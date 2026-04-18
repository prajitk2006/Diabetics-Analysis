# tests/test_processing.py
import sys
import os
project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, project_root)

import pandas as pd
import numpy as np
import pytest
from src.data_processing import load_and_clean_data

@pytest.fixture
def sample_data():
    data = {
        'Pregnancies': [6, 1],
        'Glucose': [0, 120],
        'BloodPressure': [72, 0],
        'SkinThickness': [35, 29],
        'Insulin': [0, 94],
        'BMI': [33.6, 0],
        'DiabetesPedigreeFunction': [0.627, 0.351],
        'Age': [50, 31],
        'Outcome': [1, 0]
    }
    return pd.DataFrame(data)

def test_zero_replacement(sample_data, tmp_path):
    temp_file = tmp_path / "test_diabetes.csv"
    sample_data.to_csv(temp_file, index=False)
    
    cleaned = load_and_clean_data(temp_file)
    
    clinical_cols = ['Glucose', 'BloodPressure', 'SkinThickness', 'Insulin', 'BMI']
    for col in clinical_cols:
        assert (cleaned[col] == 0).sum() == 0, f"Zero found in {col}"
    
    assert cleaned['Glucose'].iloc[0] == 120.0