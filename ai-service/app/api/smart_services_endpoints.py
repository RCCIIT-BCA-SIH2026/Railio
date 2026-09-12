from fastapi import APIRouter
from pydantic import BaseModel
import random
from datetime import datetime, timedelta, timezone

router = APIRouter()

class AlarmRequest(BaseModel):
    trainNumber: str
    stationName: str
    scheduledArrivalTime: str  # ISO string or relative like "2026-09-10T14:30:00"
    bufferMinutes: int

@router.post("/smart-alarm")
def configure_smart_alarm(request: AlarmRequest):
    # Simulate fetching dynamic ETA
    # For demo, let's assume the train is delayed by a random amount between 15 and 90 mins
    delay_minutes = random.randint(15, 90)
    
    try:
        scheduled_time = datetime.fromisoformat(request.scheduledArrivalTime.replace('Z', '+00:00'))
    except ValueError:
        # Fallback if parsing fails, just use current time + 2 hours
        scheduled_time = datetime.now(timezone.utc) + timedelta(hours=2)

    predicted_arrival = scheduled_time + timedelta(minutes=delay_minutes)
    alarm_trigger_time = predicted_arrival - timedelta(minutes=request.bufferMinutes)

    return {
        "trainNumber": request.trainNumber,
        "stationName": request.stationName,
        "delayMinutes": delay_minutes,
        "scheduledArrivalTime": scheduled_time.isoformat(),
        "predictedArrivalTime": predicted_arrival.isoformat(),
        "alarmTriggerTime": alarm_trigger_time.isoformat(),
        "bufferMinutes": request.bufferMinutes,
        "message": f"Train is delayed by {delay_minutes} mins. Alarm synced successfully with the new ETA."
    }

class FoodOrderRequest(BaseModel):
    trainNumber: str
    stationName: str
    vendorName: str
    orderId: str
    scheduledArrivalTime: str

@router.post("/food-delivery")
def optimize_food_delivery(request: FoodOrderRequest):
    # Simulate dynamic ETA for vendor JIT (Just In Time) cooking
    delay_minutes = random.randint(30, 120)
    
    try:
        scheduled_time = datetime.fromisoformat(request.scheduledArrivalTime.replace('Z', '+00:00'))
    except ValueError:
        scheduled_time = datetime.now(timezone.utc) + timedelta(hours=3)

    predicted_arrival = scheduled_time + timedelta(minutes=delay_minutes)
    
    # The vendor originally planned to start cooking 45 mins before scheduled arrival
    original_cook_time = scheduled_time - timedelta(minutes=45)
    # The new optimized cook time is 45 mins before the *predicted* arrival
    optimized_cook_time = predicted_arrival - timedelta(minutes=45)

    return {
        "orderId": request.orderId,
        "trainNumber": request.trainNumber,
        "vendorName": request.vendorName,
        "delayMinutes": delay_minutes,
        "scheduledArrivalTime": scheduled_time.isoformat(),
        "predictedArrivalTime": predicted_arrival.isoformat(),
        "originalCookingTime": original_cook_time.isoformat(),
        "optimizedCookingTime": optimized_cook_time.isoformat(),
        "foodQualityScore": 98,
        "message": f"Vendor '{request.vendorName}' cooking delayed by {delay_minutes} mins. Food will be served hot."
    }
