from fastapi import APIRouter, Depends, HTTPException, status
from utils.token import user_required, admin_required 
from utils.schema import SignupRequest, LoginRequest, LogPayload
from utils.db import db, create_logs, create_reviews, get_scores_of_user, get_all_knowledge_base, get_reviews_of_user
from typing import cast, Annotated, Mapping, Any
import os
import json


users = db.get_collection(name="Users")
logs = db.get_collection(name="Logs")
reviews = db.get_collection(name="Reviews")

router: APIRouter = APIRouter(prefix="/api", tags=["Database"])


@router.get("/user/knowledge")
def display_knowledge(user: Annotated[dict[str,str], Depends(dependency=user_required)]) -> Mapping[str, Any]:
    user = users.find_one(filter={ "username": user.get("username") })
    return { "knowledge_scores": user.get("knowledge_scores") }

@router.get("/knowledge_base")
def fetch_all_knowledge_base(
        user: Annotated[dict[str,str], Depends(dependency=admin_required)]
    ) -> Mapping[str, Any]:
    
    # Since the Depends(admin_required) already secures this route, 
    # we just need to return the data!
    return get_all_knowledge_base()

@router.get("/logs")
def fetch_question_logs(
        user: Annotated[dict[str,str], Depends(dependency=user_required)],
        ) -> dict[str, Any]:
    return get_scores_of_user(user=user)

@router.post("/logs")
def upload_question_logs(
        user: Annotated[dict[str,str], Depends(dependency=user_required)],
        payload: LogPayload
        ) -> None:
    data = json.dumps(payload.data.model_dump())
    print(data)
    latestScores = json.dumps(payload.latestScores)

    create_logs(user=user, data=payload.data, timestamp=payload.timestamp, latestScores=payload.latestScores, isCorrect=payload.isCorrect)

@router.get("/history")
async def get_user_history(
    user: Annotated[dict[str, str], Depends(dependency=user_required)]
):
    account: User = user
    # Fetch BOTH logs and reviews for the profile page
    user_logs = get_scores_of_user(user=user)
    user_reviews = get_reviews_of_user(user=user)

    return {
        "logs": user_logs.get("data", []),
        "reviews": user_reviews.get("data", [])
    }

@router.post("/reviews")
async def save_review_log(
        user: Annotated[dict[str, str], Depends(dependency=user_required)],
        payload: LogPayload
        ) -> None:
    data = json.dumps(payload.data.model_dump())

    create_reviews(user=user, data=payload.data, timestamp=payload.timestamp, isCorrect=payload.isCorrect)
