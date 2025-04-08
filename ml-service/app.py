from flask import Flask, request, jsonify
import pandas as pd
import numpy as np
import os
from flask_cors import CORS
from datetime import datetime, timedelta
import pickle
from sklearn.preprocessing import StandardScaler

app = Flask(__name__)
CORS(app)

# Global variables for models
no_show_model = None
scaler = None

# Check if models exist, otherwise create placeholder models
def load_or_create_models():
    global no_show_model, scaler
    
    try:
        # For now, we'll use simple heuristics instead of ML models
        print("Using heuristic models for predictions")
    except:
        print("Error initializing models")

# Initialize on startup
load_or_create_models()

@app.route('/predict/no-show', methods=['POST'])
def predict_no_show():
    """
    Predicts the probability of a no-show for an appointment
    
    Expected input:
    {
        "patientAge": int,
        "patientGender": string,
        "appointmentType": string,
        "appointmentHour": int,
        "appointmentDay": int,
        "daysUntilAppointment": int,
        "previousNoShowRate": float,
        "appointmentCount": int
    }
    """
    data = request.get_json()
    
    # Simple heuristic model to predict no-show probability
    probability = 0.1  # Base probability
    
    # Factors that increase no-show probability
    if data.get('previousNoShowRate', 0) > 0.2:
        probability += 0.2
    
    if data.get('daysUntilAppointment', 0) > 10:
        probability += 0.1
    
    if data.get('appointmentHour', 12) < 9:
        probability += 0.1  # Early morning appointments have higher no-show rates
    
    if data.get('appointmentHour', 12) > 16:
        probability += 0.1  # Late afternoon appointments have higher no-show rates
    
    if data.get('appointmentDay', 3) == 0 or data.get('appointmentDay', 3) == 6:
        probability += 0.1  # Weekend appointments have higher no-show rates
    
    if data.get('appointmentCount', 0) < 2:
        probability += 0.1  # New patients have higher no-show rates
    
    # Cap probability between 0 and 1
    probability = max(0, min(1, probability))
    
    return jsonify({
        'probability': probability
    })

@app.route('/optimize/schedule', methods=['POST'])
def optimize_schedule():
    """
    Optimizes a doctor's schedule for a given day
    
    Expected input:
    {
        "doctorId": string,
        "date": string (format: "YYYY-MM-DD"),
        "existingAppointments": [
            {
                "id": string,
                "startTime": string (format: "HH:MM"),
                "duration": int,
                "noShowProbability": float
            }
        ]
    }
    """
    data = request.get_json()
    
    # Default working hours
    start_time = "09:00"
    end_time = "17:00"
    
    # Default appointment duration
    appointment_duration = 30
    
    # Parse existing appointments
    existing_appointments = data.get('existingAppointments', [])
    
    # Convert date to datetime
    try:
        selected_date = datetime.strptime(data.get('date', '2023-01-01'), '%Y-%m-%d')
    except:
        selected_date = datetime.now()
    
    # Find available slots
    available_slots = []
    current_time = datetime.strptime(start_time, '%H:%M')
    end_datetime = datetime.strptime(end_time, '%H:%M')
    
    while current_time < end_datetime:
        # Check if this time slot overlaps with existing appointments
        current_time_str = current_time.strftime('%H:%M')
        slot_end_time = (current_time + timedelta(minutes=appointment_duration)).strftime('%H:%M')
        
        is_available = True
        for appt in existing_appointments:
            appt_start = datetime.strptime(appt.get('startTime', '00:00'), '%H:%M')
            appt_end = appt_start + timedelta(minutes=appt.get('duration', 30))
            
            if (current_time < appt_end and 
                current_time + timedelta(minutes=appointment_duration) > appt_start):
                is_available = False
                break
        
        if is_available:
            # Calculate optimality score based on time of day
            hour = current_time.hour
            
            # Preference for mid-morning and early afternoon slots
            time_preference = 0.7  # Default
            if 9 <= hour < 11:  # Mid-morning slots
                time_preference = 1.0
            elif 11 <= hour < 13:  # Around lunch
                time_preference = 0.6
            elif 13 <= hour < 15:  # Early afternoon
                time_preference = 0.9
            elif 15 <= hour < 17:  # Late afternoon
                time_preference = 0.8
            
            available_slots.append({
                'startTime': current_time_str,
                'endTime': slot_end_time,
                'optimalityScore': time_preference
            })
        
        # Move to next 30-minute slot
        current_time += timedelta(minutes=appointment_duration)
    
    # Sort slots by optimality score (best first)
    available_slots.sort(key=lambda x: x['optimalityScore'], reverse=True)
    
    return jsonify({
        'doctorId': data.get('doctorId', ''),
        'date': data.get('date', ''),
        'availableSlots': available_slots
    })

@app.route('/', methods=['GET'])
def health_check():
    return jsonify({
        'status': 'healthy',
        'message': 'ML service is running'
    })

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5001))
    app.run(host='0.0.0.0', port=port, debug=True)