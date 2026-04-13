import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import axios from 'axios';

// 🔥 Backend API URL from .env
const API = import.meta.env.VITE_SERVER_URL;

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [hasNewOrderOffers, setHasNewOrderOffers] = useState(false);
  const [hasNewDeliveries, setHasNewDeliveries] = useState(false);

  // 🔥 Check authentication on mount
  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const response = await axios.get(`${API}/auth/me`, {
        withCredentials: true
      });
      setUser(response.data);
    } catch (err) {
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  // 🔥 Redirect to Google OAuth (BACKEND, not frontend)
  const login = useCallback(() => {
    window.location.href = `${API}/auth/google`;
  }, []);

  const logout = useCallback(async () => {
    try {
      await axios.get(`${API}/auth/logout`, {
        withCredentials: true
      });
      setUser(null);
    } catch (err) {
      console.error('Logout error:', err);
    }
  }, []);

  const updatePhone = useCallback(async (phone) => {
    try {
      const response = await axios.post(
        `${API}/auth/update-phone`,
        { phone },
        { withCredentials: true }
      );
      setUser(response.data.user);
      return response.data;
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update phone');
      throw err;
    }
  }, []);

  const isAuthenticated = !!user;
  const isNewUser = user?.isNewUser || false;

  const setOrderOfferNotification = useCallback(() => {
    setHasNewOrderOffers(true);
  }, []);

  const clearOrderOfferNotification = useCallback(() => {
    setHasNewOrderOffers(false);
  }, []);

  const setDeliveryNotification = useCallback(() => {
    setHasNewDeliveries(true);
  }, []);

  const clearDeliveryNotification = useCallback(() => {
    setHasNewDeliveries(false);
  }, []);

  const value = {
    user,
    isAuthenticated,
    isNewUser,
    loading,
    error,
    login,
    logout,
    updatePhone,
    checkAuth,
    clearError: () => setError(null),
    hasNewOrderOffers,
    setOrderOfferNotification,
    clearOrderOfferNotification,
    hasNewDeliveries,
    setDeliveryNotification,
    clearDeliveryNotification
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

// Hook
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};