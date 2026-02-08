/**
 * Admin Context
 * Provides admin session and permissions throughout the app
 */

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
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

  // Load session from localStorage on mount (server-validated)
  useEffect(() => {
    const token = localStorage.getItem('admin_token');
    if (token) {
      fetchSession(token).then((verified) => {
        if (verified) setSession(verified);
        else localStorage.removeItem('admin_token');
      });
    }
  }, []);

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
        localStorage.setItem('admin_token', data.session.token);
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }, []);

  const logout = useCallback(() => {
    const token = session?.token || localStorage.getItem('admin_token');
    if (token) {
      fetch('/api/admin/logout', {
        method: 'POST',
        headers: { 'x-admin-token': token },
      }).catch(() => {});
    }
    setSession(null);
    localStorage.removeItem('admin_token');
  }, [session]);

  const refreshSession = useCallback(() => {
    const token = localStorage.getItem('admin_token');
    if (token) {
      fetchSession(token).then((verified) => {
        if (verified) setSession(verified);
        else logout();
      });
    }
  }, [logout]);

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
