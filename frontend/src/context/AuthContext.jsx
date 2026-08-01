import { createContext, useState, useEffect } from 'react';
import api from '../api';

export const AuthContext = createContext();

// Simple pure JS function to decode JWT payload without npm packages
function decodeToken(token) {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      window.atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch (err) {
    return null;
  }
}

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');

    if (token && storedUser) {
      const decoded = decodeToken(token);
      
      // If token is invalid or expired (exp is in seconds since epoch)
      if (!decoded || (decoded.exp && Date.now() >= decoded.exp * 1000)) {
        console.warn("Session expired or invalid token. Logging out.");
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setUser(null);
      } else {
        // Enforce role sync from decoded token just in case
        const userObj = JSON.parse(storedUser);
        if (decoded.role && userObj.role !== decoded.role) {
          userObj.role = decoded.role;
        }
        if (decoded.mustResetPassword !== undefined) {
          userObj.mustResetPassword = decoded.mustResetPassword;
        }
        localStorage.setItem('user', JSON.stringify(userObj));
        setUser(userObj);
      }
    }
    
    setIsLoading(false);
  }, []);

  const login = async (email, password) => {
    try {
      const response = await api.post('/login', { email, password });
      
      const { token, user } = response.data;
      
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));
      
      setUser(user);
      return { success: true, user };
    } catch (error) {
      return { 
        success: false, 
        message: error.response?.data?.message || 'Login failed'
      };
    }
  };

  const resetPassword = async (newPassword) => {
    try {
      const response = await api.post('/reset-password', { newPassword });
      const { token, user } = response.data;

      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));
      setUser(user);

      return { success: true, user };
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || 'Password reset failed'
      };
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    window.location.href = '/login';
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout, resetPassword }}>
      {children}
    </AuthContext.Provider>
  );
};

