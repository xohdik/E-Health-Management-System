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
    yearsOfExperience: '',
    dateOfBirth: '', // Added
    gender: '' // Added
  });
  const [formError, setFormError] = useState(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const { firstName, lastName, email, password, password2, role, specialization, yearsOfExperience, dateOfBirth, gender } = formData;

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Basic validation
    if (!firstName || !lastName || !email || !password || !password2 || !dateOfBirth || !gender) {
      setFormError('Please fill in all fields');
      return;
    }

    if (password !== password2) {
      setFormError('Passwords do not match');
      return;
    }

    // Validate dateOfBirth (ensure user is at least 18 years old)
    const birthDate = new Date(dateOfBirth);
    const today = new Date();
    const age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    const dayDiff = today.getDate() - birthDate.getDate();
    const isUnderAge = age < 18 || (age === 18 && (monthDiff < 0 || (monthDiff === 0 && dayDiff < 0)));
    if (isUnderAge) {
      setFormError('You must be at least 18 years old to register');
      return;
    }

    if (['doctor', 'nurse'].includes(role)) {
      if (!specialization) {
        setFormError('Specialization is required for doctors and nurses');
        return;
      }
      if (!yearsOfExperience || yearsOfExperience < 0) {
        setFormError('Please enter a valid number of years of experience');
        return;
      }
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
        dateOfBirth: new Date(dateOfBirth).toISOString(), // Convert to ISO string for backend
        gender,
        ...(role === 'doctor' || role === 'nurse'
          ? {
              specialization,
              yearsOfExperience: parseInt(yearsOfExperience)
            }
          : {})
      };

      console.log('Submitting registration data:', body);

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
            <label htmlFor="dateOfBirth">Date of Birth</label>
            <input
              type="date"
              name="dateOfBirth"
              id="dateOfBirth"
              value={dateOfBirth}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="gender">Gender</label>
            <select name="gender" id="gender" value={gender} onChange={handleChange} required>
              <option value="">Select Gender</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other</option>
            </select>
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
            <>
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
              <div className="form-group">
                <label htmlFor="yearsOfExperience">Years of Experience</label>
                <input
                  type="number"
                  name="yearsOfExperience"
                  id="yearsOfExperience"
                  value={yearsOfExperience}
                  onChange={handleChange}
                  placeholder="Enter years of experience"
                  min="0"
                  required
                />
              </div>
            </>
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