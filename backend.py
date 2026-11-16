import json
import requests
from datetime import datetime, timezone
from fastapi import FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, HTMLResponse, RedirectResponse
from pydantic import BaseModel
import os
import random
import time
from typing import List, Optional

# Optional Vector DB / ChromaDB import (fallback to local keyword search if chromadb not installed)
try:
    import chromadb
    from chromadb.utils import embedding_functions
    HAVE_CHROMADB = True
except ImportError:
    chromadb = None
    embedding_functions = None
    HAVE_CHROMADB = False

# Import Custom Admin Auth & Security Middleware
import supabase_client
import master_sync_service
import admin_auth
from auth_middleware import SecureAdminMiddleware

# --- AUTOMATIC .ENV FILE LOADER ---
def load_env_file():
    if os.path.exists(".env"):
        try:
            with open(".env", "r", encoding="utf-8") as f:
                for line in f:
                    line = line.strip()
                    if line and not line.startswith("#") and "=" in line:
                        k, v = line.split("=", 1)
                        k = k.strip()
                        v = v.strip().strip("'\"")
                        os.environ[k] = v
        except Exception as e:
            print(f"Error reading .env: {e}")

load_env_file()

# --- CONFIGURATION ---
API_URL = os.getenv("API_URL", "https://openrouter.ai/api/v1/chat/completions")
MODEL_NAME = os.getenv("DRIVE_THRU_MODEL", "openai/gpt-oss-120b")
API_KEY = os.getenv("API_KEY", "") or os.getenv("OPENROUTER_API_KEY", "") or os.getenv("OPENAI_API_KEY", "")
OLLAMA_URL = os.getenv("OLLAMA_URL", "http://localhost:11434/api/generate")

if API_KEY.startswith("sk-or-v1-sk-or-v1-"):
    API_KEY = "sk-or-v1-" + API_KEY[len("sk-or-v1-sk-or-v1-"):]

# --- MENU DATABASE & SEARCH SETUP ---
collection = None
local_menu_items = []

try:
    if os.path.exists("menu.json"):
        with open("menu.json", "r", encoding="utf-8") as file:
            local_menu_items = json.load(file)
except Exception as e:
    print(f"Notice reading menu.json: {e}")

if HAVE_CHROMADB:
    try:
        chroma_client = chromadb.Client()
        try:
            better_embeddings = embedding_functions.SentenceTransformerEmbeddingFunction(model_name="BAAI/bge-small-en-v1.5")
            collection = chroma_client.get_or_create_collection(
                name="drive_thru_menu_v8", 
                embedding_function=better_embeddings
            )
        except Exception:
            collection = chroma_client.get_or_create_collection(name="drive_thru_menu_v8")

        if collection.count() == 0 and local_menu_items:
            collection.add(
                documents=[item["text"] for item in local_menu_items],
                metadatas=[item["metadata"] for item in local_menu_items],
                ids=[item["id"] for item in local_menu_items]
            )
            print("Successfully loaded menu into ChromaDB collection!")
    except Exception as err:
        print(f"Notice initializing ChromaDB: {err}. Using local search fallback.")
        collection = None
else:
    print("Notice: chromadb not installed. Drive-thru assistant will use lightweight fallback search.")

# --- FASTAPI SETUP ---
api = FastAPI(title="Mother's Hut Restaurant & Admin Platform")

# Attach Custom Admin Security Middleware (validates short URLs and sessions)
api.add_middleware(SecureAdminMiddleware)

api.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class UserQuery(BaseModel):
    question: str

def is_mobile_user_agent(ua_string: str) -> bool:
    if not ua_string:
        return False
    ua = ua_string.lower()
    mobile_keywords = [
        "mobile", "android", "iphone", "ipad", "ipod",
        "blackberry", "windows phone", "iemobile", "opera mini"
    ]
    return any(keyword in ua for keyword in mobile_keywords)

