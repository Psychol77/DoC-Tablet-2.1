from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

from fastapi import FastAPI, APIRouter, HTTPException, Request, Response, Depends
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional
from datetime import datetime, timezone, timedelta
from bson import ObjectId
import bcrypt
import jwt

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# JWT Configuration
JWT_ALGORITHM = "HS256"
JWT_SECRET = os.environ.get("JWT_SECRET", "fallback-secret-key")

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Create the main app
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# ==================== MODELS ====================

class UserCreate(BaseModel):
    email: str
    password: str
    firstName: str
    lastName: str
    badgeNumber: str
    position: str
    role: str = "employee"

class UserLogin(BaseModel):
    email: str
    password: str

class UserResponse(BaseModel):
    id: str
    email: str
    firstName: str
    lastName: str
    badgeNumber: str
    position: str
    role: str
    meritBars: List[str] = []
    trainings: dict = {}
    notes: str = ""
    promotionDate: Optional[str] = None
    createdAt: str

class AssetCreate(BaseModel):
    name: str
    serialNumber: str
    category: str = "Inne"
    status: str = "Dostępny"

class AssetResponse(BaseModel):
    id: str
    name: str
    serialNumber: str
    category: str
    status: str
    assignedTo: Optional[str] = None
    assignedToName: Optional[str] = None
    createdAt: str

class AssignmentCreate(BaseModel):
    assetId: str
    userId: str

class AssignmentResponse(BaseModel):
    id: str
    assetId: str
    userId: str
    assetName: str
    assetSerialNumber: str
    userName: str
    createdAt: str

class ProfileUpdate(BaseModel):
    meritBars: Optional[List[str]] = None
    trainings: Optional[dict] = None
    notes: Optional[str] = None
    promotionDate: Optional[str] = None

class AuditLogResponse(BaseModel):
    id: str
    action: str
    entityType: str
    entityId: str
    userId: str
    userName: str
    details: str
    createdAt: str

# ==================== HELPERS ====================

def hash_password(password: str) -> str:
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(password.encode("utf-8"), salt)
    return hashed.decode("utf-8")

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return bcrypt.checkpw(plain_password.encode("utf-8"), hashed_password.encode("utf-8"))

def get_jwt_secret() -> str:
    return JWT_SECRET

def create_access_token(user_id: str, email: str) -> str:
    payload = {
        "sub": user_id, 
        "email": email, 
        "exp": datetime.now(timezone.utc) + timedelta(minutes=60), 
        "type": "access"
    }
    return jwt.encode(payload, get_jwt_secret(), algorithm=JWT_ALGORITHM)

def create_refresh_token(user_id: str) -> str:
    payload = {
        "sub": user_id, 
        "exp": datetime.now(timezone.utc) + timedelta(days=7), 
        "type": "refresh"
    }
    return jwt.encode(payload, get_jwt_secret(), algorithm=JWT_ALGORITHM)

async def get_current_user(request: Request) -> dict:
    token = request.cookies.get("access_token")
    if not token:
        auth_header = request.headers.get("Authorization", "")
        if auth_header.startswith("Bearer "):
            token = auth_header[7:]
    if not token:
        raise HTTPException(status_code=401, detail="Nie zalogowano")
    try:
        payload = jwt.decode(token, get_jwt_secret(), algorithms=[JWT_ALGORITHM])
        if payload.get("type") != "access":
            raise HTTPException(status_code=401, detail="Nieprawidłowy typ tokenu")
        user = await db.users.find_one({"_id": ObjectId(payload["sub"])})
        if not user:
            raise HTTPException(status_code=401, detail="Użytkownik nie znaleziony")
        user["id"] = str(user["_id"])
        user.pop("_id", None)
        user.pop("password_hash", None)
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token wygasł")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Nieprawidłowy token")

async def log_audit(action: str, entity_type: str, entity_id: str, user_id: str, user_name: str, details: str):
    await db.audit_logs.insert_one({
        "action": action,
        "entityType": entity_type,
        "entityId": entity_id,
        "userId": user_id,
        "userName": user_name,
        "details": details,
        "createdAt": datetime.now(timezone.utc).isoformat()
    })

# ==================== AUTH ENDPOINTS ====================

