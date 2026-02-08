# Invite / provisioning workflow (v1)

This workflow enforces **invite-only** access for Engineering Academy and **internal-only** access for Sales Academy.

## Principles
- **Default deny**: no access until explicitly provisioned.
- **No discoverability**: users never see other portals.
- **Separate admins**: Engineering admins cannot administer Sales (and vice versa).

## Engineering Academy (invite-only, free)

### Who can request access
- Healthcare facilities/energy engineers
- Approved contractors working on behalf of a hospital (manual verification)

### How access is granted (recommended v1)
1. Engineer submits request (form/email) with:
   - name, email, hospital, role/title, manager name (optional)
2. Academy admin validates:
   - hospital domain OR a lightweight verification step
3. Admin sends LMS invite:
   - invite link expires (e.g., 7 days)
4. User enrolls in “Engineering Level 1” course

### Allowlist strategy
- **Primary**: hospital email domains allowlisted
- **Exceptions**: individual allowlist entries for consultants/contractors

### Operational SLA
- Target: approve within 1 business day during pilot

### Offboarding
- Remove user from LMS portal (engineering only)
- Keep certificate record if applicable (optional)

## Sales Academy (internal-only)

### Who gets access
- Everwatt employees (or explicitly approved partners)

### Provisioning
- Provision via company email domain and/or manual admin invites.
- Require MFA if supported by LMS/IdP.

### Visibility
- Sales Academy is only linked in-app for staff users (editor/admin in the app).

## Audit / logging
- Track invites issued, approvals, and removals in a simple spreadsheet during pilot.
- Move to an internal system later if needed.

