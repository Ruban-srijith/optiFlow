"""
OptiFlow ML Model Trainer
Generates synthetic Coimbatore bus ridership data and trains a LightGBM regressor.
Run once: python train_model.py

Features: [stop_id, hour_of_day, day_of_week, current_occupancy]
Target:   predicted_boardings (passengers boarding at a given stop)
"""

import numpy as np
import joblib
import lightgbm as lgb
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_absolute_error

# ---------------------------------------------------------------------------
# SYNTHETIC DATA GENERATION
# Coimbatore stop IDs: 101-108, 201-205, 301-303
# ---------------------------------------------------------------------------
STOP_IDS = [101, 102, 103, 104, 105, 106, 107, 108, 201, 202, 203, 204, 205, 301, 302, 303]

# Historical average boardings per stop (domain knowledge)
HISTORICAL_AVG = {
    101: 12, 102: 8,  103: 6,  104: 10, 105: 18,  # 1D heavy at Gandhipuram
    106: 5,  107: 4,  108: 3,
    201: 9,  202: 6,  203: 14, 204: 11, 205: 4,
    301: 16, 302: 7,  303: 5,
}

np.random.seed(42)
N = 50_000

stop_ids        = np.random.choice(STOP_IDS, N)
hours           = np.random.randint(6, 23, N)           # 6 AM – 10 PM
days            = np.random.randint(0, 7, N)            # 0=Mon ... 6=Sun
hist_avg        = np.array([HISTORICAL_AVG[s] for s in stop_ids], dtype=float)
current_occ     = np.random.randint(0, 60, N)

# Generate boarding count with realistic noise
# Peak hours (8-10 AM, 5-7 PM) boost boardings; rush hour at major stops
peak_hour  = ((hours >= 8) & (hours <= 10)) | ((hours >= 17) & (hours <= 19))
weekend    = days >= 5

boardings = (
    hist_avg
    + np.where(peak_hour, hist_avg * 0.5, 0)          # +50% peak
    - np.where(weekend, hist_avg * 0.2, 0)             # -20% weekend
    + np.random.normal(0, 2, N)                        # noise
    - current_occ * 0.05                               # crowded buses get fewer boardings
)
boardings = np.clip(np.round(boardings), 0, 30).astype(int)

X = np.column_stack([stop_ids, hours, days, hist_avg, current_occ])
y = boardings

X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

# ---------------------------------------------------------------------------
# LIGHTGBM TRAINING — CPU optimised (n_jobs=1, device=cpu)
# ---------------------------------------------------------------------------
model = lgb.LGBMRegressor(
    n_estimators=200,
    learning_rate=0.05,
    num_leaves=31,
    max_depth=6,
    n_jobs=1,          # Single-core: i5 optimised
    device='cpu',
    random_state=42,
    verbose=-1,
)

print("🔄 Training LightGBM model...")
model.fit(
    X_train, y_train,
    eval_set=[(X_test, y_test)],
    callbacks=[lgb.early_stopping(20, verbose=False), lgb.log_evaluation(period=50)],
)

preds = model.predict(X_test)
mae = mean_absolute_error(y_test, preds)
print(f"✅ Training complete — MAE: {mae:.2f} passengers")

joblib.dump(model, "model.pkl")
print("💾 Model saved to model.pkl")
