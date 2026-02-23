from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import jwt
import os

security = HTTPBearer()


"""
--- CRUD ----
function operations for manipulating
or reading tokens for the api routes
"""

def create_access_token(payload: dict) -> str:
    return jwt.encode(payload, os.getenv("JWT_SECRET"), algorithm=os.getenv("JWT_ALGORITHM"))

def read_access_token(payload: HTTPAuthorizationCredentials = Depends(security)) -> dict:
    token = payload.credentials
    if not token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing token")

    try:
        decoded_token = jwt.decode(token, os.getenv("JWT_SECRET"), algorithms=[os.getenv("JWT_ALGORITHM")])
        return decoded_token
    except Exception as e:
        print(f"An exception has occured ::", e)
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")


"""
--- ROLES ---
role based system for the authorization
on api routes for fastapi
"""

def admin_required(user = Depends(read_access_token)) -> dict:
    if user.get("role") != "admin":
        raise HTTPException(
            status_code=status.http_403_forbidden,
            detail="Admin privileges required"
        )
    return user

def user_required(user = Depends(read_access_token)) -> dict:
    if user.get("role") != "regular":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User privileges required"
        )
    return user
