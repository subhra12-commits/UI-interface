"""
supabase_client.py
Production Supabase database client for Mother's Hut Restaurant Intelligence.
Manages persistent order storage, real-time token lookups, and customer analytics
directly via direct PostgreSQL pooled connection or REST interface.
"""

import os
import json
import logging
from typing import Dict, Any, Optional, List
from datetime import datetime
import psycopg2
from psycopg2.extras import RealDictCursor

logger = logging.getLogger("mothers_hut.supabase")

# Database connection URL (URL-encoded password for special characters like #)
DATABASE_URL = os.getenv(
    "DATABASE_URL", 
    "postgresql://postgres.xrjpheqinpsnvnqvcdtk:%23Subhradeepsaha@aws-0-ap-south-1.pooler.supabase.com:6543/postgres"
)

# Optional Supabase REST endpoint parameters
SUPABASE_URL = os.getenv("SUPABASE_URL", "https://xrjpheqinpsnvnqvcdtk.supabase.co").rstrip("/")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "") or os.getenv("SUPABASE_ANON_KEY", "")

def get_db_connection():
    """Establishes a connection to the Supabase PostgreSQL database."""
    return psycopg2.connect(DATABASE_URL, connect_timeout=10)

def is_supabase_configured() -> bool:
    """Check if Supabase connection URL or credentials are configured."""
    return bool(DATABASE_URL or (SUPABASE_URL and SUPABASE_KEY))

def insert_order(order_data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Inserts a newly created order token into Supabase public.orders table.
    Falls back gracefully if Supabase is offline or connection fails.
    """
    try:
        conn = get_db_connection()
        conn.autocommit = True
        cur = conn.cursor(cursor_factory=RealDictCursor)

        insert_sql = """
            INSERT INTO public.orders (
                order_id,
                token,
                customer_name,
                phone_number,
                date_of_birth,
                group_size,
                service_mode,
                table_number,
                first_visit_date,
                ordered_at,
                estimated_prep_mins,
                items,
                item_count,
                subtotal,
                taxes,
                grand_total,
                special_note,
                status
            ) VALUES (
                %(order_id)s,
                %(token)s,
                %(customer_name)s,
                %(phone_number)s,
                %(date_of_birth)s,
                %(group_size)s,
                %(service_mode)s,
                %(table_number)s,
                %(first_visit_date)s,
                %(ordered_at)s,
                %(estimated_prep_mins)s,
                %(items)s,
                %(item_count)s,
                %(subtotal)s,
                %(taxes)s,
                %(grand_total)s,
                %(special_note)s,
                %(status)s
            ) RETURNING *;
        """

        payload = {
            "order_id": order_data.get("order_id"),
            "token": order_data.get("token"),
            "customer_name": order_data.get("customer_name", "Valued Guest"),
            "phone_number": order_data.get("phone_number", ""),
            "date_of_birth": order_data.get("date_of_birth") or None,
            "group_size": int(order_data.get("group_size", 1)),
            "service_mode": order_data.get("service_mode", "dine-in"),
            "table_number": str(order_data.get("table_number", "4")),
            "first_visit_date": order_data.get("first_visit_date", datetime.utcnow().strftime("%Y-%m-%d")),
            "ordered_at": order_data.get("ordered_at", datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S")),
            "estimated_prep_mins": int(order_data.get("estimated_prep_mins", 15)),
            "items": json.dumps(order_data.get("items", [])),
            "item_count": int(order_data.get("item_count", 0)),
            "subtotal": float(order_data.get("subtotal", 0.0)),
            "taxes": float(order_data.get("taxes", 0.0)),
            "grand_total": float(order_data.get("grand_total", 0.0)),
            "special_note": order_data.get("special_note", ""),
            "status": order_data.get("status", "Sent to Kitchen")
        }

        cur.execute(insert_sql, payload)
        row = cur.fetchone()
        cur.close()
        conn.close()

        logger.info(f"Order {order_data.get('order_id')} successfully inserted into Supabase PostgreSQL.")
        return {"status": "success", "data": dict(row) if row else {}}
    except Exception as exc:
        logger.error(f"Failed to insert order into Supabase PostgreSQL: {exc}")
        return {"status": "connection_error", "detail": str(exc)}

def get_orders_from_supabase(limit: int = 50) -> List[Dict[str, Any]]:
    """Retrieve recent orders from Supabase public.orders table."""
    try:
        conn = get_db_connection()
        cur = conn.cursor(cursor_factory=RealDictCursor)
        cur.execute(
            "SELECT * FROM public.orders ORDER BY ordered_at DESC LIMIT %s;", 
            (limit,)
        )
        rows = cur.fetchall()
        cur.close()
        conn.close()

        results = []
        for r in rows:
            record = dict(r)
            if "id" in record:
                record["id"] = str(record["id"])
            if "ordered_at" in record and record["ordered_at"]:
                record["ordered_at"] = str(record["ordered_at"])
            if "first_visit_date" in record and record["first_visit_date"]:
                record["first_visit_date"] = str(record["first_visit_date"])
            if "created_at" in record and record["created_at"]:
                record["created_at"] = str(record["created_at"])
            if "updated_at" in record and record["updated_at"]:
                record["updated_at"] = str(record["updated_at"])
            if "subtotal" in record:
                record["subtotal"] = float(record["subtotal"])
            if "taxes" in record:
                record["taxes"] = float(record["taxes"])
            if "grand_total" in record:
                record["grand_total"] = float(record["grand_total"])
            if isinstance(record.get("items"), str):
                try:
                    record["items"] = json.loads(record["items"])
                except Exception:
                    pass
            results.append(record)
        return results
    except Exception as exc:
        logger.error(f"Error querying Supabase PostgreSQL: {exc}")
        return []


def update_order_items_in_supabase(token_or_id: str, new_items: List[Dict[str, Any]], subtotal: float, taxes: float, grand_total: float, additional_prep_mins: int = 0) -> Dict[str, Any]:
    """
    Appends or updates order items for an active table token in Supabase.
    Recalculates item count, subtotal, taxes, grand_total, and estimated preparation time.
    """
    try:
        conn = get_db_connection()
        conn.autocommit = True
        cur = conn.cursor(cursor_factory=RealDictCursor)

        update_sql = """
            UPDATE public.orders
            SET 
                items = %(items)s,
                item_count = %(item_count)s,
                subtotal = %(subtotal)s,
                taxes = %(taxes)s,
                grand_total = %(grand_total)s,
                estimated_prep_mins = GREATEST(estimated_prep_mins, %(prep_mins)s),
                updated_at = NOW()
            WHERE token = %(token)s OR order_id = %(token)s
            RETURNING *;
        """

        payload = {
            "token": token_or_id,
            "items": json.dumps(new_items),
            "item_count": sum(i.get("qty", 1) for i in new_items),
            "subtotal": float(subtotal),
            "taxes": float(taxes),
            "grand_total": float(grand_total),
            "prep_mins": int(additional_prep_mins)
        }

        cur.execute(update_sql, payload)
        row = cur.fetchone()
        cur.close()
        conn.close()

        if row:
            logger.info(f"Order {token_or_id} updated with new items in Supabase.")
            return {"status": "success", "data": dict(row)}
        return {"status": "not_found", "message": f"Token {token_or_id} not found in Supabase"}
    except Exception as exc:
        logger.error(f"Failed to update order in Supabase: {exc}")
        return {"status": "error", "detail": str(exc)}
