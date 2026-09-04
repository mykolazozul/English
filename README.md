# English Flow 🇺🇸

A responsive English-learning web app built with React + Vite.

## Notion synchronization

The app uses your Notion database **🇺🇸 English words** as the source of truth.
The database currently has 395 rows and the data source ID is:

`f38dba17-bbd6-4f04-9875-030212db4d0a`

### Local sync

1. Create a Notion integration and copy its internal integration token.
2. Share the **🇺🇸 English words** database with that integration.
3. In PowerShell:

```powershell
$env:NOTION_TOKEN="YOUR_NOTION_TOKEN"
npm run sync:notion
npm run dev
```

The sync script follows Notion pagination and imports all available non-empty word rows, including Word, Translation, Explanation, Pronunciation, Examples, Category and Notion URL.

### GitHub automatic sync

Add a repository secret named `NOTION_TOKEN` in:

**GitHub → English → Settings → Secrets and variables → Actions**

The included workflow `.github/workflows/notion-sync.yml` can be run manually and also runs every day. It downloads the full Notion vocabulary, updates the generated data file and commits the result back to the repository.

This architecture keeps the Notion token out of the browser. Never put `NOTION_TOKEN` in `VITE_*` variables or frontend source code.

## Run

```powershell
npm install
npm run dev
```

## Build

```powershell
npm run build
```

## Deployment

### Vercel (recommended)
Connect the GitHub repo in Vercel. Framework Preset: **Vite**.
`base` is set to `/` so assets load correctly on `*.vercel.app`.

After deploy, enable **Web Analytics** in the Vercel project dashboard.

### GitHub Pages
If you still need GitHub Pages, change `base` in `vite.config.js` to `'/English/'` and use the included workflow.

## Vercel Analytics

The app includes `@vercel/analytics` (React version).

```jsx
import { Analytics } from '@vercel/analytics/react';
// ...
<Analytics />
```

After deploying to Vercel, enable Web Analytics in the project dashboard.
