# Deploying DAGI BINGO Backend on Render

This guide walks you through deploying the **DAGI BINGO** backend to [Render.com](https://render.com) using your GitHub repository [https://github.com/dagdagim/dagibingo.git](https://github.com/dagdagim/dagibingo.git).

---

## Option 1: Automatic Blueprint Deployment (Recommended & Fastest)

1. Sign in to your [Render Dashboard](https://dashboard.render.com/).
2. Click **New +** → **Blueprint**.
3. Connect your GitHub repository: `https://github.com/dagdagim/dagibingo.git`.
4. Render will automatically read [`render.yaml`](file:///c:/Users/dell/Desktop/bingo/render.yaml) and configure:
   - **Service Name**: `dagi-bingo-backend`
   - **Environment**: Node
   - **Build Command**: `npm install && npm run build:shared && npm run build:server`
   - **Start Command**: `npm run start --workspace=@bingo/server`
   - **Health Check**: `/health`
5. Under **Environment Variables**, fill in your `MONGODB_URI` (from MongoDB Atlas) and `CLIENT_URL` (your frontend domain).
6. Click **Apply**. Render will build and deploy your backend with a live URL (e.g. `https://dagi-bingo-backend.onrender.com`).

---

## Option 2: Manual Web Service Deployment

1. Go to [Render Dashboard](https://dashboard.render.com/) → **New +** → **Web Service**.
2. Select your repository `dagdagim/dagibingo`.
3. Configure the settings:
   - **Name**: `dagi-bingo-backend`
   - **Region**: Oregon (US West) or Frankfurt (EU)
   - **Branch**: `main`
   - **Root Directory**: `.` (leave blank / root)
   - **Runtime**: `Node`
   - **Build Command**: `npm install && npm run build:shared && npm run build:server`
   - **Start Command**: `npm run start --workspace=@bingo/server`
   - **Instance Type**: `Free` (or Starter)

4. **Environment Variables**:
   Click **Add Environment Variable** and enter:

   | Key | Recommended Value |
   |---|---|
   | `NODE_ENV` | `production` |
   | `PORT` | `10000` (or leave default, Render sets $PORT) |
   | `HOST` | `0.0.0.0` |
   | `MONGODB_URI` | `mongodb+srv://<user>:<password>@cluster.mongodb.net/bingo_arena?retryWrites=true&w=majority` |
   | `JWT_SECRET` | *(click Generate or enter a secure 32+ char key)* |
   | `JWT_EXPIRES_IN` | `2h` |
   | `JWT_REFRESH_SECRET` | *(click Generate or enter a secure 32+ char key)* |
   | `JWT_REFRESH_EXPIRES_IN` | `7d` |
   | `GAME_MODE` | `DEMO` |
   | `CLIENT_URL` | `https://your-frontend.vercel.app` *(or your frontend URL)* |
   | `CHAPA_PUBLIC_KEY` | `CHAPUBK_TEST-F8wVF0CiDxcc6xAut5vm1oFKM4VCVCG9` |
   | `CHAPA_SECRET_KEY` | `CHASECK_TEST-EzF8SkHTiEva3p8xXcwKREFNpIHCq5hu` |
   | `CHAPA_WEBHOOK_SECRET` | `dagi_bingo_chapa_webhook_secret_2026` |
   | `CHAPA_API_URL` | `https://api.chapa.co/v1` |

5. Click **Create Web Service**.

---

## 3. Database Setup (Free MongoDB Atlas)
If you don't have a live MongoDB Atlas URI:
1. Create a free cluster on [MongoDB Atlas](https://www.mongodb.com/cloud/atlas).
2. Under **Network Access**, add IP `0.0.0.0/0` (Allow Access from Anywhere so Render can connect).
3. Under **Database Access**, create a database user and password.
4. Click **Connect** → **Drivers** → Copy the Connection String into `MONGODB_URI` on Render.

---

## 4. Connecting Frontend to your Render Backend
Once your Render backend is live (e.g. `https://dagi-bingo-backend.onrender.com`):
- Set `VITE_API_URL=https://dagi-bingo-backend.onrender.com` in your frontend environment settings (e.g., in Vercel or Netlify).
