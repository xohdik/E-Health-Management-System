import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import axios from 'axios';
import { AuthProvider, useAuth } from './context/AuthContext';

// Import components
import Header from './components/Layout/Header';
import Sidebar from './components/Layout/Sidebar';
import Footer from './components/Layout/Footer';
import Login from './components/Auth/Login';
import Register from './components/Auth/Register';
import PendingApproval from './components/Auth/PendingApproval';
import PatientDashboard from './components/Dashboard/PatientDashboard';
import DoctorDashboard from './components/Dashboard/DoctorDashboard';
import AdminDashboard from './components/Dashboard/AdminDashboard';
import AdminApprovals from './components/Dashboard/AdminApprovals';
import AdminUsers from './components/Dashboard/AdminUsers';
import AdminSettings from './components/Dashboard/AdminSettings';
import AdminUserDetails from './components/Dashboard/AdminUserDetails';
import AdminApprovalDetails from './components/Dashboard/AdminApprovalDetails';
import AppointmentCalendar from './components/Appointments/AppointmentCalendar';
import BookAppointment from './components/Appointments/BookAppointment';
import AppointmentDetail from './components/Appointments/AppointmentDetail';
import TelemedicineCall from './components/TelemedicineCall';
import Telemedicine from './components/Telemedicine';
import Patients from './components/Patients';
import PatientProfile from './components/PatientProfile';
import PatientRecords from './components/EHR/PatientRecords';
import Dashboard from './components/Dashboard';
import AdminEHRs from './components/Dashboard/AdminEHRs';
import AdminEHRDetails from './components/Dashboard/AdminEHRDetails';

// Set default axios configuration
axios.defaults.baseURL = 'http://localhost:5000/api';
axios.interceptors.request.use(config => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers['Authorization'] = `Bearer ${token}`;
  }
  return config;
});

// Enhanced Private Route component
const PrivateRoute = ({ element, allowedRoles }) => {
  const { user } = useAuth();
  if (!user) {
    return <Navigate to="/login" />;
  }
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to={`/${user.role}-dashboard`} />;
  }
  return element;
};

// Dashboard Loading Wrapper
const DashboardLoader = ({ children }) => {
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 2000);
    return () => clearTimeout(timer);
  }, []);

  if (isLoading) {
    return (
      <div className="loading-container">
        <div className="loading-content">
          <h1 className="loading-logo">E-Health</h1>
          <div className="loading-bar"></div>
          <p className="loading-text">Getting Ready...</p>
        </div>
      </div>
    );
  }
  return children;
};

// AuthenticatedLayout component
const AuthenticatedLayout = ({ children }) => {
  const { user } = useAuth();
  if (!user) {
    return <>{children}</>;
  }
  return (
    <div className="main-content-wrapper" style={{ display: 'flex', width: '100%' }}>
      <Sidebar />
      <div className="content-area" style={{ flex: 1, width: '100%' }}>
        {children}
      </div>
    </div>
  );
};

// Component to handle root redirection
const RootRedirect = () => {
  const { user } = useAuth();

  if (user) {
    return <Navigate to={`/${user.role}-dashboard`} replace />;
  }
  return <Navigate to="/login" replace />;
};

