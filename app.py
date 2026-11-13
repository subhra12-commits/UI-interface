import os
import requests
import streamlit as st
import chromadb
from fastapi import FastAPI
import uvicorn
import threading

# --- 1. CONFIGURATION & RAG SETUP ---
OLLAMA_URL = "http://localhost:11434/api/generate"
MODEL_NAME = "llama3" # Make sure you ran `ollama pull llama3`

# Initialize Local ChromaDB
chroma_client = chromadb.Client()
collection = chroma_client.get_or_create_collection(name="drive_thru_menu")

# Seed initial drive-through menu database if empty
if collection.count() == 0:
    menu_items = [
        {"id": "1", "text": "Classic Cheeseburger consists of a beef patty, cheddar cheese, lettuce, tomato, pickles, onions, and special sauce on a toasted sesame seed bun."},
        {"id": "2", "text": "Crispy Chicken Burger consists of a crispy breaded chicken breast, spicy mayo, shredded lettuce, and pickles on a brioche bun."},
        {"id": "3", "text": "Bacon Double Burger consists of two beef patties, double American cheese, smoked bacon, barbecue sauce, and crispy onion strings."},
        {"id": "4", "text": "Veggie Supreme Burger consists of a black bean and quinoa patty, avocado slice, pepper jack cheese, chipotle mayo, lettuce, and tomato."}
    ]
    collection.add(
        documents=[item["text"] for item in menu_items],
        ids=[item["id"] for item in menu_items]
    )

def query_rag(question: str):
    # Retrieve top 2 most relevant menu descriptions
    results = collection.query(query_texts=[question], n_results=2)
    retrieved_docs = results["documents"][0] if results["documents"] else []
    context = "\n".join(retrieved_docs)
    
    prompt = f"""You are an ultra-fast drive-through assistant. Use ONLY the menu details below to answer the customer's question concisely. Keep answers short and direct to reduce ordering time.

Menu Context:
{context}

Customer Question: {question}
Answer:"""

    try:
        response = requests.post(
            OLLAMA_URL,
            json={"model": MODEL_NAME, "prompt": prompt, "stream": False},
            timeout=10
        )
        return response.json().get("response", "Sorry, I couldn't process that.")
    except Exception as e:
        return f"Error connecting to Ollama: {str(e)}"

# --- 2. FASTAPI BACKEND ---
api = FastAPI()

@api.get("/ask")
def ask_endpoint(question: str):
    answer = query_rag(question)
    return {"question": question, "answer": answer}

def run_fastapi():
    uvicorn.run(api, host="127.0.0.1", port=8000, log_level="warning")

# --- 3. STREAMLIT INTERFACE ---
def run_streamlit():
    st.title("🚗 Drive-Through Quick-Order Assistant")
    st.write("Instant RAG-powered answers to minimize customer ordering time.")

    if "messages" not in st.session_state:
        st.session_state.messages = []

    for message in st.session_state.messages:
        with st.chat_message(message["role"]):
            st.markdown(message["content"])

    if prompt := st.chat_input("Ask about the menu (e.g., What does the Classic Cheeseburger consist of?)"):
        st.session_state.messages.append({"role": "user", "content": prompt})
        with st.chat_message("user"):
            st.markdown(prompt)

        with st.chat_message("assistant"):
            with st.spinner("Checking menu..."):
                answer = query_rag(prompt)
                st.markdown(answer)
                st.session_state.messages.append({"role": "assistant", "content": answer})

if __name__ == "__main__":
    run_streamlit()
    
    # Run Streamlit frontend
    import sys
    from streamlit.web.cli import main as st_main
    sys.argv = ["streamlit", "run", __file__]
    sys.exit(st_main())