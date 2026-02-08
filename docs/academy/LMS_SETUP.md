# LMS setup (two separate Academy portals)

Goal: stand up **two isolated portals/spaces** under the Everwatt Academy umbrella so **Sales cannot discover Engineering content** (and vice versa).

## 1) Create two separate portals/spaces

- **Engineering Academy**: `academy.everwatt.com/engineering`
- **Sales Academy**: `academy.everwatt.com/sales`

Hard requirement: **no shared catalog/search/navigation** between them.

## 2) Portal configuration checklist (both portals)

- **Branding**: Everwatt Academy umbrella, but distinct portal names.
- **Admins**: separate admin groups per portal.
- **Content ownership**: separate course author roles per portal.
- **Search**: scoped to the portal only (no global org search).
- **Public pages**: minimal (no course listing unless permitted).
- **Analytics**: portal-scoped reporting only.
- **Export**: portal-scoped export permissions only.

## 3) Access policy

### Engineering Academy (invite-only, free)

- Enrollment is **invite-only** (email invites and/or approval queue).
- No sales CTAs.
- Optional: allowlist by hospital email domain, with manual overrides for contractors.

### Sales Academy (internal only)

- Restricted to company emails (or manual provisioning).
- Do not expose in product to non-staff users.

## 4) Certification (Engineering Level 1)

Create a certification object with:

- **Passing score**: define once (e.g. 80%).
- **Retake policy**: e.g. unlimited retakes but cooldown (24h).
- **Expiration/renewal**: e.g. 12–18 months.
- **Certificate template**: “Everwatt Certified Healthcare Energy Operator — Level 1”.
- **Credential page** (optional): shareable verification page.

## 5) SSO (post-MVP hardening)

Do not turn this app into an IdP. Use an external IdP (Okta/Google Workspace/Auth0/etc) and connect it to each LMS portal via OIDC/SAML when ready.

## 6) App integration points

The app links to the portals via environment variables:

- `VITE_ACADEMY_ENGINEERING_URL`
- `VITE_ACADEMY_SALES_URL`

The in-app Academy page role-gates **Sales Academy** behind AdminContext permission checks.

