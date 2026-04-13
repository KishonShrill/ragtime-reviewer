from fastapi import HTTPException, status
from pymongo.mongo_client import MongoClient
from pymongo.server_api import ServerApi
from starlette.status import HTTP_500_INTERNAL_SERVER_ERROR
from utils.hashing import hash_password, verify_password
from .schema import LogicEngineResponse, Logs, SubtopicKnowledgeScore, Subtopics, QuestionResponse, User
from typing import cast, Any, Mapping, Optional
from datetime import datetime
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

def verify_user(mongoUser: str, password: str) -> Mapping[str, Any]:
    user = users.find_one(filter={
        "$or":[
            {"username": mongoUser},
            {"email": mongoUser}
        ]})
    if not user:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail={"title": "Authorization Error",
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
def create_user(username: str, email: str, password: str, role: str) -> tuple[bool, User]:
    """
    Inserts a new user into the collection with a Cold Start adaptive profile 
    and returns the created user data (excluding the password).
    """
    hashed_pw = hash_password(password)
    
    # Initialize the Cold Start profile for the 4 core Science subjects
    initial_scores_model = {
        subject: SubtopicKnowledgeScore(
                mastery_score = 0.41, 
                rank = "Medium",  # Cold start baseline
                weak_concepts = []
        )
        for subject in ["Biology", "Chemistry", "Physics", "General Science"]
    }

    initial_scores_dict = {
        sub: model.model_dump() for sub, model in initial_scores_model.items()
    }

    user_doc: dict[str, Any] = {
        "username": username,
        "email": email,
        "password": hashed_pw,
        "role": role,
        "knowledge_scores": initial_scores_dict,
        "overall_progress": {
            "total_questions_answered": 0,
            "average_accuracy": 0.0,
        },
        "fallback": None,
    }
    try:
        print(f"Inserting User: {user_doc}")
        _ = users.insert_one(document=user_doc)
        return False, User(username=username, email=email, role=role, knowledge_scores=Subtopics(subtopic=initial_scores_model), access_token="")
    except Exception as e:
        print("An exception occurred ::", e)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail={"title": "MongoDB Connection Error",
                                                                                       "reason": "Cannot create user, database is down..."})

def create_logs(user: User, data: Logs, timestamp: datetime, latestScores: dict[str,Any], isCorrect: bool) -> None:
    try:
        payload = {
            "user": user.username,
            "knowledge_base": {
                "original_question_id": data.original_question_id,
                "original_question": data.original_question
            },
            "augmented": {
                "question": data.question,
                "answer": data.answer,
                "options": data.options,
                "bloom_taxonomy": data.bloom_taxonomy,
                "difficulty": data.difficulty,
                "subtopic": data.subtopic
            },
            "timestamp": timestamp,
            "execution_time": data.execution_time,
            "updated_scores": latestScores,
            "isCorrect": isCorrect
        }

        result = logs.insert_one(document=payload)
        print(result)

    except IndexError:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail={"title": "MongoDB Error",
                                                                                       "reason": "Query not found"})
    except Exception as e:
        print(e)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail={"title": "MongoDB Connection Error",
                                                                                       "reason": "Cannot create log for user for database..."})


def get_logs_count(user: User) -> int:
    try:
        return logs.count_documents({ "user": user.username })

    except IndexError:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail={"title": "MongoDB Error",
                                                                                       "reason": "Query not found"})
    except Exception as e:
        print(e)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail={"title": "MongoDB Connection Error",
                                                                                       "reason": "Cannot get logs count from database..."})

def get_scores_of_user(user: User) -> dict[str,Any]:
    try:
        cursor = logs.find({"user": user.username}, {"knowledge_base": 0}).sort("timestamp", 1)
        logs_list = list(cursor)
        
        for log in logs_list:
            log["_id"] = str(log["_id"]) 
        
        return {"status": "success", "data": logs_list}
    
    except:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail={"title": "MongoDB Connection Error",
                                                                                       "reason": "Cannot get logs of user from database..."})


def get_question(query_fields: LogicEngineResponse, excluded_ids: Optional[list[str]] = []) -> QuestionResponse:
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
        raw_data: QuestionResponse = result[0]

        return QuestionResponse(
            question_id = raw_data.get("question_id"),
            question = raw_data.get("question"),
            answer = raw_data.get("answer"),
            subtopic = raw_data.get("subtopic"),
            difficulty = raw_data.get("difficulty"),
            bloom_taxonomy = raw_data.get("bloom_taxonomy"),
            image=raw_data.get("image"),
            description=raw_data.get("description")
        )
    except IndexError:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail={"title": "MongoDB Error",
                                                                                       "reason": "Query not found"})
    except Exception as e:
        print(e)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail={"title": "MongoDB Connection Error",
                                                                                       "reason": "Cannot fetch question, database is down..."})


def get_specific_question(question_id: str) -> QuestionResponse:
    try:
        raw_data = knowledge_base.find_one({"question_id": question_id})
        
        if not raw_data:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail={"title": "Not Found", "reason": "That question ID no longer exists."})

        return QuestionResponse(
            question_id = raw_data.get("question_id"),
            question = raw_data.get("question"),
            answer = raw_data.get("answer"),
            subtopic = raw_data.get("subtopic"),
            difficulty = raw_data.get("difficulty"),
            bloom_taxonomy = raw_data.get("bloom_taxonomy"),
            image = raw_data.get("image"),
            description=raw_data.get("description")
        )
    except HTTPException:
        raise
    except Exception as e:
        print(e)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail={"title": "MongoDB Connection Error", "reason": "Cannot fetch specific question."})


def get_all_knowledge_base() -> dict[str, Any]:
    try:
        # Fetch all documents. {"_id": 0} explicitly removes the unserializable ObjectId.
        cursor = knowledge_base.find({}, {"_id": 0})
        questions_list = list(cursor)
        
        return {"status": "success", "data": questions_list}
        
    except Exception as e:
        print(e)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, 
            detail={
                "title": "MongoDB Connection Error",
                "reason": "Cannot fetch knowledge base from database..."
            }
        )
