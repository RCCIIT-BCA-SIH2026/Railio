import pickle

with open('/Users/ankitkarmakar/Documents/MY PROJECTS ALL IN /Rail Sathi/RailSathi/train_delay_model.pkl', 'rb') as f:
    model = pickle.load(f)

print(type(model))
print(dir(model))
if hasattr(model, 'feature_names_in_'):
    print(model.feature_names_in_)
