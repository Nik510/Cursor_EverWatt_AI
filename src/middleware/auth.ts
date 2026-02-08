/**
 * Auth middleware for Hono
 *
 * - Parses Authorization: Bearer <jwt>
 * - Attaches user to context
 */

import type { Context, Next } from 'hono';
import type { UserRole } from '../backend/admin/types';
import { getBearerTokenFromAuthHeader, verifyJwt, type AuthUser } from '../services/auth-service';

export type AuthContextUser = AuthUser;

export function getJwtUserFromRequest(c: Context): AuthContextUser | null {
  const token = getBearerTokenFromAuthHeader(c.req.header('Authorization'));
  if (!token) return null;
  return verifyJwt(token);
}

export async function authMiddleware(c: Context, next: Next) {
  const user = getJwtUserFromRequest(c);
  if (user) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (c as any).set('user', user);
  }
  await next();
}

export function requireAuth(c: Context): AuthContextUser {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const user = ((c as any).get?.('user') as AuthContextUser | undefined) || getJwtUserFromRequest(c);
  if (!user) {
    throw new Error('Unauthorized');
  }
  return user;
}

export function requireRole(c: Context, role: UserRole): AuthContextUser {
  const user = requireAuth(c);
  const hierarchy: Record<UserRole, number> = { viewer: 1, editor: 2, admin: 3 };
  const userRole: UserRole = user.role || 'viewer';
  if (hierarchy[userRole] < hierarchy[role]) {
    throw new Error('Forbidden');
  }
  return user;
}
