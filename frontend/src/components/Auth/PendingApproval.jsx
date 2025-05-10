// src/components/Auth/PendingApproval.jsx
import React from 'react';
import { Link } from 'react-router-dom';

const PendingApproval = () => {
  return (
    <div className="auth-container">
      <div className="auth-card">
        <h2>Registration Pending Approval</h2>
        <div className="alert alert-info">
          <p>Hurray!!!.Thanks for your Registration!. Your account is currently pending administrative approval.</p>
          <p>You will receive an email notification once your account has been approved.</p>
        </div>
        <div className="auth-footer">
          <Link to="/login" className="btn btn-primary btn-block">Return to Login</Link>
        </div>
      </div>
    </div>
  );
};

export default PendingApproval;