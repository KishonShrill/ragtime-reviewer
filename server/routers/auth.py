from fastapi import APIRouter, Depends, HTTPException, status
from utils.db import create_user, user_exists, verify_user 
from utils.token import user_required, create_access_token
from utils.schema import SignupRequest, LoginRequest
from typing import cast, Annotated, Mapping, Any
import os


router: APIRouter = APIRouter(prefix="/api/auth", tags=["Authentication"])

# Mock DB (replace with MongoDB in production)
USER_DB: dict[str | None,str] = {
    os.getenv("SECRET_ADMIN"): "admin",
    os.getenv("SECRET_REGULAR"): "regular",
    os.getenv("SECRET_TRIAL"): "free_trial"
}


@router.get("/me")
def me(user: Annotated[dict[str,str], Depends(dependency=user_required)]) -> dict[str,str]:
    return user 

@router.post("/signup")
async def signup(request: SignupRequest) -> dict[str,str]: 
    role = USER_DB.get(request.secret)
    if not role:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail={"title": "SignUp Error!", 
                                                                              "reason": "Secret Password is Incorrect"})

    if user_exists(request.username):
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail={"title": "SignUp Error!", 
                                                                          "reason": "User Already Exists"})

    if len(request.password.encode("utf-8")) > 72:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail={"title": "SignUp Error!", 
                                                                             "reason": "Password too long (max 72 chars)"})

    err, new_user = create_user(request.username, request.password, role)
    
    if (err != True):
        print(new_user)
        token: str = create_access_token(payload=cast(dict[str,str], new_user))

        return {"username": request.username,
                "role": role,
                "access_token": token}

    raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail={"title": "Server Error", 
                                                                                   "reason": "Something went wrong when saving the user..."})

@router.post("/login")
async def login(request: LoginRequest) -> dict[str, str | Any | None]:
    try: 
        user = verify_user(request.username, request.password)
        username = user.get("username")
        role = user.get("role")

        old_user = {"username": username, "role": role}
        token: str = create_access_token(payload=cast(dict[str,str], old_user))

        return {"username": username,
                "role": role,
                "access_token": token}

    except Exception as e: 
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail={"title": "Login Error!", 
                                                                          "reason": e})
