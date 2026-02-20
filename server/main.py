from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from datetime import datetime
from routers import auth
from utils.db import check_health
import pytz  # pip install pytz

app = FastAPI(title="Adaptive Quiz Generator API")

# IMPORTANT: Enable CORS so your React app can talk to this server
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # For production, replace with your specific React URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth.router)
# app.include_router(ai.router)

@app.get("/")
def read_root():
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

@app.get("/api/health")
def read_health():
    mongo_health = {}
    if check_health():
        mongo_health = {"status": "MongoDB is healthy"}
    else:
        mongo_health = {"status": "MongoDB is down"}, 500
    return {
            "server": "Server is Online",
            "database": mongo_health,
            "model": "Llama-3.1-8B-Instruct-4bit"
            }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)

