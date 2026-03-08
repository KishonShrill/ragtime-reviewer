from datetime import date
from typing import TypedDict, Optional
from pydantic import BaseModel
from dataclasses import dataclass


# Website Requests
class LoginRequest(BaseModel):
    username: str
    password: str

class SignupRequest(BaseModel):
    username: str
    password: str
    secret: str

# Data Models
class LogicEngineResponse(BaseModel):
    subtopic: str
    difficulty: str
    bloom_taxonomy: str

class QuestionResponse(TypedDict):
    question_id: str
    question: str
    answer: str
    bloom_taxonomy: str
    difficulty: str
    subtopic: str
    image: Optional[str] # Add this line! Allows a string or None.

class QuestionLog(BaseModel):
    original: str
    augmented: str

class Logs(BaseModel):
    username: str
    question: QuestionLog
    topic: str
    bloom_level: str
    result: str
    timestamp: date


# Profile Queries
class SubtopicKnowledgeScore(BaseModel):
    mastery_score: float # 0.0 to 1.0
    rank: str # difficulty
    weak_concepts: list[str]

class Subtopics(BaseModel):
    subtopic: dict[str, SubtopicKnowledgeScore]

class QuestionRequest(BaseModel):
    scores: dict[str, SubtopicKnowledgeScore]
    subject: str

class LearnerProfile(BaseModel):
    username: str
    knowledge_scores: Subtopics

class User(BaseModel):
    username: str
    role: str
    knowledge_scores: Subtopics
    access_token: str
