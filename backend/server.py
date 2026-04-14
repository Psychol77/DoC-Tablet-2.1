import os
import logging
from typing import List, Optional
from datetime import datetime, timezone, timedelta
from pathlib import Path

from dotenv import load_dotenv
ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

from fastapi import FastAPI, APIRouter, HTTPException, Request, Response
from starlette.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import bcrypt
import jwt
from supabase import create_client, Client

# Połączenie z Supabase
SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_KEY")
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

JWT_ALGORITHM = "HS256"
JWT_SECRET = os.environ.get("JWT_SECRET", "twoj-sekretny-klucz-doc")

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI()

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

class EquipmentAssignment(BaseModel):
    name: str
    serial_number: str

# ==================== POMOCNICY ====================
def verify_password(plain_password: str, hashed_password: str) -> bool:
    try:
        return bcrypt.checkpw(plain_password.encode("utf-8"), hashed_password.encode("utf-8"))
    except:
        return plain_password == hashed_password

def create_access_token(user_id: str, email: str, role: str):
    payload = {
        "sub": user_id,
        "email": email,
        "role": role,
        "exp": datetime.now(timezone.utc) + timedelta(hours=8),
        "type": "access"
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

# ==================== AUTH ====================

@api_router.post("/auth/login")
async def login(data: UserLogin, response: Response):
    email = data.email.lower().strip()
    res = supabase.table("users").select("*").eq("email", email).execute()
    
    if not res.data:
        raise HTTPException(status_code=401, detail="Nieprawidłowe dane")
    
    user = res.data[0]
    # Używamy password_hash z Twojej bazy
    if not verify_password(data.password, user.get("password_hash", "")):
        raise HTTPException(status_code=401, detail="Nieprawidłowe dane")
    
    user_role = user.get("role", "employee")
    token = create_access_token(str(user["id"]), email, user_role)
    
    response.set_cookie(
        key="access_token",
        value=token,
        httponly=True,
        secure=True,
        samesite="none",
        max_age=28800,
        path="/"
    )
    
    return {
        "id": user["id"],
        "email": user["email"],
        "firstName": user.get("first_name", ""),
        "lastName": user.get("last_name", ""),
        "role": user_role
    }

@api_router.get("/auth/me")
async def get_me(request: Request):
    token = request.cookies.get("access_token")
    if not token: raise HTTPException(status_code=401)
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        res = supabase.table("users").select("*").eq("id", payload["sub"]).execute()
        user = res.data[0]
        return {**user, "role": user.get("role", "employee")}
    except: raise HTTPException(status_code=401)

# ==================== WYPOSAŻENIE (LISTA I DODAWANIE) ====================

@api_router.get("/equipment/my")
async def get_my_equipment(request: Request):
    """Pobiera listę sprzętu zalogowanego użytkownika"""
    token = request.cookies.get("access_token")
    if not token: raise HTTPException(status_code=401)
    
    payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
    # Pobieramy sprzęt przypisany do Twojego ID (np. 1234)
    res = supabase.table("equipment").select("*").eq("assigned_to", payload["sub"]).execute()
    return res.data

@api_router.post("/equipment/assign")
async def assign_equipment(data: EquipmentAssignment, request: Request):
    """Obsługuje formularz wydania sprzętu"""
    token = request.cookies.get("access_token")
    if not token: raise HTTPException(status_code=401)
    
    payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
    
    new_item = {
        "name": data.name,
        "serial_number": data.serial_number,
        "assigned_to": payload["sub"],
        "status": "Aktywny",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    res = supabase.table("equipment").insert(new_item).execute()
    return res.data

# ==================== PERSONEL ====================

@api_router.get("/users")
async def get_all_users():
    """Pobiera listę wszystkich pracowników"""
    res = supabase.table("users").select("id, first_name, last_name, rank, badge_number, position, role").execute()
    return res.data

@api_router.get("/users/{user_id}/profile")
async def get_user_profile(user_id: str):
    """Pobiera dane do zakładki 'Mój profil'"""
    res = supabase.table("users").select("*").eq("id", user_id).execute()
    if not res.data: raise HTTPException(status_code=404)
    return res.data[0]

app.include_router(api_router)

if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 10000))
    uvicorn.run(app, host="0.0.0.0", port=port)