@api_router.post("/auth/login")
async def login(data: UserLogin, response: Response):
    email = data.email.lower().strip()
    user = await db.users.find_one({"email": email})
    if not user:
        raise HTTPException(status_code=401, detail="Nieprawidłowy email lub hasło")
    if not verify_password(data.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Nieprawidłowy email lub hasło")
    
    user_id = str(user["_id"])
    access_token = create_access_token(user_id, email)
    refresh_token = create_refresh_token(user_id)
    
    response.set_cookie(key="access_token", value=access_token, httponly=True, secure=False, samesite="lax", max_age=3600, path="/")
    response.set_cookie(key="refresh_token", value=refresh_token, httponly=True, secure=False, samesite="lax", max_age=604800, path="/")
    
    return {
        "id": user_id,
        "email": user["email"],
        "firstName": user.get("firstName", ""),
        "lastName": user.get("lastName", ""),
        "badgeNumber": user.get("badgeNumber", ""),
        "position": user.get("position", ""),
        "role": user["role"],
        "meritBars": user.get("meritBars", ["", "", "", "", "", ""]),
        "trainings": user.get("trainings", {}),
        "notes": user.get("notes", ""),
        "promotionDate": user.get("promotionDate"),
        "createdAt": user.get("createdAt", "")
    }

@api_router.post("/auth/logout")
async def logout(response: Response):
    response.delete_cookie(key="access_token", path="/")
    response.delete_cookie(key="refresh_token", path="/")
    return {"message": "Wylogowano pomyślnie"}

@api_router.get("/auth/me")
async def get_me(request: Request):
    user = await get_current_user(request)
    return {
        "id": user["id"],
        "email": user["email"],
        "firstName": user.get("firstName", ""),
        "lastName": user.get("lastName", ""),
        "badgeNumber": user.get("badgeNumber", ""),
        "position": user.get("position", ""),
        "role": user["role"],
        "meritBars": user.get("meritBars", ["", "", "", "", "", ""]),
        "trainings": user.get("trainings", {}),
        "notes": user.get("notes", ""),
        "promotionDate": user.get("promotionDate"),
        "createdAt": user.get("createdAt", "")
    }

@api_router.post("/auth/refresh")
async def refresh_token(request: Request, response: Response):
    token = request.cookies.get("refresh_token")
    if not token:
        raise HTTPException(status_code=401, detail="Brak tokenu odświeżania")
    try:
        payload = jwt.decode(token, get_jwt_secret(), algorithms=[JWT_ALGORITHM])
        if payload.get("type") != "refresh":
            raise HTTPException(status_code=401, detail="Nieprawidłowy typ tokenu")
        user = await db.users.find_one({"_id": ObjectId(payload["sub"])})
        if not user:
            raise HTTPException(status_code=401, detail="Użytkownik nie znaleziony")
        
        user_id = str(user["_id"])
        access_token = create_access_token(user_id, user["email"])
        response.set_cookie(key="access_token", value=access_token, httponly=True, secure=False, samesite="lax", max_age=3600, path="/")
        
        return {"message": "Token odświeżony"}
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token wygasł")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Nieprawidłowy token")

# ==================== USER ENDPOINTS ====================

@api_router.post("/users")
async def create_user(data: UserCreate, request: Request):
    current_user = await get_current_user(request)
    if current_user["role"] != "founder":
        raise HTTPException(status_code=403, detail="Brak uprawnień")
    
    email = data.email.lower().strip()
    existing = await db.users.find_one({"email": email})
    if existing:
        raise HTTPException(status_code=400, detail="Email już istnieje")
    
    existing_badge = await db.users.find_one({"badgeNumber": data.badgeNumber})
    if existing_badge:
        raise HTTPException(status_code=400, detail="Numer odznaki już istnieje")
    
    user_doc = {
        "email": email,
        "password_hash": hash_password(data.password),
        "firstName": data.firstName,
        "lastName": data.lastName,
        "badgeNumber": data.badgeNumber,
        "position": data.position,
        "role": data.role,
        "meritBars": ["", "", "", "", "", ""],
        "trainings": {
            "OPP": False,
            "KPP": False,
            "Strzelanie": False,
            "Taktyka": False,
            "Prawo": False,
            "PierwszaPomoc": False
        },
        "notes": "",
        "promotionDate": None,
        "createdAt": datetime.now(timezone.utc).isoformat()
    }
    
    result = await db.users.insert_one(user_doc)
    user_id = str(result.inserted_id)
    
    await log_audit(
        "CREATE", "USER", user_id, 
        current_user["id"], f"{current_user['firstName']} {current_user['lastName']}",
        f"Utworzono użytkownika: {data.firstName} {data.lastName} ({data.badgeNumber})"
    )
    
    return {
        "id": user_id,
        "email": email,
        "firstName": data.firstName,
        "lastName": data.lastName,
        "badgeNumber": data.badgeNumber,
        "position": data.position,
        "role": data.role,
        "meritBars": user_doc["meritBars"],
        "trainings": user_doc["trainings"],
        "notes": "",
        "promotionDate": None,
        "createdAt": user_doc["createdAt"]
    }