@api.get("/", response_class=HTMLResponse)
def serve_index(request: Request):
    ua = request.headers.get("user-agent", "")
    target_file = "mobile.html" if is_mobile_user_agent(ua) else "index.html"
    try:
        with open(target_file, "r", encoding="utf-8") as f:
            return HTMLResponse(content=f.read(), status_code=200)
    except FileNotFoundError:
        try:
            with open("index.html", "r", encoding="utf-8") as f:
                return HTMLResponse(content=f.read(), status_code=200)
        except FileNotFoundError:
            return HTMLResponse(content="<h1>Error: Frontend file not found in project directory.</h1>", status_code=404)
    except Exception as e:
        return HTMLResponse(content=f"<h1>Error loading frontend: {str(e)}</h1>", status_code=500)

@api.get("/mobile", response_class=HTMLResponse)
def serve_mobile_explicit():
    try:
        with open("mobile.html", "r", encoding="utf-8") as f:
            return HTMLResponse(content=f.read(), status_code=200)
    except Exception:
        with open("index.html", "r", encoding="utf-8") as f:
            return HTMLResponse(content=f.read(), status_code=200)

@api.get("/desktop", response_class=HTMLResponse)
def serve_desktop_explicit():
    with open("index.html", "r", encoding="utf-8") as f:
        return HTMLResponse(content=f.read(), status_code=200)

@api.get("/logo.png")
def serve_logo():
    if os.path.exists("logo.png"):
        return FileResponse("logo.png", media_type="image/png")
    return HTMLResponse(status_code=404)

@api.get("/bengali.json")
def serve_bengali_json():
    if os.path.exists("bengali.json"):
        return FileResponse("bengali.json", media_type="application/json")
    return HTMLResponse(status_code=404)

@api.get("/sw.js")
def serve_service_worker():
    if os.path.exists("sw.js"):
        return FileResponse("sw.js", media_type="application/javascript")
    return HTMLResponse(status_code=404)

@api.get("/react", response_class=HTMLResponse)
def serve_react_frontend():
    if os.path.exists("react_app.html"):
        with open("react_app.html", "r", encoding="utf-8") as f:
            return HTMLResponse(content=f.read(), status_code=200)
    return HTMLResponse(content="<h1>React frontend not found.</h1>", status_code=404)

@api.get("/menu")
def get_menu():
    try:
        with open("menu.json", "r", encoding="utf-8") as file:
            return json.load(file)
    except FileNotFoundError:
        return []

# ============================================================
# ADMIN AUTHENTICATION & SECURE URL SHORTENER ENDPOINTS
# ============================================================
class AdminRegisterRequest(BaseModel):
    username: str
    password: str
    employee_id: str

class AdminLoginRequest(BaseModel):
    username: str
    password: str

@api.get("/admin", response_class=HTMLResponse)
@api.get("/admin.html", response_class=HTMLResponse)
def serve_admin_login():
    try:
        with open("admin.html", "r", encoding="utf-8") as f:
            return HTMLResponse(content=f.read(), status_code=200)
    except FileNotFoundError:
        return HTMLResponse(content="<h1>Admin frontend file (admin.html) not found.</h1>", status_code=404)

class SSOTicketRequest(BaseModel):
    username: str
    target_service: str

# Strategy 2: Generate Cryptographically Signed Supabase SSO JWT Ticket
@api.post("/api/admin/generate-sso-ticket")
def generate_sso_ticket_endpoint(req: SSOTicketRequest):
    users = admin_auth._load_json(admin_auth.USER_DB_FILE, {})
    user = users.get(req.username.strip().lower())
    emp_id = user.get("employee_id", "EMP-UNKNOWN") if user else "EMP-UNKNOWN"
    
    # 120-second validity ticket
    ticket = admin_auth.generate_supabase_sso_ticket(req.username, emp_id, req.target_service, ttl_seconds=120)
    return {
        "success": True,
        "sso_ticket": ticket,
        "expires_in": 120,
        "target_service": req.target_service
    }

