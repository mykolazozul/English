# Realtime deployment

Vercel is the web/API layer. The project includes a portable WebSocket service in `realtime/` because a persistent socket needs a long-lived realtime runtime. Vercel's current WebSocket guidance distinguishes persistent realtime connections from ordinary serverless requests; the included service can be deployed on a long-running Node host, while Neon remains the system of record.

## Required env
- DATABASE_URL — same Neon connection string as the API
- PORT — supplied by the host (default 8787)

## Install/start
```bash
cd realtime
npm install
npm start
```

## Frontend
Set Vercel `VITE_REALTIME_URL` to the public `wss://...` URL of this service. Never put DATABASE_URL in a VITE_ variable.

The client automatically reconnects. If realtime is unavailable, the normal HTTP chat API remains available.
