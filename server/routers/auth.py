from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials
from pydantic import BaseModel
from utils.db import create_user, user_exists, verify_user 
from utils.token import admin_required, create_access_token, read_access_token
import os


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

    err, new_user = create_user(request.username, request.password, role)
    
    if (err != True):
        print(new_user)
        token = create_access_token(new_user)

        return token

    raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Something went wrong when saving the user...")

@router.post("/login")
async def login(request: LoginRequest):
    if (verify_user(request.username, request.password)):
        return "You are logged in"
    return "You failed bitch"


@router.get("/me")
def me(user = Depends(admin_required)):
    return user 