# Endpoint for destination Render apps to verify incoming SSO tickets
@api.get("/api/admin/verify-sso-ticket")
def verify_sso_ticket_endpoint(ticket: str):
    decoded = admin_auth.verify_supabase_sso_ticket(ticket)
    if not decoded:
        return {"valid": False, "message": "Invalid or expired ticket"}, 401
    return {"valid": True, "claims": decoded}

@api.post("/api/admin/register")
def register_admin_endpoint(data: AdminRegisterRequest):
    res = admin_auth.register_admin(data.username, data.password, data.employee_id)
    if not res.get("success"):
        return JSONResponse(status_code=400, content=res)
    return res

@api.post("/api/admin/login")
def login_admin_endpoint(data: AdminLoginRequest):
    user = admin_auth.authenticate_admin(data.username, data.password)
    if not user:
        return {"success": False, "message": "Incorrect username or password."}
    
    # Generate short randomized URL for this session
    short_code = admin_auth.create_short_session_url(user["username"], user.get("employee_id", ""))
    short_url = f"/s/{short_code}"
    
    return {
        "success": True,
        "token": user["token"],
        "short_code": short_code,
        "short_url": short_url
    }

# Short URL resolver: Validates random short code and redirects to dashboard with secure ref
@api.get("/s/{code}")
def resolve_short_url(code: str):
    session = admin_auth.validate_short_code(code)
    if not session:
        return HTMLResponse(
            content="""<!DOCTYPE html>
            <html><body style="font-family:sans-serif; text-align:center; padding:50px; background:#1c1917; color:#fff;">
            <h2>Session Expired or Invalid Short URL</h2>
            <p style="color:#a8a29e;">Please login through the Admin portal again.</p>
            <a href="/admin" style="display:inline-block; margin-top:20px; background:#d97706; color:#fff; padding:10px 20px; border-radius:10px; text-decoration:none; font-weight:bold;">Return to Login</a>
            </body></html>""",
            status_code=403
        )
    # Redirect to protected dashboard with session query ref and set secure cookie
    response = RedirectResponse(url=f"/admin/dashboard?ref={code}", status_code=303)
    return response

# Protected Admin Dashboard showing Render and Supabase projects
@api.get("/admin/dashboard", response_class=HTMLResponse)
def serve_admin_dashboard(request: Request):
    try:
        with open("admin_dashboard.html", "r", encoding="utf-8") as f:
            return HTMLResponse(content=f.read(), status_code=200)
    except FileNotFoundError:
        return HTMLResponse(content="<h1>Admin dashboard not found.</h1>", status_code=404)

