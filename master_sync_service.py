"""
master_sync_service.py - Real-time and 5-minute interval synchronizer between
Mother's Hut Primary Supabase and the Master Supabase Analytics database.

Requirements:
- Window alignment: Exact 5-minute intervals ending in 0 or 5 (e.g. 12:00, 12:05, 12:10).
- Columns updated in master_metrics: ONLY `total_orders` and `customer_count`.
- All other columns (vehicle_count, hygiene_score, food_quality_score, positive_sentiment, negative_sentiment) remain untouched!
- If window_start row already exists, update and replace 0s with actual counts.
- If row does not exist, insert it with window_start, total_orders, customer_count.
"""

import os
import time
import logging
from datetime import datetime, timezone, timedelta
import psycopg2
from psycopg2.extras import RealDictCursor
from dotenv import load_dotenv

load_dotenv()

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("master_sync")

PRIMARY_DB_URL = os.getenv(
    "DATABASE_URL",
    "postgresql://postgres.xrjpheqinpsnvnqvcdtk:%23Subhradeepsaha@aws-0-ap-south-1.pooler.supabase.com:6543/postgres"
)

MASTER_DB_URL = os.getenv(
    "MASTER_SUPABASE_DATABASE_URL",
    "postgresql://postgres.vmdxwszdawcdluaignpl:The_Neotia_Uni@aws-1-ap-southeast-1.pooler.supabase.com:6543/postgres"
)


def get_5min_window(dt: datetime) -> datetime:
    """Round down datetime to previous 5-minute boundary (:00, :05, :10, :15, etc.)."""
    minute = (dt.minute // 5) * 5
    return dt.replace(minute=minute, second=0, microsecond=0)


def sync_interval(window_start: datetime, total_orders: int, customer_count: int) -> bool:
    """
    Upserts into Master Supabase `public.master_metrics` table for the specified window_start.
    ONLY updates `total_orders` and `customer_count`. Preserves all other columns.
    """
    try:
        with psycopg2.connect(MASTER_DB_URL, connect_timeout=10) as conn:
            with conn.cursor() as cur:
                # Upsert query preserving other columns
                upsert_sql = """
                INSERT INTO public.master_metrics (window_start, total_orders, customer_count)
                VALUES (%s, %s, %s)
                ON CONFLICT (window_start) DO UPDATE SET
                    total_orders = EXCLUDED.total_orders,
                    customer_count = EXCLUDED.customer_count;
                """
                cur.execute(upsert_sql, (window_start, total_orders, customer_count))
            conn.commit()
        logger.info(f"Successfully synced window {window_start} -> total_orders={total_orders}, customer_count={customer_count}")
        return True
    except Exception as e:
        logger.error(f"Error syncing to Master Supabase for {window_start}: {e}")
        return False


def get_primary_metrics_for_window(window_start: datetime):
    """
    Calculates total_orders and average customer_count in [window_start, window_start + 5 minutes).
    Uses primary Mother's Hut `orders` table.
    """
    window_end = window_start + timedelta(minutes=5)
    try:
        with psycopg2.connect(PRIMARY_DB_URL, connect_timeout=10) as conn:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                query = """
                SELECT 
                    COUNT(*) as total_orders,
                    COALESCE(ROUND(AVG(COALESCE(group_size, 1))), 0) as avg_customer_count
                FROM public.orders
                WHERE ordered_at >= %s AND ordered_at < %s;
                """
                cur.execute(query, (window_start, window_end))
                row = cur.fetchone()
                total_orders = int(row["total_orders"]) if row else 0
                customer_count = int(row["avg_customer_count"]) if row else 0
                return total_orders, customer_count
    except Exception as e:
        logger.error(f"Error reading primary orders for window {window_start}: {e}")
        return 0, 0


def sync_all_recent_intervals(hours_back: int = 12):
    """
    Backfills/syncs all 5-minute intervals from hours_back until now.
    Finds windows where orders exist or that already exist in master_metrics.
    """
    logger.info(f"Checking intervals for the past {hours_back} hours...")
    try:
        with psycopg2.connect(PRIMARY_DB_URL, connect_timeout=10) as conn:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                query = f"""
                SELECT 
                    to_timestamp(floor(extract(epoch from ordered_at) / 300) * 300) at time zone 'UTC' as window_start,
                    COUNT(*) as total_orders,
                    COALESCE(ROUND(AVG(COALESCE(group_size, 1))), 0) as avg_customer_count
                FROM public.orders
                WHERE ordered_at >= NOW() - INTERVAL '{hours_back} hours'
                GROUP BY 1
                ORDER BY 1 ASC;
                """
                cur.execute(query)
                rows = cur.fetchall()

        synced_count = 0
        for r in rows:
            w_start = r["window_start"]
            t_orders = int(r["total_orders"])
            c_count = int(r["avg_customer_count"])
            if sync_interval(w_start, t_orders, c_count):
                synced_count += 1
                
        logger.info(f"Backfilled {synced_count} intervals with active order data.")
        return synced_count
    except Exception as e:
        logger.error(f"Error in sync_all_recent_intervals: {e}")
        return 0


def sync_current_window():
    """
    Identifies the current 5-minute window, calculates metrics from primary, and updates master.
    """
    now = datetime.now(timezone.utc)
    current_window = get_5min_window(now)
    total_orders, customer_count = get_primary_metrics_for_window(current_window)
    return sync_interval(current_window, total_orders, customer_count)


if __name__ == "__main__":
    print("Running initial sync and backfill...")
    count = sync_all_recent_intervals(hours_back=24)
    print(f"Initial sync complete. Synced intervals: {count}")
