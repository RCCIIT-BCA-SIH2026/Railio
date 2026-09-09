import joblib

# তোমার trained model load করো
model = joblib.load("train_delay_model.pkl")

print("Model loaded successfully!")