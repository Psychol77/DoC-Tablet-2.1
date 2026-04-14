import os
import logging
from datetime import datetime, timezone, timedelta
from fastapi import FastAPI, APIRouter, HTTPException, Request, Response
from starlette.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import bcrypt
import jwt
from supabase import create_client, Client

# Konfiguracja Supabase
SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_KEY")
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

# Konfiguracja JWT
JWT_ALGORITHM = "HS256"
JWT_SECRET = os.environ.get("JWT_SECRET", "twoj-sekretny-klucz-doc")

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI()

# CORS - KLUCZOWE DLA RENDERA
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # W produkcji podaj dokładny URL frontendu
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

api_router = APIRouter(prefix="/api")

class UserLogin(BaseModel):
    email: str
    password: str

class EquipmentAssignment(BaseModel):
    name: str
    serial_number: str

# --- POMOCNICY ---
def get_user_from_token(request: Request):
    token = request.cookies.get("access_token")
    if not token:
        raise HTTPException(status_code=401, detail="Brak tokena")
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        return payload
    except:
        raise HTTPException(status_code=401, detail="Sesja wygasła")

# --- AUTH ---
@api_router.post("/auth/login")
async def login(data: UserLogin, response: Response):
    email = data.email.lower().strip()
    res = supabase.table("users").select("*").eq("email", email).execute()
    
    if not res.data:
        raise HTTPException(status_code=401, detail="Nieprawidłowy email lub hasło")
    
    user = res.data[0]
    # Weryfikacja password_hash z bazy
    stored_hash = user.get("password_hash", "")
    
    try:
        valid = bcrypt.checkpw(data.password.encode('utf-8'), stored_hash.encode('utf-8'))
    except:
        valid = (data.password == stored_hash)

    if not valid:
        raise HTTPException(status_code=401, detail="Nieprawidłowy email lub hasło")

    token = jwt.encode({
        "sub": str(user["id"]),
        "role": user.get("role", "employee"),
        "exp": datetime.now(timezone.utc) + timedelta(hours=8)
    }, JWT_SECRET, algorithm=JWT_ALGORITHM)

    # Ustawienie ciasteczka - SameSite=None i Secure=True są wymagane na Renderze
    response.set_cookie(
        key="access_token",
        value=token,
        httponly=True,
        secure=True, 
        samesite="none",
        max_age=28800,
        path="/"
    )
    
    return {"id": user["id"], "email": user["email"], "role": user.get("role", "employee")}

# --- WYPOSAŻENIE (Naprawia image_36d1c0.png) ---
@api_router.get("/equipment/my")
async def get_my_equipment(request: Request):
    user = get_user_from_token(request)
    res = supabase.table("equipment").select("*").eq("assigned_to", user["sub"]).execute()
    return res.data

@api_router.post("/equipment/assign")
async def assign_equipment(data: EquipmentAssignment, request: Request):
    user = get_user_from_token(request)
    new_item = {
        "name": data.name,
        "serial_number": data.serial_number,
        "assigned_to": user["sub"],
        "status": "Aktywny"
    }
    res = supabase.table("equipment").insert(new_item).execute()
    return res.data

# --- PERSONEL (Naprawia image_2c681d.png) ---
@api_router.get("/users")
async def get_users(request: Request):
    get_user_from_token(request) # Wymaga zalogowania
    res = supabase.table("users").select("*").execute()
    return res.data

@api_router.get("/users/{user_id}/profile")
async def get_profile(user_id: str, request: Request):
    get_user_from_token(request)
    res = supabase.table("users").select("*").eq("id", user_id).execute()
    if not res.data:
        raise HTTPException(status_code=404)
    return res.data[0]

@api_router.post("/auth/logout")
async def logout(response: Response):
    response.delete_cookie(key="access_token", path="/", samesite="none", secure=True)
    return {"message": "Wylogowano"}

app.include_router(api_router)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=int(os.environ.get("PORT", 10000)))
