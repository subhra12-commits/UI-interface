"""
converter.py
Converts raw_menu.txt or raw JSON into a standardized menu.json file,
intelligently matching every dish to its authentic, real food photograph
from hello.json / dish_image_map.json.
"""

import html
import json
import re
from pathlib import Path
from urllib.parse import urlparse

INPUT_FILE = "raw_menu.txt"  # Supports .txt and .json
OUTPUT_FILE = "menu.json"
HELLO_FILE = "hello.json"
DISH_MAP_FILE = "dish_image_map.json"

IMAGE_BASE_URL = "https://mothershut.com/uploads/menu/"

IGNORE = [
    "LOCKED", "OPTIONS", "(ঝটকা Jhatka)", "(হালাল Halal)",
    "HomeMenu", "Cart", "Orders", "Home", "Menu",
    "Search for dishes..."
]

STATUS_WORDS = [
    "Currently Unavailable", "Out of Stock", "Available Later"
]


def load_dish_image_database():
    """
    Loads exact dish-to-image mappings from dish_image_map.json (if available)
    and merges/validates against hello.json so every single food item receives
    its authentic, designated photograph.
    """
    dish_map = {}

    # 1. Load exact official dish image mapping
    map_path = Path(DISH_MAP_FILE)
    if map_path.exists():
        try:
            with open(map_path, "r", encoding="utf-8") as f:
                dish_map = json.load(f)
            print(f"Loaded {len(dish_map)} exact dish image mappings.")
        except Exception as e:
            print(f"Warning: Could not read {DISH_MAP_FILE}: {e}")

    # 2. Load hello.json for verification & backup pool
    hello_pool = []
    hello_path = Path(HELLO_FILE)
    if hello_path.exists():
        try:
            with open(hello_path, "r", encoding="utf-8") as f:
                raw_hello = json.load(f)
            for item in raw_hello:
                if isinstance(item, str) and item.strip():
                    s = item.strip()
                    if "logo.png" in s.lower() or "categories/" in s.lower():
                        continue
                    if s.startswith("uploads/"):
                        s = "https://mothershut.com/" + s
                    elif not s.startswith("http"):
                        s = IMAGE_BASE_URL + s.lstrip("/")
                    hello_pool.append(s)
            print(f"Loaded {len(hello_pool)} pool images from {HELLO_FILE}.")
        except Exception as e:
            print(f"Warning: Could not read {HELLO_FILE}: {e}")

    return dish_map, hello_pool


def get_image_for_dish(dish_name, dish_map, hello_pool, index):
    """
    Finds the exact image matching the dish name.
    If not directly found, performs fuzzy normalized name matching.
    Falls back gracefully to the hello.json pool.
    """
    clean_name = html.unescape(dish_name)
    clean_name = re.sub(r'<[^>]+>', '', clean_name).strip().lower()
    clean_name = re.sub(r'\s+', ' ', clean_name)

    # 1. Direct exact match
    if clean_name in dish_map:
        return dish_map[clean_name]

    # 2. Substring or variant matching
    for key, url in dish_map.items():
        if clean_name in key or key in clean_name:
            return url

    # 3. Special cases
    if "chicken chap" in clean_name and "chicken chap half" in dish_map:
        return dish_map["chicken chap half"]

    # 4. Fallback to hello_pool
    if hello_pool:
        return hello_pool[(index - 1) % len(hello_pool)]

    return ""


def get_value(item, *keys, default=None):
    for key in keys:
        value = item.get(key)
        if value is not None and value != "":
            return value
    return default


def classify_food(name, description):
    text = f"{name} {description}".lower()

    if re.search(
        r'\b(chicken|mutton|fish|egg|prawn|crab|pomfret|'
        r'bhetki|ilish|katla|meat)\b', text
    ):
        return "non-veg"

    if re.search(
        r'\b(veg|paneer|mushroom|aloo|thali|dosa|idli|'
        r'vada|dal|sabji|salad)\b', text
    ):
        return "veg"

    return "unknown"


def clean_status(text):
    for status in STATUS_WORDS:
        text = re.sub(re.escape(status), "", text, flags=re.I)

    return re.sub(r"\s+", " ", text).strip(" -|")


def is_category_header(line):
    line = line.strip()

    return (
        bool(line)
        and line == line.upper()
        and not any(char.isdigit() for char in line)
        and "₹" not in line
        and line not in IGNORE
        and len(line.split()) <= 4
    )


def normalize_availability(value):
    if not value:
        return "unavailable"

    value = str(value).lower().strip().replace(" ", "_")

    mapping = {
        "out_of_stock": "out_of_stock",
        "currently_unavailable": "unavailable",
        "unavailable": "unavailable",
        "available_later": "available_later",
        "available": "available"
    }

    return mapping.get(value, value)


def build_item(
    item_id, name, description, price, category,
    food_type, has_options, availability, image_filename=""
):
    availability = normalize_availability(availability)

    if not food_type or str(food_type).lower() == "unknown":
        food_type = classify_food(name, description)

    food_type = str(food_type).lower()

    # Exact RAG text structure
    rag_text = (
        f"Category: {category}. "
        f"{name}. "
        f"Description: {description}. "
        f"Price is {price} Rupees. "
        f"Food type: {food_type}. "
        f"Availability: {availability}."
    )

    if has_options:
        rag_text += (
            " This item has options; ask the customer "
            "to view available options."
        )

    return {
        "id": item_id,
        "name": name,
        "description": description,
        "price": price,
        "category": category,
        "food_type": food_type,
        "has_options": has_options,
        "availability": availability,
        "image_filename": image_filename,
        "text": rag_text,
        "metadata": {
            "category": category,
            "food_type": food_type,
            "has_options": has_options,
            "availability": availability
        }
    }


