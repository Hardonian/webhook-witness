# webhook-witness

Webhook Witness is a Cloudflare Workers + D1 + Pages micro-SaaS for SaaS teams that need to capture, inspect, isolate, and replay webhook payloads fast.

Phase 2 status:
- workspace-scoped capture and dashboards
- simple token auth per workspace
- lead capture and plan interest intake
- billing shell with plan/checkout intent flow
- live landing page + live dashboard

Offer:
- Starter: $29/mo
- Team: $99/mo
- Agency: $299/mo

Stack:
- Cloudflare Workers API
- Cloudflare D1
- Cloudflare Pages dashboard + landing

Core endpoints:
- `GET /health`
- `GET /api/v1/plans`
- `POST /api/v1/leads`
- `POST /api/v1/workspaces/bootstrap`
- `POST /api/v1/auth/workspace`
- `POST /api/v1/capture/:workspaceSlug/:source?token=...`
- `POST /api/v1/workspaces/:slug/demo-seed?token=...`
- `GET /api/v1/workspaces/:slug/summary?token=...`
- `GET /api/v1/workspaces/:slug/events?token=...`
- `GET /api/v1/workspaces/:slug/events/:id?token=...`
- `GET /api/v1/workspaces/:slug/replay-plan/:id?token=...`

Notes:
- Billing shell is live as checkout-intent capture and plan routing.
- Full Stripe checkout requires Stripe credentials and webhook secrets not yet provisioned in this repo.