@api_router.get("/users")
async def get_users(request: Request):
    await get_current_user(request)
    users = await db.users.find({}, {"password_hash": 0}).to_list(1000)
    result = []
    for user in users:
        result.append({
            "id": str(user["_id"]),
            "email": user["email"],
            "firstName": user.get("firstName", ""),
            "lastName": user.get("lastName", ""),
            "badgeNumber": user.get("badgeNumber", ""),
            "position": user.get("position", ""),
            "role": user["role"],
            "meritBars": user.get("meritBars", ["", "", "", "", "", ""]),
            "trainings": user.get("trainings", {}),
            "notes": user.get("notes", ""),
            "promotionDate": user.get("promotionDate"),
            "createdAt": user.get("createdAt", "")
        })
    return result

@api_router.get("/users/{user_id}")
async def get_user(user_id: str, request: Request):
    await get_current_user(request)
    try:
        user = await db.users.find_one({"_id": ObjectId(user_id)}, {"password_hash": 0})
    except Exception:
        raise HTTPException(status_code=400, detail="Nieprawidłowe ID")
    if not user:
        raise HTTPException(status_code=404, detail="Użytkownik nie znaleziony")
    
    return {
        "id": str(user["_id"]),
        "email": user["email"],
        "firstName": user.get("firstName", ""),
        "lastName": user.get("lastName", ""),
        "badgeNumber": user.get("badgeNumber", ""),
        "position": user.get("position", ""),
        "role": user["role"],
        "meritBars": user.get("meritBars", ["", "", "", "", "", ""]),
        "trainings": user.get("trainings", {}),
        "notes": user.get("notes", ""),
        "promotionDate": user.get("promotionDate"),
        "createdAt": user.get("createdAt", "")
    }

@api_router.put("/users/{user_id}")
async def update_user(user_id: str, data: ProfileUpdate, request: Request):
    current_user = await get_current_user(request)
    if current_user["role"] != "founder":
        raise HTTPException(status_code=403, detail="Brak uprawnień do edycji")
    
    try:
        user = await db.users.find_one({"_id": ObjectId(user_id)})
    except Exception:
        raise HTTPException(status_code=400, detail="Nieprawidłowe ID")
    if not user:
        raise HTTPException(status_code=404, detail="Użytkownik nie znaleziony")
    
    update_data = {}
    if data.meritBars is not None:
        update_data["meritBars"] = data.meritBars
    if data.trainings is not None:
        update_data["trainings"] = data.trainings
    if data.notes is not None:
        update_data["notes"] = data.notes
    if data.promotionDate is not None:
        update_data["promotionDate"] = data.promotionDate
    
    if update_data:
        await db.users.update_one({"_id": ObjectId(user_id)}, {"$set": update_data})
        await log_audit(
            "UPDATE", "USER", user_id,
            current_user["id"], f"{current_user['firstName']} {current_user['lastName']}",
            f"Zaktualizowano profil: {user['firstName']} {user['lastName']}"
        )
    
    updated_user = await db.users.find_one({"_id": ObjectId(user_id)}, {"password_hash": 0})
    return {
        "id": str(updated_user["_id"]),
        "email": updated_user["email"],
        "firstName": updated_user.get("firstName", ""),
        "lastName": updated_user.get("lastName", ""),
        "badgeNumber": updated_user.get("badgeNumber", ""),
        "position": updated_user.get("position", ""),
        "role": updated_user["role"],
        "meritBars": updated_user.get("meritBars", ["", "", "", "", "", ""]),
        "trainings": updated_user.get("trainings", {}),
        "notes": updated_user.get("notes", ""),
        "promotionDate": updated_user.get("promotionDate"),
        "createdAt": updated_user.get("createdAt", "")
    }

