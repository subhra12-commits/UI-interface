from fastapi import Request, HTTPException
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import HTMLResponse, RedirectResponse
import os
import admin_auth

class SecureAdminMiddleware(BaseHTTPMiddleware):
    """
    Middleware that intercepts requests to protected portal endpoints.
    Verifies that the user has a valid short session token or active authenticated cookie.
    Direct access by copying URLs without a valid token is strictly blocked.
    """
    async def dispatch(self, request: Request, call_next):
        path = request.url.path
        
        # Protect internal portal dashboards
        if path.startswith("/admin/dashboard") or path.startswith("/admin/projects"):
            token = request.cookies.get("mh_admin_token")
            short_code = request.query_params.get("ref", "")
            
            authorized = False
            if short_code and admin_auth.validate_short_code(short_code):
                authorized = True
            elif token:
                # Validate token cookie against registered user sessions
                users = admin_auth._load_json(admin_auth.USER_DB_FILE, {})
                for u in users.values():
                    if u.get("token") == token:
                        authorized = True
                        break

            if not authorized:
                # Deny access to copy-pasted URL
                return HTMLResponse(
                    content="""<!DOCTYPE html>
                    <html lang="en">
                    <head>
                        <meta charset="UTF-8"><title>403 Forbidden - Access Denied</title>
                        <script src="https://cdn.tailwindcss.com"></script>
                    </head>
                    <body class="bg-stone-900 text-white min-h-screen flex items-center justify-center p-4">
                        <div class="max-w-md w-full bg-stone-800 border border-red-500/30 rounded-3xl p-8 text-center shadow-2xl">
                            <div class="w-16 h-16 bg-red-500/20 text-red-400 rounded-2xl flex items-center justify-center mx-auto mb-4">
                                <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m0 0v2m0-2h2m-2 0H10m2-11a9 9 0 110 18 9 9 0 010-18zm0 5a1 1 0 00-1 1v4a1 1 0 002 0V9a1 1 0 00-1-1z"/></svg>
                            </div>
                            <h2 class="text-xl font-bold mb-2">Access Denied</h2>
                            <p class="text-stone-400 text-xs mb-6">Direct URL access is restricted. This secure portal requires an authenticated session generated via the Admin interface.</p>
                            <a href="/admin" class="inline-block px-5 py-2.5 bg-red-600 hover:bg-red-500 text-white text-xs font-bold rounded-xl transition-all">Go to Admin Login</a>
                        </div>
                    </body>
                    </html>""",
                    status_code=403
                )

        return await call_next(request)