# ============================================================
# AI ASSISTANT ENDPOINT
# ============================================================
@api.post("/ask")
def ask_endpoint(query: UserQuery):
    load_env_file()
    
    active_api_key = os.getenv("API_KEY", "") or os.getenv("OPENROUTER_API_KEY", "") or os.getenv("OPENAI_API_KEY", "") or API_KEY
    if active_api_key.startswith("sk-or-v1-sk-or-v1-"):
        active_api_key = "sk-or-v1-" + active_api_key[len("sk-or-v1-sk-or-v1-"):]

    active_api_url = os.getenv("API_URL", "") or API_URL
    active_model = os.getenv("DRIVE_THRU_MODEL", "") or MODEL_NAME

    # Retrieve relevant menu context
    if collection is not None:
        try:
            results = collection.query(query_texts=[query.question], n_results=6)
            retrieved_docs = results["documents"][0] if results["documents"] else []
        except Exception:
            retrieved_docs = []
    else:
        # Fallback keyword matching when ChromaDB is not installed
        q_lower = query.question.lower()
        matched = []
        for itm in local_menu_items:
            txt = itm.get("text", "")
            if any(term in txt.lower() for term in q_lower.split() if len(term) > 2):
                matched.append(txt)
            if len(matched) >= 6:
                break
        retrieved_docs = matched if matched else [itm.get("text", "") for itm in local_menu_items[:6]]

    context = "\n".join(retrieved_docs)
    
    prompt = f"""You are an ultra-fast drive-through assistant for Mother's Hut restaurant.
Use ONLY the menu details below to answer concisely, helpfully, and accurately.

CRITICAL RULES:
- The menu items below explicitly state their Category (e.g., Category: Breakfast).
- If the customer asks for a category like "breakfast", look at the Category labels in the context. List up to 4 matching items from that section with their exact prices and ask what they want to order.
- If they ask about prices, ingredients, or food type (veg/non-veg), answer clearly.
- Keep the response concise, polite, and quick to read.

Menu Context:
{context}

Customer Question: {query.question}
Answer:"""

    if active_api_key:
        headers = {
            "Authorization": f"Bearer {active_api_key}",
            "Content-Type": "application/json",
            "HTTP-Referer": "http://localhost:8000",
            "X-Title": "Mothers Hut Drive-Thru"
        }
        payload = {
            "model": active_model,
            "messages": [
                {
                    "role": "system",
                    "content": "You are an ultra-fast drive-through assistant for Mother's Hut highway restaurant. Be concise, accurate, and mention exact item names and prices."
                },
                {
                    "role": "user",
                    "content": f"Menu Context:\n{context}\n\nCustomer Question: {query.question}"
                }
            ],
            "max_tokens": 500,
            "temperature": 0.3
        }
        try:
            response = requests.post(active_api_url, json=payload, headers=headers, timeout=45)
            if response.status_code == 200:
                data = response.json()
                choices = data.get("choices", [])
                if choices and len(choices) > 0:
                    answer = choices[0].get("message", {}).get("content", "").strip()
                else:
                    answer = "Here are our authentic menu recommendations. What would you like to order?"
            else:
                answer = f"API Error ({response.status_code}): {response.text}"
        except Exception as e:
            answer = f"Error connecting to AI service: {str(e)}"
    else:
        target_ollama = os.getenv("OLLAMA_URL", "") or OLLAMA_URL
        try:
            response = requests.post(
                target_ollama,
                json={
                    "model": active_model, 
                    "prompt": prompt, 
                    "stream": False,
                    "options": {"num_ctx": 2048} 
                },
                timeout=60
            )
            if response.status_code == 200:
                answer = response.json().get("response", "Error: Ollama returned empty data.")
            else:
                answer = f"Ollama Error {response.status_code}: {response.text}"
        except Exception as e:
            answer = f"Error connecting to Ollama: {str(e)}"

    return {"question": query.question, "answer": answer}

# --- PRODUCTION ORDERS & TOKEN GENERATING SYSTEM ---
class OrderItem(BaseModel):
    id: str
    name: str
    price: float
    qty: int
    prep_time: Optional[str] = "15 Mins"

class OrderRequest(BaseModel):
    customer_name: Optional[str] = "Valued Guest"
    phone_number: Optional[str] = ""
    date_of_birth: Optional[str] = None
    group_size: Optional[int] = 1
    items: List[OrderItem]
    subtotal: float
    taxes: float
    grand_total: float
    service_mode: Optional[str] = "dine-in"   # 'dine-in', 'takeaway', 'delivery'
    table_number: Optional[str] = "4"
    special_note: Optional[str] = ""
    first_visit_date: Optional[str] = None
    estimated_prep_mins: Optional[int] = 15

class OrderUpdateItemsRequest(BaseModel):
    token: str
    additional_items: List[OrderItem]
    staff_notes: Optional[str] = ""

active_orders = {}

def calculate_estimated_prep_time(items: List[OrderItem]) -> int:
    """Calculates overall kitchen prep time based on highest latency item in cart."""
    max_mins = 10
    for item in items:
        name_lower = item.name.lower()
        if any(w in name_lower for w in ["biryani", "mutton", "thali", "fish", "prawn", "roast"]):
            max_mins = max(max_mins, 20)
        elif any(w in name_lower for w in ["bhature", "luchi", "curry", "paneer", "chicken", "paratha"]):
            max_mins = max(max_mins, 15)
        elif any(w in name_lower for w in ["chai", "coffee", "lassi", "beverage", "dessert", "sweet", "juice"]):
            max_mins = max(max_mins, 8)
        else:
            max_mins = max(max_mins, 12)
    return max_mins