@api_router.delete("/users/{user_id}")
async def delete_user(user_id: str, request: Request):
    current_user = await get_current_user(request)
    if current_user["role"] != "founder":
        raise HTTPException(status_code=403, detail="Brak uprawnień")
    
    try:
        user = await db.users.find_one({"_id": ObjectId(user_id)})
    except Exception:
        raise HTTPException(status_code=400, detail="Nieprawidłowe ID")
    if not user:
        raise HTTPException(status_code=404, detail="Użytkownik nie znaleziony")
    
    # Remove assignments first
    await db.assignments.delete_many({"userId": user_id})
    await db.users.delete_one({"_id": ObjectId(user_id)})
    
    await log_audit(
        "DELETE", "USER", user_id,
        current_user["id"], f"{current_user['firstName']} {current_user['lastName']}",
        f"Usunięto użytkownika: {user['firstName']} {user['lastName']}"
    )
    
    return {"message": "Użytkownik usunięty"}

# ==================== ASSET ENDPOINTS ====================

@api_router.post("/assets")
async def create_asset(data: AssetCreate, request: Request):
    current_user = await get_current_user(request)
    if current_user["role"] != "founder":
        raise HTTPException(status_code=403, detail="Brak uprawnień")
    
    existing = await db.assets.find_one({"serialNumber": data.serialNumber})
    if existing:
        raise HTTPException(status_code=400, detail="Numer seryjny już istnieje")
    
    asset_doc = {
        "name": data.name,
        "serialNumber": data.serialNumber,
        "category": data.category,
        "status": data.status,
        "createdBy": None,  # Created by admin, no owner
        "createdAt": datetime.now(timezone.utc).isoformat()
    }
    
    result = await db.assets.insert_one(asset_doc)
    asset_id = str(result.inserted_id)
    
    await log_audit(
        "CREATE", "ASSET", asset_id,
        current_user["id"], f"{current_user['firstName']} {current_user['lastName']}",
        f"Utworzono sprzęt: {data.name} (S/N: {data.serialNumber})"
    )
    
    return {
        "id": asset_id,
        "name": data.name,
        "serialNumber": data.serialNumber,
        "category": data.category,
        "status": data.status,
        "assignedTo": None,
        "assignedToName": None,
        "createdBy": None,
        "createdAt": asset_doc["createdAt"]
    }

# Employee adds their own equipment (auto-assigned)
@api_router.post("/assets/my-equipment")
async def create_my_equipment(data: AssetCreate, request: Request):
    current_user = await get_current_user(request)
    
    # Force category to "Inne" (WYPOSAŻENIE) for employee-added equipment
    if current_user["role"] != "founder":
        data.category = "Inne"
    
    existing = await db.assets.find_one({"serialNumber": data.serialNumber})
    if existing:
        raise HTTPException(status_code=400, detail="Numer seryjny już istnieje")
    
    asset_doc = {
        "name": data.name,
        "serialNumber": data.serialNumber,
        "category": data.category,
        "status": "W użyciu",  # Auto status for personal equipment
        "createdBy": current_user["id"],  # Track who created it
        "createdAt": datetime.now(timezone.utc).isoformat()
    }
    
    result = await db.assets.insert_one(asset_doc)
    asset_id = str(result.inserted_id)
    
    # Auto-assign to the creator
    assignment_doc = {
        "assetId": asset_id,
        "userId": current_user["id"],
        "createdAt": datetime.now(timezone.utc).isoformat()
    }
    await db.assignments.insert_one(assignment_doc)
    
    await log_audit(
        "CREATE", "ASSET", asset_id,
        current_user["id"], f"{current_user['firstName']} {current_user['lastName']}",
        f"Dodano własny sprzęt: {data.name} (S/N: {data.serialNumber})"
    )
    
    return {
        "id": asset_id,
        "name": data.name,
        "serialNumber": data.serialNumber,
        "category": data.category,
        "status": "W użyciu",
        "assignedTo": current_user["id"],
        "assignedToName": f"[{current_user['badgeNumber']}] {current_user['firstName']} {current_user['lastName']}",
        "createdBy": current_user["id"],
        "createdAt": asset_doc["createdAt"]
    }

