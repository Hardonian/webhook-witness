# webhook-witness

Webhook Witness is a Cloudflare Workers + D1 + Pages micro-SaaS for teams that need to capture, inspect, and replay webhook payloads fast.

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
- `POST /api/v1/capture/:source`
- `GET /api/v1/stats`
- `GET /api/v1/events`
- `GET /api/v1/events/:id`
- `POST /api/v1/demo-seed`
- `GET /api/v1/replay-plan/:id`
