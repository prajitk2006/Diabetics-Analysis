import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler

def load_and_clean_data(filepath):
    df = pd.read_csv(filepath)
    
    zero_cols = ['Glucose', 'BloodPressure', 'SkinThickness', 'Insulin', 'BMI']
    df[zero_cols] = df[zero_cols].replace(0, np.nan)
    
    medians = df[zero_cols].median()
    df[zero_cols] = df[zero_cols].fillna(medians)
    
    return df

def scale_features(X_train, X_test):
    """
    Standardizes features to have mean=0 and variance=1.
    Returns the scaler object so it can be saved for later use in Flask app.
    """
    scaler = StandardScaler()
    X_train_scaled = scaler.fit_transform(X_train)
    X_test_scaled = scaler.transform(X_test)
    return X_train_scaled, X_test_scaled, scaler

def prepare_data(filepath, test_size=0.2, random_state=42):
    """
    Master pipeline: Load -> Clean -> Split -> Scale.
    Returns everything needed for modeling.
    """
    df = load_and_clean_data(filepath)
    
    X = df.drop('Outcome', axis=1)
    y = df['Outcome']
    
    
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=test_size, random_state=random_state, stratify=y)
    
    X_train_scaled, X_test_scaled, scaler = scale_features(X_train, X_test)
    
    return X_train_scaled, X_test_scaled, y_train, y_test, scaler, X.columns.tolist()