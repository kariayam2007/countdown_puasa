from fastapi import FastAPI, APIRouter, HTTPException
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

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app without a prefix
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Indonesia timezone
JAKARTA_TZ = pytz.timezone('Asia/Jakarta')

# ============ MODELS ============

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
    maghrib_time: str  # Format: HH:MM
    location: str = "Bekasi"
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class MaghribScheduleCreate(BaseModel):
    date: str
    maghrib_time: str
    location: str = "Bekasi"

class MaghribScheduleUpdate(BaseModel):
    date: Optional[str] = None
    maghrib_time: Optional[str] = None
    location: Optional[str] = None

class DisplayState(BaseModel):
    state: str  # "tvc", "countdown", "berbuka"
    countdown_seconds: Optional[int] = None
    maghrib_time: Optional[str] = None
    current_tvc_videos: List[TVCVideo] = []
    berbuka_video: Optional[BerbukaVideo] = None
    berbuka_end_time: Optional[str] = None

# ============ TVC VIDEO ENDPOINTS ============

@api_router.get("/tvc-videos", response_model=List[TVCVideo])
async def get_tvc_videos():
    videos = await db.tvc_videos.find({}, {"_id": 0}).sort("order", 1).to_list(100)
    return videos

@api_router.post("/tvc-videos", response_model=TVCVideo)
async def create_tvc_video(video: TVCVideoCreate):
    video_obj = TVCVideo(**video.model_dump())
    doc = video_obj.model_dump()
    await db.tvc_videos.insert_one(doc)
    return video_obj

@api_router.put("/tvc-videos/{video_id}", response_model=TVCVideo)
async def update_tvc_video(video_id: str, video: TVCVideoUpdate):
    update_data = {k: v for k, v in video.model_dump().items() if v is not None}
    if not update_data:
        raise HTTPException(status_code=400, detail="No data to update")
    
    result = await db.tvc_videos.update_one({"id": video_id}, {"$set": update_data})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Video not found")
    
    updated = await db.tvc_videos.find_one({"id": video_id}, {"_id": 0})
    return TVCVideo(**updated)

@api_router.delete("/tvc-videos/{video_id}")
async def delete_tvc_video(video_id: str):
    result = await db.tvc_videos.delete_one({"id": video_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Video not found")
    return {"message": "Video deleted"}

# ============ BERBUKA VIDEO ENDPOINTS ============

@api_router.get("/berbuka-videos", response_model=List[BerbukaVideo])
async def get_berbuka_videos():
    videos = await db.berbuka_videos.find({}, {"_id": 0}).to_list(100)
    return videos

@api_router.post("/berbuka-videos", response_model=BerbukaVideo)
async def create_berbuka_video(video: BerbukaVideoCreate):
    video_obj = BerbukaVideo(**video.model_dump())
    doc = video_obj.model_dump()
    await db.berbuka_videos.insert_one(doc)
    return video_obj

@api_router.put("/berbuka-videos/{video_id}", response_model=BerbukaVideo)
async def update_berbuka_video(video_id: str, video: BerbukaVideoUpdate):
    update_data = {k: v for k, v in video.model_dump().items() if v is not None}
    if not update_data:
        raise HTTPException(status_code=400, detail="No data to update")
    
    result = await db.berbuka_videos.update_one({"id": video_id}, {"$set": update_data})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Video not found")
    
    updated = await db.berbuka_videos.find_one({"id": video_id}, {"_id": 0})
    return BerbukaVideo(**updated)

@api_router.delete("/berbuka-videos/{video_id}")
async def delete_berbuka_video(video_id: str):
    result = await db.berbuka_videos.delete_one({"id": video_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Video not found")
    return {"message": "Video deleted"}

# ============ MAGHRIB SCHEDULE ENDPOINTS ============

@api_router.get("/schedules", response_model=List[MaghribSchedule])
async def get_schedules():
    schedules = await db.maghrib_schedules.find({}, {"_id": 0}).sort("date", 1).to_list(100)
    return schedules

@api_router.post("/schedules", response_model=MaghribSchedule)
async def create_schedule(schedule: MaghribScheduleCreate):
    # Check if schedule for this date already exists
    existing = await db.maghrib_schedules.find_one({"date": schedule.date})
    if existing:
        raise HTTPException(status_code=400, detail="Schedule for this date already exists")
    
    schedule_obj = MaghribSchedule(**schedule.model_dump())
    doc = schedule_obj.model_dump()
    await db.maghrib_schedules.insert_one(doc)
    return schedule_obj

@api_router.put("/schedules/{schedule_id}", response_model=MaghribSchedule)
async def update_schedule(schedule_id: str, schedule: MaghribScheduleUpdate):
    update_data = {k: v for k, v in schedule.model_dump().items() if v is not None}
    if not update_data:
        raise HTTPException(status_code=400, detail="No data to update")
    
    result = await db.maghrib_schedules.update_one({"id": schedule_id}, {"$set": update_data})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Schedule not found")
    
    updated = await db.maghrib_schedules.find_one({"id": schedule_id}, {"_id": 0})
    return MaghribSchedule(**updated)

@api_router.delete("/schedules/{schedule_id}")
async def delete_schedule(schedule_id: str):
    result = await db.maghrib_schedules.delete_one({"id": schedule_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Schedule not found")
    return {"message": "Schedule deleted"}

@api_router.post("/schedules/bulk", response_model=List[MaghribSchedule])
async def create_bulk_schedules(schedules: List[MaghribScheduleCreate]):
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
    now = datetime.now(JAKARTA_TZ)
    today_str = now.strftime("%Y-%m-%d")
    current_time = now.strftime("%H:%M")
    
    # Get today's maghrib schedule
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
    
    maghrib_time_str = schedule["maghrib_time"]
    maghrib_hour, maghrib_minute = map(int, maghrib_time_str.split(":"))
    
    # Create maghrib datetime for today
    maghrib_dt = now.replace(hour=maghrib_hour, minute=maghrib_minute, second=0, microsecond=0)
    
    # Calculate countdown start time (120 minutes before maghrib)
    countdown_start = maghrib_dt - timedelta(minutes=120)
    
    # Calculate berbuka end time (5 minutes after maghrib by default, or use video duration)
    berbuka_duration = berbuka_video.get("duration_seconds", 300) if berbuka_video else 300
    berbuka_end = maghrib_dt + timedelta(seconds=berbuka_duration)
    
    # Determine current state
    if now < countdown_start:
        # Before countdown starts - show TVC
        return DisplayState(
            state="tvc",
            maghrib_time=maghrib_time_str,
            current_tvc_videos=[TVCVideo(**v) for v in tvc_videos],
            berbuka_video=BerbukaVideo(**berbuka_video) if berbuka_video else None
        )
    elif now < maghrib_dt:
        # During countdown period
        seconds_remaining = int((maghrib_dt - now).total_seconds())
        return DisplayState(
            state="countdown",
            countdown_seconds=seconds_remaining,
            maghrib_time=maghrib_time_str,
            current_tvc_videos=[TVCVideo(**v) for v in tvc_videos],
            berbuka_video=BerbukaVideo(**berbuka_video) if berbuka_video else None
        )
    elif now < berbuka_end:
        # During berbuka video period
        return DisplayState(
            state="berbuka",
            maghrib_time=maghrib_time_str,
            current_tvc_videos=[TVCVideo(**v) for v in tvc_videos],
            berbuka_video=BerbukaVideo(**berbuka_video) if berbuka_video else None,
            berbuka_end_time=berbuka_end.isoformat()
        )
    else:
        # After berbuka - back to TVC
        return DisplayState(
            state="tvc",
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
