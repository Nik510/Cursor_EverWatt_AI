# Admin System

## Overview

The admin system provides authentication, authorization, and content management capabilities. Admins can publish/hide content, edit modules, and manage visibility throughout the app.

## Features

1. **Authentication** - Login/logout with role-based access
2. **Visibility Control** - Publish, hide, archive, or draft content
3. **Admin Dashboard** - Centralized content management
4. **In-App Controls** - Floating admin panel for quick actions
5. **Role-Based Access** - Admin, Editor, Viewer roles

## User Roles

- **Admin** - Full access: publish, hide, edit, delete, manage users
- **Editor** - Can edit and create content, but may need approval to publish
- **Viewer** - Read-only access

## Default Login

For development/demo:
- **Email**: `admin@everwatt.com`
- **Password**: Any password (for demo purposes)

## Usage

### Accessing Admin

1. Navigate to `/admin` in the app
2. Or click the admin button (⚙️) in the bottom-right corner when logged in
3. Login with admin credentials

### Publishing/Hiding Content

1. **Via Admin Dashboard** (`/admin`):
   - View all modules with their status
   - Filter by status (published, draft, hidden, archived)
   - Click edit to change visibility

2. **Via Floating Admin Panel**:
   - Click the settings icon (⚙️) in bottom-right
   - Use visibility controls to publish/hide content
   - Changes are immediate

### Content Visibility Status

- **Published** - Visible to all users
- **Draft** - Work in progress, visible to admins/editors
- **Hidden** - Not visible to regular users (admins can see)
- **Archived** - Old content, not visible to regular users

## Architecture

```
src/
├── backend/
│   └── admin/
│       ├── types.ts          # Admin types and interfaces
│       ├── auth.ts           # Authentication logic
│       └── README.md
├── contexts/
│   └── AdminContext.tsx      # React context for admin state
├── components/
│   └── admin/
│       ├── AdminLogin.tsx    # Login component
│       └── AdminControls.tsx # Floating admin panel
└── pages/
    └── admin/
        └── AdminDashboard.tsx # Main admin interface
```

## Integration

The admin system is integrated into:

1. **ModuleHub** - Shows admin button when logged in
2. **EETraining** - Filters content by visibility, shows admin controls
3. **All Modules** - Can be extended to any module

## Future Enhancements

- [ ] Database-backed authentication
- [ ] JWT tokens for secure sessions
- [ ] Content versioning and history
- [ ] Approval workflow for editors
- [ ] Audit log for all admin actions
- [ ] User management UI
- [ ] Content editing UI (WYSIWYG)
- [ ] Bulk operations (publish/hide multiple items)

## Security Notes

**Current Implementation (Development)**:
- In-memory user store
- Simple token-based sessions
- No password hashing (demo only)

**Production Requirements**:
- Database for users and sessions
- Password hashing (bcrypt/argon2)
- JWT tokens with expiration
- HTTPS only
- Rate limiting
- CSRF protection
