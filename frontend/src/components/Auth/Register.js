import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';

const Register = () => {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    password2: '',
    role: 'patient',
    specialization: '',
    availability: [
      { day: 1, startTime: '', endTime: '' },
      { day: 2, startTime: '', endTime: '' },
      { day: 3, startTime: '', endTime: '' },
      { day: 4, startTime: '', endTime: '' },
      { day: 5, startTime: '', endTime: '' }
    ]
  });
  const [showAvailability, setShowAvailability] = useState(false);
  const [formError, setFormError] = useState(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const { firstName, lastName, email, password, password2, role, specialization, availability } = formData;

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleAvailabilityChange = (index, field, value) => {
    const newAvailability = [...availability];
    newAvailability[index][field] = value;
    setFormData({ ...formData, availability: newAvailability });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!firstName || !lastName || !email || !password || !password2) {
      setFormError('Please fill in all fields');
      return;
    }

    if (password !== password2) {
      setFormError('Passwords do not match');
      return;
    }

    if ((role === 'doctor' || role === 'nurse') && !specialization) {
      setFormError('Specialization is required for doctors and nurses');
      return;
    }

    try {
      setLoading(true);
      setFormError(null);

      const config = { headers: { 'Content-Type': 'application/json' } };
      const body = {
        firstName,
        lastName,
        email,
        password,
        role,
        ...(role === 'doctor' || role === 'nurse') && {
          specialization,
          availability: availability.filter(a => a.startTime && a.endTime) // Send for both roles
        }
      };

      const response = await axios.post('http://localhost:5000/api/auth/register', body, config);

      if (response.data.success) {
        console.log('Registration successful', response.data);
        localStorage.setItem('token', response.data.token);
        localStorage.setItem('userId', response.data.userId);
        localStorage.setItem('firstName', response.data.firstName);
        localStorage.setItem('lastName', response.data.lastName);
        localStorage.setItem('role', response.data.role);

        if (role === 'doctor' || role === 'nurse') {
          navigate('/pending-approval');
        } else {
          navigate('/login');
        }
      }
    } catch (err) {
      console.error('Registration error:', err.response?.data || err.message);
      setFormError(err.response?.data?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h2>Create an Account</h2>

        {formError && <div className="alert alert-danger">{formError}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="firstName">First Name</label>
              <input
                type="text"
                name="firstName"
                id="firstName"
                value={firstName}
                onChange={handleChange}
                placeholder="Enter your first name"
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="lastName">Last Name</label>
              <input
                type="text"
                name="lastName"
                id="lastName"
                value={lastName}
                onChange={handleChange}
                placeholder="Enter your last name"
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="email">Email Address</label>
            <input
              type="email"
              name="email"
              id="email"
              value={email}
              onChange={handleChange}
              placeholder="Enter your email"
              required
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="password">Password</label>
              <input
                type="password"
                name="password"
                id="password"
                value={password}
                onChange={handleChange}
                placeholder="Enter your password"
                minLength="6"
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="password2">Confirm Password</label>
              <input
                type="password"
                name="password2"
                id="password2"
                value={password2}
                onChange={handleChange}
                placeholder="Confirm your password"
                minLength="6"
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="role">Account Type</label>
            <select name="role" id="role" value={role} onChange={handleChange}>
              <option value="patient">Patient</option>
              <option value="doctor">Doctor</option>
              <option value="nurse">Nurse</option>
            </select>
          </div>

          {['doctor', 'nurse'].includes(role) && (
            <div className="form-group">
              <label htmlFor="specialization">Specialization</label>
              <input
                type="text"
                name="specialization"
                id="specialization"
                value={specialization}
                onChange={handleChange}
                placeholder="Enter your specialization"
                required
              />
            </div>
          )}

          {['doctor', 'nurse'].includes(role) && (
            <div className="form-group">
              <button
                type="button"
                className="btn btn-secondary btn-block collapsible-toggle"
                onClick={() => setShowAvailability(!showAvailability)}
              >
                {showAvailability ? 'Hide Availability' : 'Set Availability (Optional)'}
              </button>
              {showAvailability && (
                <div className="availability-container">
                  {availability.map((slot, index) => (
                    <div key={index} className="form-row availability-slot">
                      <span>{['Mon', 'Tue', 'Wed', 'Thu', 'Fri'][index]}</span>
                      <input
                        type="time"
                        value={slot.startTime}
                        onChange={(e) => handleAvailabilityChange(index, 'startTime', e.target.value)}
                      />
                      <span>to</span>
                      <input
                        type="time"
                        value={slot.endTime}
                        onChange={(e) => handleAvailabilityChange(index, 'endTime', e.target.value)}
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
            {loading ? 'Registering...' : 'Register'}
          </button>
        </form>

        <div className="auth-footer">
          <p>
            Already have an account? <Link to="/login">Login</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Register;