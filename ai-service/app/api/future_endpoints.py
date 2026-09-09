from fastapi import APIRouter
import random
from datetime import datetime, timedelta

router = APIRouter()

@router.get("/gnn-cascade")
def get_gnn_cascade():
    """
    Returns simulated cascading delay propagation across a network.
    """
    now = datetime.now()
    return {
        "networkStatus": "CRITICAL_CASCADE_DETECTED",
        "primaryIncident": {
            "trainNumber": "12301",
            "trainName": "Howrah Rajdhani Express",
            "station": "Mughalsarai Junction",
            "delayMinutes": 45,
            "rootCause": "Signal Failure at Outer"
        },
        "cascadingImpact": [
            {
                "id": "node-1",
                "trainNumber": "12259",
                "trainName": "Sealdah Duronto",
                "impactStation": "Kanpur Central",
                "predictedDelayMinutes": 35,
                "timeToImpactMinutes": 60,
                "confidenceScore": 0.94,
                "status": "AWAITING_REGULATION"
            },
            {
                "id": "node-2",
                "trainNumber": "12313",
                "trainName": "Sealdah Rajdhani",
                "impactStation": "Allahabad Jn",
                "predictedDelayMinutes": 20,
                "timeToImpactMinutes": 120,
                "confidenceScore": 0.88,
                "status": "PRIORITY_REORDERED"
            },
            {
                "id": "node-3",
                "trainNumber": "12815",
                "trainName": "Nandan Kanan Exp",
                "impactStation": "Gaya",
                "predictedDelayMinutes": 15,
                "timeToImpactMinutes": 180,
                "confidenceScore": 0.82,
                "status": "NORMAL"
            }
        ],
        "systemRecommendation": "Hold Train 12313 at Allahabad for 10 minutes to allow clearing of Mughalsarai corridor. Expected network delay reduction: 22%."
    }

@router.get("/federated-learning")
def get_federated_learning():
    """
    Returns simulated Federated Learning sync status across 17 zones.
    """
    zones = ["ER", "NR", "WR", "SR", "CR", "SER", "NWR", "NCR", "ECR", "NFR", "ECoR", "SCR", "SWR", "SECR", "WCR", "NER", "Metro"]
    
    # Simulate some zones syncing, some synced, some offline
    node_status = []
    for zone in zones:
        status = random.choice(["SYNCED", "SYNCED", "SYNCED", "SYNCING", "OFFLINE"])
        acc = round(random.uniform(85.0, 94.0), 1) if status != "OFFLINE" else 0.0
        node_status.append({
            "zoneCode": zone,
            "status": status,
            "localModelAccuracy": acc,
            "lastSyncTime": (datetime.now() - timedelta(minutes=random.randint(1, 60))).isoformat(),
            "dataPrivacy": "SECURE_LOCAL_ONLY"
        })
    
    return {
        "globalModelVersion": "v4.2.1-FL",
        "globalAccuracy": 93.8,
        "epochsCompleted": 142,
        "totalDataPointsProcessed": "14.2 Million",
        "privacyStatus": "Zero Raw Data Shared",
        "zoneNodes": node_status
    }

@router.get("/logistics")
def get_logistics_orchestration():
    """
    Returns simulated predictive downstream logistics orchestration events.
    """
    return {
        "triggerTrain": "12301 - Howrah Rajdhani",
        "predictedETA": "06:55",
        "scheduledETA": "06:00",
        "delay": "+55 min",
        "orchestratedActions": [
            {
                "department": "Crew Management",
                "action": "HOER Extension Approved",
                "details": "Outgoing Loco Pilot shift extended by 45 mins. No relief crew required.",
                "status": "EXECUTED",
                "costSavedINR": 12000
            },
            {
                "department": "Station Operations",
                "action": "Dynamic Platform Reallocation",
                "details": "Platform 5 temporarily freed for Train 12275. Rajdhani reassigned to Platform 4 at 06:55.",
                "status": "EXECUTED",
                "costSavedINR": 45000
            },
            {
                "department": "Catering (IRCTC)",
                "action": "JIT Meal Loading Adjusted",
                "details": "Base kitchen at Kanpur instructed to delay breakfast loading by 50 mins.",
                "status": "EXECUTED",
                "costSavedINR": 8500
            },
            {
                "department": "City Transport",
                "action": "Feeder Bus Sync",
                "details": "Delhi Metro Feeder Bus #4 departure rescheduled from 06:15 to 07:15 via API.",
                "status": "EXECUTED",
                "costSavedINR": 0
            }
        ],
        "totalOperationsSaved": "₹65,500"
    }
