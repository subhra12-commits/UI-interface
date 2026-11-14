import hashlib
import hmac
import secrets
import time
import os
import json
import jwt
from typing import Optional, Dict

USER_DB_FILE = "admin_users.json"
TOKEN_DB_FILE = "short_urls.json"

# Secret keys for signing and hashing
SECRET_SALT = os.getenv("AUTH_SECRET_SALT", "mothers_hut_secure_salt_2026")
# Supabase JWT Secret (can be set in .env or defaults to a high-entropy secret)
SUPABASE_JWT_SECRET = os.getenv("SUPABASE_JWT_SECRET", "super-secret-mothers-hut-supabase-jwt-key-2026")

def _load_json(file_path: str, default: dict) -> dict:
    if os.path.exists(file_path):
        try:
            with open(file_path, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            return default
    return default

def _save_json(file_path: str, data: dict):
    with open(file_path, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2)

def hash_password_with_token(password: str) -> tuple[str, str]:
    token = secrets.token_hex(16)
    hashed = hmac.new(
        key=f"{SECRET_SALT}:{token}".encode("utf-8"),
        msg=password.encode("utf-8"),
        digestmod=hashlib.sha256
    ).hexdigest()
    return hashed, token

def verify_password_with_token(password: str, stored_hash: str, token: str) -> bool:
    calculated_hash = hmac.new(
        key=f"{SECRET_SALT}:{token}".encode("utf-8"),
        msg=password.encode("utf-8"),
        digestmod=hashlib.sha256
    ).hexdigest()
    return hmac.compare_digest(calculated_hash, stored_hash)

# User Store operations
def register_admin(username: str, password: str, employee_id: str) -> dict:
    users = _load_json(USER_DB_FILE, {})
    username = username.strip().lower()
    if username in users:
        return {"success": False, "message": "Username already exists."}
    
    pwd_hash, token = hash_password_with_token(password)
    users[username] = {
        "username": username,
        "employee_id": employee_id.strip(),
        "password_hash": pwd_hash,
        "token": token,
        "created_at": time.strftime("%Y-%m-%d %H:%M:%S")
    }
    _save_json(USER_DB_FILE, users)
    return {"success": True, "message": "Admin registered successfully."}

def authenticate_admin(username: str, password: str) -> Optional[dict]:
    users = _load_json(USER_DB_FILE, {})
    username = username.strip().lower()
    if username not in users:
        return None
    user_data = users[username]
    if verify_password_with_token(password, user_data["password_hash"], user_data["token"]):
        return user_data
    return None

# =========================================================================
# STRATEGY 2: SUPABASE SHARED SSO JWT TOKEN GENERATION
# =========================================================================
def generate_supabase_sso_ticket(username: str, employee_id: str, target_service: str, ttl_seconds: int = 120) -> str:
    """
    Generates a cryptographically signed, short-lived (120s) JWT SSO ticket.
    Follows Supabase JWT standard format (aud=authenticated, role=authenticated/admin)
    The destination Render microservice validates this ticket using SUPABASE_JWT_SECRET.
    """
    now = int(time.time())
    payload = {
        "aud": "authenticated",
        "role": "admin",
        "sub": username,
        "user_metadata": {
            "username": username,
            "employee_id": employee_id,
            "system": "mothers_hut_pos"
        },
        "target": target_service,
        "iat": now,
        "exp": now + ttl_seconds
    }
    token = jwt.encode(payload, SUPABASE_JWT_SECRET, algorithm="HS256")
    return token

def verify_supabase_sso_ticket(token_str: str) -> Optional[dict]:
    try:
        decoded = jwt.decode(token_str, SUPABASE_JWT_SECRET, algorithms=["HS256"], audience="authenticated")
        return decoded
    except Exception as e:
        print(f"JWT Verification failed: {e}")
        return None

# URL Shortener and One-Time/Expiring Session Access
def create_short_session_url(username: str, employee_id: str, ttl_seconds: int = 3600) -> str:
    sessions = _load_json(TOKEN_DB_FILE, {})
    now = time.time()
    valid_sessions = {k: v for k, v in sessions.items() if v.get("expires_at", 0) > now}
    
    short_code = secrets.token_urlsafe(8)
    valid_sessions[short_code] = {
        "username": username,
        "employee_id": employee_id,
        "created_at": now,
        "expires_at": now + ttl_seconds
    }
    _save_json(TOKEN_DB_FILE, valid_sessions)
    return short_code

def validate_short_code(short_code: str) -> Optional[dict]:
    sessions = _load_json(TOKEN_DB_FILE, {})
    session = sessions.get(short_code)
    if not session:
        return None
    if time.time() > session.get("expires_at", 0):
        del sessions[short_code]
        _save_json(TOKEN_DB_FILE, sessions)
        return None
    return session
