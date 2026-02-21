/**
 * Admin Context
 * Provides admin session and permissions throughout the app
 */

import React, { createContext, useContext, useState, useCallback } from 'react';
import type { AdminSession, UserRole } from '../backend/admin/types';

interface AdminContextType {
  session: AdminSession | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
  hasPermission: (role: UserRole) => boolean;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  refreshSession: () => void;
}

const AdminContext = createContext<AdminContextType | undefined>(undefined);

let warnedTokenPersistence = false;

export const AdminProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<AdminSession | null>(null);

  function roleHasPermission(userRole: UserRole, requiredRole: UserRole): boolean {
    const roleHierarchy: Record<UserRole, number> = {
      viewer: 1,
      editor: 2,
      admin: 3,
    };
    return roleHierarchy[userRole] >= roleHierarchy[requiredRole];
  }

  async function fetchSession(token: string): Promise<AdminSession | null> {
    try {
      const res = await fetch('/api/admin/session', {
        headers: {
          'x-admin-token': token,
        },
      });
      if (!res.ok) return null;
      const data = await res.json();
      return data?.success ? (data.session as AdminSession) : null;
    } catch {
      return null;
    }
  }

  const login = useCallback(async (email: string, password: string): Promise<boolean> => {
    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      if (!res.ok) return false;
      const data = await res.json();
      if (data?.success && data.session?.token) {
        setSession(data.session as AdminSession);
        if (!warnedTokenPersistence) {
          warnedTokenPersistence = true;
          console.warn('[everwatt] Admin token persistence is disabled; you will be logged out on refresh.');
        }
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }, []);

  const logout = useCallback(() => {
    const token = session?.token;
    if (token) {
      fetch('/api/admin/logout', {
        method: 'POST',
        headers: { 'x-admin-token': token },
      }).catch(() => {});
    }
    setSession(null);
  }, [session]);

  const refreshSession = useCallback(() => {
    const token = session?.token;
    if (token) {
      fetchSession(token).then((verified) => {
        if (verified) setSession(verified);
        else logout();
      });
    }
  }, [logout, session]);

  const checkPermission = useCallback((role: UserRole) => {
    if (!session) return false;
    return roleHasPermission(session.role, role);
  }, [session]);

  const userIsAdmin = !!session && roleHasPermission(session.role, 'admin');

  return (
    <AdminContext.Provider
      value={{
        session,
        isAuthenticated: !!session,
        isAdmin: userIsAdmin,
        hasPermission: checkPermission,
        login,
        logout,
        refreshSession,
      }}
    >
      {children}
    </AdminContext.Provider>
  );
};

export const useAdmin = () => {
  const context = useContext(AdminContext);
  if (context === undefined) {
    throw new Error('useAdmin must be used within an AdminProvider');
  }
  return context;
};
