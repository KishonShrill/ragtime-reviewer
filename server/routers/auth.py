from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel
from dotenv import load_dotenv
from utils.db import create_user, user_exists 
import os

load_dotenv()

router = APIRouter(prefix="/api/auth", tags=["auth"])

# Mock DB (replace with MongoDB in production)
USER_DB = {
    "admin123": "admin",
    "regular123": "regular",
    "trial123": "free_trial"
}

class LoginRequest(BaseModel):
    username: str
    password: str
    salt: str

class SignupRequest(BaseModel):
    username: str
    password: str
    secret: str

@router.post("/signup")
async def signup(request: SignupRequest): 
    role = USER_DB.get(request.secret)
    if not role:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Incorrect Secret")

    if user_exists(request.username):
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="User Already Exists")

    if len(request.password.encode("utf-8")) > 72:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Password too long (max 72 chars)")

    new_user = create_user(request.username, request.password, role)
    print(new_user)

    return {
        "access_token": f"mock_jwt_token_for_{request.username}",
        "token_type": "bearer",
        "user": new_user
    }


#@router.post("/login")
#async def login(request: LoginRequest);
    
