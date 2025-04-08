# File: /ml-service/train_models.py
"""
Script to train the machine learning models for appointment optimization
"""
import pandas as pd
import numpy as np
import tensorflow as tf
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler
import pickle
import os

# Create models directory if it doesn't exist
os.makedirs('models', exist_ok=True)

def generate_synthetic_data(n_samples=1000):
    """Generate synthetic data for model training"""
    np.random.seed(42)
    
    # Patient features
    patient_age = np.random.normal(45, 15, n_samples).astype(int)
    patient_age = np.clip(patient_age, 18, 90)
    
    patient_gender = np.random.binomial(1, 0.5, n_samples)  # 0=female, 1=male
    
    # Appointment features
    appointment_type = np.random.binomial(1, 0.7, n_samples)  # 0=telemedicine, 1=in-person
    appointment_hour = np.random.choice(range(8, 18), n_samples)
    appointment_day = np.random.choice(range(7), n_samples)  # 0=Sunday, 6=Saturday
    days_until_appointment = np.random.exponential(7, n_samples).astype(int) + 1
    
    # Patient history
    previous_no_show_rate = np.random.beta(2, 8, n_samples)  # Most patients have low no-show rates
    appointment_count = np.random.poisson(5, n_samples)
    
    # Generate target: no-show probability
    # Base the target on logical patterns:
    # - Higher no-show for earlier/later hours
    # - Higher no-show for longer wait times
    # - Higher no-show for patients with history of no-shows
    
    hour_factor = np.abs(appointment_hour - 13) / 5  # Distance from 1pm
    wait_factor = np.clip(days_until_appointment / 30, 0, 1)  # Longer waits -> higher no-show
    
    no_show = previous_no_show_rate * 0.5 + hour_factor * 0.2 + wait_factor * 0.3
    no_show = np.clip(no_show + np.random.normal(0, 0.1, n_samples), 0, 1)
    
    # Create dataframe
    df = pd.DataFrame({
        'patient_age': patient_age,
        'patient_gender': patient_gender,
        'appointment_type': appointment_type,
        'appointment_hour': appointment_hour,
        'appointment_day': appointment_day,
        'days_until_appointment': days_until_appointment,
        'previous_no_show_rate': previous_no_show_rate,
        'appointment_count': appointment_count,
        'no_show': no_show
    })
    
    return df

def train_no_show_model(df):
    """Train a model to predict no-show probability"""
    # Split features and target
    X = df[['patient_age', 'patient_gender', 'appointment_type', 
            'appointment_hour', 'appointment_day', 'days_until_appointment',
            'previous_no_show_rate', 'appointment_count']]
    y = df['no_show']
    
    # Split data
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
    
    # Scale features
    scaler = StandardScaler()
    X_train_scaled = scaler.fit_transform(X_train)
    X_test_scaled = scaler.transform(X_test)
    
    # Create model
    model = tf.keras.Sequential([
        tf.keras.layers.Dense(16, activation='relu', input_shape=(X_train.shape[1],)),
        tf.keras.layers.Dense(8, activation='relu'),
        tf.keras.layers.Dense(1, activation='sigmoid')
    ])
    
    # Compile model
    model.compile(optimizer='adam',
                  loss='mean_squared_error',
                  metrics=['mean_absolute_error'])
    
    # Train model
    model.fit(X_train_scaled, y_train, epochs=50, batch_size=32, verbose=1)
    
    # Evaluate model
    loss, mae = model.evaluate(X_test_scaled, y_test, verbose=0)
    print(f"No-show model - Test MAE: {mae:.4f}")
    
    # Save model and scaler
    model.save('models/no_show_model.h5')
    pickle.dump(scaler, open('models/scaler.pkl', 'wb'))
    
    return model, scaler

if __name__ == "__main__":
    print("Generating synthetic data...")
    data = generate_synthetic_data(10000)
    
    print("Training no-show prediction model...")
    train_no_show_model(data)
    
    print("Training complete. Models saved to 'models/' directory.")