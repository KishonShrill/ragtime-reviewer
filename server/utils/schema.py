from datetime import date
from pydantic import BaseModel


# Website Requests
class LoginRequest(BaseModel):
    username: str
    password: str

class SignupRequest(BaseModel):
    username: str
    password: str
    secret: str

class User(BaseModel):
    username: str
    password: str
    role: str


# Data Models
class QuestionRequest(BaseModel):
    subtopic: str
    difficulty: str
    bloom_taxonomy: str

class QuestionResponse(BaseModel):
    id: str
    question: str
    answer: str
    bloom_taxonomy: str
    difficulty: str
    subtopic: str

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

class Subtopic(BaseModel):
    subtopic: dict[str, SubtopicKnowledgeScore]

class LearnerProfile(BaseModel):
    username: str
    knowledge_scores: Subtopic

