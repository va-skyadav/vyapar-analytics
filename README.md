# Vyapar Analytics

AI-powered business intelligence platform.

## Product modules

- Analytics
- Accounting
- Inventory
- HR
- Taxation
- Predictions

This repository contains the application frontend and backend integration for the Vyapar Analytics platform.

## Deployment

Production deployment is managed through Vercel from the `main` branch.


## Database and Frontend Deployment Rule

Database privilege, RLS, RPC authorization, or other schema/security changes must not be applied to the live database ahead of the matching frontend release. Before changing live database behavior, the corresponding frontend must be verified on preview and released/deployed together with the database change.

All production migrations must be backward-compatible with the frontend currently deployed in production. A migration must not revoke, remove, or change a database capability still required by the currently deployed frontend unless the replacement frontend is already verified and deployed as part of the same release sequence.

For security hardening that requires a database change, use a staged, backward-compatible migration path: add the replacement capability first, deploy and verify the frontend, then remove/revoke the obsolete capability in a subsequent coordinated release.