@api_router.get("/assets")
async def get_assets(request: Request):
    await get_current_user(request)
    assets = await db.assets.find({}).to_list(1000)
    result = []
    for asset in assets:
        asset_id = str(asset["_id"])
        assignment = await db.assignments.find_one({"assetId": asset_id})
        assigned_to = None
        assigned_to_name = None
        if assignment:
            assigned_to = assignment["userId"]
            user = await db.users.find_one({"_id": ObjectId(assignment["userId"])})
            if user:
                assigned_to_name = f"[{user['badgeNumber']}] {user['firstName']} {user['lastName']}"
        
        result.append({
            "id": asset_id,
            "name": asset["name"],
            "serialNumber": asset["serialNumber"],
            "category": asset.get("category", "Inne"),
            "status": asset.get("status", "Dostępny"),
            "assignedTo": assigned_to,
            "assignedToName": assigned_to_name,
            "createdBy": asset.get("createdBy"),
            "createdAt": asset.get("createdAt", "")
        })
    return result

@api_router.get("/assets/{asset_id}")
async def get_asset(asset_id: str, request: Request):
    await get_current_user(request)
    try:
        asset = await db.assets.find_one({"_id": ObjectId(asset_id)})
    except Exception:
        raise HTTPException(status_code=400, detail="Nieprawidłowe ID")
    if not asset:
        raise HTTPException(status_code=404, detail="Sprzęt nie znaleziony")
    
    assignment = await db.assignments.find_one({"assetId": asset_id})
    assigned_to = None
    assigned_to_name = None
    if assignment:
        assigned_to = assignment["userId"]
        user = await db.users.find_one({"_id": ObjectId(assignment["userId"])})
        if user:
            assigned_to_name = f"[{user['badgeNumber']}] {user['firstName']} {user['lastName']}"
    
    return {
        "id": str(asset["_id"]),
        "name": asset["name"],
        "serialNumber": asset["serialNumber"],
        "category": asset.get("category", "Inne"),
        "status": asset.get("status", "Dostępny"),
        "assignedTo": assigned_to,
        "assignedToName": assigned_to_name,
        "createdBy": asset.get("createdBy"),
        "createdAt": asset.get("createdAt", "")
    }

@api_router.put("/assets/{asset_id}")
async def update_asset(asset_id: str, data: AssetCreate, request: Request):
    current_user = await get_current_user(request)
    
    try:
        asset = await db.assets.find_one({"_id": ObjectId(asset_id)})
    except Exception:
        raise HTTPException(status_code=400, detail="Nieprawidłowe ID")
    if not asset:
        raise HTTPException(status_code=404, detail="Sprzęt nie znaleziony")
    
    # Check permissions: founder can edit all, employee can edit only their own
    if current_user["role"] != "founder":
        if asset.get("createdBy") != current_user["id"]:
            raise HTTPException(status_code=403, detail="Możesz edytować tylko swój sprzęt")
        # Force category to "Inne" for employee
        data.category = "Inne"
    
    # Check if serial number is taken by another asset
    existing = await db.assets.find_one({"serialNumber": data.serialNumber, "_id": {"$ne": ObjectId(asset_id)}})
    if existing:
        raise HTTPException(status_code=400, detail="Numer seryjny już istnieje")
    
    await db.assets.update_one({"_id": ObjectId(asset_id)}, {"$set": {
        "name": data.name,
        "serialNumber": data.serialNumber,
        "category": data.category,
        "status": data.status
    }})
    
    await log_audit(
        "UPDATE", "ASSET", asset_id,
        current_user["id"], f"{current_user['firstName']} {current_user['lastName']}",
        f"Zaktualizowano sprzęt: {data.name} (S/N: {data.serialNumber})"
    )
    
    return await get_asset(asset_id, request)

@api_router.delete("/assets/{asset_id}")
async def delete_asset(asset_id: str, request: Request):
    current_user = await get_current_user(request)
    
    try:
        asset = await db.assets.find_one({"_id": ObjectId(asset_id)})
    except Exception:
        raise HTTPException(status_code=400, detail="Nieprawidłowe ID")
    if not asset:
        raise HTTPException(status_code=404, detail="Sprzęt nie znaleziony")
    
    # Check permissions: founder can delete all, employee can delete only their own
    if current_user["role"] != "founder":
        if asset.get("createdBy") != current_user["id"]:
            raise HTTPException(status_code=403, detail="Możesz usuwać tylko swój sprzęt")
    
    # Cascade delete: remove assignments first
    await db.assignments.delete_many({"assetId": asset_id})
    await db.assets.delete_one({"_id": ObjectId(asset_id)})
    
    await log_audit(
        "DELETE", "ASSET", asset_id,
        current_user["id"], f"{current_user['firstName']} {current_user['lastName']}",
        f"Usunięto sprzęt: {asset['name']} (S/N: {asset['serialNumber']})"
    )
    
    return {"message": "Sprzęt usunięty (wraz z przypisaniami)"}

