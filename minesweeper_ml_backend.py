# minesweeper_ml_backend.py
"""
A simple Python backend for Minesweeper AI that learns from each game using scikit-learn.
This backend exposes endpoints for:
- Logging moves and board states
- Training a model
- Predicting the probability of a cell being a mine

You can run this backend with: python minesweeper_ml_backend.py
"""
from flask import Flask, request, jsonify
from flask_cors import CORS
from sklearn.ensemble import RandomForestClassifier
import numpy as np
import pickle
import os

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

MODEL_PATH = 'minesweeper_model.pkl'
DATA_PATH = 'minesweeper_data.npy'
LABEL_PATH = 'minesweeper_labels.npy'

# In-memory data for this session
X = []  # Features
y = []  # Labels

# Load model and data if exists
if os.path.exists(MODEL_PATH):
    with open(MODEL_PATH, 'rb') as f:
        model = pickle.load(f)
else:
    model = RandomForestClassifier(n_estimators=50)

if os.path.exists(DATA_PATH) and os.path.exists(LABEL_PATH):
    X = np.load(DATA_PATH).tolist()
    y = np.load(LABEL_PATH).tolist()

@app.route('/log_move', methods=['POST'])
def log_move():
    data = request.json
    # data: {features: [...], label: 0 or 1}
    X.append(data['features'])
    y.append(data['label'])
    return jsonify({'status': 'logged', 'count': len(X)})

@app.route('/train', methods=['POST'])
def train():
    if len(X) < 10:
        return jsonify({'status': 'not enough data'})
    model.fit(X, y)
    with open(MODEL_PATH, 'wb') as f:
        pickle.dump(model, f)
    np.save(DATA_PATH, np.array(X))
    np.save(LABEL_PATH, np.array(y))
    return jsonify({'status': 'trained', 'samples': len(X)})

@app.route('/predict', methods=['POST'])
def predict():
    data = request.json
    # data: {features: [...]} (single cell)
    
    # Model eğitilmemiş ise random tahmin döndür
    if not hasattr(model, 'n_features_in_') or len(X) < 10:
        return jsonify({'mine_probability': 0.5})  # Neutral probability
    
    try:
        proba = model.predict_proba([data['features']])[0][1]  # Probability of being a mine
        return jsonify({'mine_probability': proba})
    except Exception as e:
        # Hata durumunda neutral probability döndür
        return jsonify({'mine_probability': 0.5})

@app.route('/status', methods=['GET'])
def status():
    info = {
        'sample_count': len(X),
        'model_trained': hasattr(model, 'n_features_'),
        'features_dim': len(X[0]) if X else 0,
        'labels_0': int(np.sum(np.array(y) == 0)) if y else 0,
        'labels_1': int(np.sum(np.array(y) == 1)) if y else 0
    }
    return jsonify(info)

@app.route('/panel', methods=['GET'])
def panel():
    info = {
        'sample_count': len(X),
        'model_trained': hasattr(model, 'n_features_'),
        'features_dim': len(X[0]) if X else 0,
        'labels_0': int(np.sum(np.array(y) == 0)) if y else 0,
        'labels_1': int(np.sum(np.array(y) == 1)) if y else 0
    }
    html = f"""
    <html><head><title>Minesweeper ML Panel</title></head><body>
    <h2>Minesweeper ML Backend Panel</h2>
    <ul>
      <li><b>Toplam örnek:</b> {info['sample_count']}</li>
      <li><b>Model eğitildi mi?:</b> {'Evet' if info['model_trained'] else 'Hayır'}</li>
      <li><b>Özellik vektörü boyutu:</b> {info['features_dim']}</li>
      <li><b>0 (mayın yok) etiketi:</b> {info['labels_0']}</li>
      <li><b>1 (mayın var) etiketi:</b> {info['labels_1']}</li>
    </ul>
    </body></html>
    """
    return html

if __name__ == '__main__':
    app.run(port=5005, debug=True)
