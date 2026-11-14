import json
import requests
import chromadb
from chromadb.utils import embedding_functions
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, HTMLResponse
from pydantic import BaseModel
import os

# --- CONFIGURATION ---
OLLAMA_URL = "http://localhost:11434/api/generate"
MODEL_NAME = "llama3" 

# --- DATABASE SETUP ---
chroma_client = chromadb.Client()
better_embeddings = embedding_functions.SentenceTransformerEmbeddingFunction(model_name="BAAI/bge-small-en-v1.5")

collection = chroma_client.get_or_create_collection(
    name="drive_thru_menu_v8", 
    embedding_function=better_embeddings
)

if collection.count() == 0:
    try:
        with open("menu.json", "r", encoding="utf-8") as file:
            menu_items = json.load(file)
            
        collection.add(
            documents=[item["text"] for item in menu_items],
            metadatas=[item["metadata"] for item in menu_items],
            ids=[item["id"] for item in menu_items]
        )
        print("Successfully loaded menu into database!")
    except FileNotFoundError:
        print("Warning: menu.json not found.")

# --- FASTAPI SETUP ---
api = FastAPI(title="Drive-Thru RAG API")

# CRITICAL: Allow the HTML frontend to communicate with this backend
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

# Serve main interactive restaurant frontend with mobile/desktop user-agent routing
@api.get("/", response_class=HTMLResponse)
def serve_index(request: Request):
    ua = request.headers.get("user-agent", "")
    target_file = "mobile.html" if is_mobile_user_agent(ua) else "index.html"
    
    # Fallback to index.html if mobile.html isn't present yet
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

# New endpoint to feed the visual menu table in HTML
@api.get("/menu")
def get_menu():
    try:
        with open("menu.json", "r", encoding="utf-8") as file:
            return json.load(file)
    except FileNotFoundError:
        return []

@api.post("/ask")
def ask_endpoint(query: UserQuery):
    # 1. REDUCED: Pull only 6 items instead of 20 to prevent memory overflow
    results = collection.query(query_texts=[query.question], n_results=6)
    retrieved_docs = results["documents"][0] if results["documents"] else []
    context = "\n".join(retrieved_docs)
    
    prompt = f"""You are an ultra-fast drive-through assistant. Use ONLY the menu details below to answer concisely.

CRITICAL RULES:
- The menu items below explicitly state their Category (e.g., Category: Breakfast).
- If the customer asks for a category like "breakfast", look at the Category labels in the context. List up to 4 matching items from that section and ask what they want to order.
- Keep the list easy to read out loud.

Menu Context:
{context}

Customer Question: {query.question}
Answer:"""

    try:
        response = requests.post(
            OLLAMA_URL,
            json={
                "model": MODEL_NAME, 
                "prompt": prompt, 
                "stream": False,
                # 2. REDUCED: Safe limit for 6GB VRAM GPUs
                "options": {"num_ctx": 2048} 
            },
            timeout=120
        )
        if response.status_code == 200:
            answer = response.json().get("response", "Error: Ollama returned empty data.")
        else:
            answer = f"Ollama Error {response.status_code}: {response.text}"
    except Exception as e:
        answer = f"Error connecting to Ollama: {str(e)}"

    return {"question": query.question, "answer": answer}

class UserLocation(BaseModel):
    latitude: float
    longitude: float

@api.post("/location")
def receive_location(loc: UserLocation):
    print(f"Received customer delivery location -> Latitude: {loc.latitude}, Longitude: {loc.longitude}")
    return {"status": "success"}
