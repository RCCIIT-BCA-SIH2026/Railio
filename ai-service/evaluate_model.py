import pandas as pd
import joblib
import numpy as np

from sklearn.metrics import (
    mean_absolute_error,
    mean_squared_error,
    r2_score
)

MODEL_FILE = "app/ml/models/train_delay_model.pkl"
DATA_FILE = "app/ml/data/train_dataset.csv"

# =========================
# LOAD MODEL + DATASET
# =========================

model = joblib.load(MODEL_FILE)

df = pd.read_csv(DATA_FILE, sep="\t")

print("\n========== DATASET ==========")
print("Rows:", len(df))

# =========================
# DATE FEATURES
# =========================

df["Date"] = pd.to_datetime(df["Date"], errors="coerce")

df["day"] = df["Date"].dt.day
df["month"] = df["Date"].dt.month
df["day_of_week"] = df["Date"].dt.dayofweek


# =========================
# TIME FEATURES
# =========================

def extract_time(series):
    parsed = pd.to_datetime(
        series.astype(str),
        format="%H:%M:%S",
        errors="coerce"
    )

    # Try HH:MM if HH:MM:SS failed
    if parsed.isna().all():
        parsed = pd.to_datetime(
            series.astype(str),
            format="%H:%M",
            errors="coerce"
        )

    return parsed.dt.hour, parsed.dt.minute


df["departure_hour"], df["departure_minute"] = extract_time(
    df["Departure Time"]
)

df["arrival_hour"], df["arrival_minute"] = extract_time(
    df["Arrival Time"]
)


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

scheduled_departure = pd.to_datetime(
    df["Departure Time"].astype(str),
    errors="coerce"
)

actual_departure = pd.to_datetime(
    df["Actual Departure Time"].astype(str),
    errors="coerce"
)

df["departure_delay"] = (
    (actual_departure - scheduled_departure)
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

# IMPORTANT:
# This must match the logic used while training.
# Temporary numeric encoding.
df["direction"] = 0


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