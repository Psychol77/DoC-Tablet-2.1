import os
import logging
import uuid
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

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

api_router = APIRouter(prefix="/api")

# ==================== RANK/POSITION HELPERS ====================

BOARD_RANKS = ["Warden", "D. Warden", "AoW"]
COMMAND_RANKS = ["Captain", "Lieutenant"]
OFFICER_RANKS = ["Sergeant", "PO III", "PO II", "PO I", "Kadet"]

def can_edit_profiles(rank: str, role: str) -> bool:
    if role in ("founder", "admin"):
        return True
    return rank in BOARD_RANKS or rank in COMMAND_RANKS

def is_officer_rank(rank: str) -> bool:
    return rank in OFFICER_RANKS or rank == "Sergeant"

def normalize_role(role: str) -> str:
    """Map DB role to frontend role."""
    if role == "admin":
        return "founder"
    return role or "employee"

def format_user(user: dict) -> dict:
    """Format a Supabase user row into the shape the frontend expects."""
    rank = user.get("rank", "")
    role = normalize_role(user.get("role", "employee"))
    return {
        "id": str(user["id"]),
        "email": user.get("email", ""),
        "firstName": user.get("first_name", ""),
        "lastName": user.get("last_name", ""),
        "badgeNumber": user.get("badge_number", ""),
        "position": rank,
        "role": role,
        "canEditProfiles": can_edit_profiles(rank, role),
        "isOfficerRank": is_officer_rank(rank),
        "meritBars": user.get("merits") or [],
        "trainings": user.get("trainings") or {},
        "notes": user.get("notes", ""),
    }

# ==================== MODELS ====================

class UserLogin(BaseModel):
    email: str
    password: str

class UserCreate(BaseModel):
    email: str
    password: str
    firstName: str
    lastName: str
    badgeNumber: str
    position: Optional[str] = ""
    role: Optional[str] = "employee"

class UserUpdate(BaseModel):
    meritBars: Optional[list] = None
    trainings: Optional[dict] = None
    badgeNumber: Optional[str] = None
    position: Optional[str] = None
    notes: Optional[str] = None

class AssetCreate(BaseModel):
    name: str
    serialNumber: str
    category: Optional[str] = "Inne"
    status: Optional[str] = "Dostępny"

class AssetUpdate(BaseModel):
    name: Optional[str] = None
    serialNumber: Optional[str] = None
    category: Optional[str] = None
    status: Optional[str] = None

# ==================== AUTH HELPERS ====================

def verify_password(plain_password: str, hashed_password: str) -> bool:
    try:
        return bcrypt.checkpw(plain_password.encode("utf-8"), hashed_password.encode("utf-8"))
    except Exception:
        return plain_password == hashed_password

