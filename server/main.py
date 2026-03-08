from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers import auth, ai, db, root
from dotenv import load_dotenv

_ = load_dotenv()


app: FastAPI = FastAPI(title="Adaptive Quiz Generator API")

# IMPORTANT: Enable CORS so your React app can talk to this server
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # For production, replace with your specific React URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(root.router)
app.include_router(auth.router)
app.include_router(ai.router)
app.include_router(db.router)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)

