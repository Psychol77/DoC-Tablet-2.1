import os
import logging
from typing import List, Optional
from datetime import datetime, timezone, timedelta
from pathlib import Path

# Load env variables
from dotenv import load_dotenv
ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

from fastapi import FastAPI, APIRouter, HTTPException, Request, Response, Depends
from starlette.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import bcrypt
import jwt
from supabase import create_client, Client

# Supabase Connection
SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_KEY")
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

# JWT Configuration
JWT_ALGORITHM = "HS256"
JWT_SECRET = os.environ.get("JWT_SECRET", "twoj-sekretny-klucz-doc")

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI()

# CORS - Pozwala frontendowi na Renderze łączyć się z tym serwerem
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

api_router = APIRouter(prefix="/api")

# ==================== MODELE ====================
class UserLogin(BaseModel):
    email: str
    password: str

# ==================== POMOCNICY ====================
def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Sprawdza hasło przy użyciu bcrypt, z fallbackiem na zwykły tekst."""
    try:
        # Próba weryfikacji bcrypt
        return bcrypt.checkpw(plain_password.encode("utf-8"), hashed_password.encode("utf-8"))
    except Exception:
        # Jeśli hasło w bazie nie jest haszem bcrypt (zwykły tekst), porównaj bezpośrednio
        return plain_password == hashed_password

def create_access_token(user_id: str, email: str):
    payload = {
        "sub": user_id,
        "email": email,
        "exp": datetime.now(timezone.utc) + timedelta(hours=2),
        "type": "access"
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

# ==================== ENDPOINTY AUTH ====================

@api_router.post("/auth/login")
async def login(data: UserLogin, response: Response):
    email = data.email.lower().strip()
    
    # Szukanie użytkownika w Supabase
    res = supabase.table("users").select("*").eq("email", email).execute()
    
    if not res.data:
        logger.warning(f"Próba logowania na nieistniejący e-mail: {email}")
        raise HTTPException(status_code=401, detail="Nieprawidłowy email lub hasło")
    
    user = res.data[0]
    
    # POPRAWKA: Pobieramy 'password_hash' zamiast 'password'
    stored_password = user.get("password_hash") or user.get("password", "")
    
    if not verify_password(data.password, stored_password):
        logger.warning(f"Błędne hasło dla użytkownika: {email}")
        raise HTTPException(status_code=401, detail="Nieprawidłowy email lub hasło")
    
    user_id = str(user["id"])
    token = create_access_token(user_id, email)
    
    # Ustawienie ciasteczka (Secure=True i SameSite=None dla Rendera)
    response.set_cookie(
        key="access_token", 
        value=token, 
        httponly=True, 
        secure=True, 
        samesite="none", 
        max_age=7200, 
        path="/"
    )
    
    logger.info(f"Użytkownik {email} zalogowany pomyślnie.")
    
    return {
        "id": user_id,
        "email": user["email"],
        "firstName": user.get("first_name", ""),
        "lastName": user.get("last_name", ""),
        "badgeNumber": user.get("badge_number", ""),
        "role": user.get("role", "employee")
    }

@api_router.get("/auth/me")
async def get_me(request: Request):
    token = request.cookies.get("access_token")
    if not token:
        raise HTTPException(status_code=401, detail="Nie zalogowano")
    
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        res = supabase.table("users").select("*").eq("id", payload["sub"]).execute()
        if not res.data:
            raise HTTPException(status_code=401, detail="Użytkownik nie istnieje")
        
        user = res.data[0]
        return {
            "id": user["id"],
            "email": user["email"],
            "firstName": user.get("first_name", ""),
            "lastName": user.get("last_name", ""),
            "role": user.get("role", "employee")
        }
    except Exception:
        raise HTTPException(status_code=401, detail="Sesja wygasła")

@api_router.post("/auth/logout")
async def logout(response: Response):
    response.delete_cookie(key="access_token", path="/", samesite="none", secure=True)
    return {"message": "Wylogowano"}

app.include_router(api_router)

if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 10000))
    uvicorn.run(app, host="0.0.0.0", port=port)
