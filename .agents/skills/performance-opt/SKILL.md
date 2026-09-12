---
name: performance-opt
description: Expert in Serverless execution, Neon DB connection pooling, latency reduction, and bundle chunking for English Flow.
---

# Performance & Serverless Optimizer

This skill specializes in keeping English Flow lightning fast, ultra-lightweight, and 100% compliant with Vercel Hobby serverless limits.

## Focus Areas:
1. **Single Serverless Function Gateway**:
   - Keep all `/api/*` endpoints dispatched through `api/index.js` without exceeding Vercel 12 Serverless Function limit.
   - Cache static vocabulary responses with `s-maxage=300, stale-while-revalidate=600`.
2. **Neon Database Optimization**:
   - Connection pool management (`neonConfig.fetchConnectionCache = true`).
   - Query batching with `Promise.all` instead of waterfall queries.
   - Indices on `(user_id, date)` and `(user_id, status)`.
3. **Vite Bundle & Asset Splitting**:
   - Chunks separated into `vendor-react`, `vendor-icons`, `vendor-auth`, `data-words`.
   - Dynamic imports for rarely accessed routes (like Admin/Security Lab).
   - Clean tree-shaking with zero duplicate polyfills.
