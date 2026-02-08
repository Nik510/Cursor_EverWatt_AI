/**
 * Admin System Types
 * Authentication, authorization, and content management
 */

/**
 * User Roles
 */
export type UserRole = 'admin' | 'editor' | 'viewer';

/**
 * User Account
 */
export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  createdAt: string;
  lastLogin?: string;
}

/**
 * Admin Session
 */
export interface AdminSession {
  userId: string;
  email: string;
  role: UserRole;
  expiresAt: number;
  token: string;
}

/**
 * Content Visibility Status
 */
export type VisibilityStatus = 'published' | 'draft' | 'archived' | 'hidden';

/**
 * Content Approval Status
 */
export type ApprovalStatus = 'approved' | 'pending' | 'rejected';

/**
 * Content Metadata with Admin Controls
 */
export interface AdminContentMetadata {
  visibility: VisibilityStatus;
  approvalStatus?: ApprovalStatus;
  publishedAt?: string;
  publishedBy?: string;
  lastEditedAt?: string;
  lastEditedBy?: string;
  notes?: string; // Admin notes
  tags?: string[];
  [key: string]: unknown;
}

/**
 * Module with Admin Metadata
 */
export interface AdminModule {
  id: string;
  title: string;
  subtitle?: string;
  description?: string;
  icon?: string;
  category: string;
  order: number;
  status: VisibilityStatus; // Replaces 'draft' | 'published' | 'archived'
  sections: AdminSection[];
  metadata?: AdminContentMetadata & {
    author?: string;
    version?: string;
    estimatedTime?: number;
    difficulty?: 'beginner' | 'intermediate' | 'advanced';
  };
}

/**
 * Section with Admin Metadata
 */
export interface AdminSection {
  id: string;
  title: string;
  subtitle?: string;
  icon?: string;
  order: number;
  status: VisibilityStatus;
  content: AdminContentBlock[];
  metadata?: AdminContentMetadata & {
    estimatedTime?: number;
    difficulty?: 'beginner' | 'intermediate' | 'advanced';
    prerequisites?: string[];
  };
}

/**
 * Content Block with Admin Metadata
 */
export interface AdminContentBlock {
  id: string;
  type: string;
  order: number;
  status: VisibilityStatus;
  metadata?: AdminContentMetadata & {
    title?: string;
    description?: string;
    tags?: string[];
  };
  [key: string]: unknown; // Block-specific fields
}

/**
 * Admin Action Log
 */
export interface AdminAction {
  id: string;
  userId: string;
  userEmail: string;
  action: 'create' | 'update' | 'delete' | 'publish' | 'hide' | 'archive' | 'approve' | 'reject';
  resourceType: 'module' | 'section' | 'content-block' | 'user';
  resourceId: string;
  timestamp: string;
  changes?: Record<string, { old: unknown; new: unknown }>;
  notes?: string;
}

/**
 * Admin Settings
 */
export interface AdminSettings {
  requireApproval: boolean; // Require approval before publishing
  allowDrafts: boolean; // Allow draft content
  defaultVisibility: VisibilityStatus; // Default for new content
  allowedRoles: UserRole[]; // Roles that can publish
}
