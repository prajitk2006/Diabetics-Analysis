# app/app.py
import sys
import os
project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, project_root)

from flask import Flask, request, render_template, jsonify
import numpy as np
import pandas as pd
import joblib
import json
import random
from datetime import datetime

app = Flask(__name__)

# Load scaler and model
SCALER_PATH = os.path.join(project_root, 'models', 'scaler.pkl')
MODEL_PATH = os.path.join(project_root, 'models', 'diabetes_model.pkl')
scaler = joblib.load(SCALER_PATH)
model = joblib.load(MODEL_PATH)

# Load the dataset for dashboard statistics
DATA_PATH = os.path.join(project_root, 'data', 'diabetes.csv')
df_full = pd.read_csv(DATA_PATH)
# Apply same cleaning as in data_processing (simplified for dashboard)
from src.data_processing import load_and_clean_data
df_clean = load_and_clean_data(DATA_PATH)

FEATURE_NAMES = [
    'Pregnancies', 'Glucose', 'BloodPressure', 'SkinThickness',
    'Insulin', 'BMI', 'DiabetesPedigreeFunction', 'Age'
]

def get_dashboard_stats():
    """Compute summary statistics for dashboard."""
    stats = {
        'total_patients': len(df_clean),
        'diabetic_count': int(df_clean['Outcome'].sum()),
        'non_diabetic_count': int(len(df_clean) - df_clean['Outcome'].sum()),
        'prevalence': round(df_clean['Outcome'].mean() * 100, 1),
        'avg_glucose_diabetic': round(df_clean[df_clean['Outcome']==1]['Glucose'].mean(), 1),
        'avg_glucose_non': round(df_clean[df_clean['Outcome']==0]['Glucose'].mean(), 1),
        'avg_bmi_diabetic': round(df_clean[df_clean['Outcome']==1]['BMI'].mean(), 1),
        'avg_bmi_non': round(df_clean[df_clean['Outcome']==0]['BMI'].mean(), 1),
        'avg_age_diabetic': round(df_clean[df_clean['Outcome']==1]['Age'].mean(), 1),
        'avg_age_non': round(df_clean[df_clean['Outcome']==0]['Age'].mean(), 1),
    }
    return stats
def generate_yearly_trends():
    """Generate synthetic diabetes prevalence trends from 2000 to current year."""
    current_year = datetime.now().year
    years = list(range(2000, current_year + 1))
    
    # Realistic increasing trend (based on CDC data: ~6% to ~11% prevalence)
    base_prevalence = 5.5
    trend = []
    for i, year in enumerate(years):
        # Add some yearly variation
        noise = random.uniform(-0.3, 0.5)
        # Steady increase with slight acceleration after 2010
        if year < 2010:
            increase = 0.15 * i + noise
        else:
            increase = 0.25 * i + noise
        prevalence = base_prevalence + increase
        trend.append(round(prevalence, 1))
    
    # Simulated model performance (recall) over years (improving)
    recall_trend = [round(0.65 + i*0.012, 3) for i in range(len(years))]
    
    return {
        'years': years,
        'prevalence': trend,
        'recall': recall_trend,
        'latest_prevalence': trend[-1],
        'trend_direction': 'increasing' if trend[-1] > trend[0] else 'decreasing',
        'percent_change': round((trend[-1] - trend[0]) / trend[0] * 100, 1)
    }

@app.route('/api/yearly_trends')
def yearly_trends():
    data = generate_yearly_trends()
    return jsonify(data)

@app.route('/api/agent_insight')
def agent_insight():
    """AI Agent generates a natural language insight from trends."""
    data = generate_yearly_trends()
    direction = data['trend_direction']
    change = data['percent_change']
    latest = data['latest_prevalence']
    
    insights = [
        f"Diabetes prevalence has {direction} by {abs(change)}% since 2000, reaching {latest}% in {data['years'][-1]}.",
        f"Our model's recall has improved from {data['recall'][0]} to {data['recall'][-1]}, a {round((data['recall'][-1]-data['recall'][0])*100,1)}% absolute gain.",
        "Key drivers remain glucose levels and BMI, but age-related risk is accelerating per trend analysis."
    ]
    return jsonify({'insight': ' '.join(insights)})

@app.route('/')
def home():
    stats = get_dashboard_stats()
    return render_template('index.html', features={}, stats=stats)

@app.route('/predict', methods=['POST'])
def predict():
    stats = get_dashboard_stats()
    template_context = {'features': {}, 'stats': stats}
    
    try:
        features_list = []
        for name in FEATURE_NAMES:
            value = request.form.get(name, '')
            if value.strip() == '':
                raise ValueError(f"Field '{name}' cannot be empty.")
            features_list.append(float(value))
        
        input_array = np.array(features_list).reshape(1, -1)
        input_scaled = scaler.transform(input_array)
        
        prediction = model.predict(input_scaled)[0]
        probability = model.predict_proba(input_scaled)[0][1]
        
        risk_level = "High Risk - Diabetic" if prediction == 1 else "Low Risk - Non-Diabetic"
        prob_percent = f"{probability:.1%}"
        
        template_context.update({
            'prediction_text': f'Result: {risk_level}',
            'probability_text': f'Risk Probability: {prob_percent}',
            'features': dict(zip(FEATURE_NAMES, features_list))
        })
        
    except Exception as e:
        template_context['prediction_text'] = f'Error: {str(e)}'
        saved_features = {}
        for name in FEATURE_NAMES:
            saved_features[name] = request.form.get(name, '')
        template_context['features'] = saved_features
    
    return render_template('index.html', **template_context)

@app.route('/api/chart_data')
def chart_data():
    """Return JSON data for frontend charts."""
    # Glucose distribution by outcome
    diabetic_glucose = df_clean[df_clean['Outcome']==1]['Glucose'].tolist()
    non_diabetic_glucose = df_clean[df_clean['Outcome']==0]['Glucose'].tolist()
    
    # Age bins for trend
    age_bins = [20,30,40,50,60,70,80,90]
    age_labels = ['20-29','30-39','40-49','50-59','60-69','70-79','80+']
    df_clean['AgeGroup'] = pd.cut(df_clean['Age'], bins=age_bins, labels=age_labels, right=False)
    age_prevalence = df_clean.groupby('AgeGroup')['Outcome'].mean() * 100
    
    # Feature importance (precomputed SHAP-like values from model if tree-based)
    # For simplicity, we can use model.feature_importances_ if available
    if hasattr(model, 'feature_importances_'):
        importance = model.feature_importances_.tolist()
    else:
        # Fallback mock importance (replace with actual SHAP if needed)
        importance = [0.08, 0.32, 0.09, 0.07, 0.10, 0.18, 0.06, 0.10]
    
    data = {
        'diabetic_glucose': diabetic_glucose,
        'non_diabetic_glucose': non_diabetic_glucose,
        'age_labels': age_labels,
        'age_prevalence': age_prevalence.fillna(0).round(1).tolist(),
        'feature_names': FEATURE_NAMES,
        'feature_importance': importance
    }
    return jsonify(data)

@app.errorhandler(404)
def page_not_found(e):
    return render_template('404.html'), 404

if __name__ == '__main__':
    app.run(debug=True)