const App = () => {
  return (
    <AuthProvider>
      <Router>
        <div className="app-container">
          <Header />
          <div className="main-content">
            <Routes>
              {/* Public Routes */}
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/pending-approval" element={<PendingApproval />} />

              {/* Root Route - Redirect based on role */}
              <Route
                path="/"
                element={
                  <AuthenticatedLayout>
                    <RootRedirect />
                  </AuthenticatedLayout>
                }
              />

              {/* Dashboard Routes */}
              <Route
                path="/dashboard"
                element={
                  <PrivateRoute
                    element={
                      <AuthenticatedLayout>
                        <DashboardLoader>
                          <Dashboard />
                        </DashboardLoader>
                      </AuthenticatedLayout>
                    }
                    allowedRoles={['patient', 'doctor', 'admin']}
                  />
                }
              />
              <Route
                path="/patient-dashboard"
                element={
                  <PrivateRoute
                    element={
                      <AuthenticatedLayout>
                        <DashboardLoader>
                          <PatientDashboard />
                        </DashboardLoader>
                      </AuthenticatedLayout>
                    }
                    allowedRoles={['patient']}
                  />
                }
              />
              <Route
                path="/doctor-dashboard"
                element={
                  <PrivateRoute
                    element={
                      <AuthenticatedLayout>
                        <DashboardLoader>
                          <DoctorDashboard />
                        </DashboardLoader>
                      </AuthenticatedLayout>
                    }
                    allowedRoles={['doctor']}
                  />
                }
              />
              <Route
                path="/admin-dashboard"
                element={
                  <PrivateRoute
                    element={
                      <AuthenticatedLayout>
                        <DashboardLoader>
                          <AdminDashboard />
                        </DashboardLoader>
                      </AuthenticatedLayout>
                    }
                    allowedRoles={['admin']}
                  />
                }
              />

              {/* EHR Routes */}
              <Route
                path="/patient-profile"
                element={
                  <PrivateRoute
                    element={
                      <AuthenticatedLayout>
                        <DashboardLoader>
                          <PatientProfile />
                        </DashboardLoader>
                      </AuthenticatedLayout>
                    }
                    allowedRoles={['patient']}
                  />
                }
              />
              <Route
                path="/patient/records/:patientId"
                element={
                  <PrivateRoute
                    element={
                      <AuthenticatedLayout>
                        <DashboardLoader>
                          <PatientRecords />
                        </DashboardLoader>
                      </AuthenticatedLayout>
                    }
                    allowedRoles={['patient', 'doctor', 'admin']}
                  />
                }
              />
              <Route
                path="/admin/ehrs"
                element={
                  <PrivateRoute
                    element={
                      <AuthenticatedLayout>
                        <DashboardLoader>
                          <AdminEHRs />
                        </DashboardLoader>
                      </AuthenticatedLayout>
                    }
                    allowedRoles={['admin']}
                  />
                }
              />
              <Route
                path="/admin/ehrs/:id"
                element={
                  <PrivateRoute
                    element={
                      <AuthenticatedLayout>
                        <DashboardLoader>
                          <AdminEHRDetails />
                        </DashboardLoader>
                      </AuthenticatedLayout>
                    }
                    allowedRoles={['admin']}
                  />
                }
              />

              {/* Appointment Routes */}
              <Route
                path="/appointments"
                element={
                  <PrivateRoute
                    element={
                      <AuthenticatedLayout>
                        <DashboardLoader>
                          <AppointmentCalendar />
                        </DashboardLoader>
                      </AuthenticatedLayout>
                    }
                    allowedRoles={['patient', 'doctor', 'admin']}
                  />
                }
              />
              <Route
                path="/appointments/book"
                element={
                  <PrivateRoute
                    element={
                      <AuthenticatedLayout>
                        <DashboardLoader>
                          <BookAppointment />
                        </DashboardLoader>
                      </AuthenticatedLayout>
                    }
                    allowedRoles={['patient']}
                  />
                }
              />
              <Route
                path="/appointments/:id"
                element={
                  <PrivateRoute
                    element={
                      <AuthenticatedLayout>
                        <DashboardLoader>
                          <AppointmentDetail />
                        </DashboardLoader>
                      </AuthenticatedLayout>
                    }
                    allowedRoles={['patient', 'doctor', 'admin']}
                  />
                }
              />

              {/* Telemedicine Routes */}
              <Route
                path="/telemedicine"
                element={
                  <PrivateRoute
                    element={
                      <AuthenticatedLayout>
                        <DashboardLoader>
                          <Telemedicine />
                        </DashboardLoader>
                      </AuthenticatedLayout>
                    }
                    allowedRoles={['doctor', 'patient']}
                  />
                }
              />
              <Route
                path="/telemedicine/call/:appointmentId"
                element={
                  <PrivateRoute
                    element={
                      <AuthenticatedLayout>
                        <DashboardLoader>
                          <TelemedicineCall />
                        </DashboardLoader>
                      </AuthenticatedLayout>
                    }
                    allowedRoles={['doctor', 'patient']}
                  />
                }
              />

              {/* Patients Route */}
              <Route
                path="/patients"
                element={
                  <PrivateRoute
                    element={
                      <AuthenticatedLayout>
                        <DashboardLoader>
                          <Patients />
                        </DashboardLoader>
                      </AuthenticatedLayout>
                    }
                    allowedRoles={['doctor']}
                  />
                }
              />

              {/* Admin Routes */}
              <Route
                path="/admin/approvals"
                element={
                  <PrivateRoute
                    element={
                      <AuthenticatedLayout>
                        <DashboardLoader>
                          <AdminApprovals />
                        </DashboardLoader>
                      </AuthenticatedLayout>
                    }
                    allowedRoles={['admin']}
                  />
                }
              />
              <Route
                path="/admin/approvals/:id"
                element={
                  <PrivateRoute
                    element={
                      <AuthenticatedLayout>
                        <DashboardLoader>
                          <AdminApprovalDetails />
                        </DashboardLoader>
                      </AuthenticatedLayout>
                    }
                    allowedRoles={['admin']}
                  />
                }
              />
              <Route
                path="/admin/users"
                element={
                  <PrivateRoute
                    element={
                      <AuthenticatedLayout>
                        <DashboardLoader>
                          <AdminUsers />
                        </DashboardLoader>
                      </AuthenticatedLayout>
                    }
                    allowedRoles={['admin']}
                  />
                }
              />
              <Route
                path="/admin/users/:id"
                element={
                  <PrivateRoute
                    element={
                      <AuthenticatedLayout>
                        <DashboardLoader>
                          <AdminUserDetails />
                        </DashboardLoader>
                      </AuthenticatedLayout>
                    }
                    allowedRoles={['admin']}
                  />
                }
              />
              <Route
                path="/admin/settings"
                element={
                  <PrivateRoute
                    element={
                      <AuthenticatedLayout>
                        <DashboardLoader>
                          <AdminSettings />
                        </DashboardLoader>
                      </AuthenticatedLayout>
                    }
                    allowedRoles={['admin']}
                  />
                }
              />

              {/* Catch-all Route */}
              <Route path="*" element={<div>404 - Page Not Found</div>} />
            </Routes>
          </div>
          <Footer />
        </div>
      </Router>
    </AuthProvider>
  );
};

export default App;