# src/train_model.py
import pandas as pd
import joblib
import os
from sklearn.linear_model import LogisticRegression
from sklearn.ensemble import RandomForestClassifier
from xgboost import XGBClassifier
from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score, roc_auc_score, confusion_matrix

from data_processing import prepare_data

def train_and_evaluate():
    filepath = os.path.join('data', 'diabetes.csv')
    X_train, X_test, y_train, y_test, scaler, feature_names = prepare_data(filepath)
    
    joblib.dump(scaler, 'models/scaler.pkl')
    
    models = {
        "Logistic Regression": LogisticRegression(max_iter=1000, random_state=42),
        "Random Forest": RandomForestClassifier(n_estimators=100, random_state=42),
        "XGBoost": XGBClassifier(eval_metric='logloss', random_state=42)
    }
    
    results = []
    best_model = None
    best_recall = 0
    
    for name, model in models.items():
        model.fit(X_train, y_train)
        y_pred = model.predict(X_test)
        y_proba = model.predict_proba(X_test)[:, 1]
        
        recall = recall_score(y_test, y_pred)
        f1 = f1_score(y_test, y_pred)
        roc_auc = roc_auc_score(y_test, y_proba)
        tn, fp, fn, tp = confusion_matrix(y_test, y_pred).ravel()
        
        results.append({
            "Model": name,
            "Accuracy": accuracy_score(y_test, y_pred),
            "Precision": precision_score(y_test, y_pred),
            "Recall (Sensitivity)": recall,
            "F1-Score": f1,
            "ROC-AUC": roc_auc,
            "False Negatives (Missed Cases)": fn,
            "False Positives (False Alarms)": fp
        })
        
        if recall > best_recall:
            best_recall = recall
            best_model = model
            
    joblib.dump(best_model, 'models/diabetes_model_xgb.pkl')
    print(f"Best model saved with Recall: {best_recall:.3f}")
    
    results_df = pd.DataFrame(results)
    print("\n--- Model Comparison (Clinical Focus) ---")
    print(results_df.to_string(index=False))
    
    return best_model, X_test, y_test, feature_names

if __name__ == "__main__":
    best_model, X_test, y_test, feature_names = train_and_evaluate()