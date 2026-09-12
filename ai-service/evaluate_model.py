import os
import pandas as pd
import joblib
import numpy as np

from sklearn.metrics import (
    mean_absolute_error,
    mean_squared_error,
    r2_score
)

_THIS_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_FILE = os.path.join(_THIS_DIR, "app", "ml", "models", "train_delay_model.pkl")
if not os.path.exists(MODEL_FILE):
    MODEL_FILE = os.path.join(os.path.dirname(_THIS_DIR), "train_delay_model.pkl")

DATA_FILE = os.path.join(_THIS_DIR, "app", "ml", "data", "train_dataset.csv")
if not os.path.exists(DATA_FILE):
    DATA_FILE = os.path.join(os.path.dirname(_THIS_DIR), "data", "trains", "suburban_trains_schedule_dataset.csv")

# =========================
# LOAD MODEL + DATASET
# =========================

model = joblib.load(MODEL_FILE)

sep = '\t' if DATA_FILE.endswith('train_dataset.csv') else ','
df = pd.read_csv(DATA_FILE, sep=sep)

print("\n========== DATASET ==========")
print("File:", DATA_FILE)
print("Rows:", len(df))

from typing import Any

# =========================
# DATE FEATURES
# =========================

df["Date_dt"] = pd.to_datetime(df["Date"], format="%d-%m-%Y", errors="coerce")
dt_prop: Any = df["Date_dt"].dt

df["day"] = dt_prop.day
df["month"] = dt_prop.month
df["day_of_week"] = dt_prop.dayofweek


# =========================
# TIME FEATURES
# =========================

dep_parsed = pd.to_datetime(df["Departure Time"].astype(str), format="%H:%M", errors="coerce")
arr_parsed = pd.to_datetime(df["Arrival Time"].astype(str), format="%H:%M", errors="coerce")
dep_dt: Any = dep_parsed.dt
arr_dt: Any = arr_parsed.dt

df["departure_hour"] = dep_dt.hour
df["departure_minute"] = dep_dt.minute

df["arrival_hour"] = arr_dt.hour
df["arrival_minute"] = arr_dt.minute


# =========================
# TRAIN NUMBER
# =========================

df["Train No."] = pd.to_numeric(
    df["Train No."],
    errors="coerce"
)


# =========================
# DEPARTURE DELAY
# =========================

actual_dep_parsed = pd.to_datetime(df["Actual Departure Time"].astype(str), format="%H:%M", errors="coerce")

df["departure_delay"] = (
    (actual_dep_parsed - dep_parsed)
    .dt.total_seconds()
    / 60
)

# Handle midnight crossing
df.loc[
    df["departure_delay"] < -720,
    "departure_delay"
] += 1440


# =========================
# DIRECTION
# =========================

df["direction"] = df["Train Name"].apply(lambda x: 0 if "Sealdah - Dankuni" in str(x) else 1)


# =========================
# TARGET
# =========================

TARGET = "Delays (mins)"

df[TARGET] = pd.to_numeric(
    df[TARGET],
    errors="coerce"
)


# =========================
# FEATURES
# =========================

FEATURES = [
    "Train No.",
    "day",
    "month",
    "day_of_week",
    "departure_hour",
    "departure_minute",
    "arrival_hour",
    "arrival_minute",
    "Travel Duration (mins)",
    "Distance (km)",
    "direction",
    "departure_delay",
]

# Convert numerical columns
for col in FEATURES:
    df[col] = pd.to_numeric(df[col], errors="coerce")


# =========================
# CLEAN DATA
# =========================

evaluation_df = df.dropna(
    subset=FEATURES + [TARGET]
).copy()

print("\nValid rows for evaluation:", len(evaluation_df))

X = evaluation_df[FEATURES]
y_true = evaluation_df[TARGET]


# =========================
# PREDICTION
# =========================

y_pred = model.predict(X)


# =========================
# METRICS
# =========================

mae = mean_absolute_error(y_true, y_pred)

rmse = np.sqrt(
    mean_squared_error(y_true, y_pred)
)

r2 = r2_score(y_true, y_pred)

errors = np.abs(
    y_true.values - y_pred
)

within_5 = np.mean(errors <= 5) * 100
within_10 = np.mean(errors <= 10) * 100


# =========================
# RESULTS
# =========================

print("\n===================================")
print("      MODEL EVALUATION RESULTS")
print("===================================")

print(f"Total evaluation samples: {len(y_true)}")
print(f"MAE: {mae:.4f} minutes")
print(f"RMSE: {rmse:.4f} minutes")
print(f"R² Score: {r2:.4f}")
print(f"Within ±5 minutes: {within_5:.2f}%")
print(f"Within ±10 minutes: {within_10:.2f}%")

print("===================================\n")