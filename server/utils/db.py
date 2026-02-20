from pymongo.mongo_client import MongoClient
from pymongo.server_api import ServerApi
from dotenv import load_dotenv
from argon2 import PasswordHasher
import os

load_dotenv()

# MongoDB setup
MONGO_URI = os.getenv("MONGO_URI")
client = MongoClient(MONGO_URI, server_api=ServerApi('1'))
db = client.get_database("FinalThesis")
knowledge_base = db.get_collection("KnowledgeBase")
users = db.get_collection("Users")
logs = db.get_collection("Logs")

def check_health():
    """Returns True if MongoDB is reachable, False otherwise"""
    try:
        client.admin.command('ping')
        return True
    except Exception as e:
        print("MongoDB connection error:", e)
        return False


"""
Function call for util use on files
Will recheck again if there's anything
new to change.
"""

hasher = PasswordHasher()
# --- Helpers ---
def hash_password(password: str) -> str:
    return hasher.hash(password)

def verify_password(password: str, hashed: str) -> bool:
    return hasher.verify(password, hashed)



# --- CRUD ---
def create_user(username: str, password: str, role: str) -> dict:
    """
    Inserts a new user into the collection and returns the created user (without password)
    """
    hashed_pw = hash_password(password)
    user_doc = {
        "username": username,
        "password": hashed_pw,
        "role": role
    }
    new_user = users.insert_one(user_doc)
    return new_user

def user_exists(username: str) -> bool:
    user = users.find_one({ "username": username })
    if user:
        return True
    return False
