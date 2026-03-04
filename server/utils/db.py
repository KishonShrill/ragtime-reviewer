from fastapi import HTTPException, status
from pymongo.mongo_client import MongoClient
from pymongo.server_api import ServerApi
from utils.hashing import hash_password, verify_password
from .schema import QuestionRequest, User
from typing import cast, Any, Mapping, Optional
import os


# MongoDB setup
MONGO_URI: str | None = os.getenv("MONGO_URI")
client: MongoClient[Any] = MongoClient(host=MONGO_URI, server_api=ServerApi(version='1'))
db = client.get_database(name="FinalThesis")
knowledge_base = db.get_collection(name="KnowledgeBase")
users = db.get_collection(name="Users")
logs = db.get_collection(name="Logs")

def check_health() -> bool:
    """Returns True if MongoDB is reachable, False otherwise"""
    try:
        _ = client.admin.command('ping')
        return True
    except Exception as e:
        print("MongoDB connection error:", e)
        return False

def user_exists(username: str) -> bool:
    user = users.find_one(filter={ "username": username })
    if user:
        return True
    return False

def verify_user(username: str, password: str) -> Mapping[str, Any]:
    user = users.find_one(filter={ "username": username })
    if not user:
        raise HTTPException(status_code=status.HTTP_404_CONFLICT, detail={"title": "Authorization Error",
                                                                          "reason": "User Doesn't Exist"})
    hashed_pass = cast(str, user.get("password"))

    if not verify_password(hashed=hashed_pass, password=password):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail={"title": "Authentication Error",
                                                                             "reason": "Password does not match"})
    return user

"""
Function call for util use on files
Will recheck again if there's anything
new to change.
"""

# --- CRUD ---
def create_user(username: str, password: str, role: str) -> tuple[bool, dict[str, str] | None]:
    """
    Inserts a new user into the collection with a Cold Start adaptive profile 
    and returns the created user data (excluding the password).
    """
    hashed_pw = hash_password(password)
    
    # Initialize the Cold Start profile for the 4 core Science subjects
    initial_knowledge_scores: dict[str, dict[str, str | float | list[str]]] = {
        subject: {
            "mastery_score": 0.5, 
            "rank": "Medium",  # Cold start baseline
            "weak_concepts": []
        }
        for subject in ["Biology", "Chemistry", "Physics", "General Science"]
    }

    user_doc: dict[str, Any] = {
        "username": username,
        "password": hashed_pw,
        "role": role,
        "knowledge_scores": initial_knowledge_scores,
        "overall_progress": {
            "total_questions_answered": 0,
            "average_accuracy": 0.0,
        },
        "fallback": None,
    }
    try:
        print(f"Inserting User: {user_doc}")
        _ = users.insert_one(document=user_doc)
        return False, { "username": username, "role": role }
    except Exception as e:
        print("An exception occurred ::", e)
        return True, None


def get_question(query_fields: QuestionRequest, excluded_ids: Optional[list[str]] = []) -> dict[str, str]:
    try:
        """
        Mock function to represent fetching/generating a question from MongoDB/LLM.
        """
        pipeline = [
            {
                "$match": {
                    "bloom_taxonomy": query_fields.bloom_taxonomy,
                    "difficulty": query_fields.difficulty,
                    "subtopic": query_fields.subtopic,

                    "id": { "$nin": excluded_ids }
                }
            },
            {
                "$sample": { "size": 1 }
            }
        ]

        result = list(knowledge_base.aggregate(pipeline))

        return {"id": cast(str, result[0].get("id")),
            "question": cast(str, result[0].get("question")),
            "answer": cast(str, result[0].get("answer")),
            "subtopic": cast(str, result[0].get("subtopic")),
            "difficulty": cast(str, result[0].get("difficulty")),
            "bloom_taxonomy": cast(str, result[0].get("bloom_taxonomy"))}
    except:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail={"title": "MongoDB Connection Error",
                                                                                       "reason": "Can't connect to server, please try again..."})

    # item = {
    #     "question_text": f"This is a mock {spec_dict['difficulty']} question about {spec_dict['subtopic']}.",
    #     "metadata": spec_dict,
    #     "options": ["A", "B", "C", "D"],
    #     "correct_answer": "A"
    # }

    # item = {
    #     "question": fetched_question,
    #     "answer": fetched_answer,
    #     "bloom_taxonomy": fetched_bloom_taxonomy,
    #     "difficulty": fetched_difficulty,
    # }

    # return item 
