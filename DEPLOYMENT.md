# Deployment Guide

Frontend → **Netlify**  
Backend  → **Render**

---

## 1. Push to GitHub

Make sure your code is in a GitHub repository. Both Netlify and Render connect directly to GitHub for automatic deploys on every push.

```
git add .
git commit -m "ready for deployment"
git push
```

---

## 2. Deploy the backend on Render

The backend is a Node.js Express server that holds your Groq API key and proxies requests to the Groq API.

### Steps

1. Go to [render.com](https://render.com) → **New +** → **Web Service**
2. Connect your GitHub account and select this repository
3. Render auto-detects `render.yaml` and pre-fills:
   - **Build command:** `npm install --omit=dev`
   - **Start command:** `node server/index.js`
   - **Health check:** `/api/health`
4. Under **Environment** → **Add Environment Variable**, add these **secret** vars (do not put them in `render.yaml`):

   | Key | Value |
   |-----|-------|
   | `GROQ_API_KEY` | your key from [console.groq.com/keys](https://console.groq.com/keys) |
   | `ALLOWED_ORIGIN` | leave blank for now — fill in after Netlify deploy (step 3) |

5. Click **Create Web Service**
6. Wait for the first deploy to finish (2–3 min)
7. Copy your service URL — it looks like `https://voice-compiler-api.onrender.com`

> **Free plan note:** Render free tier spins down after 15 min of inactivity. The first request after idle takes ~30 s. Upgrade to the Starter plan ($7/mo) to avoid this.

---

## 3. Deploy the frontend on Netlify

The frontend is a Vite-built static site. It calls the Render backend at the URL you set in `VITE_API_BASE_URL`.

### Steps

1. Go to [app.netlify.com](https://app.netlify.com) → **Add new site** → **Import an existing project** → **GitHub**
2. Select this repository
3. Netlify auto-detects `netlify.toml` and pre-fills:
   - **Build command:** `npm run build`
   - **Publish directory:** `dist`
4. Before the first deploy, go to **Site → Environment variables → Add a variable**:

   | Key | Value |
   |-----|-------|
   | `VITE_API_BASE_URL` | `https://voice-compiler-api.onrender.com/api` (your Render URL + `/api`) |

5. Click **Deploy site**
6. Once deployed, copy your Netlify URL — it looks like `https://your-app.netlify.app`

---

## 4. Wire the two services together

### Add your Netlify URL to Render

1. In Render → your service → **Environment**
2. Set `ALLOWED_ORIGIN` = `https://your-app.netlify.app` (exact URL, no trailing slash)
3. Click **Save Changes** — Render redeploys automatically

### (Optional) Set a custom domain

- **Netlify:** Site → Domain management → Add custom domain
- **Render:** Service → Settings → Custom domains

---

## 5. Verify it works

Open your Netlify URL in the browser and check:

1. **Backend health** — visit `https://your-render-url.onrender.com/api/health` in a new tab. You should see:
   ```json
   { "status": "ok", "hasApiKey": true, "codegenModel": "...", "analysisModel": "..." }
   ```
2. **Voice input** — speak a request; the app should generate C code and show all six phases
3. **Offline fallback** — if the backend is unreachable the app still works using the built-in local analyzer (you'll see the amber warning banner)

---

## Environment variable reference

### Render (backend)

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `GROQ_API_KEY` | **yes** | — | Groq API key |
| `ALLOWED_ORIGIN` | recommended | open | Your Netlify URL, e.g. `https://your-app.netlify.app` |
| `PORT` | no | `5174` | Render overrides this with `10000` automatically |
| `GROQ_CODEGEN_MODEL` | no | `llama-3.3-70b-versatile` | Groq model for code generation |
| `GROQ_ANALYSIS_MODEL` | no | `llama-3.3-70b-versatile` | Groq model for phase analysis |

### Netlify (frontend — build-time)

| Variable | Required | Description |
|----------|----------|-------------|
| `VITE_API_BASE_URL` | **yes** | Full URL of the Render backend + `/api`, e.g. `https://voice-compiler-api.onrender.com/api` |

---

## Local development (unchanged)

```bash
cp .env.sample .env
# Fill in GROQ_API_KEY in .env
npm install
npm run dev
```

Vite proxies `/api/*` to `http://localhost:5174` so `VITE_API_BASE_URL` is not needed locally.
