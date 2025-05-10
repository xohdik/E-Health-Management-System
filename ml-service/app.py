from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware  # Add this import
from fastapi.responses import HTMLResponse
from pydantic import BaseModel
from typing import List
import joblib
import numpy as np
import pandas as pd
from datetime import datetime

app = FastAPI()

# Add CORS middleware to allow requests from the frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # Allow requests from your frontend
    allow_credentials=True,
    allow_methods=["*"],  # Allow all HTTP methods (GET, POST, OPTIONS, etc.)
    allow_headers=["*"],  # Allow all headers
)

# Load the no-show prediction model, scaler, and label encoders
try:
    model = joblib.load('no_show_model.pkl')
    scaler = joblib.load('no_show_scaler.pkl')
    label_encoders = joblib.load('no_show_label_encoders.pkl')
except Exception as e:
    raise Exception(f"Error loading model, scaler, or label encoders: {str(e)}")

# Input model for no-show prediction
class NoShowInput(BaseModel):
    patientAge: int
    patientGender: str
    appointmentType: str
    appointmentHour: int
    appointmentDay: int
    daysUntilAppointment: int
    previousNoShowRate: float
    appointmentCount: int
    reason: str
    doctorSpecialization: str
    telemedicineEnabled: bool

# Input models for schedule optimization
class Appointment(BaseModel):
    id: str
    startTime: str  # HH:MM format
    duration: int  # in minutes
    noShowProbability: float

class ScheduleInput(BaseModel):
    doctorId: str
    date: str  # ISO format
    existingAppointments: List[Appointment]

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse
from pydantic import BaseModel
from typing import List
import joblib
import numpy as np
import pandas as pd
from datetime import datetime

app = FastAPI()

# Add CORS middleware to allow requests from the frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Load the no-show prediction model, scaler, and label encoders
try:
    model = joblib.load('no_show_model.pkl')
    scaler = joblib.load('no_show_scaler.pkl')
    label_encoders = joblib.load('no_show_label_encoders.pkl')
except Exception as e:
    raise Exception(f"Error loading model, scaler, or label encoders: {str(e)}")

# Input model for no-show prediction
class NoShowInput(BaseModel):
    patientAge: int
    patientGender: str
    appointmentType: str
    appointmentHour: int
    appointmentDay: int
    daysUntilAppointment: int
    previousNoShowRate: float
    appointmentCount: int
    reason: str
    doctorSpecialization: str
    telemedicineEnabled: bool

# Input models for schedule optimization
class Appointment(BaseModel):
    id: str
    startTime: str  # HH:MM format
    duration: int  # in minutes
    noShowProbability: float

class ScheduleInput(BaseModel):
    doctorId: str
    date: str  # ISO format
    existingAppointments: List[Appointment]

@app.post("/predict/no-show")
async def predict_no_show(data: NoShowInput):
    try:
        print("Received no-show input:", data.dict())  # Add this log

        # Convert input to DataFrame
        input_df = pd.DataFrame([data.dict()])

        # Encode categorical variables
        categorical_columns = ['patientGender', 'appointmentType', 'reason', 'doctorSpecialization']
        for col in categorical_columns:
            if col in label_encoders:
                # Handle unseen labels by mapping to a default value (e.g., most frequent)
                input_df[col] = input_df[col].map(
                    lambda x: x if x in label_encoders[col].classes_ else label_encoders[col].classes_[0]
                )
                input_df[col] = label_encoders[col].transform(input_df[col])
            else:
                raise ValueError(f"No label encoder found for {col}")

        # Ensure the order of columns matches the training data
        feature_order = [
            'patientAge', 'patientGender', 'appointmentType', 'appointmentHour',
            'appointmentDay', 'daysUntilAppointment', 'previousNoShowRate',
            'appointmentCount', 'reason', 'doctorSpecialization', 'telemedicineEnabled'
        ]
        input_df = input_df[feature_order]

        # Scale the input data
        input_scaled = scaler.transform(input_df)

        # Make prediction
        probability = model.predict_proba(input_scaled)[0][1]  # Probability of no-show (class 1)

        print("Predicted probability:", probability)  # Add this log

        return {"probability": float(probability)}
    except Exception as e:
        print("Prediction error:", str(e))  # Add this log
        raise HTTPException(status_code=500, detail=f"Prediction error: {str(e)}")

@app.post("/optimize/schedule")
async def optimize_schedule(data: ScheduleInput):
    try:
        # Parse the date
        target_date = datetime.fromisoformat(data.date.replace('Z', '+00:00')).date()

        # Parse existing appointments
        appointments = []
        for apt in data.existingAppointments:
            start_time = datetime.strptime(apt.startTime, '%H:%M')
            start_datetime = datetime.combine(target_date, start_time.time())
            end_datetime = start_datetime + pd.Timedelta(minutes=apt.duration)
            appointments.append({
                'start': start_datetime,
                'end': end_datetime,
                'noShowProbability': apt.noShowProbability
            })

        # Define working hours (9:00 to 17:00)
        start_hour = 9
        end_hour = 17
        day_start = datetime.combine(target_date, datetime.strptime(f"{start_hour}:00", '%H:%M').time())
        day_end = datetime.combine(target_date, datetime.strptime(f"{end_hour}:00", '%H:%M').time())

        # Generate possible 30-minute slots
        slots = []
        current_time = day_start
        while current_time < day_end:
            slot_end = current_time + pd.Timedelta(minutes=30)
            if slot_end <= day_end:
                # Check if the slot overlaps with any existing appointment
                is_available = True
                for apt in appointments:
                    if (current_time < apt['end'] and slot_end > apt['start']):
                        is_available = False
                        break
                if is_available:
                    # Calculate an optimality score based on no-show probabilities of nearby appointments
                    nearby_risk = 0
                    nearby_count = 0
                    for apt in appointments:
                        if abs((apt['start'] - current_time).total_seconds()) < 3600:  # Within 1 hour
                            nearby_risk += apt['noShowProbability']
                            nearby_count += 1
                    avg_nearby_risk = nearby_risk / (nearby_count + 1)  # Avoid division by zero
                    optimality_score = 1 - avg_nearby_risk  # Higher score if lower nearby risk

                    slots.append({
                        "startTime": current_time.strftime('%H:%M'),
                        "endTime": slot_end.strftime('%H:%M'),
                        "optimalityScore": float(optimality_score)
                    })
            current_time = slot_end

        return {"availableSlots": slots}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Optimization error: {str(e)}")
    
@app.get("/", response_class=HTMLResponse)
async def root():
    return """
    <html>
        <head>
            <title>E-Health ML Service</title>
            <style>
                body { 
                    font-family: Arial, sans-serif; 
                    background-color: #f4f4f9; 
                    text-align: center; 
                    padding-top: 100px;
                }
                h1 {
                    color: #4CAF50;
                    font-size: 36px;
                }
                p {
                    color: #555;
                    font-size: 18px;
                }
            </style>
        </head>
        <body>
            <h1>🚀 ML Service for E-Health Management System is Running</h1>
            <p>Prediction and scheduling endpoints available.</p>
        </body>
    </html>
    """
