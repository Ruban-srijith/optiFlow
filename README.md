# 🚌 OptiFlow - Real-Time Public Transport Management System
### Coimbatore City Transit · MERN Stack + Google Maps

A production-ready Proof of Concept for real-time bus tracking, live seat availability, and ML-powered passenger prediction for Coimbatore, Tamil Nadu.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│  React Frontend (Vite, port 5173)                           │
│  @react-google-maps/api · Tailwind CSS · Socket.io-client   │
└─────────────┬───────────────────────────────────┬───────────┘
              │ REST /api/*                        │ ws://
              ▼                                    ▼
┌─────────────────────────────────────────────────────────────┐
│  Node.js + Express + Socket.io  (port 5000)                 │
│  Mongoose · Google Directions API                            │
└─────────────┬───────────────────────────────────┬───────────┘
              │                                    │
              ▼                                    ▼
┌─────────────────────┐              ┌─────────────────────────┐
│  MongoDB             │              │  Python FastAPI ML      │
│  optiflow database   │              │  LightGBM predictor     │
│  2dsphere indexes    │              │  port 8000              │
└─────────────────────┘              └─────────────────────────┘
```

---

## Prerequisites

| Tool | Version | Notes |
|------|---------|-------|
| Node.js | 18+ | `node --version` |
| npm | 9+ | bundled with Node |
| MongoDB | 6+ | Must be running locally |
| Python | 3.9+ | For ML microservice |
| pip | latest | `pip --version` |

---

## 1. Clone / Setup

```powershell
cd e:\optiflow
```

---

## 2. Google Maps API Key

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Enable: **Maps JavaScript API**, **Directions API**, **Places API**
3. Copy your key
4. Edit `server/.env`:
   ```
   GOOGLE_MAPS_API_KEY=your_actual_key_here
   ```
5. Edit `client/.env`:
   ```
   VITE_GOOGLE_MAPS_API_KEY=your_actual_key_here
   ```

> **Note:** The app works without a key - maps render in fallback mode with straight-line routes.

---

## 3. Install Dependencies

### Backend
```powershell
cd server
npm install
```

### Frontend
```powershell
cd ..\client
npm install
```

### Python ML Service
```powershell
cd ..\ml_service
pip install -r requirements.txt
python train_model.py        # trains and saves model.pkl (~10 seconds)
```

---

## 4. Seed the Database

Ensure MongoDB is running (`mongod`), then:

```powershell
cd ..\server
npm run seed
```

Output:
```
✅ Connected to MongoDB
🗑️  Cleared existing collections
✅ Seeded 16 stops
✅ Seeded 3 buses (routes 1D, 3D, 11A)
🚌 OptiFlow seed complete!
```

---

## 5. Start All Services

Open **4 separate terminals**:

### Terminal 1 - Backend API
```powershell
cd e:\optiflow\server
npm run dev
# → http://localhost:5000
```

### Terminal 2 - ML Microservice
```powershell
cd e:\optiflow\ml_service
uvicorn ml_service:app --host 0.0.0.0 --port 8000 --reload
# → http://localhost:8000
```

### Terminal 3 - Frontend
```powershell
cd e:\optiflow\client
npm run dev
# → http://localhost:5173
```

### Terminal 4 - Fleet Simulator (optional, for live demo)
```powershell
cd e:\optiflow\server
npm run simulate
# Simulates 3 buses issuing tickets + broadcasting GPS
```

---

## 6. Using the App

1. Open `http://localhost:5173`
2. Type an **origin stop** (e.g. `Gandhipuram`) and **destination** (e.g. `Vadavalli`)
3. Click **Search Buses**
4. View bus cards with:
   - Live seat availability
   - TNSTC fare (₹2/stop, min ₹5)
   - Intermediate stop count
5. Click **View Stop-by-Stop Forecast** to expand the ML prediction accordion
6. Click any bus card to highlight its route on the map
7. Click a live bus marker on the map to see its InfoWindow

---

## API Reference

### `GET /api/buses/search`
```
?origin_stop_name=Gandhipuram&destination_stop_name=Vadavalli
```

### `POST /api/tickets/issue`
```json
{
  "bus_id": "TN-38-N-1234",
  "origin_stop_id": 105,
  "destination_stop_id": 107,
  "passenger_count": 2,
  "timestamp": "2026-08-03T10:30:00Z"
}
```

### `GET /api/buses` - all buses with live positions
### `GET /api/buses/stops` - all stops
### `GET /api/tickets` - recent 50 tickets

### ML Service - `POST http://localhost:8000/predict_route`
```json
{
  "stops": [105, 106, 107],
  "hour_of_day": 9,
  "day_of_week": 0,
  "current_occupancy": 15,
  "seating_capacity": 40
}
```

---

## Routes

| Bus | Route | Stops |
|-----|-------|-------|
| 1D | Ondipudur → Maruthamalai | 8 stops |
| 3D | Ganapathy → Kovaipudur | 6 stops |
| 11A | Ukkadam → Thudiyalur | 6 stops |

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| `ECONNREFUSED 27017` | Start MongoDB: `mongod` |
| Map shows fallback | Add Google Maps key to both `.env` files |
| ML predictions missing | Start `uvicorn ml_service:app --port 8000` |
| Simulator fails | Ensure server is running first (`npm run dev`) |
| No buses in search | Run `npm run seed` first |

---

## Hardware Requirements

- **CPU:** Intel Core i5 (or equivalent) - all ML runs single-core
- **RAM:** 4 GB minimum, 8 GB recommended
- **GPU:** Not required
- **OS:** Windows / macOS / Linux

---

*Built with ❤️ for Coimbatore City - OptiFlow v1.0.0*
