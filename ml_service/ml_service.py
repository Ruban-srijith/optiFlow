"""
OptiFlow ML Microservice — FastAPI
Exposes /predict and /predict_route endpoints.

Start: uvicorn ml_service:app --host 0.0.0.0 --port 8000 --reload

If model.pkl doesn't exist, run train_model.py first.
"""

import os
import math
import joblib
import numpy as np
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List

app = FastAPI(title="OptiFlow ML Service", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------------------------
# HISTORICAL AVERAGE BOARDINGS (fallback when model not available)
# ---------------------------------------------------------------------------
HISTORICAL_AVG = {
    101: 12, 102: 8,  103: 6,  104: 10, 105: 18,
    106: 5,  107: 4,  108: 3,
    201: 9,  202: 6,  203: 14, 204: 11, 205: 4,
    301: 16, 302: 7,  303: 5,
}

# Load model
MODEL_PATH = os.path.join(os.path.dirname(__file__), "model.pkl")
model = None

if os.path.exists(MODEL_PATH):
    model = joblib.load(MODEL_PATH)
    print(f"✅ Model loaded from {MODEL_PATH}")
else:
    print("⚠️  model.pkl not found. Run train_model.py first. Using fallback heuristics.")


# ---------------------------------------------------------------------------
# SCHEMAS
# ---------------------------------------------------------------------------
class PredictRequest(BaseModel):
    stop_id: int
    hour_of_day: int
    day_of_week: int
    current_occupancy: int = 0


class RouteRequest(BaseModel):
    stops: List[int]
    hour_of_day: int
    day_of_week: int
    current_occupancy: int
    seating_capacity: int = 40


class StopForecast(BaseModel):
    stop_id: int
    stop_name: str
    predicted_boardings: int
    predicted_dropoffs: int
    predicted_free_seats: int
    predicted_occupancy: int


# Stop name lookup
STOP_NAMES = {
    101: "Ondipudur", 102: "Singanallur", 103: "Ramanathapuram",
    104: "Lakshmi Mills", 105: "Gandhipuram", 106: "Lawley Road",
    107: "Vadavalli", 108: "Maruthamalai",
    201: "Ganapathy", 202: "Sivananda Colony", 203: "Town Hall",
    204: "Ukkadam", 205: "Kovaipudur",
    301: "Railway Station", 302: "Saibaba Colony", 303: "Thudiyalur",
}


def predict_boardings(stop_id: int, hour: int, day: int, occupancy: int) -> int:
    """Predict passenger boardings at a stop."""
    hist_avg = HISTORICAL_AVG.get(stop_id, 5)

    if model is not None:
        features = np.array([[stop_id, hour, day, hist_avg, occupancy]])
        pred = model.predict(features)[0]
        return max(0, int(round(pred)))

    # Fallback: heuristic
    peak = (8 <= hour <= 10) or (17 <= hour <= 19)
    weekend = day >= 5
    base = hist_avg
    if peak:
        base *= 1.5
    if weekend:
        base *= 0.8
    base -= occupancy * 0.05
    return max(0, int(round(base + np.random.normal(0, 1.5))))


# ---------------------------------------------------------------------------
# ENDPOINTS
# ---------------------------------------------------------------------------
@app.get("/health")
def health():
    return {"status": "ok", "model_loaded": model is not None, "service": "OptiFlow ML"}


@app.post("/predict")
def predict_single(req: PredictRequest):
    boardings = predict_boardings(req.stop_id, req.hour_of_day, req.day_of_week, req.current_occupancy)
    return {
        "stop_id": req.stop_id,
        "predicted_boardings": boardings,
    }


@app.post("/predict_route")
def predict_route(req: RouteRequest):
    """
    Predict stop-by-stop occupancy and free seats for a list of stops.
    Uses rolling occupancy simulation.
    """
    occupancy = req.current_occupancy
    forecast = []

    for i, stop_id in enumerate(req.stops):
        # Estimate drop-offs: fraction of passengers reaching this stop
        if i == 0:
            dropoffs = 0
        else:
            # Passengers dropping off = proportion nearing end of their journey
            dropoffs = max(0, int(round(occupancy * (1 / max(len(req.stops) - i, 1)) * 0.6)))

        boardings = predict_boardings(stop_id, req.hour_of_day, req.day_of_week, occupancy)

        occupancy = max(0, occupancy - dropoffs + boardings)
        # Cap at total capacity (seated + standing)
        occupancy = min(occupancy, req.seating_capacity + 20)

        free_seats = max(0, req.seating_capacity - occupancy)

        forecast.append(
            StopForecast(
                stop_id=stop_id,
                stop_name=STOP_NAMES.get(stop_id, f"Stop {stop_id}"),
                predicted_boardings=boardings,
                predicted_dropoffs=dropoffs,
                predicted_free_seats=free_seats,
                predicted_occupancy=occupancy,
            )
        )

    return {"forecast": [f.model_dump() for f in forecast]}
