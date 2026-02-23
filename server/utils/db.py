from fastapi import HTTPException, status
from pymongo.mongo_client import MongoClient
from pymongo.server_api import ServerApi
from utils.hashing import hash_password, verify_password
from typing import Any
import os


# MongoDB setup
MONGO_URI = os.getenv("MONGO_URI")
client: MongoClient[Any] = MongoClient(MONGO_URI, server_api=ServerApi('1'))
db = client.get_database("FinalThesis")
knowledge_base = db.get_collection("KnowledgeBase")
users = db.get_collection("Users")
logs = db.get_collection("Logs")

def check_health() -> bool:
    """Returns True if MongoDB is reachable, False otherwise"""
    try:
        _ = client.admin.command('ping')
        return True
    except Exception as e:
        print("MongoDB connection error:", e)
        return False


"""
Function call for util use on files
Will recheck again if there's anything
new to change.
"""

# --- CRUD ---
def create_user(username: str, password: str, role: str) -> tuple[bool, dict[str, str] | None]:
    """
    Inserts a new user into the collection and returns the created user (without password)
    """
    hashed_pw = hash_password(password)
    user_doc: dict[str,str] = {
        "username": username,
        "password": hashed_pw,
        "role": role
    }
    try:
        _ = users.insert_one(document=user_doc)
        return False, { "username": username, "role": role }
    except Exception as e:
        print("An exception occurred ::", e)
        return True, None


def user_exists(username: str) -> bool:
    user = users.find_one({ "username": username })
    if user:
        return True
    return False

def verify_user(username: str, password: str) -> bool:
    user: Any | None = users.find_one({ "username": username })
    if user:
        return verify_password(user.get("password"), password)
    raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="User Doesn't Exist")
