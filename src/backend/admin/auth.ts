/**
 * Admin Authentication
 * Simple session-based auth (can be upgraded to JWT/OAuth)
 */

import type { User, AdminSession, UserRole } from './types';

// In-memory user store (replace with database in production)
const users: User[] = [
  {
    id: 'admin-1',
    email: 'admin@everwatt.com',
    name: 'Admin User',
    role: 'admin',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'editor-1',
    email: 'editor@everwatt.com',
    name: 'Editor User',
    role: 'editor',
    createdAt: new Date().toISOString(),
  },
];

// Active sessions (replace with Redis/database in production)
const sessions = new Map<string, AdminSession>();

/**
 * Login with email/password
 * In production, this would verify against a database
 */
export async function login(email: string, password: string): Promise<AdminSession | null> {
  // For demo: accept any password for known emails
  // In production: hash and verify password
  const user = users.find(u => u.email === email);
  
  if (!user) {
    return null;
  }

  // Update last login
  user.lastLogin = new Date().toISOString();

  // Create session
  const session: AdminSession = {
    userId: user.id,
    email: user.email,
    role: user.role,
    expiresAt: Date.now() + 24 * 60 * 60 * 1000, // 24 hours
    token: generateToken(),
  };

  sessions.set(session.token, session);
  
  return session;
}

/**
 * Verify session token
 */
export function verifySession(token: string): AdminSession | null {
  const session = sessions.get(token);
  
  if (!session) {
    return null;
  }

  if (Date.now() > session.expiresAt) {
    sessions.delete(token);
    return null;
  }

  return session;
}

/**
 * Logout
 */
export function logout(token: string): void {
  sessions.delete(token);
}

/**
 * Get user by ID
 */
export function getUser(userId: string): User | null {
  return users.find(u => u.id === userId) || null;
}

/**
 * Check if user has permission
 */
export function hasPermission(session: AdminSession | null, requiredRole: UserRole): boolean {
  if (!session) {
    return false;
  }

  const roleHierarchy: Record<UserRole, number> = {
    viewer: 1,
    editor: 2,
    admin: 3,
  };

  return roleHierarchy[session.role] >= roleHierarchy[requiredRole];
}

/**
 * Check if user is admin
 */
export function isAdmin(session: AdminSession | null): boolean {
  return session?.role === 'admin';
}

/**
 * Generate session token
 */
function generateToken(): string {
  return `token_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Get all users (admin only)
 */
export function getAllUsers(): User[] {
  return users;
}

/**
 * Create new user (admin only)
 */
export function createUser(email: string, name: string, role: UserRole): User {
  const user: User = {
    id: `user-${Date.now()}`,
    email,
    name,
    role,
    createdAt: new Date().toISOString(),
  };

  users.push(user);
  return user;
}
