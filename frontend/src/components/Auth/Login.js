import React, { useState, useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import AuthContext from '../../context/AuthContext';

const Login = () => {
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const { login } = useContext(AuthContext);

  const { email, password } = formData;

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    try {
      const role = await login({ email, password });
      const isApproved = localStorage.getItem('isApproved') === 'true';

      switch (role) {
        case 'admin':
          navigate('/admin-dashboard');
          break;
        case 'doctor':
          navigate(isApproved ? '/doctor-dashboard' : '/pending-approval');
          break;
        case 'nurse':
          navigate(isApproved ? '/nurse-dashboard' : '/pending-approval');
          break;
        case 'patient':
          navigate('/patient-dashboard');
          break;
        default:
          navigate('/'); // Fallback
      }
    } catch (err) {
      console.error('Caught login error:', err);
      setError(err.message || 'Login failed. Please try again.');
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h2>Login to Your Account</h2>
        
        {error && (
          <div 
            className="alert alert-danger" 
            style={{ 
              backgroundColor: '#f8d7da', 
              color: '#721c24', 
              padding: '10px', 
              marginBottom: '15px',
              borderRadius: '5px'
            }}
          >
            {error}
          </div>
        )}
        
        <form onSubmit={handleSubmit}>
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
          
          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              type="password"
              name="password"
              id="password"
              value={password}
              onChange={handleChange}
              placeholder="Enter your password"
              required
            />
          </div>
          
          <button type="submit" className="btn btn-primary btn-block">
            Login
          </button>
        </form>
      </div>
    </div>
  );
};

export default Login;