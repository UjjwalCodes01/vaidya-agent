/**
 * useAuth Hook
 * Re-export from AuthContext for convenient imports
 *
 * Usage:
 * import { useAuth } from '@/lib/hooks/useAuth';
 * const { user, isAuthenticated, login, logout } = useAuth();
 */

export { useAuth, type User, type AuthState, type AuthContextValue } from '../context/AuthContext';