@api.post("/order")
def create_order(order: OrderRequest):
    # Unique high-visibility visual token (e.g. MH-4821)
    for _ in range(50):
        rand_suffix = f"{random.randint(1000, 9999)}"
        token = f"MH-{rand_suffix}"
        if token not in active_orders:
            break
    else:
        token = f"MH-{int(time.time() * 1000) % 100000}"

    current_dt = datetime.now()
    date_str = current_dt.strftime("%Y-%m-%d")
    timestamp_str = current_dt.strftime("%Y-%m-%d %H:%M:%S")
    order_id = f"MH-{current_dt.strftime('%Y%m%d')}-{token.split('-')[-1]}"

    # Calculate preparation time
    prep_mins = order.estimated_prep_mins or calculate_estimated_prep_time(order.items)

    order_record = {
        "order_id": order_id,
        "token": token,
        "customer_name": (order.customer_name or "").strip() or "Valued Guest",
        "phone_number": (order.phone_number or "").strip() or "N/A",
        "date_of_birth": (order.date_of_birth or "").strip() or None,
        "group_size": max(1, order.group_size or 1),
        "service_mode": (order.service_mode or "dine-in").lower(),
        "table_number": str(order.table_number or "4") if order.service_mode == "dine-in" else "Takeaway / Drive-Thru",
        "first_visit_date": order.first_visit_date or date_str,
        "ordered_at": timestamp_str,
        "estimated_prep_mins": prep_mins,
        "items": [item.dict() for item in order.items],
        "item_count": sum(i.qty for i in order.items),
        "subtotal": order.subtotal,
        "taxes": order.taxes,
        "grand_total": order.grand_total,
        "special_note": order.special_note or "",
        "status": "Sent to Kitchen"
    }

    # 1. Save to in-memory active store
    active_orders[token] = order_record

    # 2. Persist to Supabase Database (public.orders)
    supabase_result = supabase_client.insert_order(order_record)
    order_record["supabase_status"] = supabase_result.get("status")

    print(f"Production Order Confirmed! ID: {order_id} | Token: {token} | Origin: {order.service_mode} | Customer: {order_record['customer_name']} | Group: {order_record['group_size']} | Total: ₹{order.grand_total} | Supabase: {supabase_result.get('status')}")

    return {
        "status": "success",
        "order_id": order_id,
        "token": token,
        "order": order_record
    }

@api.get("/order/{token}")
def get_order_by_token(token: str):
    if token in active_orders:
        return active_orders[token]
    return {"status": "error", "message": "Order token not found"}, 404

@api.get("/order/table/{table_num}")
def get_order_by_table(table_num: str):
    """Find active dine-in order and token for a specific table."""
    clean_table = str(table_num).strip().replace("T-", "").replace("Table #", "").replace("Table ", "")
    # Check local active orders
    for token, ord_rec in active_orders.items():
        if ord_rec.get("service_mode") == "dine-in":
            tbl = str(ord_rec.get("table_number", "")).strip()
            if tbl == clean_table or tbl == f"Table #{clean_table}":
                return {"status": "success", "order": ord_rec}
    
    # Check Supabase
    supabase_orders = supabase_client.get_orders_from_supabase(limit=25)
    for ord_rec in supabase_orders:
        if ord_rec.get("service_mode") == "dine-in":
            tbl = str(ord_rec.get("table_number", "")).strip()
            if tbl == clean_table or tbl == f"Table #{clean_table}":
                return {"status": "success", "order": ord_rec}

    return {"status": "not_found", "message": f"No active order found for Table #{clean_table}"}, 404

