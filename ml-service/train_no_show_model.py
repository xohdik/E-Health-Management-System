import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestClassifier
from sklearn.preprocessing import StandardScaler, LabelEncoder
import joblib

# Simulate a dataset for no-show prediction
data = {
    'patientAge': [25, 30, 45, 60, 35, 50, 28, 40, 55, 32] * 10,
    'patientGender': ['M', 'F', 'M', 'F', 'M', 'F', 'M', 'F', 'M', 'F'] * 10,
    'appointmentType': ['in-person', 'telemedicine', 'in-person', 'telemedicine', 'in-person', 'telemedicine', 'in-person', 'telemedicine', 'in-person', 'telemedicine'] * 10,
    'appointmentHour': [9, 10, 11, 14, 15, 16, 9, 10, 13, 14] * 10,
    'appointmentDay': [1, 2, 3, 4, 5, 1, 2, 3, 4, 5] * 10,
    'daysUntilAppointment': [1, 3, 5, 7, 2, 4, 6, 8, 3, 5] * 10,
    'previousNoShowRate': [0.1, 0.2, 0.3, 0.4, 0.1, 0.2, 0.3, 0.4, 0.1, 0.2] * 10,
    'appointmentCount': [1, 5, 10, 15, 3, 7, 2, 8, 12, 4] * 10,
    'reason': ['Check-up', 'Follow-up', 'Check-up', 'Follow-up', 'Check-up', 'Follow-up', 'Check-up', 'Follow-up', 'Check-up', 'Follow-up'] * 10,
    'doctorSpecialization': ['General Practitioner', 'Cardiologist', 'General Practitioner', 'Cardiologist', 'General Practitioner', 'Cardiologist', 'General Practitioner', 'Cardiologist', 'General Practitioner', 'Cardiologist'] * 10,
    'telemedicineEnabled': [True, False, True, False, True, False, True, False, True, False] * 10,
    'noShow': [0, 1, 0, 1, 0, 1, 0, 1, 0, 1] * 10  # 0 = attended, 1 = no-show
}

df = pd.DataFrame(data)

# Encode categorical variables
label_encoders = {}
categorical_columns = ['patientGender', 'appointmentType', 'reason', 'doctorSpecialization']
for col in categorical_columns:
    label_encoders[col] = LabelEncoder()
    df[col] = label_encoders[col].fit_transform(df[col])

# Features and target
X = df.drop('noShow', axis=1)
y = df['noShow']

# Split the data
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

# Scale the features
scaler = StandardScaler()
X_train_scaled = scaler.fit_transform(X_train)
X_test_scaled = scaler.transform(X_test)

# Train a Random Forest model
model = RandomForestClassifier(n_estimators=100, random_state=42)
model.fit(X_train_scaled, y_train)

# Evaluate the model
accuracy = model.score(X_test_scaled, y_test)
print(f"Model accuracy: {accuracy * 100:.2f}%")

# Save the model, scaler, and label encoders
joblib.dump(model, 'no_show_model.pkl')
joblib.dump(scaler, 'no_show_scaler.pkl')
joblib.dump(label_encoders, 'no_show_label_encoders.pkl')
print("Model, scaler, and label encoders saved successfully.")