import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import axios from 'axios';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const AuthContext = createContext(null);

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}

function formatApiErrorDetail(detail) {
  if (detail == null) return "Coś poszło nie tak. Spróbuj ponownie.";
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail))
    return detail.map((e) => (e && typeof e.msg === "string" ? e.msg : JSON.stringify(e))).filter(Boolean).join(" ");
  if (detail && typeof detail.msg === "string") return detail.msg;
  return String(detail);
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const tryRefreshToken = useCallback(async () => {
    try {
      await axios.post(`${API_URL}/api/auth/refresh`, {}, { withCredentials: true });
      return true;
    } catch {
      return false;
    }
  }, []);

  const checkAuth = useCallback(async () => {
    try {
      const response = await axios.get(`${API_URL}/api/auth/me`, {
        withCredentials: true
      });
      setUser(response.data);
    } catch (e) {
      // Try refresh token if access token expired
      if (e.response?.status === 401) {
        const refreshed = await tryRefreshToken();
        if (refreshed) {
          try {
            const response = await axios.get(`${API_URL}/api/auth/me`, {
              withCredentials: true
            });
            setUser(response.data);
            return;
          } catch {
            // refresh succeeded but /me still fails
          }
        }
      }
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, [tryRefreshToken]);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  // Global axios interceptor for automatic token refresh
  useEffect(() => {
    let isRefreshing = false;
    let failedQueue = [];

    const processQueue = (error) => {
      failedQueue.forEach(prom => {
        if (error) prom.reject(error);
        else prom.resolve();
      });
      failedQueue = [];
    };

    const interceptor = axios.interceptors.response.use(
      response => response,
      async (error) => {
        const originalRequest = error.config;
        
        if (error.response?.status === 401 && !originalRequest._retry && 
            !originalRequest.url?.includes('/auth/login') && 
            !originalRequest.url?.includes('/auth/refresh')) {
          
          if (isRefreshing) {
            return new Promise((resolve, reject) => {
              failedQueue.push({ resolve, reject });
            }).then(() => axios(originalRequest));
          }

          originalRequest._retry = true;
          isRefreshing = true;

          try {
            await axios.post(`${API_URL}/api/auth/refresh`, {}, { withCredentials: true });
            processQueue(null);
            return axios(originalRequest);
          } catch (refreshError) {
            processQueue(refreshError);
            setUser(null);
            return Promise.reject(refreshError);
          } finally {
            isRefreshing = false;
          }
        }
        return Promise.reject(error);
      }
    );

    return () => axios.interceptors.response.eject(interceptor);
  }, []);

  const login = async (email, password) => {
    setError(null);
    try {
      const response = await axios.post(
        `${API_URL}/api/auth/login`,
        { email, password },
        { withCredentials: true }
      );
      setUser(response.data);
      return { success: true };
    } catch (e) {
      const errorMsg = formatApiErrorDetail(e.response?.data?.detail) || e.message;
      setError(errorMsg);
      return { success: false, error: errorMsg };
    }
  };

  const logout = async () => {
    try {
      await axios.post(`${API_URL}/api/auth/logout`, {}, { withCredentials: true });
    } catch (e) {
      console.error('Logout error:', e);
    } finally {
      setUser(null);
    }
  };

  const refreshUser = async () => {
    await checkAuth();
  };

  const value = {
    user,
    loading,
    error,
    login,
    logout,
    refreshUser,
    isFounder: user?.role === 'founder',
    canEditProfiles: user?.canEditProfiles || user?.role === 'founder',
    isOfficerRank: user?.isOfficerRank,
    isAuthenticated: !!user
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export default AuthContext;
