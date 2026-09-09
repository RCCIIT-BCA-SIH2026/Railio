import joblib

MODEL_FILE = "../ai-service/app/ml/models/train_delay_model.pkl"

model = joblib.load(MODEL_FILE)

print("Model loaded successfully!")
print("Model type:", type(model))
print("\nModel details:")
print(model)










