from pydantic import BaseModel


class LoginRequest(BaseModel):
    username: str
    password: str
    role: str | None = None

class SignupRequest(BaseModel):
    username: str
    password: str
    secret: str

class User(BaseModel):
    username: str
    role: str