# ==================== ASSIGNMENT ENDPOINTS ====================

@api_router.post("/assignments")
async def create_assignment(data: AssignmentCreate, request: Request):
    current_user = await get_current_user(request)
    if current_user["role"] != "founder":
        raise HTTPException(status_code=403, detail="Brak uprawnień")
    
    # Validate asset exists
    try:
        asset = await db.assets.find_one({"_id": ObjectId(data.assetId)})
    except Exception:
        raise HTTPException(status_code=400, detail="Nieprawidłowe ID sprzętu")
    if not asset:
        raise HTTPException(status_code=404, detail="Sprzęt nie znaleziony")
    
    # Validate user exists
    try:
        user = await db.users.find_one({"_id": ObjectId(data.userId)})
    except Exception:
        raise HTTPException(status_code=400, detail="Nieprawidłowe ID użytkownika")
    if not user:
        raise HTTPException(status_code=404, detail="Użytkownik nie znaleziony")
    
    # Check if asset is already assigned
    existing = await db.assignments.find_one({"assetId": data.assetId})
    if existing:
        raise HTTPException(status_code=400, detail="Sprzęt jest już przypisany")
    
    assignment_doc = {
        "assetId": data.assetId,
        "userId": data.userId,
        "createdAt": datetime.now(timezone.utc).isoformat()
    }
    
    result = await db.assignments.insert_one(assignment_doc)
    assignment_id = str(result.inserted_id)
    
    await log_audit(
        "CREATE", "ASSIGNMENT", assignment_id,
        current_user["id"], f"{current_user['firstName']} {current_user['lastName']}",
        f"Przypisano sprzęt {asset['name']} do {user['firstName']} {user['lastName']}"
    )
    
    return {
        "id": assignment_id,
        "assetId": data.assetId,
        "userId": data.userId,
        "assetName": asset["name"],
        "assetSerialNumber": asset["serialNumber"],
        "userName": f"{user['firstName']} {user['lastName']}",
        "createdAt": assignment_doc["createdAt"]
    }

@api_router.get("/assignments")
async def get_assignments(request: Request):
    await get_current_user(request)
    assignments = await db.assignments.find({}).to_list(1000)
    result = []
    for assignment in assignments:
        try:
            asset = await db.assets.find_one({"_id": ObjectId(assignment["assetId"])})
            user = await db.users.find_one({"_id": ObjectId(assignment["userId"])})
        except Exception:
            continue
        if asset and user:
            result.append({
                "id": str(assignment["_id"]),
                "assetId": assignment["assetId"],
                "userId": assignment["userId"],
                "assetName": asset["name"],
                "assetSerialNumber": asset["serialNumber"],
                "userName": f"{user['firstName']} {user['lastName']}",
                "createdAt": assignment.get("createdAt", "")
            })
    return result

@api_router.get("/assignments/user/{user_id}")
async def get_user_assignments(user_id: str, request: Request):
    await get_current_user(request)
    assignments = await db.assignments.find({"userId": user_id}).to_list(1000)
    result = []
    for assignment in assignments:
        try:
            asset = await db.assets.find_one({"_id": ObjectId(assignment["assetId"])})
        except Exception:
            continue
        if asset:
            result.append({
                "id": str(assignment["_id"]),
                "assetId": assignment["assetId"],
                "assetName": asset["name"],
                "assetSerialNumber": asset["serialNumber"],
                "createdAt": assignment.get("createdAt", "")
            })
    return result

