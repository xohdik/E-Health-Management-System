import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';

const BookAppointment = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [bookingLoading, setBookingLoading] = useState(false);
  const [doctors, setDoctors] = useState([]);
  const [specializations, setSpecializations] = useState([]);
  const [patientDetails, setPatientDetails] = useState(null);
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
  const [noShowProbability, setNoShowProbability] = useState(null); // New state for no-show probability
  const [predictionLoading, setPredictionLoading] = useState(false); // New state for prediction loading
  const [predictionError, setPredictionError] = useState(null); // New state for prediction error

  // Fetch doctors
  useEffect(() => {
    const fetchDoctors = async () => {
      try {
        const res = await axios.get('/users/doctors');
        console.log("Fetched doctors data:", res.data);
        setDoctors(res.data);
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

  // Fetch patient details
  useEffect(() => {
    const fetchPatientDetails = async () => {
      try {
        const res = await axios.get('/users/patient-details', {
          params: { patientId: user.id }
        });
        console.log("Fetched patient details:", res.data);
        setPatientDetails(res.data);
      } catch (err) {
        console.error('Error fetching patient details:', err);
        setError('Failed to load patient details. Please try again later.');
      }
    };

    fetchPatientDetails();
  }, [user.id]);

  const filteredDoctors = formData.specialization
    ? doctors.filter(doc => doc.specialization === formData.specialization)
    : doctors;

  useEffect(() => {
    const fetchAvailableSlots = async () => {
      if (!formData.doctorId || !selectedDate) {
        console.log('Skipping fetchAvailableSlots: doctorId or selectedDate missing', {
          doctorId: formData.doctorId,
          selectedDate
        });
        return;
      }

      try {
        const date = selectedDate.toISOString().split('T')[0];
        console.log('Fetching slots for:', { doctorId: formData.doctorId, date });

        const res = await axios.get('/appointments/slots', {
          params: {
            doctorId: formData.doctorId,
            date: date
          }
        });

        console.log('Available slots response:', res.data);
        const formattedSlots = res.data
          .filter(slot => slot.available)
          .map(slot => {
            const [hour, minute] = slot.time.split(':').map(Number);
            const period = hour >= 12 ? 'PM' : 'AM';
            const adjustedHour = hour % 12 || 12;
            const timeString = `${adjustedHour}:${minute.toString().padStart(2, '0')} ${period}`;
            return { time: timeString };
          });
        setAvailableSlots(formattedSlots);
      } catch (err) {
        console.error('Error fetching available slots:', err);
        setError('Failed to load available time slots. Please try again later.');
      }
    };

    fetchAvailableSlots();
  }, [formData.doctorId, selectedDate]);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleDateChange = (date) => {
    setSelectedDate(date);
    setFormData({
      ...formData,
      date: date
    });
  };

  const handleSlotSelect = (timeString) => {
    setFormData({
      ...formData,
      slot: timeString
    });
  };

  const selectDoctor = (doctorId) => {
    console.log("Selecting doctor with ID:", doctorId);
    setFormData(prev => ({
      ...prev,
      doctorId: doctorId
    }));
  };

  const getSelectedDoctor = () => {
    return doctors.find(doc => doc._id === formData.doctorId) || null;
  };

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

  const nextStep = () => {
    console.log("Current step:", step);
    console.log("Current formData:", formData);

    if (step === 1 && !formData.specialization) {
      setError('Please select a specialization');
      return;
    }

    if (step === 2 && !formData.doctorId) {
      setError('Please select a doctor');
      return;
    }

    if (step === 3 && (!formData.date || !formData.slot)) {
      setError('Please select a date and time slot');
      return;
    }

    setError(null);
    setStep(step + 1);
  };

  const prevStep = () => {
    setError(null);
    setStep(step - 1);
  };

  // Function to predict no-show probability
  const predictNoShow = async () => {
    if (!formData.reason) {
      setPredictionError('Please provide a reason for your appointment');
      setNoShowProbability(null);
      return;
    }

    if (!patientDetails) {
      setPredictionError('Patient details are not loaded. Please try again later.');
      setNoShowProbability(null);
      return;
    }

    if (!formData.slot) {
      setPredictionError('Please select a time slot');
      setNoShowProbability(null);
      return;
    }

    if (!formData.date) {
      setPredictionError('Please select a date');
      setNoShowProbability(null);
      return;
    }

    setPredictionLoading(true);
    setPredictionError(null);
    setNoShowProbability(null);

    try {
      const [time, period] = formData.slot.split(' ');
      if (!time || !period) {
        throw new Error('Invalid time slot format');
      }
      let [hour, minute] = time.split(':').map(Number);
      if (isNaN(hour) || isNaN(minute)) {
        throw new Error('Invalid time slot values');
      }
      if (period === 'PM' && hour !== 12) hour += 12;
      if (period === 'AM' && hour === 12) hour = 0;

      const appointmentDate = new Date(formData.date);
      if (isNaN(appointmentDate.getTime())) {
        throw new Error('Invalid appointment date');
      }
      const today = new Date();
      const daysUntilAppointment = Math.ceil(
        (appointmentDate - today) / (1000 * 60 * 60 * 24)
      );
      const appointmentDay = appointmentDate.getDay();

      const patientGender = patientDetails.gender === 'Unknown' ? 'Other' : patientDetails.gender;

      const noShowInput = {
        patientAge: patientDetails.age,
        patientGender: patientGender,
        appointmentType: formData.type,
        appointmentHour: hour,
        appointmentDay: appointmentDay,
        daysUntilAppointment: daysUntilAppointment,
        previousNoShowRate: patientDetails.previousNoShowRate,
        appointmentCount: patientDetails.appointmentCount,
        reason: formData.reason,
        doctorSpecialization: formData.specialization,
        telemedicineEnabled: formData.type === 'telemedicine'
      };

      console.log('noShowInput:', noShowInput);

      const mlResponse = await axios.post('http://localhost:5001/predict/no-show', noShowInput);
      console.log("ML Service Response:", mlResponse.data);

      const probability = mlResponse.data.probability;
      setNoShowProbability(probability);
    } catch (error) {
      console.error('Prediction error:', {
        message: error.message,
        code: error.code,
        response: error.response?.data,
        status: error.response?.status,
        fullError: error
      });

      if (error.message.includes('5001')) {
        setPredictionError('ML service is unavailable. Please try again later.');
      } else if (error.response?.data?.detail) {
        const errorMessages = error.response.data.detail.map(err => err.msg).join(', ');
        setPredictionError(`ML service error: ${errorMessages}`);
      } else {
        setPredictionError(
          error.response?.data?.message ||
          error.message ||
          'Failed to predict no-show probability. Please try again.'
        );
      }
    } finally {
      setPredictionLoading(false);
    }
  };

  const bookAppointment = async (e) => {
    e.preventDefault();

    if (!formData.reason) {
      setError('Please provide a reason for your appointment');
      return;
    }

    if (noShowProbability === null && !predictionError) {
      setError('Please wait for the no-show probability to be calculated');
      return;
    }

    setBookingLoading(true);
    setError(null);

    try {
      // Step 1: Parse slot for backend
      const [time, period] = formData.slot.split(' ');
      if (!time || !period) {
        throw new Error('Invalid time slot format');
      }
      let [hour, minute] = time.split(':').map(Number);
      if (isNaN(hour) || isNaN(minute)) {
        throw new Error('Invalid time slot values');
      }
      if (period === 'PM' && hour !== 12) hour += 12;
      if (period === 'AM' && hour === 12) hour = 0;

      // Step 2: Format the appointment data
      const slotString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
      const dateStr = formData.date.toISOString().split('T')[0];
      const appointmentData = {
        doctorId: formData.doctorId,
        patientId: user.id,
        date: dateStr,
        slot: slotString,
        type: formData.type,
        reason: formData.reason,
        symptoms: formData.reason, // Use reason as symptoms
        notes: '',
        noShowProbability: noShowProbability || 0 // Use stored probability, fallback to 0
      };

      console.log("Sending appointment data:", appointmentData);

      // Step 3: Book the appointment
      const response = await axios.post('/appointments/book', appointmentData);
      console.log("Appointment created successfully:", response.data);
      navigate('/patient-dashboard');
    } catch (error) {
      console.error('Booking error:', {
        message: error.message,
        code: error.code,
        response: error.response?.data,
        status: error.response?.status,
        fullError: error
      });

      if (error.response?.data?.errors) {
        const errorMessages = error.response.data.errors.map(err => err.msg).join(', ');
        setError(`Please fix the following: ${errorMessages}`);
      } else {
        setError(
          error.response?.data?.message ||
          error.message ||
          'Failed to book appointment. Please try again.'
        );
      }
    } finally {
      setBookingLoading(false);
    }
  };

  if (loading || !patientDetails) {
    return (
      <div className="loading-container">
        <div className="loading-content">
          <h1 className="loading-logo">E-Health</h1>
          <div className="loading-bar"></div>
          <p className="loading-text">Loading...</p>
        </div>
      </div>
    );
  }

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

      {bookingLoading && (
        <div className="loading-container">
          <div className="loading-content">
            <h1 className="loading-logo">E-Health</h1>
            <div className="loading-bar"></div>
            <p className="loading-text">Booking Your Appointment...</p>
          </div>
        </div>
      )}

      <div className="appointment-form" style={{ display: bookingLoading ? 'none' : 'block' }}>
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
                onBlur={predictNoShow} // Add onBlur handler
                className="form-control"
                rows="3"
                placeholder="Please briefly describe your symptoms or reason for visit"
              ></textarea>
            </div>

            {/* Display prediction loading, error, or result */}
            {predictionLoading && (
              <div className="prediction-loading">
                Calculating no-show probability...
              </div>
            )}
            {predictionError && (
              <div className="alert alert-danger">
                {predictionError}
              </div>
            )}
            {noShowProbability !== null && !predictionLoading && !predictionError && (
              <div className="prediction-result">
                No-Show Probability: {(noShowProbability * 100).toFixed(2)}%
                {noShowProbability > 0.5 && (
                  <span className="prediction-warning">
                    {' '}This is a high no-show risk. Consider confirming your attendance.
                  </span>
                )}
              </div>
            )}

            <div className="form-actions">
              <button
                className="btn btn-secondary"
                onClick={prevStep}
                disabled={bookingLoading}
              >
                Back
              </button>
              <button
                className="btn btn-primary"
                onClick={bookAppointment}
                disabled={bookingLoading || predictionLoading}
              >
                {bookingLoading ? 'Booking...' : 'Confirm Booking'}
              </button>
            </div>
          </div>
        )}
      </div>

      <style>{`
        
        .alert {
          padding: 1rem;
          border-radius: 5px;
          margin-bottom: 1.5rem;
        }

        .alert-danger {
          background: #f8d7da;
          color: #721c24;
        }

        .prediction-loading {
          margin-top: 0.5rem;
          color: #666;
          font-style: italic;
        }

        .prediction-result {
          margin-top: 0.5rem;
          color: #333;
          font-weight: 500;
        }

        .prediction-warning {
          color: #e74c3c;
          font-weight: 400;
        }
      `}</style>
    </div>
  );
};

export default BookAppointment;