@api.post("/order/add-items")
def add_items_to_order(req: OrderUpdateItemsRequest):
    """Appends newly added dishes to an existing table token & recalculates bill."""
    token = req.token.strip()
    target_order = active_orders.get(token)

    # If not found locally, fetch from Supabase
    if not target_order:
        sb_orders = supabase_client.get_orders_from_supabase(limit=50)
        for o in sb_orders:
            if o.get("token") == token or o.get("order_id") == token:
                target_order = o
                break

    if not target_order:
        return {"status": "error", "message": f"Token {token} not found"}, 404

    # Merge items list
    existing_items = list(target_order.get("items", []))
    for add_it in req.additional_items:
        # Check if item already exists to increment qty
        found = False
        for ex in existing_items:
            if ex.get("id") == add_it.id or ex.get("name") == add_it.name:
                ex["qty"] = int(ex.get("qty", 1)) + int(add_it.qty)
                found = True
                break
        if not found:
            existing_items.append(add_it.dict())

    # Recalculate bill
    subtotal = sum(float(i.get("price", 0)) * int(i.get("qty", 1)) for i in existing_items)
    taxes = round(subtotal * 0.05, 2)
    grand_total = round(subtotal + taxes, 2)
    new_prep_time = calculate_estimated_prep_time([OrderItem(**i) if isinstance(i, dict) else i for i in existing_items])

    # Update in-memory record
    target_order["items"] = existing_items
    target_order["item_count"] = sum(int(i.get("qty", 1)) for i in existing_items)
    target_order["subtotal"] = subtotal
    target_order["taxes"] = taxes
    target_order["grand_total"] = grand_total
    target_order["estimated_prep_mins"] = max(target_order.get("estimated_prep_mins", 15), new_prep_time)
    active_orders[token] = target_order

    # Update in Supabase
    sb_res = supabase_client.update_order_items_in_supabase(token, existing_items, subtotal, taxes, grand_total, new_prep_time)

    print(f"Token {token} updated! Added {len(req.additional_items)} item(s). New Grand Total: ₹{grand_total} | Supabase: {sb_res.get('status')}")

    return {
        "status": "success",
        "message": f"Token {token} updated successfully with new items",
        "order": target_order,
        "supabase_result": sb_res
    }

@api.get("/orders")
def get_all_orders():
    """Retrieve orders list in tabular format for kitchen & admin intelligence."""
    # Attempt to fetch from Supabase first
    supabase_orders = supabase_client.get_orders_from_supabase(limit=100)
    if supabase_orders:
        return {"orders": supabase_orders, "source": "supabase"}
    
    # Otherwise return local active memory store sorted by timestamp desc
    local_list = sorted(list(active_orders.values()), key=lambda x: x.get("ordered_at", ""), reverse=True)
    return {"orders": local_list, "source": "local"}


@api.post("/api/sync-master")
def trigger_master_sync():
    """
    Triggers 5-minute interval synchronization to Master Supabase database.
    Updates `total_orders` and `customer_count` for all recent intervals.
    """
    synced = master_sync_service.sync_all_recent_intervals(hours_back=24)
    return {
        "status": "success",
        "synced_intervals": synced,
        "message": f"Successfully synchronized {synced} five-minute interval(s) to Master Supabase master_metrics."
    }


def _master_sync_worker():
    """Background worker that continuously syncs at 5-minute boundaries (:00, :05, :10, etc.)."""
    import threading
    while True:
        try:
            # Sync current and recent intervals
            master_sync_service.sync_all_recent_intervals(hours_back=2)
            
            # Sleep until next 5-minute wall clock mark (minutes ending in 0 or 5)
            now = datetime.now(timezone.utc)
            minutes_to_next = 5 - (now.minute % 5)
            seconds_to_next = (minutes_to_next * 60) - now.second
            if seconds_to_next <= 0:
                seconds_to_next = 300
            time.sleep(seconds_to_next)
        except Exception as e:
            print(f"[MasterSyncWorker] Error: {e}")
            time.sleep(60)


# Lifespan event handler for FastAPI
@api.on_event("startup")
def startup_event():
    import threading
    _sync_thread = threading.Thread(target=_master_sync_worker, daemon=True)
    _sync_thread.start()
    print("Master Supabase 5-minute background sync thread started.")


if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8000))
    uvicorn.run("backend:api", host="0.0.0.0", port=port, reload=True)
