from fastapi import APIRouter, Depends, HTTPException, status
from utils.db import create_user, user_exists, verify_user 
from utils.token import user_required, create_access_token
from utils.schema import SignupRequest, LoginRequest, User, Subtopics
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
async def signup(request: SignupRequest) -> User: 
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

    err, new_user = create_user(
            username=request.username, 
            email=request.email, 
            password=request.password, 
            role=role
    )
    
    if (err != True):
        print(f"\nNew User: {new_user}")
        token: str = create_access_token(payload=new_user)

        return User(
            username = request.username,
            email = request.email,
            role = role,
            knowledge_scores = new_user.knowledge_scores,
            access_token = token
        )

    raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail={"title": "Server Error", 
                                                                                   "reason": "Something went wrong when saving the user..."})

@router.post("/login")
async def login(request: LoginRequest) -> User:
    user = verify_user(request.username, request.password)
    email: str = user.get("email")
    role: str = user.get("role")
    knowledge_scores: dict[str, Any]  = user.get("knowledge_scores")
    print(f"Email: {email}")
    try: 
        old_user = User( 
            username=request.username,
            email=email,
            role=role, 
            knowledge_scores=Subtopics(subtopic=knowledge_scores),
            access_token=''
        )
        token: str = create_access_token(payload=old_user)

        return User(
            username=request.username,
            email=email,
            role=role,
            knowledge_scores=Subtopics(subtopic=knowledge_scores),
            access_token=token
        )

    except Exception as e:
        print(e)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail={"title": "Login Error!", 
                                                                                       "reason": "Something went wrong when logging in..."})