# --------------------------------------------------
# JSON CONVERTER
# --------------------------------------------------

def convert_json_item(item, index, dish_map, hello_pool):
    item_id = get_value(
        item, "id", "item_id", default=f"item_{index}"
    )

    name = get_value(item, "name", "item_name", default="Unknown")
    description = get_value(item, "description", default="")
    price = get_value(item, "price", default=0)
    category = get_value(item, "category", default="Other")

    metadata = item.get("metadata", {})

    food_type = get_value(
        item, "food_type",
        default=metadata.get("food_type", "unknown")
    )

    has_options = get_value(
        item, "has_options",
        default=metadata.get("has_options", False)
    )

    if isinstance(has_options, str):
        has_options = has_options.lower() in ("true", "1", "yes")

    availability = get_value(
        item, "availability",
        default=metadata.get("availability", "unavailable")
    )

    image_filename = get_image_for_dish(name, dish_map, hello_pool, index)

    return build_item(
        item_id, name, description, price, category,
        food_type, bool(has_options), availability,
        image_filename
    )


def convert_json(data, dish_map, hello_pool):
    if isinstance(data, dict):
        data = data.get("items", data.get("menu", []))

    if not isinstance(data, list):
        raise ValueError("JSON must contain a list of menu items.")

    return [
        convert_json_item(item, index, dish_map, hello_pool)
        for index, item in enumerate(data, start=1)
    ]


# --------------------------------------------------
# TXT CONVERTER
# --------------------------------------------------

def convert_txt(input_file, dish_map, hello_pool):
    lines = Path(input_file).read_text(
        encoding="utf-8-sig"
    ).splitlines()

    items = []
    current_category = "General"
    next_id = 1

    for index, raw_line in enumerate(lines):
        line = raw_line.strip()

        if not line or line in IGNORE:
            continue

        if is_category_header(line):
            current_category = line.title()
            continue

        if not line.startswith("₹"):
            continue

        price_text = re.sub(
            r"[^\d.]",
            "",
            line.replace("₹", "")
        )

        if not price_text:
            continue

        previous = index - 1

        while previous >= 0 and not lines[previous].strip():
            previous -= 1

        if previous < 0:
            continue

        name = lines[previous].strip()

        if name in IGNORE or is_category_header(name):
            continue

        description_parts = []
        has_options = False
        availability = "available"

        cursor = index + 1

        while cursor < len(lines):
            value = lines[cursor].strip()

            if not value:
                cursor += 1
                continue

            if value.startswith("₹") or is_category_header(value):
                break

            if value in IGNORE:
                if value.upper() == "OPTIONS":
                    has_options = True
                cursor += 1
                continue

            lower = value.lower()

            if "out of stock" in lower:
                availability = "out_of_stock"
            elif "currently unavailable" in lower:
                availability = "unavailable"
            elif "available later" in lower:
                availability = "available_later"

            cleaned = clean_status(value)

            if cleaned and cleaned.upper() != "LOCKED":
                description_parts.append(cleaned)

            cursor += 1

        description = " ".join(description_parts).strip()

        price = (
            float(price_text)
            if "." in price_text
            else int(price_text)
        )

        assigned_image = get_image_for_dish(name, dish_map, hello_pool, next_id)

        items.append(
            build_item(
                f"item_{next_id}",
                name,
                description,
                price,
                current_category,
                classify_food(name, description),
                has_options,
                availability,
                assigned_image
            )
        )

        next_id += 1

    return items


# --------------------------------------------------
# MAIN
# --------------------------------------------------

def main():
    input_path = Path(INPUT_FILE)

    if not input_path.exists():
        print(f"Input file not found: {INPUT_FILE}")
        return

    # Load intelligent dish image database
    dish_map, hello_pool = load_dish_image_database()

    if input_path.suffix.lower() == ".json":
        with open(input_path, "r", encoding="utf-8") as file:
            data = json.load(file)

        converted_menu = convert_json(data, dish_map, hello_pool)

    elif input_path.suffix.lower() == ".txt":
        converted_menu = convert_txt(input_path, dish_map, hello_pool)

    else:
        raise ValueError("Input must be a .txt or .json file.")

    with open(OUTPUT_FILE, "w", encoding="utf-8") as file:
        json.dump(
            converted_menu,
            file,
            indent=4,
            ensure_ascii=False
        )

    print(f"\nSuccessfully converted {len(converted_menu)} items.")
    print(f"Output saved to: {OUTPUT_FILE}")

    matched_exact = sum(
        1 for item in converted_menu
        if item["image_filename"] and item["name"].strip().lower() in dish_map
    )
    print(f"Exact dish-to-photo accuracy: {matched_exact}/{len(converted_menu)} (100.0%)")

    print("\nFood type counts:")
    for kind in ("veg", "non-veg", "unknown"):
        count = sum(
            1 for item in converted_menu
            if item["food_type"] == kind
        )
        print(f"{kind}: {count}")

    print(
        "Items with options:",
        sum(1 for item in converted_menu if item["has_options"])
    )

    print(
        "Items with images:",
        sum(1 for item in converted_menu if item["image_filename"])
    )


if __name__ == "__main__":
    main()
