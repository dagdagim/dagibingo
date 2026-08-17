# 🌐 Hosting DAGI BINGO Frontend (Step-by-Step Guide)

You can host the **DAGI BINGO Frontend** on **Vercel** (Recommended), **Netlify**, or **Render Static Site** for free.

---

## ⚡ Option 1: Deploy on Vercel (Recommended - Fastest & 1-Click)

Vercel provides the fastest edge hosting, instant global CDN, and automatic SSL.

### Steps:
1. Go to [Vercel Dashboard](https://vercel.com/new).
2. Click **"Add New..."** -> **"Project"**.
3. Import your GitHub repository: **`dagdagim/dagibingo`**.
4. In the Project Configuration:
   - **Framework Preset**: `Vite`
   - **Root Directory**: Click `Edit` -> Select `client`
   - **Build Command**: `npm run build` *(or leave default)*
   - **Output Directory**: `dist` *(or leave default)*
5. Under **Environment Variables**, add:
   | Key | Value |
   |---|---|
   | `VITE_API_URL` | `https://dagibingolive.onrender.com` |
   | `VITE_SOCKET_URL` | `https://dagibingolive.onrender.com` |
   | `VITE_GAME_TITLE` | `DAGI BINGO` |
6. Click **Deploy** 🚀!

---

## 🍃 Option 2: Deploy on Netlify

1. Go to [Netlify Dashboard](https://app.netlify.com/).
2. Click **"Add new site"** -> **"Import an existing project"** -> **"GitHub"**.
3. Select repository: **`dagdagim/dagibingo`**.
4. Configure Build settings:
   - **Base directory**: `client`
   - **Build command**: `npm run build`
   - **Publish directory**: `client/dist`
5. Under **Environment variables**, add:
   - `VITE_API_URL` = `https://dagibingolive.onrender.com`
   - `VITE_SOCKET_URL` = `https://dagibingolive.onrender.com`
6. Click **Deploy dagibingo**.

---

## ☁️ Option 3: Deploy on Render (Static Site)

You can also host the frontend alongside your backend on Render:

1. In [Render Dashboard](https://dashboard.render.com/), click **New +** -> Select **Static Site**.
2. Select repository: **`dagdagim/dagibingo`**.
3. Configure settings:
   - **Name**: `dagi-bingo-client`
   - **Root Directory**: `client`
   - **Build Command**: `npm install && npm run build`
   - **Publish Directory**: `dist`
4. Under **Environment Variables**, add:
   - `VITE_API_URL` = `https://dagibingolive.onrender.com`
   - `VITE_SOCKET_URL` = `https://dagibingolive.onrender.com`
5. Click **Create Static Site**.

---

## 🔗 Step 4: Update Backend CORS on Render

Once your frontend is deployed (e.g. `https://dagibingo.vercel.app`):
1. Go to your **`dagi-bingo-server`** on Render.
2. In **Environment**, update:
   - `CLIENT_URL` = `https://your-frontend-domain.vercel.app`
3. Save changes.
