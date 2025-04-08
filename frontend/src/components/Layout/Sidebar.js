import React, { useContext } from 'react';
import { Link, useLocation } from 'react-router-dom';
import AuthContext from '../../context/AuthContext';

const Sidebar = () => {
  const { user } = useContext(AuthContext);
  const location = useLocation();
  
  const isActive = (path) => {
    return location.pathname === path ? 'active' : '';
  };

  // Define menu items for each role
  const adminMenuItems = [
    { path: '/admin-dashboard', label: 'Dashboard', icon: 'home' },
    { path: '/admin/approvals', label: 'Pending Approvals', icon: 'clipboard-list' },
    { path: '/admin/users', label: 'Users', icon: 'users' },
    { path: '/admin/settings', label: 'Settings', icon: 'cogs' },
  ];
  
  const doctorMenuItems = [
    { path: '/doctor-dashboard', label: 'Dashboard', icon: 'home' },
    { path: '/appointments', label: 'Appointments', icon: 'calendar-alt' },
    { path: '/patients', label: 'My Patients', icon: 'users' },
    { path: '/telemedicine', label: 'Telemedicine', icon: 'video' },
  ];
  
  const patientMenuItems = [
    { path: '/patient-dashboard', label: 'Dashboard', icon: 'home' },
    { path: '/appointments', label: 'My Appointments', icon: 'calendar-alt' },
    { path: '/appointments/book', label: 'Book Appointment', icon: 'calendar-plus' },
    { path: '/medical-records', label: 'Medical Records', icon: 'file-medical-alt' },
    { path: '/telemedicine', label: 'Telemedicine', icon: 'video' },
  ];

  // Select menu based on user role
  const menuItems = user?.role === 'doctor' ? doctorMenuItems : 
                   user?.role === 'admin' ? adminMenuItems : 
                   patientMenuItems;
  
  return (
    <div className="sidebar">
      <div className="user-info">
        <div className="user-avatar">
          <i className="fas fa-user-circle"></i>
        </div>
        <div className="user-details">
          <p className="user-name">{user?.firstName || 'User'} {user?.lastName || ''}</p>
          <p className="user-role">{user?.role || 'patient'}</p>
        </div>
      </div>
      
      <ul className="menu">
        {menuItems.map((item, index) => (
          <li key={index} className={`menu-item ${isActive(item.path)}`}>
            <Link to={item.path}>
              <i className={`fas fa-${item.icon}`}></i>
              <span>{item.label}</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default Sidebar;