def create_access_token(user_id: str, email: str):
    payload = {
        "sub": user_id,
        "email": email,
        "exp": datetime.now(timezone.utc) + timedelta(hours=2),
        "type": "access"
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

def create_refresh_token(user_id: str, email: str):
    payload = {
        "sub": user_id,
        "email": email,
        "exp": datetime.now(timezone.utc) + timedelta(days=7),
        "type": "refresh"
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

def get_current_user(request: Request) -> dict:
    """Extract current user from JWT cookie."""
    token = request.cookies.get("access_token")
    if not token:
        raise HTTPException(status_code=401, detail="Nie zalogowano")
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Sesja wygasła")
    except Exception:
        raise HTTPException(status_code=401, detail="Nieprawidłowy token")

def write_audit_log(user_id: str, user_name: str, action: str, entity_type: str, details: str):
    """Try to write audit log, silently fail if table doesn't exist."""
    try:
        supabase.table("audit_logs").insert({
            "user_id": user_id,
            "user_name": user_name,
            "action": action,
            "entity_type": entity_type,
            "details": details,
            "created_at": datetime.now(timezone.utc).isoformat()
        }).execute()
    except Exception as e:
        logger.warning(f"Audit log write failed (table may not exist): {e}")

# ==================== AUTH ENDPOINTS ====================

@api_router.post("/auth/login")
async def login(data: UserLogin, response: Response):
    email = data.email.lower().strip()
    res = supabase.table("users").select("*").eq("email", email).execute()

    if not res.data:
        logger.warning(f"Próba logowania na nieistniejący e-mail: {email}")
        raise HTTPException(status_code=401, detail="Nieprawidłowy email lub hasło")

    user = res.data[0]
    stored_password = user.get("password_hash") or user.get("password", "")

    if not verify_password(data.password, stored_password):
        logger.warning(f"Błędne hasło dla użytkownika: {email}")
        raise HTTPException(status_code=401, detail="Nieprawidłowy email lub hasło")

    user_id = str(user["id"])
    token = create_access_token(user_id, email)
    refresh = create_refresh_token(user_id, email)

    response.set_cookie(
        key="access_token", value=token,
        httponly=True, secure=True, samesite="none",
        max_age=7200, path="/"
    )
    response.set_cookie(
        key="refresh_token", value=refresh,
        httponly=True, secure=True, samesite="none",
        max_age=604800, path="/"
    )

    logger.info(f"Użytkownik {email} zalogowany pomyślnie.")
    return format_user(user)

@api_router.get("/auth/me")
async def get_me(request: Request):
    payload = get_current_user(request)
    res = supabase.table("users").select("*").eq("id", payload["sub"]).execute()
    if not res.data:
        raise HTTPException(status_code=401, detail="Użytkownik nie istnieje")
    return format_user(res.data[0])

@api_router.post("/auth/refresh")
async def refresh_token(request: Request, response: Response):
    token = request.cookies.get("refresh_token")
    if not token:
        raise HTTPException(status_code=401, detail="Brak refresh tokena")
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        if payload.get("type") != "refresh":
            raise HTTPException(status_code=401, detail="Nieprawidłowy token")

        new_access = create_access_token(payload["sub"], payload["email"])
        response.set_cookie(
            key="access_token", value=new_access,
            httponly=True, secure=True, samesite="none",
            max_age=7200, path="/"
        )
        return {"message": "Token odświeżony"}
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Refresh token wygasł")
    except Exception:
        raise HTTPException(status_code=401, detail="Nieprawidłowy refresh token")

@api_router.post("/auth/logout")
async def logout(response: Response):
    response.delete_cookie(key="access_token", path="/", samesite="none", secure=True)
    response.delete_cookie(key="refresh_token", path="/", samesite="none", secure=True)
    return {"message": "Wylogowano"}

# ==================== USERS ENDPOINTS ====================

@api_router.get("/users/public")
async def get_users_public(request: Request):
    get_current_user(request)
    res = supabase.table("users").select("id,first_name,last_name,rank,badge_number,role,email").execute()
    users = []
    for u in res.data:
        users.append({
            "id": str(u["id"]),
            "firstName": u.get("first_name", ""),
            "lastName": u.get("last_name", ""),
            "position": u.get("rank", ""),
            "badgeNumber": u.get("badge_number", ""),
            "role": normalize_role(u.get("role", "employee")),
            "email": u.get("email", ""),
        })
    return users

@api_router.get("/users/{user_id}")
async def get_user(user_id: str, request: Request):
    get_current_user(request)
    res = supabase.table("users").select("*").eq("id", user_id).execute()
    if not res.data:
        raise HTTPException(status_code=404, detail="Użytkownik nie znaleziony")
    return format_user(res.data[0])

@api_router.post("/users")
async def create_user(data: UserCreate, request: Request):
    current = get_current_user(request)

    # Check if email already exists
    existing = supabase.table("users").select("id").eq("email", data.email.lower().strip()).execute()
    if existing.data:
        raise HTTPException(status_code=400, detail="Użytkownik z tym emailem już istnieje")

    # Hash password
    hashed = bcrypt.hashpw(data.password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")

    # Generate unique ID
    new_id = str(uuid.uuid4())[:8]

    new_user = {
        "id": new_id,
        "email": data.email.lower().strip(),
        "password_hash": hashed,
        "first_name": data.firstName,
        "last_name": data.lastName,
        "badge_number": data.badgeNumber,
        "rank": data.position,
        "role": data.role or "employee",
        "merits": [],
        "trainings": [],
        "notes": None,
    }

    res = supabase.table("users").insert(new_user).execute()

    # Audit log
    write_audit_log(
        current["sub"],
        current.get("email", ""),
        "CREATE", "USER",
        f"Utworzono użytkownika: {data.firstName} {data.lastName} ({data.email})"
    )

    if res.data:
        return format_user(res.data[0])
    return {"message": "Użytkownik utworzony"}

@api_router.put("/users/{user_id}")
async def update_user(user_id: str, data: UserUpdate, request: Request):
    current = get_current_user(request)

    update_data = {}
    if data.meritBars is not None:
        update_data["merits"] = data.meritBars
    if data.trainings is not None:
        # Convert dict to the format stored in DB
        update_data["trainings"] = data.trainings
    if data.badgeNumber is not None:
        update_data["badge_number"] = data.badgeNumber
    if data.position is not None:
        update_data["rank"] = data.position
    if data.notes is not None:
        update_data["notes"] = data.notes

    if not update_data:
        raise HTTPException(status_code=400, detail="Brak danych do aktualizacji")

    res = supabase.table("users").update(update_data).eq("id", user_id).execute()

    write_audit_log(
        current["sub"],
        current.get("email", ""),
        "UPDATE", "USER",
        f"Zaktualizowano profil użytkownika ID: {user_id}"
    )

    if res.data:
        return format_user(res.data[0])
    return {"message": "Zaktualizowano"}

@api_router.delete("/users/{user_id}")
async def delete_user(user_id: str, request: Request):
    current = get_current_user(request)

    # Get user info for audit
    user_res = supabase.table("users").select("first_name,last_name,email").eq("id", user_id).execute()
    user_name = ""
    if user_res.data:
        u = user_res.data[0]
        user_name = f"{u.get('first_name', '')} {u.get('last_name', '')}"

    # Delete user's assignments first
    supabase.table("assignments").delete().eq("user_id", user_id).execute()

    # Delete user
    supabase.table("users").delete().eq("id", user_id).execute()

    write_audit_log(
        current["sub"],
        current.get("email", ""),
        "DELETE", "USER",
        f"Usunięto użytkownika: {user_name}"
    )

    return {"message": "Użytkownik usunięty"}

# ==================== ASSETS ENDPOINTS ====================

def enrich_assets(assets: list) -> list:
    """Add assignedTo, assignedToName, createdBy to assets from assignments+users."""
    if not assets:
        return []

    asset_ids = [a["id"] for a in assets]

    # Get all assignments for these assets
    assignments_res = supabase.table("assignments").select("*").in_("asset_id", asset_ids).execute()
    assignments = assignments_res.data or []

    # Build mapping: asset_id -> user_id (first assignment = creator)
    asset_to_user = {}
    for a in assignments:
        aid = a["asset_id"]
        if aid not in asset_to_user:
            asset_to_user[aid] = a["user_id"]

    # Get unique user IDs
    user_ids = list(set(asset_to_user.values()))
    user_map = {}
    if user_ids:
        users_res = supabase.table("users").select("id,first_name,last_name,badge_number").in_("id", user_ids).execute()
        for u in (users_res.data or []):
            uid = str(u["id"])
            user_map[uid] = f"[{u.get('badge_number', '??')}] {u.get('first_name', '')} {u.get('last_name', '')}"

    # Enrich assets
    enriched = []
    for asset in assets:
        aid = asset["id"]
        user_id = asset_to_user.get(aid)
        enriched.append({
            "id": aid,
            "name": asset.get("name", ""),
            "serialNumber": asset.get("serial_number", ""),
            "category": asset.get("category", "Inne"),
            "status": asset.get("status", "Dostępny"),
            "assignedTo": str(user_id) if user_id else None,
            "assignedToName": user_map.get(str(user_id), "") if user_id else None,
            "createdBy": str(user_id) if user_id else None,
        })
    return enriched

@api_router.get("/assets")
async def get_assets(request: Request):
    get_current_user(request)
    res = supabase.table("assets").select("*").execute()
    return enrich_assets(res.data or [])

@api_router.post("/assets/my-equipment")
async def add_my_equipment(data: AssetCreate, request: Request):
    current = get_current_user(request)
    user_id = current["sub"]

    # Create asset
    asset_data = {
        "name": data.name,
        "serial_number": data.serialNumber,
        "category": data.category or "Inne",
        "status": "W użyciu",
    }
    asset_res = supabase.table("assets").insert(asset_data).execute()

    if not asset_res.data:
        raise HTTPException(status_code=500, detail="Błąd tworzenia sprzętu")

    new_asset = asset_res.data[0]

    # Create assignment
    assignment_data = {
        "user_id": user_id,
        "asset_id": new_asset["id"],
        "assigned_at": datetime.now(timezone.utc).isoformat(),
    }
    supabase.table("assignments").insert(assignment_data).execute()

    # Audit log
    write_audit_log(
        user_id,
        current.get("email", ""),
        "CREATE", "ASSET",
        f"Pobrał sprzęt: {data.name} (S/N: {data.serialNumber})"
    )

    # Return enriched asset
    enriched = enrich_assets([new_asset])
    return enriched[0] if enriched else new_asset

@api_router.put("/assets/{asset_id}")
async def update_asset(asset_id: int, data: AssetUpdate, request: Request):
    current = get_current_user(request)

    update_data = {}
    if data.name is not None:
        update_data["name"] = data.name
    if data.serialNumber is not None:
        update_data["serial_number"] = data.serialNumber
    if data.category is not None:
        update_data["category"] = data.category
    if data.status is not None:
        update_data["status"] = data.status

    if not update_data:
        raise HTTPException(status_code=400, detail="Brak danych do aktualizacji")

    res = supabase.table("assets").update(update_data).eq("id", asset_id).execute()

    action_detail = f"Zaktualizowano sprzęt ID: {asset_id}"
    if data.status == "Zutylizowany":
        action_detail = f"Zutylizowano sprzęt: {data.name or ''} (ID: {asset_id})"

    write_audit_log(
        current["sub"],
        current.get("email", ""),
        "UPDATE", "ASSET",
        action_detail
    )

    if res.data:
        enriched = enrich_assets(res.data)
        return enriched[0] if enriched else res.data[0]
    return {"message": "Zaktualizowano"}

@api_router.delete("/assets/{asset_id}")
async def delete_asset(asset_id: int, request: Request):
    current = get_current_user(request)

    # Delete assignments first
    supabase.table("assignments").delete().eq("asset_id", asset_id).execute()
    # Delete asset
    supabase.table("assets").delete().eq("id", asset_id).execute()

    write_audit_log(
        current["sub"],
        current.get("email", ""),
        "DELETE", "ASSET",
        f"Usunięto sprzęt ID: {asset_id}"
    )

    return {"message": "Sprzęt usunięty"}

# ==================== ASSIGNMENTS ENDPOINTS ====================

@api_router.get("/assignments/user/{user_id}")
async def get_user_assignments(user_id: str, request: Request):
    get_current_user(request)

    assign_res = supabase.table("assignments").select("*").eq("user_id", user_id).execute()
    assignments = assign_res.data or []

    if not assignments:
        return []

    # Get asset details
    asset_ids = [a["asset_id"] for a in assignments]
    assets_res = supabase.table("assets").select("*").in_("id", asset_ids).execute()
    asset_map = {a["id"]: a for a in (assets_res.data or [])}

    result = []
    for a in assignments:
        asset = asset_map.get(a["asset_id"], {})
        result.append({
            "id": a["id"],
            "userId": a["user_id"],
            "assetId": a["asset_id"],
            "assetName": asset.get("name", "Nieznany"),
            "assetSerialNumber": asset.get("serial_number", ""),
            "assignedAt": a.get("assigned_at", ""),
        })
    return result

# ==================== AUDIT LOG ENDPOINTS ====================

@api_router.get("/audit-logs")
async def get_audit_logs(request: Request):
    get_current_user(request)
    try:
        res = supabase.table("audit_logs").select("*").order("created_at", desc=True).limit(100).execute()
        logs = []
        for log in (res.data or []):
            logs.append({
                "id": log.get("id"),
                "action": log.get("action", ""),
                "entityType": log.get("entity_type", ""),
                "userName": log.get("user_name", ""),
                "details": log.get("details", ""),
                "createdAt": log.get("created_at", ""),
            })
        return logs
    except Exception as e:
        logger.warning(f"Audit logs fetch failed (table may not exist): {e}")
        return []

# ==================== STATS ENDPOINT ====================

@api_router.get("/stats")
async def get_stats(request: Request):
    get_current_user(request)

    users_res = supabase.table("users").select("id", count="exact").execute()
    assets_res = supabase.table("assets").select("id", count="exact").execute()
    assignments_res = supabase.table("assignments").select("id", count="exact").execute()

    return {
        "totalUsers": users_res.count or len(users_res.data or []),
        "totalAssets": assets_res.count or len(assets_res.data or []),
        "totalAssignments": assignments_res.count or len(assignments_res.data or []),
    }

# ==================== INCLUDE ROUTER ====================

app.include_router(api_router)

if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 10000))
    uvicorn.run(app, host="0.0.0.0", port=port)
