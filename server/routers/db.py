from fastapi import APIRouter, Depends, HTTPException, status
from utils.token import user_required
from utils.schema import SignupRequest, LoginRequest
from utils.db import db
from typing import cast, Annotated, Mapping, Any
import os


users = db.get_collection(name="Users")

router: APIRouter = APIRouter(prefix="/api", tags=["Database"])

@router.get("/user/knowledge")
def display_knowledge(user: Annotated[dict[str,str], Depends(dependency=user_required)]) -> Mapping[str, Any]:
    user = users.find_one(filter={ "username": user.get("username") })
    return { "knowledge_scores": user.get("knowledge_scores") }
