from fastapi import FastAPI, APIRouter, HTTPException, Depends, UploadFile, File
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.staticfiles import StaticFiles
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional
import uuid
from datetime import datetime, timezone, timedelta
import pytz
import jwt
import bcrypt
import shutil

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# Create uploads directory
UPLOAD_DIR = ROOT_DIR / "uploads" / "videos"
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# JWT Settings
JWT_SECRET = os.environ.get('JWT_SECRET', 'frestea-ramadan-secret-key-2026')
JWT_ALGORITHM = "HS256"
JWT_EXPIRATION_HOURS = 24

# Security
security = HTTPBearer()

# Create the main app without a prefix
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Indonesia timezone
JAKARTA_TZ = pytz.timezone('Asia/Jakarta')

# ============ MODELS ============

class AdminUser(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    username: str
    password_hash: str
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class LoginRequest(BaseModel):
    username: str
    password: str

class LoginResponse(BaseModel):
    token: str
    username: str

class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str

class CreateUserRequest(BaseModel):
    username: str
    password: str

class UserResponse(BaseModel):
    id: str
    username: str
    created_at: str

class TVCVideo(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    url: str
    order: int = 0
    is_active: bool = True
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class TVCVideoCreate(BaseModel):
    name: str
    url: str
    order: int = 0
    is_active: bool = True

class TVCVideoUpdate(BaseModel):
    name: Optional[str] = None
    url: Optional[str] = None
    order: Optional[int] = None
    is_active: Optional[bool] = None

class BerbukaVideo(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    url: str
    duration_seconds: int = 300  # 5 minutes default
    is_active: bool = True
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class BerbukaVideoCreate(BaseModel):
    name: str
    url: str
    duration_seconds: int = 300
    is_active: bool = True

class BerbukaVideoUpdate(BaseModel):
    name: Optional[str] = None
    url: Optional[str] = None
    duration_seconds: Optional[int] = None
    is_active: Optional[bool] = None

class MaghribSchedule(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    date: str  # Format: YYYY-MM-DD
    subuh_time: str  # Format: HH:MM - waktu mulai countdown
    maghrib_time: str  # Format: HH:MM - waktu berbuka
    location: str = "Bekasi"
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class MaghribScheduleCreate(BaseModel):
    date: str
    subuh_time: str
    maghrib_time: str
    location: str = "Bekasi"

class MaghribScheduleUpdate(BaseModel):
    date: Optional[str] = None
    subuh_time: Optional[str] = None
    maghrib_time: Optional[str] = None
    location: Optional[str] = None

class LocationSettings(BaseModel):
    location: str = "Bekasi"

class DisplayState(BaseModel):
    state: str  # "countdown", "berbuka", "tvc"
    countdown_seconds: Optional[int] = None
    subuh_time: Optional[str] = None
    maghrib_time: Optional[str] = None
    location: Optional[str] = None
    current_tvc_videos: List[TVCVideo] = []
    berbuka_video: Optional[BerbukaVideo] = None
    berbuka_end_time: Optional[str] = None

# ============ AUTH HELPERS ============

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def verify_password(password: str, password_hash: str) -> bool:
    return bcrypt.checkpw(password.encode('utf-8'), password_hash.encode('utf-8'))

def create_token(username: str) -> str:
    payload = {
        "username": username,
        "exp": datetime.now(timezone.utc) + timedelta(hours=JWT_EXPIRATION_HOURS)
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

def verify_token(credentials: HTTPAuthorizationCredentials = Depends(security)) -> str:
    try:
        token = credentials.credentials
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        return payload["username"]
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

# ============ AUTH ENDPOINTS ============

@api_router.post("/auth/login", response_model=LoginResponse)
async def login(request: LoginRequest):
    # Find user
    user = await db.admin_users.find_one({"username": request.username}, {"_id": 0})
    
    if not user:
        raise HTTPException(status_code=401, detail="Username atau password salah")
    
    if not verify_password(request.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Username atau password salah")
    
    token = create_token(request.username)
    return LoginResponse(token=token, username=request.username)

@api_router.get("/auth/verify")
async def verify_auth(username: str = Depends(verify_token)):
    return {"valid": True, "username": username}

@api_router.post("/auth/setup")
async def setup_admin(request: LoginRequest):
    """Setup initial admin user - only works if no admin exists"""
    existing = await db.admin_users.find_one({})
    if existing:
        raise HTTPException(status_code=400, detail="Admin sudah ada. Gunakan login.")
    
    admin = AdminUser(
        username=request.username,
        password_hash=hash_password(request.password)
    )
    await db.admin_users.insert_one(admin.model_dump())
    
    token = create_token(request.username)
    return LoginResponse(token=token, username=request.username)

@api_router.get("/auth/check-setup")
async def check_setup():
    """Check if admin user has been setup"""
    existing = await db.admin_users.find_one({})
    return {"needs_setup": existing is None}

@api_router.post("/auth/change-password")
async def change_password(request: ChangePasswordRequest, username: str = Depends(verify_token)):
    """Change password for current user"""
    user = await db.admin_users.find_one({"username": username}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=404, detail="User tidak ditemukan")
    
    if not verify_password(request.current_password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Password lama salah")
    
    if len(request.new_password) < 6:
        raise HTTPException(status_code=400, detail="Password minimal 6 karakter")
    
    new_hash = hash_password(request.new_password)
    await db.admin_users.update_one(
        {"username": username},
        {"$set": {"password_hash": new_hash}}
    )
    
    return {"message": "Password berhasil diubah"}

@api_router.get("/auth/users", response_model=List[UserResponse])
async def get_users(username: str = Depends(verify_token)):
    """Get all admin users"""
    users = await db.admin_users.find({}, {"_id": 0, "password_hash": 0}).to_list(100)
    return users

@api_router.post("/auth/users", response_model=UserResponse)
async def create_user(request: CreateUserRequest, username: str = Depends(verify_token)):
    """Create a new admin user"""
    existing = await db.admin_users.find_one({"username": request.username})
    if existing:
        raise HTTPException(status_code=400, detail="Username sudah digunakan")
    
    if len(request.password) < 6:
        raise HTTPException(status_code=400, detail="Password minimal 6 karakter")
    
    admin = AdminUser(
        username=request.username,
        password_hash=hash_password(request.password)
    )
    await db.admin_users.insert_one(admin.model_dump())
    
    return UserResponse(
        id=admin.id,
        username=admin.username,
        created_at=admin.created_at
    )

@api_router.delete("/auth/users/{user_id}")
async def delete_user(user_id: str, username: str = Depends(verify_token)):
    """Delete an admin user"""
    # Prevent deleting self
    user_to_delete = await db.admin_users.find_one({"id": user_id}, {"_id": 0})
    if not user_to_delete:
        raise HTTPException(status_code=404, detail="User tidak ditemukan")
    
    if user_to_delete["username"] == username:
        raise HTTPException(status_code=400, detail="Tidak bisa menghapus akun sendiri")
    
    # Check if this is the last user
    count = await db.admin_users.count_documents({})
    if count <= 1:
        raise HTTPException(status_code=400, detail="Minimal harus ada 1 admin")
    
    await db.admin_users.delete_one({"id": user_id})
    return {"message": "User berhasil dihapus"}

@api_router.put("/auth/users/{user_id}/reset-password")
async def reset_user_password(user_id: str, request: LoginRequest, username: str = Depends(verify_token)):
    """Reset password for another user"""
    user = await db.admin_users.find_one({"id": user_id}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=404, detail="User tidak ditemukan")
    
    if len(request.password) < 6:
        raise HTTPException(status_code=400, detail="Password minimal 6 karakter")
    
    new_hash = hash_password(request.password)
    await db.admin_users.update_one(
        {"id": user_id},
        {"$set": {"password_hash": new_hash}}
    )
    
    return {"message": "Password berhasil direset"}

# ============ FILE UPLOAD ENDPOINTS ============

@api_router.post("/upload/video")
async def upload_video(file: UploadFile = File(...), username: str = Depends(verify_token)):
    """Upload video file"""
    # Validate file type
    allowed_types = ["video/mp4", "video/webm", "video/ogg", "video/quicktime"]
    if file.content_type not in allowed_types:
        raise HTTPException(status_code=400, detail="Format video tidak didukung. Gunakan MP4, WebM, atau OGG")
    
    # Generate unique filename
    file_ext = file.filename.split(".")[-1] if "." in file.filename else "mp4"
    unique_filename = f"{uuid.uuid4()}.{file_ext}"
    file_path = UPLOAD_DIR / unique_filename
    
    # Save file
    try:
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Gagal menyimpan file: {str(e)}")
    
    # Return URL
    video_url = f"/api/videos/{unique_filename}"
    return {"url": video_url, "filename": unique_filename}

@api_router.delete("/upload/video/{filename}")
async def delete_video_file(filename: str, username: str = Depends(verify_token)):
    """Delete uploaded video file"""
    file_path = UPLOAD_DIR / filename
    if file_path.exists():
        os.remove(file_path)
        return {"message": "File berhasil dihapus"}
    raise HTTPException(status_code=404, detail="File tidak ditemukan")

# ============ TVC VIDEO ENDPOINTS (PROTECTED) ============

@api_router.get("/tvc-videos", response_model=List[TVCVideo])
async def get_tvc_videos():
    videos = await db.tvc_videos.find({}, {"_id": 0}).sort("order", 1).to_list(100)
    return videos

@api_router.post("/tvc-videos", response_model=TVCVideo)
async def create_tvc_video(video: TVCVideoCreate, username: str = Depends(verify_token)):
    video_obj = TVCVideo(**video.model_dump())
    doc = video_obj.model_dump()
    await db.tvc_videos.insert_one(doc)
    return video_obj

@api_router.put("/tvc-videos/{video_id}", response_model=TVCVideo)
async def update_tvc_video(video_id: str, video: TVCVideoUpdate, username: str = Depends(verify_token)):
    update_data = {k: v for k, v in video.model_dump().items() if v is not None}
    if not update_data:
        raise HTTPException(status_code=400, detail="No data to update")
    
    result = await db.tvc_videos.update_one({"id": video_id}, {"$set": update_data})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Video not found")
    
    updated = await db.tvc_videos.find_one({"id": video_id}, {"_id": 0})
    return TVCVideo(**updated)

@api_router.delete("/tvc-videos/{video_id}")
async def delete_tvc_video(video_id: str, username: str = Depends(verify_token)):
    result = await db.tvc_videos.delete_one({"id": video_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Video not found")
    return {"message": "Video deleted"}

# ============ BERBUKA VIDEO ENDPOINTS (PROTECTED) ============

@api_router.get("/berbuka-videos", response_model=List[BerbukaVideo])
async def get_berbuka_videos():
    videos = await db.berbuka_videos.find({}, {"_id": 0}).to_list(100)
    return videos

@api_router.post("/berbuka-videos", response_model=BerbukaVideo)
async def create_berbuka_video(video: BerbukaVideoCreate, username: str = Depends(verify_token)):
    video_obj = BerbukaVideo(**video.model_dump())
    doc = video_obj.model_dump()
    await db.berbuka_videos.insert_one(doc)
    return video_obj

@api_router.put("/berbuka-videos/{video_id}", response_model=BerbukaVideo)
async def update_berbuka_video(video_id: str, video: BerbukaVideoUpdate, username: str = Depends(verify_token)):
    update_data = {k: v for k, v in video.model_dump().items() if v is not None}
    if not update_data:
        raise HTTPException(status_code=400, detail="No data to update")
    
    result = await db.berbuka_videos.update_one({"id": video_id}, {"$set": update_data})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Video not found")
    
    updated = await db.berbuka_videos.find_one({"id": video_id}, {"_id": 0})
    return BerbukaVideo(**updated)

@api_router.delete("/berbuka-videos/{video_id}")
async def delete_berbuka_video(video_id: str, username: str = Depends(verify_token)):
    result = await db.berbuka_videos.delete_one({"id": video_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Video not found")
    return {"message": "Video deleted"}

# ============ MAGHRIB SCHEDULE ENDPOINTS (PROTECTED) ============

@api_router.get("/schedules", response_model=List[MaghribSchedule])
async def get_schedules():
    schedules = await db.maghrib_schedules.find({}, {"_id": 0}).sort("date", 1).to_list(100)
    return schedules

@api_router.post("/schedules", response_model=MaghribSchedule)
async def create_schedule(schedule: MaghribScheduleCreate, username: str = Depends(verify_token)):
    # Check if schedule for this date already exists
    existing = await db.maghrib_schedules.find_one({"date": schedule.date})
    if existing:
        raise HTTPException(status_code=400, detail="Schedule for this date already exists")
    
    schedule_obj = MaghribSchedule(**schedule.model_dump())
    doc = schedule_obj.model_dump()
    await db.maghrib_schedules.insert_one(doc)
    return schedule_obj

@api_router.put("/schedules/{schedule_id}", response_model=MaghribSchedule)
async def update_schedule(schedule_id: str, schedule: MaghribScheduleUpdate, username: str = Depends(verify_token)):
    update_data = {k: v for k, v in schedule.model_dump().items() if v is not None}
    if not update_data:
        raise HTTPException(status_code=400, detail="No data to update")
    
    result = await db.maghrib_schedules.update_one({"id": schedule_id}, {"$set": update_data})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Schedule not found")
    
    updated = await db.maghrib_schedules.find_one({"id": schedule_id}, {"_id": 0})
    return MaghribSchedule(**updated)

@api_router.delete("/schedules/{schedule_id}")
async def delete_schedule(schedule_id: str, username: str = Depends(verify_token)):
    result = await db.maghrib_schedules.delete_one({"id": schedule_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Schedule not found")
    return {"message": "Schedule deleted"}

@api_router.post("/schedules/bulk", response_model=List[MaghribSchedule])
async def create_bulk_schedules(schedules: List[MaghribScheduleCreate], username: str = Depends(verify_token)):
    created = []
    for schedule in schedules:
        existing = await db.maghrib_schedules.find_one({"date": schedule.date})
        if not existing:
            schedule_obj = MaghribSchedule(**schedule.model_dump())
            doc = schedule_obj.model_dump()
            await db.maghrib_schedules.insert_one(doc)
            created.append(schedule_obj)
    return created

# ============ DISPLAY STATE ENDPOINT ============

@api_router.get("/display-state", response_model=DisplayState)
async def get_display_state():
    """
    Flow baru:
    1. Subuh -> Maghrib: Countdown saja (tanpa video)
    2. Maghrib -> (Maghrib + durasi berbuka): Video Berbuka saja (tanpa tulisan)
    3. Setelah Berbuka selesai: Video TVC looping
    """
    now = datetime.now(JAKARTA_TZ)
    today_str = now.strftime("%Y-%m-%d")
    
    # Get today's schedule
    schedule = await db.maghrib_schedules.find_one({"date": today_str}, {"_id": 0})
    
    # Get active TVC videos
    tvc_videos = await db.tvc_videos.find({"is_active": True}, {"_id": 0}).sort("order", 1).to_list(100)
    
    # Get active berbuka video
    berbuka_video = await db.berbuka_videos.find_one({"is_active": True}, {"_id": 0})
    
    if not schedule:
        # No schedule for today, show TVC
        return DisplayState(
            state="tvc",
            current_tvc_videos=[TVCVideo(**v) for v in tvc_videos],
            berbuka_video=BerbukaVideo(**berbuka_video) if berbuka_video else None
        )
    
    location = schedule.get("location", "Bekasi")
    subuh_time_str = schedule.get("subuh_time", "04:30")
    maghrib_time_str = schedule["maghrib_time"]
    
    # Parse times
    subuh_hour, subuh_minute = map(int, subuh_time_str.split(":"))
    maghrib_hour, maghrib_minute = map(int, maghrib_time_str.split(":"))
    
    # Create datetime objects for today
    subuh_dt = now.replace(hour=subuh_hour, minute=subuh_minute, second=0, microsecond=0)
    maghrib_dt = now.replace(hour=maghrib_hour, minute=maghrib_minute, second=0, microsecond=0)
    
    # Calculate berbuka end time based on video duration
    berbuka_duration = berbuka_video.get("duration_seconds", 300) if berbuka_video else 300
    berbuka_end = maghrib_dt + timedelta(seconds=berbuka_duration)
    
    # Determine current state based on new flow
    if now < subuh_dt:
        # Before subuh - show TVC
        return DisplayState(
            state="tvc",
            subuh_time=subuh_time_str,
            maghrib_time=maghrib_time_str,
            location=location,
            current_tvc_videos=[TVCVideo(**v) for v in tvc_videos],
            berbuka_video=BerbukaVideo(**berbuka_video) if berbuka_video else None
        )
    elif now < maghrib_dt:
        # From Subuh to Maghrib - show COUNTDOWN only (no video)
        seconds_remaining = int((maghrib_dt - now).total_seconds())
        return DisplayState(
            state="countdown",
            countdown_seconds=seconds_remaining,
            subuh_time=subuh_time_str,
            maghrib_time=maghrib_time_str,
            location=location,
            current_tvc_videos=[TVCVideo(**v) for v in tvc_videos],
            berbuka_video=BerbukaVideo(**berbuka_video) if berbuka_video else None
        )
    elif now < berbuka_end:
        # From Maghrib to berbuka_end - show BERBUKA VIDEO only (no text)
        return DisplayState(
            state="berbuka",
            subuh_time=subuh_time_str,
            maghrib_time=maghrib_time_str,
            location=location,
            current_tvc_videos=[TVCVideo(**v) for v in tvc_videos],
            berbuka_video=BerbukaVideo(**berbuka_video) if berbuka_video else None,
            berbuka_end_time=berbuka_end.isoformat()
        )
    else:
        # After berbuka ends - show TVC videos
        return DisplayState(
            state="tvc",
            subuh_time=subuh_time_str,
            maghrib_time=maghrib_time_str,
            location=location,
            current_tvc_videos=[TVCVideo(**v) for v in tvc_videos],
            berbuka_video=BerbukaVideo(**berbuka_video) if berbuka_video else None
        )
            maghrib_time=maghrib_time_str,
            current_tvc_videos=[TVCVideo(**v) for v in tvc_videos],
            berbuka_video=BerbukaVideo(**berbuka_video) if berbuka_video else None
        )

# ============ ROOT ENDPOINT ============

@api_router.get("/")
async def root():
    return {"message": "Frestea Ramadan Countdown API"}

# Include the router in the main app
app.include_router(api_router)

# Serve uploaded videos
app.mount("/api/videos", StaticFiles(directory=str(UPLOAD_DIR)), name="videos")

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