@api_router.delete("/assignments/{assignment_id}")
async def delete_assignment(assignment_id: str, request: Request):
    current_user = await get_current_user(request)
    if current_user["role"] != "founder":
        raise HTTPException(status_code=403, detail="Brak uprawnień")
    
    try:
        assignment = await db.assignments.find_one({"_id": ObjectId(assignment_id)})
    except Exception:
        raise HTTPException(status_code=400, detail="Nieprawidłowe ID")
    if not assignment:
        raise HTTPException(status_code=404, detail="Przypisanie nie znalezione")
    
    asset = await db.assets.find_one({"_id": ObjectId(assignment["assetId"])})
    user = await db.users.find_one({"_id": ObjectId(assignment["userId"])})
    
    await db.assignments.delete_one({"_id": ObjectId(assignment_id)})
    
    await log_audit(
        "DELETE", "ASSIGNMENT", assignment_id,
        current_user["id"], f"{current_user['firstName']} {current_user['lastName']}",
        f"Usunięto przypisanie sprzętu {asset['name'] if asset else 'N/A'} od {user['firstName'] if user else 'N/A'} {user['lastName'] if user else ''}"
    )
    
    return {"message": "Przypisanie usunięte"}

# ==================== AUDIT LOG ENDPOINTS ====================

@api_router.get("/audit-logs")
async def get_audit_logs(request: Request):
    current_user = await get_current_user(request)
    if current_user["role"] != "founder":
        raise HTTPException(status_code=403, detail="Brak uprawnień")
    
    logs = await db.audit_logs.find({}).sort("createdAt", -1).to_list(500)
    result = []
    for log in logs:
        result.append({
            "id": str(log["_id"]),
            "action": log["action"],
            "entityType": log["entityType"],
            "entityId": log["entityId"],
            "userId": log["userId"],
            "userName": log["userName"],
            "details": log["details"],
            "createdAt": log["createdAt"]
        })
    return result

# ==================== STATS ENDPOINT ====================

@api_router.get("/stats")
async def get_stats(request: Request):
    await get_current_user(request)
    users_count = await db.users.count_documents({})
    assets_count = await db.assets.count_documents({})
    assignments_count = await db.assignments.count_documents({})
    available_assets = await db.assets.count_documents({"status": "Dostępny"})
    
    return {
        "usersCount": users_count,
        "assetsCount": assets_count,
        "assignmentsCount": assignments_count,
        "availableAssets": available_assets
    }

# ==================== ROOT ====================

@api_router.get("/")
async def root():
    return {"message": "System Department Of Corrections API"}

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=[os.environ.get('FRONTEND_URL', 'http://localhost:3000')],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ==================== STARTUP EVENT ====================

@app.on_event("startup")
async def startup_event():
    # Create indexes
    await db.users.create_index("email", unique=True)
    await db.users.create_index("badgeNumber", unique=True)
    await db.assets.create_index("serialNumber", unique=True)
    await db.assignments.create_index("assetId")
    await db.assignments.create_index("userId")
    
    # Seed admin
    admin_email = os.environ.get("ADMIN_EMAIL", "admin@doc.gov")
    admin_password = os.environ.get("ADMIN_PASSWORD", "Admin123!")
    
    existing = await db.users.find_one({"email": admin_email})
    if existing is None:
        hashed = hash_password(admin_password)
        await db.users.insert_one({
            "email": admin_email,
            "password_hash": hashed,
            "firstName": "Administrator",
            "lastName": "Systemu",
            "badgeNumber": "0001",
            "position": "Warden",
            "role": "founder",
            "meritBars": ["", "", "", "", "", ""],
            "trainings": {
                "OPP": True,
                "KPP": True,
                "Strzelanie": True,
                "Taktyka": True,
                "Prawo": True,
                "PierwszaPomoc": True
            },
            "notes": "",
            "promotionDate": None,
            "createdAt": datetime.now(timezone.utc).isoformat()
        })
        logger.info(f"Admin user created: {admin_email}")
    elif not verify_password(admin_password, existing["password_hash"]):
        await db.users.update_one({"email": admin_email}, {"$set": {"password_hash": hash_password(admin_password)}})
        logger.info(f"Admin password updated: {admin_email}")
    
    # Write test credentials
    import os as os_module
    os_module.makedirs("/app/memory", exist_ok=True)
    with open("/app/memory/test_credentials.md", "w") as f:
        f.write("# Test Credentials\n\n")
        f.write("## Admin Account (founder)\n")
        f.write(f"- Email: {admin_email}\n")
        f.write(f"- Password: {admin_password}\n")
        f.write(f"- Role: founder\n\n")
        f.write("## Auth Endpoints\n")
        f.write("- POST /api/auth/login\n")
        f.write("- POST /api/auth/logout\n")
        f.write("- GET /api/auth/me\n")
        f.write("- POST /api/auth/refresh\n")

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
