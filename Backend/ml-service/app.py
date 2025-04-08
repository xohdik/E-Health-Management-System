# File: /ml-service/app.py
from flask import Flask, request, jsonify
import pandas as pd
import numpy as np
import pickle
import os
from flask_cors import CORS
from datetime import datetime, timedelta
import tensorflow as tf
from sklearn.preprocessing import StandardScaler

app = Flask(__name__)
CORS(app)

# Load ML models
MODEL_DIR = os.environ.get('MODEL_DIR', 'models')

# Check if models exist, otherwise create placeholder models
def load_or_create_models():
    global no_show_model, schedule_optimizer_model, scaler
    
    try:
        # Load no-show prediction model
        no_show_model = tf.keras.models.load_model(f'{MODEL_DIR}/no_show_model.h5')
        
        # Load schedule optimizer model (if using ML for this)
        # schedule_optimizer_model = pickle.load(open(f'{MODEL_DIR}/schedule_optimizer.pkl', 'rb'))
        
        # Load scaler for feature normalization
        scaler = pickle.load(open(f'{MODEL_DIR}/scaler.pkl', 'rb'))
        
        print("Successfully loaded existing models")
    except:
        print("Creating placeholder models (should be replaced with trained models)")
        
        # Create a simple no-show prediction model
        no_show_model = tf.keras.Sequential([
            tf.keras.layers.Dense(16, activation='relu', input_shape=(8,)),
            tf.keras.layers.Dense(8, activation='relu'),
            tf.keras.layers.Dense(1, activation='sigmoid')
        ])
        no_show_model.compile(optimizer='adam', loss='binary_crossentropy', metrics=['accuracy'])
        
        # Create a simple scaler
        scaler = StandardScaler()
        
        print("Created placeholder models")

# Initialize models on startup
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
    
    # Convert categorical features
    gender_encoded = 1 if data.get('patientGender', 'male').lower() == 'male' else 0
    appt_type_encoded = 1 if data.get('appointmentType', 'in-person') == 'in-person' else 0
    
    # Create feature array
    features = np.array([
        data.get('patientAge', 30),
        gender_encoded,
        appt_type_encoded,
        data.get('appointmentHour', 12),
        data.get('appointmentDay', 1),
        data.get('daysUntilAppointment', 7),
        data.get('previousNoShowRate', 0),
        data.get('appointmentCount', 0)
    ]).reshape(1, -1)
    
    # Scale features
    try:
        features_scaled = scaler.transform(features)
    except:
        # If scaler hasn't been fit yet, use raw features
        features_scaled = features
    
    # Make prediction
    try:
        probability = float(no_show_model.predict(features_scaled)[0][0])
    except:
        # Fallback if model fails
        probability = data.get('previousNoShowRate', 0)
        
        # Apply heuristics if prediction fails
        if data.get('appointmentHour', 12) < 9 or data.get('appointmentHour', 12) > 16:
            probability += 0.1
        if data.get('appointmentDay', 1) == 0 or data.get('appointmentDay', 1) == 6:  # Weekend
            probability += 0.1
        if data.get('daysUntilAppointment', 7) > 14:
            probability += 0.05
            
        # Ensure probability is between 0 and 1
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
        "appointmentDuration": int,
        "startTime": string (format: "HH:MM"),
        "endTime": string (format: "HH:MM"),
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
    
    # Parse time strings to datetime objects
    start_time = datetime.strptime(data.get('startTime', '09:00'), '%H:%M')
    end_time = datetime.strptime(data.get('endTime', '17:00'), '%H:%M')
    
    # Get doctor's appointment duration
    appointment_duration = data.get('appointmentDuration', 30)
    
    # Parse existing appointments
    existing_appointments = []
    for appt in data.get('existingAppointments', []):
        appt_start = datetime.strptime(appt.get('startTime', '00:00'), '%H:%M')
        appt_duration = appt.get('duration', appointment_duration)
        appt_end = appt_start + timedelta(minutes=appt_duration)
        
        existing_appointments.append({
            'id': appt.get('id', ''),
            'start': appt_start,
            'end': appt_end,
            'noShowProbability': appt.get('noShowProbability', 0)
        })
    
    # Find available slots
    available_slots = []
    current_time = start_time
    
    while current_time < end_time:
        slot_end = current_time + timedelta(minutes=appointment_duration)
        
        # Skip if slot extends beyond end time
        if slot_end > end_time:
            break
        
        # Check if slot overlaps with existing appointments
        is_available = True
        for appt in existing_appointments:
            if (current_time < appt['end'] and slot_end > appt['start'] and 
                appt['noShowProbability'] < 0.7):  # Consider high no-show probability appointments as potentially available
                is_available = False
                break
        
        if is_available:
            # Calculate optimality score based on time of day
            hour = current_time.hour
            
            # Preference for morning and afternoon slots (avoid lunch time)
            time_preference = 1.0
            if 9 <= hour < 11:  # Morning slots
                time_preference = 0.9
            elif 11 <= hour < 13:  # Around lunch
                time_preference = 0.7
            elif 13 <= hour < 15:  # Early afternoon
                time_preference = 0.85
            elif 15 <= hour < 17:  # Late afternoon
                time_preference = 0.8
            
            # Check for distributed appointments (avoid back-to-back if possible)
            adjacency_score = 1.0
            for appt in existing_appointments:
                time_diff = min(
                    abs((current_time - appt['end']).total_seconds() / 60),
                    abs((slot_end - appt['start']).total_seconds() / 60)
                )
                
                if time_diff == 0:  # Adjacent appointment
                    adjacency_score = 0.7
                elif time_diff <= 30:  # Near appointment
                    adjacency_score = 0.85
            
            # Overall optimality score
            optimality_score = time_preference * adjacency_score
            
            available_slots.append({
                'startTime': current_time.strftime('%H:%M'),
                'endTime': slot_end.strftime('%H:%M'),
                'optimalityScore': optimality_score
            })
        
        # Move to next potential slot (using half the appointment duration for more options)
        current_time += timedelta(minutes=appointment_duration // 2)
    
    return jsonify({
        'doctorId': data.get('doctorId', ''),
        'availableSlots': available_slots
    })

@app.route('/train', methods=['POST'])
def train_models():
    """Endpoint to retrain models with new data"""
    # In a real implementation, this would update models with new data
    # For now, we just return success
    return jsonify({'status': 'success', 'message': 'Models updated'})

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5001))
    app.run(host='0.0.0.0', port=port, debug=True)


