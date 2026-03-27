'use client';

/**
 * Auth Context Provider
 * Manages user authentication state across the app
 * Supports demo mode for hackathon and real auth for production
 */

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';

// User type definition
export interface User {
  userId: string;
  name: string;
  email?: string;
  phone?: string;
  abhaAddress?: string;
  abhaLinked: boolean;
  language: string;
  role: 'user' | 'admin';
  profileImage?: string;
}

// Auth context state
export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isDemoMode: boolean;
  error: string | null;
}

// Auth context actions
export interface AuthContextValue extends AuthState {
  login: (provider?: 'google' | 'abha' | 'demo') => Promise<void>;
  logout: () => Promise<void>;
  linkABHA: (abhaAddress: string) => Promise<void>;
  updatePreferences: (prefs: Partial<Pick<User, 'language' | 'name'>>) => void;
  clearError: () => void;
}

// Default demo user for hackathon
const DEMO_USER: User = {
  userId: 'demo-user-001',
  name: 'Demo User',
  email: 'demo@vaidya.health',
  abhaLinked: false,
  language: 'English',
  role: 'user',
};

// Create context with default values
const AuthContext = createContext<AuthContextValue | null>(null);

// Storage keys
const STORAGE_KEYS = {
  USER: 'vaidya_user',
  TOKEN: 'vaidya_token',
  PREFERENCES: 'vaidya_prefs',
};

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [state, setState] = useState<AuthState>({
    user: null,
    isAuthenticated: false,
    isLoading: true,
    isDemoMode: true, // Always start in demo mode for hackathon
    error: null,
  });

  // Initialize auth state from storage on mount
  useEffect(() => {
    const initAuth = async () => {
      try {
        // Check for stored user
        const storedUser = localStorage.getItem(STORAGE_KEYS.USER);
        const storedPrefs = localStorage.getItem(STORAGE_KEYS.PREFERENCES);

        if (storedUser) {
          const user = JSON.parse(storedUser) as User;
          // Apply any stored preferences
          if (storedPrefs) {
            const prefs = JSON.parse(storedPrefs);
            Object.assign(user, prefs);
          }
          setState(prev => ({
            ...prev,
            user,
            isAuthenticated: true,
            isLoading: false,
          }));
        } else {
          // No stored user - use demo mode
          setState(prev => ({
            ...prev,
            user: DEMO_USER,
            isAuthenticated: true,
            isDemoMode: true,
            isLoading: false,
          }));
          // Store demo user
          localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(DEMO_USER));
        }
      } catch (error) {
        console.error('[Auth] Init error:', error);
        // Fallback to demo user on error
        setState(prev => ({
          ...prev,
          user: DEMO_USER,
          isAuthenticated: true,
          isDemoMode: true,
          isLoading: false,
        }));
      }
    };

    initAuth();
  }, []);

  // Login function
  const login = useCallback(async (provider: 'google' | 'abha' | 'demo' = 'demo') => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      if (provider === 'demo') {
        // Demo mode login - instant
        setState(prev => ({
          ...prev,
          user: DEMO_USER,
          isAuthenticated: true,
          isDemoMode: true,
          isLoading: false,
        }));
        localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(DEMO_USER));
        return;
      }

      // Real OAuth login
      const response = await fetch(`/api/auth/login?provider=${provider}`, {
        method: 'GET',
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Login failed');
      }

      const data = await response.json();

      if (data.success && data.data?.authUrl) {
        // Redirect to OAuth provider
        window.location.href = data.data.authUrl;
      } else if (data.success && data.data?.user) {
        // Direct login (demo mode from server)
        const user: User = {
          userId: data.data.user.userId,
          name: data.data.user.name || 'User',
          email: data.data.user.email,
          abhaAddress: data.data.user.abhaAddress,
          abhaLinked: !!data.data.user.abhaAddress,
          language: 'English',
          role: data.data.user.role || 'user',
        };

        setState(prev => ({
          ...prev,
          user,
          isAuthenticated: true,
          isDemoMode: false,
          isLoading: false,
        }));
        localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
      }
    } catch (error) {
      console.error('[Auth] Login error:', error);
      setState(prev => ({
        ...prev,
        error: 'Login failed. Please try again.',
        isLoading: false,
      }));
    }
  }, []);

  // Logout function
  const logout = useCallback(async () => {
    setState(prev => ({ ...prev, isLoading: true }));

    try {
      // Call logout API - uses DELETE method on /api/auth/login
      await fetch('/api/auth/login', {
        method: 'DELETE',
        credentials: 'include',
      });
    } catch (error) {
      console.error('[Auth] Logout error:', error);
    } finally {
      // Clear local storage
      localStorage.removeItem(STORAGE_KEYS.USER);
      localStorage.removeItem(STORAGE_KEYS.TOKEN);
      localStorage.removeItem(STORAGE_KEYS.PREFERENCES);

      // Reset to demo user
      setState({
        user: DEMO_USER,
        isAuthenticated: true,
        isDemoMode: true,
        isLoading: false,
        error: null,
      });
      localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(DEMO_USER));
    }
  }, []);

  // Link ABHA address
  const linkABHA = useCallback(async (abhaAddress: string) => {
    if (!state.user) return;

    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      // Call ABHA patient search to verify
      const response = await fetch('/api/abdm/patients/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ abhaAddress }),
      });

      const data = await response.json();

      if (data.success) {
        const updatedUser: User = {
          ...state.user,
          abhaAddress,
          abhaLinked: true,
        };

        setState(prev => ({
          ...prev,
          user: updatedUser,
          isLoading: false,
        }));
        localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(updatedUser));
      } else {
        throw new Error(data.error?.message || 'ABHA linking failed');
      }
    } catch (error) {
      console.error('[Auth] ABHA link error:', error);
      setState(prev => ({
        ...prev,
        error: 'Failed to link ABHA. Please check the address and try again.',
        isLoading: false,
      }));
    }
  }, [state.user]);

  // Update user preferences
  const updatePreferences = useCallback((prefs: Partial<Pick<User, 'language' | 'name'>>) => {
    if (!state.user) return;

    const updatedUser = { ...state.user, ...prefs };
    setState(prev => ({ ...prev, user: updatedUser }));
    localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(updatedUser));
    localStorage.setItem(STORAGE_KEYS.PREFERENCES, JSON.stringify(prefs));
  }, [state.user]);

  // Clear error
  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  const contextValue: AuthContextValue = {
    ...state,
    login,
    logout,
    linkABHA,
    updatePreferences,
    clearError,
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
}

// Custom hook to use auth context
export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

// Export context for advanced use cases
export { AuthContext };
