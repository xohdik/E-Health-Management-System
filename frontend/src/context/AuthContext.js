import React, { createContext, useState, useEffect, useCallback, useContext } from 'react';
import axios from 'axios';
import { jwtDecode } from 'jwt-decode';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(localStorage.getItem('token') || null);
  const [user, setUser] = useState(() => {
    const storedToken = localStorage.getItem('token');
    if (!storedToken) return null;

    try {
      const decoded = jwtDecode(storedToken);
      return {
        _id: localStorage.getItem('userId'),
        firstName: localStorage.getItem('firstName'),
        role: localStorage.getItem('userRole') || decoded.role,
        isApproved: localStorage.getItem('isApproved') === 'true',
      };
    } catch (err) {
      return null;
    }
  });

  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    const storedToken = localStorage.getItem('token');
    if (!storedToken) return false;

    try {
      const decoded = jwtDecode(storedToken);
      return Date.now() < decoded.exp * 1000;
    } catch (err) {
      return false;
    }
  });

  const login = async (credentials) => {
    try {
      const res = await axios.post('http://localhost:5000/api/auth/login', credentials);
      const { token, userId, firstName, lastName, role, isApproved } = res.data;

      // ✅ Only block unapproved doctor or nurse
      if ((role === 'doctor' || role === 'nurse') && !isApproved) {
        const error = new Error('Your account is pending approval by an administrator.');
        error.name = 'AccountNotApproved';
        throw error;
      }

      const decoded = jwtDecode(token);

      const userData = {
        _id: userId,
        firstName,
        lastName,
        role: decoded.role || role,
        isApproved,
      };

      // ✅ Update state
      setToken(token);
      setUser(userData);
      setIsAuthenticated(true);

      // ✅ Persist to localStorage
      localStorage.setItem('token', token);
      localStorage.setItem('userId', userId);
      localStorage.setItem('firstName', firstName);
      localStorage.setItem('lastName', lastName);
      localStorage.setItem('userRole', userData.role);
      localStorage.setItem('isApproved', isApproved.toString());

      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;

      return role;
    } catch (err) {
      console.error('Login error:', err);
      if (err.name === 'AccountNotApproved') {
        throw err;
      }
      const errorMessage = err.response?.data?.message || 'Login failed. Please try again.';
      throw new Error(errorMessage);
    }
  };

  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
    setIsAuthenticated(false);
    localStorage.clear();
    delete axios.defaults.headers.common['Authorization'];
  }, []);

  const checkTokenExpiration = useCallback(() => {
    if (!token) return;

    try {
      const decoded = jwtDecode(token);
      if (Date.now() >= decoded.exp * 1000) {
        logout();
      }
    } catch (err) {
      logout();
    }
  }, [token, logout]);

  const loadUser = useCallback(async () => {
    if (!token) return;

    try {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      const res = await axios.get('http://localhost:5000/api/auth/me');
      const decoded = jwtDecode(token);
      const userData = {
        ...res.data.data,
        role: decoded.role || res.data.data.role,
        isApproved: res.data.data.isApproved ?? true,
      };

      setUser(userData);
      setIsAuthenticated(true);

      localStorage.setItem('userId', userData._id);
      localStorage.setItem('firstName', userData.firstName);
      localStorage.setItem('lastName', userData.lastName);
      localStorage.setItem('userRole', userData.role);
      localStorage.setItem('isApproved', userData.isApproved.toString());
    } catch (err) {
      console.error('Error loading user:', err);
      logout();
    }
  }, [token, logout]);

  useEffect(() => {
    const interval = setInterval(checkTokenExpiration, 300000);
    checkTokenExpiration();
    loadUser();
    return () => clearInterval(interval);
  }, [checkTokenExpiration, loadUser]);

  return (
    <AuthContext.Provider value={{ token, user, isAuthenticated, login, logout, checkTokenExpiration }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;
