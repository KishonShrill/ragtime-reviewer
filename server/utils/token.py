from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from typing import cast, Annotated, Any
import jwt
import os

security: HTTPBearer = HTTPBearer()


"""
--- CRUD ----
function operations for manipulating
or reading tokens for the api routes
"""

def create_access_token(payload: dict[str,Any]) -> str:
    token = jwt.encode(payload=payload, key=os.getenv("JWT_SECRET"), algorithm=os.getenv("JWT_ALGORITHM"))
    return token

def read_access_token(payload: Annotated[HTTPAuthorizationCredentials, Depends(dependency=security)]) -> dict[str,str]:
    token: str = payload.credentials
    if not token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail={"title": "Authorization Error",
                                                                              "reason": "Missing token"})

    try:
        decoded_token = jwt.decode(token, os.getenv("JWT_SECRET"), algorithms=[cast(str, os.getenv("JWT_ALGORITHM"))])
        return decoded_token
    except Exception as e:
        print(f"An exception has occured ::", e)
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail={"title": "Authorization Error",
                                                                              "reason": "Invalid user"})


"""
--- ROLES ---
role based system for the authorization
on api routes for fastapi
"""

def admin_required(user: Annotated[dict[str,str], Depends(dependency=read_access_token)]) -> dict[str,str]:
    if user.get("role") != "admin":
        raise HTTPException(
            status_code=status.http_403_forbidden,
            detail={"title": "Authorization Error",
                    "reason": "Admin privileges required"}
        )
    return user

def user_required(user: Annotated[dict[str,str], Depends(dependency=read_access_token)]) -> dict[str,str]:
    if user.get("role") != "regular":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={"title": "Authorization Error",
                    "reason": "User privileges required"}
        )
    return user
