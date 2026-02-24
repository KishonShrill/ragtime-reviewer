from fastapi import HTTPException, status
from pymongo.mongo_client import MongoClient
from pymongo.server_api import ServerApi
from utils.hashing import hash_password, verify_password
from .schema import User
from typing import Any
from collections.abc import Collection
import os


# MongoDB setup
MONGO_URI: str | None = os.getenv("MONGO_URI")
client: MongoClient[Any] = MongoClient(host=MONGO_URI, server_api=ServerApi(version='1'))
db = client.get_database(name="FinalThesis")
knowledge_base: Collection[Any] = db.get_collection(name="KnowledgeBase")
users: Collection[User] = db.get_collection(name="Users")
logs: Collection[Any] = db.get_collection(name="Logs")

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
    hashed_pw: str = hash_password(password)
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
    user: Any | None = users.find_one(filter={ "username": username })
    if user:
        return True
    return False

def verify_user(username: str, password: str) -> bool:
    user: Any | None = users.find_one(filter={ "username": username })
    if user:
        return verify_password(hashed=user.get("password"), password=password)
    raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail={"title": "Authorization Error",
                                                                      "reason": "User Doesn't Exist"})
