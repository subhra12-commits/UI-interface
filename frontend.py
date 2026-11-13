import streamlit as st
import requests
import json
import pandas as pd

# Set wide layout for side-by-side view
st.set_page_config(page_title="Drive-Through Assistant", layout="wide")

BACKEND_URL = "http://127.0.0.1:8000/ask"

# --- 1. LOAD AND FORMAT MENU DATA ---
@st.cache_data
def load_menu():
    try:
        with open("menu.json", "r", encoding="utf-8") as f:
            data = json.load(f)
            
        formatted_menu = []
        for item in data:
            # Extract the category and the item description
            category = item.get("metadata", {}).get("category", "General")
            description = item.get("text", "")
            
            # Clean up the text slightly for the visual table
            clean_desc = description.replace(f"Category: {category}. ", "")
            
            formatted_menu.append({
                "Category": category,
                "Item Details & Price": clean_desc
            })
            
        return pd.DataFrame(formatted_menu)
    except FileNotFoundError:
        return pd.DataFrame([{"Category": "Error", "Item Details & Price": "menu.json not found."}])

menu_df = load_menu()

# --- 2. MAIN UI LAYOUT ---
st.title("🚗 Drive-Through Quick-Order System")
st.markdown("---")

# Split the screen into two columns (Left is slightly wider)
col1, col2 = st.columns([1.2, 1.0])

# --- LEFT COLUMN: VISUAL MENU & SEARCH ---
with col1:
    st.subheader("📋 Browse Full Menu")
    
    # Text input for manual searching
    search_query = st.text_input("🔍 Search for a dish, ingredient, or price manually...", "")
    
    # Filter the menu table based on user search
    if search_query:
        # Searches across the 'Item Details & Price' column, ignoring case
        filtered_df = menu_df[menu_df["Item Details & Price"].str.contains(search_query, case=False, na=False)]
    else:
        filtered_df = menu_df
        
    # Display the interactive dataframe
    st.dataframe(
        filtered_df, 
        use_container_width=True, 
        height=550, 
        hide_index=True
    )

# --- RIGHT COLUMN: AI ASSISTANT ---
with col2:
    st.subheader("🤖 AI Order Assistant")
    st.write("Ask for recommendations, allergy info, or custom orders!")
    
    # Container for chat history to keep it scrolling cleanly next to the menu
    chat_container = st.container(height=480)
    
    if "messages" not in st.session_state:
        st.session_state.messages = []

    with chat_container:
        for message in st.session_state.messages:
            with st.chat_message(message["role"]):
                st.markdown(message["content"])

    # Chat Input Box
    if prompt := st.chat_input("E.g., Suggest a spicy chicken dish under 300 Rupees"):
        # Add user message to state
        st.session_state.messages.append({"role": "user", "content": prompt})
        
        # Display user message instantly
        with chat_container:
            with st.chat_message("user"):
                st.markdown(prompt)

            # Display assistant response
            with st.chat_message("assistant"):
                with st.spinner("Checking the menu..."):
                    try:
                        response = requests.post(BACKEND_URL, json={"question": prompt})
                        response.raise_for_status()
                        answer = response.json().get("answer", "Error reading response.")
                    except requests.exceptions.RequestException as e:
                        answer = f"Backend connection failed. Ensure backend.py is running. Error: {e}"
                    
                    st.markdown(answer)
                    st.session_state.messages.append({"role": "assistant", "content": answer})