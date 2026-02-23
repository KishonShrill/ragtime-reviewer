from fastapi import HTTPException, status
from argon2 import PasswordHasher
from argon2.exceptions import *


hasher = PasswordHasher()
# --- Helpers ---
def hash_password(password: str) -> str:
    return hasher.hash(password)

def verify_password(hashed: str, password: str) -> bool:
    try:
        is_verified = hasher.verify(hashed, password)
        return is_verified
    except VerifyMismatchError:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Password does not match")
    except UnsupportedParametersError: 
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Current platform does not support the parameters")
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"{e}")
