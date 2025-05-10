import React from 'react';
import { useAuth } from '../context/AuthContext';
import { Navigate } from 'react-router-dom';

const Dashboard = () => {
  const { user } = useAuth();

  if (!user) {
    return <Navigate to="/login" />;
  }

  // Redirect to the appropriate dashboard based on role
  return <Navigate to={`/${user.role}-dashboard`} />;
};

export default Dashboard;