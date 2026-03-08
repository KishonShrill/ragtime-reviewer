from fastapi import APIRouter, Depends, HTTPException, status
from datetime import datetime
from utils.db import check_health
import pytz

router: APIRouter = APIRouter(tags=["Default"])

@router.get("/")
def read_root() -> dict[str, str]:
    # UTC time
    utc_now = datetime.now(pytz.UTC)
    
    # Philippine Time (UTC+8)
    ph_tz = pytz.timezone("Asia/Manila")
    ph_now = utc_now.astimezone(ph_tz)
    
    # Format the date
    date_str = ph_now.strftime("%B %d, %Y")  # e.g., February 20, 2026
    ph_time_str = ph_now.strftime("%H:%M:%S")  # PH local time
    utc_time_str = utc_now.strftime("%H:%M:%S")  # UTC time

    return {
        "date": date_str,
        "time_ph": ph_time_str,
        "time_utc": utc_time_str
    }

@router.get("/api/health")
def read_health() -> dict[str, str | dict[str,str]]:
    mongo_health = {}
    if check_health():
        mongo_health = {"status": "MongoDB is healthy"}
    else:
        mongo_health = {"status": "MongoDB is down"}
    return {
            "server": "Server is Online",
            "database": mongo_health,
            "model": "Llama-3.1-8B-Instruct-4bit"
            }
