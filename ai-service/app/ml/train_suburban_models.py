"""
train_suburban_models.py — Production ML Model Training Pipeline
================================================================
Trains a RandomForestRegressor on the verified 3,680-record Sealdah–Dankuni Local
schedule & delay dataset using the 12-dimensional feature schema:

Features (12):
  1. Train No. (numeric: 32211 - 32252)
  2. day (1-31)
  3. month (1-12)
  4. day_of_week (0=Mon ... 6=Sun)
  5. departure_hour (0-23)
  6. departure_minute (0-59)
  7. arrival_hour (0-23)
  8. arrival_minute (0-59)
  9. Travel Duration (mins) (e.g. 40 - 110)
  10. Distance (km) (constant 28.0)
  11. direction (0=Sealdah-Dankuni UP, 1=Dankuni-Sealdah DOWN)
  12. departure_delay (mins delayed at scheduled departure)

Target:
  Delays (mins)
"""

import os
import joblib
import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestRegressor
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score

# ── Paths ────────────────────────────────────────────────────────────────────
_THIS_DIR = os.path.dirname(os.path.abspath(__file__))
_AI_SERVICE_DIR = os.path.dirname(os.path.dirname(_THIS_DIR))
_PROJECT_ROOT = os.path.dirname(_AI_SERVICE_DIR)

DATA_PATH = os.path.join(_PROJECT_ROOT, "data", "trains", "suburban_trains_schedule_dataset.csv")
ALT_DATA_PATH = os.path.join(_THIS_DIR, "data", "train_dataset.csv")
MODEL_OUT_DIR = os.path.join(_THIS_DIR, "models")
MODEL_OUT_PATH = os.path.join(MODEL_OUT_DIR, "train_delay_model.pkl")
ROOT_MODEL_PATH = os.path.join(_PROJECT_ROOT, "train_delay_model.pkl")


def load_and_preprocess_dataset(csv_path: str) -> pd.DataFrame:
    """Load and engineer the 12 required features from the raw CSV dataset."""
    sep = '\t' if csv_path.endswith('.csv') and '\t' in open(csv_path, 'r', encoding='utf-8').readline() else ','
    df = pd.read_csv(csv_path, sep=sep)

    # 1. Date Features
    df["Date_dt"] = pd.to_datetime(df["Date"], format="%d-%m-%Y", errors="coerce")
    df["day"] = df["Date_dt"].dt.day
    df["month"] = df["Date_dt"].dt.month
    df["day_of_week"] = df["Date_dt"].dt.dayofweek

    # 2. Time Features
    dep_parsed = pd.to_datetime(df["Departure Time"].astype(str), format="%H:%M", errors="coerce")
    arr_parsed = pd.to_datetime(df["Arrival Time"].astype(str), format="%H:%M", errors="coerce")
    df["departure_hour"] = dep_parsed.dt.hour
    df["departure_minute"] = dep_parsed.dt.minute
    df["arrival_hour"] = arr_parsed.dt.hour
    df["arrival_minute"] = arr_parsed.dt.minute

    # 3. Numeric Train Number
    df["Train No."] = pd.to_numeric(df["Train No."], errors="coerce")

    # 4. Departure Delay Calculation
    actual_dep_parsed = pd.to_datetime(df["Actual Departure Time"].astype(str), format="%H:%M", errors="coerce")
    df["departure_delay"] = (actual_dep_parsed - dep_parsed).dt.total_seconds() / 60.0
    # Handle midnight transitions
    df.loc[df["departure_delay"] < -720, "departure_delay"] += 1440

    # 5. Direction (0 = Sealdah ➔ Dankuni, 1 = Dankuni ➔ Sealdah)
    df["direction"] = df["Train Name"].apply(lambda x: 0 if "Sealdah - Dankuni" in str(x) else 1)

    # 6. Ensure Distance & Duration
    df["Travel Duration (mins)"] = pd.to_numeric(df["Travel Duration (mins)"], errors="coerce").fillna(45.0)
    df["Distance (km)"] = pd.to_numeric(df["Distance (km)"], errors="coerce").fillna(28.0)
    df["Delays (mins)"] = pd.to_numeric(df["Delays (mins)"], errors="coerce").fillna(0.0)

    # Drop any corrupt row
    df = df.dropna(subset=[
        "Train No.", "day", "month", "day_of_week",
        "departure_hour", "departure_minute", "arrival_hour", "arrival_minute",
        "Travel Duration (mins)", "Distance (km)", "direction", "departure_delay",
        "Delays (mins)"
    ])

    return df


def train_model():
    csv_file = DATA_PATH if os.path.exists(DATA_PATH) else ALT_DATA_PATH
    if not os.path.exists(csv_file):
        raise FileNotFoundError(f"Dataset not found at {DATA_PATH} or {ALT_DATA_PATH}")

    print(f"[TrainModel] Loading dataset from: {csv_file}")
    df = load_and_preprocess_dataset(csv_file)
    print(f"[TrainModel] Valid processed dataset rows: {len(df)}")

    feature_cols = [
        "Train No.", "day", "month", "day_of_week",
        "departure_hour", "departure_minute", "arrival_hour", "arrival_minute",
        "Travel Duration (mins)", "Distance (km)", "direction", "departure_delay"
    ]
    target_col = "Delays (mins)"

    X = df[feature_cols].values
    y = df[target_col].values

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42
    )

    print(f"[TrainModel] Training RandomForestRegressor (100 estimators)...")
    model = RandomForestRegressor(
        n_estimators=100,
        max_depth=16,
        min_samples_split=4,
        min_samples_leaf=2,
        random_state=42,
        n_jobs=-1
    )
    model.fit(X_train, y_train)

    # Evaluation
    y_pred = model.predict(X_test)
    mae = mean_absolute_error(y_test, y_pred)
    rmse = np.sqrt(mean_squared_error(y_test, y_pred))
    r2 = r2_score(y_test, y_pred)
    within_5min = np.mean(np.abs(y_test - y_pred) <= 5.0) * 100.0

    print("=" * 50)
    print("           TRAINING EVALUATION RESULTS")
    print("=" * 50)
    print(f" Test Samples:     {len(y_test)}")
    print(f" MAE:              {mae:.4f} minutes")
    print(f" RMSE:             {rmse:.4f} minutes")
    print(f" R² Score:         {r2:.4f}")
    print(f" Within ±5 min:    {within_5min:.2f}%")
    print("=" * 50)

    # Save to both target locations
    os.makedirs(MODEL_OUT_DIR, exist_ok=True)
    joblib.dump(model, MODEL_OUT_PATH)
    joblib.dump(model, ROOT_MODEL_PATH)
    print(f"[TrainModel] Model successfully saved to:\n  - {MODEL_OUT_PATH}\n  - {ROOT_MODEL_PATH}")


if __name__ == "__main__":
    train_model()
