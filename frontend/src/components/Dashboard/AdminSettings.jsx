import React from 'react';
import { useNavigate } from 'react-router-dom';

const AdminSettings = () => {
  const navigate = useNavigate();

  return (
    <div className="dashboard">
      <h1>Admin Settings</h1>
      <div className="dashboard-card">
        <h2>Settings</h2>
        <p>Manage system settings here (e.g., email templates, approval workflows).</p>
      </div>
      <button onClick={() => navigate('/admin-dashboard')} className="btn btn-secondary" style={{ marginTop: '1rem' }}>
        Back to Dashboard
      </button>
    </div>
  );
};

export default AdminSettings;