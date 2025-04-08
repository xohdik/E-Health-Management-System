import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import AuthContext from '../../context/AuthContext';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';

const BookAppointment = () => {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(true);
  const [doctors, setDoctors] = useState([]);
  const [specializations, setSpecializations] = useState([]);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [availableSlots, setAvailableSlots] = useState([]);
  const [formData, setFormData] = useState({
    doctorId: '',
    specialization: '',
    date: null,
    slot: '',
    type: 'in-person',
    reason: ''
  });
  const [step, setStep] = useState(1);
  const [error, setError] = useState(null);
  
  // Fetch doctors and specializations on component mount
  useEffect(() => {
    const fetchDoctors = async () => {
      try {
        const res = await axios.get('http://localhost:5000/api/users/doctors');
        console.log("Fetched doctors data:", res.data);
        setDoctors(res.data);
        
        // Extract unique specializations
        const specs = [...new Set(res.data.map(doc => doc.specialization))];
        setSpecializations(specs);
        
        setLoading(false);
      } catch (err) {
        console.error('Error fetching doctors:', err);
        setError('Failed to load doctors. Please try again later.');
        setLoading(false);
      }
    };
    
    fetchDoctors();
  }, []);
  
  // Filter doctors by specialization
  const filteredDoctors = formData.specialization 
    ? doctors.filter(doc => doc.specialization === formData.specialization)
    : doctors;
  
  // Fetch available slots when doctor and date are selected
  useEffect(() => {
    const fetchAvailableSlots = async () => {
      if (!formData.doctorId || !selectedDate) return;
      
      try {
        const date = selectedDate.toISOString().split('T')[0];
        const res = await axios.get('http://localhost:5000/api/appointments/slots', {
          params: {
            doctorId: formData.doctorId,
            date: date
          }
        });

        setAvailableSlots(res.data);
      } catch (err) {
        console.error('Error fetching available slots:', err);
        setError('Failed to load available time slots. Please try again later.');
      }
    };
    
    fetchAvailableSlots();
  }, [formData.doctorId, selectedDate]);
  
  // Handle form input changes
  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };
  
  // Handle date selection
  const handleDateChange = (date) => {
    setSelectedDate(date);
    setFormData({
      ...formData,
      date: date
    });
  };
  
  // Handle slot selection - FIXED to use just the time string
  const handleSlotSelect = (timeString) => {
    setFormData({
      ...formData,
      slot: timeString
    });
  };
  
  // New function to handle doctor selection with debugging
  const selectDoctor = (doctorId) => {
    console.log("Selecting doctor with ID:", doctorId);
    console.log("Doctor object type:", typeof doctorId);
    
    // Set doctor ID in form data
    setFormData(prev => {
      const updated = {...prev, doctorId: doctorId};
      console.log("Updated formData:", updated);
      return updated;
    });
  };
  
  // Get selected doctor information
  const getSelectedDoctor = () => {
    return doctors.find(doc => doc._id === formData.doctorId) || null;
  };
  
  // Get doctor display name
  const getDoctorDisplayName = (doctor) => {
    if (!doctor) return 'Not selected';
    
    if (doctor.user && doctor.user.firstName) {
      return `Dr. ${doctor.user.firstName} ${doctor.user.lastName}`;
    } else if (doctor.firstName) {
      return `Dr. ${doctor.firstName} ${doctor.lastName}`;
    } else {
      return `Doctor (${doctor.specialization})`;
    }
  };
  
  // Move to next step with debugging
  const nextStep = () => {
    console.log("Current step:", step);
    console.log("Current formData:", formData);
    
    if (step === 1 && !formData.specialization) {
      setError('Please select a specialization');
      console.log("Validation failed: No specialization selected");
      return;
    }
    
    if (step === 2 && !formData.doctorId) {
      setError('Please select a doctor');
      console.log("Validation failed: No doctor selected");
      return;
    }
    
    if (step === 3 && (!formData.date || !formData.slot)) {
      setError('Please select a date and time slot');
      console.log("Validation failed: No date or time slot selected");
      return;
    }
    
    console.log("Validation passed, moving to next step");
    setError(null);
    setStep(step + 1);
  };
  
  // Move to previous step
  const prevStep = () => {
    setStep(step - 1);
  };
  
  const bookAppointment = async (e) => {
    e.preventDefault();
    
    if (!formData.reason) {
      setError('Please provide a reason for your appointment');
      return;
    }
  
    try {
      // Get the token
      const token = localStorage.getItem('token');
      
      // Format the date for the backend
      const dateStr = formData.date.toISOString().split('T')[0]; // Format: YYYY-MM-DD
      
      // Create the appointment payload matching the backend requirements
      const appointmentData = {
        doctorId: formData.doctorId,
        date: dateStr,
        slot: formData.slot, // This is already the time string after our fix
        type: formData.type,
        reason: formData.reason,
        notes: '' // Optional notes
      };
      
      console.log("Sending appointment data:", appointmentData);
      
      // Send the request to create the appointment
      const response = await axios.post(
        'http://localhost:5000/api/appointments/book',
        appointmentData,
        { 
          headers: { 
            Authorization: `Bearer ${token}` 
          } 
        }
      );
  
      // On success, redirect to dashboard
      console.log("Appointment created successfully:", response.data);
      navigate('/appointments');
      
    } catch (error) {
      console.error('Booking error:', {
        message: error.message,
        fullError: error,
        response: error.response?.data
      });
      
      if (error.response?.data?.errors) {
        // Handle validation errors from backend
        const errorMessages = error.response.data.errors.map(err => err.msg).join(', ');
        setError(`Please fix the following: ${errorMessages}`);
      } else {
        setError(
          error.response?.data?.message || 
          'Failed to book appointment. Please try again.'
        );
      }
    }
  };
  
  if (loading) {
    return <div className="loading">Loading...</div>;
  }
  
  // Get the selected doctor for display
  const selectedDoctor = getSelectedDoctor();
  
  return (
    <div className="book-appointment-container">
      <h1>Book an Appointment</h1>
      
      {error && <div className="alert alert-danger">{error}</div>}
      
      <div className="appointment-steps">
        <div className={`step ${step === 1 ? 'active' : step > 1 ? 'completed' : ''}`}>
          <span className="step-number">1</span>
          <span className="step-title">Select Specialization</span>
        </div>
        <div className={`step ${step === 2 ? 'active' : step > 2 ? 'completed' : ''}`}>
          <span className="step-number">2</span>
          <span className="step-title">Choose Doctor</span>
        </div>
        <div className={`step ${step === 3 ? 'active' : step > 3 ? 'completed' : ''}`}>
          <span className="step-number">3</span>
          <span className="step-title">Pick Date & Time</span>
        </div>
        <div className={`step ${step === 4 ? 'active' : step > 4 ? 'completed' : ''}`}>
          <span className="step-number">4</span>
          <span className="step-title">Confirm Details</span>
        </div>
      </div>
      
      <div className="appointment-form">
        {step === 1 && (
          <div className="form-step">
            <h2>Select Specialization</h2>
            <div className="form-group">
              <label>Medical Specialization:</label>
              <select 
                name="specialization" 
                value={formData.specialization} 
                onChange={handleChange}
                className="form-control"
              >
                <option value="">Select Specialization</option>
                {specializations.map((spec, index) => (
                  <option key={index} value={spec}>{spec}</option>
                ))}
              </select>
            </div>
            <div className="form-actions">
              <button className="btn btn-primary" onClick={nextStep}>
                Next
              </button>
            </div>
          </div>
        )}
        
        {step === 2 && (
          <div className="form-step">
            <h2>Choose Doctor</h2>
            <div className="doctors-list">
              {filteredDoctors.length > 0 ? (
                filteredDoctors.map(doctor => (
                  <div 
                    key={doctor._id} 
                    className={`doctor-card ${formData.doctorId === doctor._id ? 'selected' : ''}`}
                    onClick={() => selectDoctor(doctor._id)}
                  >
                    <div className="doctor-avatar">
                      <i className="fas fa-user-md"></i>
                    </div>
                    <div className="doctor-info">
                      <h3>{getDoctorDisplayName(doctor)}</h3>
                      <p className="specialization">{doctor.specialization}</p>
                      <p className="experience">{doctor.yearsOfExperience} years experience</p>
                      <div className="rating">
                        {[...Array(5)].map((_, i) => (
                          <i 
                            key={i} 
                            className={`fas fa-star ${i < doctor.rating ? 'filled' : ''}`}
                          ></i>
                        ))}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <p>No doctors available for the selected specialization.</p>
              )}
            </div>
            <div className="form-actions">
              <button className="btn btn-secondary" onClick={prevStep}>
                Back
              </button>
              <button className="btn btn-primary" onClick={nextStep}>
                Next
              </button>
            </div>
          </div>
        )}
        
        {step === 3 && (
          <div className="form-step">
            <h2>Pick Date & Time</h2>

            <div className="date-time-selection">
              
              {/* Date Picker */}
              <div className="date-picker">
                <label>Select Date:</label>
                <DatePicker
                  selected={selectedDate}
                  onChange={handleDateChange}
                  minDate={new Date()}
                  dateFormat="MMMM d, yyyy"
                  className="form-control"
                />
              </div>

              {/* Appointment Type */}
              <div className="appointment-type">
                <label>Appointment Type:</label>
                <div className="type-options">
                  <label className="type-option">
                    <input
                      type="radio"
                      name="type"
                      value="in-person"
                      checked={formData.type === 'in-person'}
                      onChange={handleChange}
                    />
                    <span className="type-label">In-Person Visit</span>
                  </label>
                  <label className="type-option">
                    <input
                      type="radio"
                      name="type"
                      value="telemedicine"
                      checked={formData.type === 'telemedicine'}
                      onChange={handleChange}
                    />
                    <span className="type-label">Video Consultation</span>
                  </label>
                </div>
              </div>

              {/* Time Slots - FIXED */}
              <div className="time-slots">
                <label>Available Time Slots:</label>
                {availableSlots.length > 0 ? (
                  <div className="slots-grid">
                    {availableSlots.map((slot, index) => (
                      <div 
                        key={index}
                        className={`time-slot ${formData.slot === slot.time ? 'selected' : ''}`}
                        onClick={() => handleSlotSelect(slot.time)}
                      >
                        {slot.time}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p>No available slots for the selected date.</p>
                )}
              </div>
            </div>

            {/* Navigation Buttons */}
            <div className="form-actions">
              <button className="btn btn-secondary" onClick={prevStep}>
                Back
              </button>
              <button className="btn btn-primary" onClick={nextStep}>
                Next
              </button>
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="form-step">
            <h2>Confirm Appointment Details</h2>
            <div className="appointment-summary">
              <div className="summary-item">
                <span className="label">Doctor:</span>
                <span className="value">
                  {getDoctorDisplayName(selectedDoctor)}
                </span>
              </div>
              <div className="summary-item">
                <span className="label">Specialization:</span>
                <span className="value">{formData.specialization}</span>
              </div>
              <div className="summary-item">
                <span className="label">Date:</span>
                <span className="value">
                  {formData.date ? formData.date.toLocaleDateString() : ''}
                </span>
              </div>
              <div className="summary-item">
                <span className="label">Time:</span>
                <span className="value">{formData.slot}</span>
              </div>
              <div className="summary-item">
                <span className="label">Type:</span>
                <span className="value">
                  {formData.type === 'in-person' ? 'In-Person Visit' : 'Video Consultation'}
                </span>
              </div>
            </div>
            
            <div className="form-group">
              <label>Reason for Appointment:</label>
              <textarea
                name="reason"
                value={formData.reason}
                onChange={handleChange}
                className="form-control"
                rows="3"
                placeholder="Please briefly describe your symptoms or reason for visit"
              ></textarea>
            </div>
            
            <div className="form-actions">
              <button className="btn btn-secondary" onClick={prevStep}>
                Back
              </button>
              <button className="btn btn-primary" onClick={bookAppointment}>
                Confirm Booking
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default BookAppointment;