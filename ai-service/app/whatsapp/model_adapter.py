from typing import Dict, Any, Optional
from app.ml.eta_delay_predictor import eta_predictor, DelayPredictionRequest
from app.ml.train_schedule_db import train_schedule_db, get_ist_now

class ExistingRailIoModelAdapter:
    def __init__(self):
        pass

    def get_train_status(self, train_number: str, role: str = None) -> Dict[str, Any]:
        """
        Fetches existing train data and runs the existing ML prediction.
        Returns a formatted dictionary suitable for WhatsApp response generation.
        """
        train = train_schedule_db.get(train_number)
        if not train:
            return {"error": f"Train {train_number} not found."}

        now = get_ist_now()
        ctx = train_schedule_db.build_predictor_context(train_number, now)
        
        ml_pred = None
        if ctx:
            try:
                ml_req = DelayPredictionRequest(
                    trainNumber=train_number,
                    currentSpeed=ctx["currentSpeed"],
                    distanceRemaining=ctx["distanceKm"],
                    weatherCondition="Clear", # Defaulting as per deepdive endpoint
                    junctionCongestionLevel=0.4,
                    day=ctx["day"], month=ctx["month"], dayOfWeek=ctx["dayOfWeek"],
                    departureHour=ctx["departureHour"], departureMinute=ctx["departureMinute"],
                    arrivalHour=ctx["arrivalHour"], arrivalMinute=ctx["arrivalMinute"],
                    travelDurationMins=ctx["travelDurationMins"],
                    distanceKm=ctx["distanceKm"], direction=ctx["direction"],
                    departureDelay=ctx["departureDelay"]
                )
                ml_pred = eta_predictor.predict(ml_req)
            except Exception as e:
                print(f"[MODEL ADAPTER] ML error: {e}")

        # Format output
        live_state = train.get("liveState", {})
        current_loc = live_state.get("current_section", train.get("source"))
        next_station = live_state.get("next_station_code", "Unknown")
        delay_minutes = live_state.get("current_delay_minutes", 0)
        
        predicted_delay = ml_pred.predictedDelayMinutes if ml_pred else delay_minutes
        
        return {
            "train_number": train_number,
            "type": train.get("type", "Unknown"),
            "current_location": current_loc,
            "next_station": next_station,
            "distance_remaining": ctx.get("distanceKm", 0) if ctx else 0,
            "scheduled_arrival": train.get("arrivalTime", "Unknown"),
            "expected_delay": predicted_delay,
            "status": live_state.get("status", "ON_TIME"),
            "updated_at": live_state.get("updated_at", now.strftime("%H:%M IST")),
            "ml_confidence": ml_pred.confidenceScore if ml_pred else 0.0
        }

    def format_for_whatsapp(self, data: Dict[str, Any], query_type: str, role: str) -> str:
        if "error" in data:
            return f"⚠️ I couldn't find information for that train. Please try again."

        text = f"🚆 *Train {data['train_number']}*\n\n"
        
        if query_type in ["QUERY_LOCATION", "QUERY_FULL_STATUS"]:
            text += f"📍 *Location:* {data['current_location']}\n"
            text += f"➡️ *Next Station:* {data['next_station']}\n"
            text += f"📏 *Distance Remaining:* {data['distance_remaining']} km\n\n"
            
        if query_type in ["QUERY_DELAY", "QUERY_ARRIVAL", "QUERY_FULL_STATUS"]:
            text += f"🕐 *Scheduled Arrival:* {data['scheduled_arrival']}\n"
            text += f"⚠️ *Expected Delay:* {data['expected_delay']:.1f} mins\n"
            text += f"🟢 *Status:* {data['status']}\n\n"
            
        text += f"⏱️ *Last Updated:* {data['updated_at']}"
        return text

model_adapter = ExistingRailIoModelAdapter()
