
import json
import re
from pathlib import Path
from urllib.parse import urlparse

INPUT_FILE = "raw_menu.txt"  # Supports .txt and .json
OUTPUT_FILE = "menu.json"

IMAGE_BASE_URL = "https://mothershut.com/uploads/menu/"

IGNORE = [
    "LOCKED", "OPTIONS", "(ঝটকা Jhatka)", "(হালাল Halal)",
    "HomeMenu", "Cart", "Orders", "Home", "Menu",
    "Search for dishes..."
]

STATUS_WORDS = [
    "Currently Unavailable", "Out of Stock", "Available Later"
]


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
        and not line.startswith("₹")
        and line.upper() == line
        and line not in IGNORE
        and not re.search(r"\d", line)
    )


def normalize_availability(value):
    value = str(value or "available").lower().replace(" ", "_")

    mapping = {
        "out_of_stock": "out_of_stock",
        "currently_unavailable": "unavailable",
        "unavailable": "unavailable",
        "available_later": "available_later",
        "available": "available"
    }

    return mapping.get(value, value)


def extract_image_url(value):
    if not value:
        return ""

    value = str(value).strip()

    # Preserve existing full URLs
    if value.startswith(("http://", "https://")):
        return value

    # Extract filename from a local path or URL-like path
    filename = urlparse(value).path.split("/")[-1]

    if not filename:
        return ""

    return IMAGE_BASE_URL + filename


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
        "image_filename": "ITEM_2665_1778771060.webp",
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

def convert_json_item(item, index):
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

    image_filename = get_value(
        item,
        "image_filename", "image", "image_url",
        default=""
    )

    return build_item(
        item_id, name, description, price, category,
        food_type, bool(has_options), availability,
        image_filename
    )


def convert_json(data):
    if isinstance(data, dict):
        data = data.get("items", data.get("menu", []))

    if not isinstance(data, list):
        raise ValueError("JSON must contain a list of menu items.")

    return [
        convert_json_item(item, index)
        for index, item in enumerate(data, start=1)
    ]


# --------------------------------------------------
# TXT CONVERTER
# --------------------------------------------------

def convert_txt(input_file):
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
        image_filename = ""

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

            image_match = re.search(
                r'[\w.-]+\.(?:webp|png|jpg|jpeg)',
                value,
                flags=re.I
            )

            if image_match:
                image_filename = image_match.group(0)
                cursor += 1
                continue

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
                image_filename
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

    if input_path.suffix.lower() == ".json":
        with open(input_path, "r", encoding="utf-8") as file:
            data = json.load(file)

        converted_menu = convert_json(data)

    elif input_path.suffix.lower() == ".txt":
        converted_menu = convert_txt(input_path)

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
