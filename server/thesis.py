from fastapi import FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
import os

app = FastAPI(title="Adaptive Quiz Generator API")

# IMPORTANT: Enable CORS so your React app can talk to this server
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # For production, replace with your specific React URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Define the request body to match your React 'fetch' call
class LoginRequest(BaseModel):
    username: str
    password: str
    secret: str
    salt: str

# Mock database of users and passwords for testing
# In your thesis project, these would be in MongoDB
USER_DB = {
    "admin123": "admin",
    "regular123": "regular",
    "trial123": "free_trial"
}

# The specific secret you personally created
MY_PERSONAL_SALT = "l49dVcs3GoKDZCRw60KBqpgOlkXsihoct54C35k02VE="

# --- GLOBAL MODEL LOADING ---
# We load it here again or import it if running as a script.
# For Colab specifically, it's often easier to rely on the global variables
# if running strictly inside the notebook, but for a true backend,
# we should load it within the app context or use a lifespan handler.
# For simplicity in this demo, we assume the model is loaded in the global scope
# of the notebook, but to run "uvicorn app:app", we need to load it inside.

class GenerateRequest(BaseModel):
    prompt: str
    max_tokens: int = 512
    temperature: float = 0.7

@app.get("/")
def read_root():
    return {"status": "Online", "model": "Llama-3-8B-Instruct-4bit"}

@app.post("/auth/login")
async def login(request: LoginRequest):
    # 1. Check the secret first
    if request.salt != MY_PERSONAL_SALT:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid Master Secret"
        )
    
    # 2. Check the password against our mock user logic
    role = USER_DB.get(request.secret)
    
    if not role:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect Secret"
        )

    # 3. Return the JWT (mocked for now) and the role
    # Your React app expects 'access_token' and 'role'
    return {
        "access_token": f"mock_jwt_token_for_{request.username}",
        "token_type": "bearer",
        "role": role,
        "username": request.username
    }

@app.post("/retry")
async def retry_question(question_data: dict):
    # This is where your adaptive logic for the thesis would go
    print(f"Logging retry for: {question_data.get('question')}")
    return {"status": "logged"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
