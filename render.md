# 🚀 Hosting DAGI BINGO Server on Render (Step-by-Step Guide)

This guide walks you through deploying **only the backend server** of **DAGI BINGO** on [Render.com](https://render.com) for free.

---

## 📋 Quick Specifications for Render

| Field | Value |
|---|---|
| **Service Type** | **Web Service** |
| **Repository** | `https://github.com/dagdagim/dagibingo` |
| **Branch** | `main` |
| **Runtime** | `Node` |
| **Root Directory** | *(leave blank / root)* |
| **Build Command** | `npm install && npm run build:server` |
| **Start Command** | `npm run start --workspace=@bingo/server` |
| **Health Check Path** | `/health` |

---

## 🛠️ Step 1: Create a MongoDB Database (Free on MongoDB Atlas)

Since Render's free tier does not host a persistent local MongoDB container, use a free cloud MongoDB instance:

1. Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) and sign in.
2. Create a free **M0 Shared Cluster**.
3. Under **Database Access**, create a user with username (e.g. `dagibingo`) and a secure password.
4. Under **Network Access**, click **Add IP Address** -> select **Allow Access from Anywhere (`0.0.0.0/0`)**.
5. Click **Connect** -> **Drivers (Node.js)** -> Copy your connection string:
   ```env
   mongodb+srv://dagibingo:<password>@cluster0.xxxxx.mongodb.net/dagibingo?retryWrites=true&w=majority
   ```

---

## 🌐 Step 2: Deploy Server on Render

1. Log in to [Render Dashboard](https://dashboard.render.com/).
2. Click **New +** -> Select **Web Service**.
3. Connect your GitHub account and select your repository: **`dagdagim/dagibingo`**.
4. Configure the service settings:
   - **Name**: `dagi-bingo-server` (or your preferred name)
   - **Region**: Any (e.g. `Frankfurt` or `Oregon`)
   - **Branch**: `main`
   - **Root Directory**: *(Leave empty)*
   - **Runtime**: `Node`
   - **Build Command**:
     ```bash
     npm install && npm run build:server
     ```
   - **Start Command**:
     ```bash
     npm run start --workspace=@bingo/server
     ```
   - **Plan**: `Free`

---

## 🔑 Step 3: Configure Environment Variables on Render

In the **Environment Variables** section on Render, add the following keys:

| Environment Variable | Value | Description |
|---|---|---|
| `NODE_ENV` | `production` | Production mode |
| `PORT` | `5000` | (Render sets this automatically, but safe to include) |
| `HOST` | `0.0.0.0` | Bind address |
| `MONGODB_URI` | `mongodb+srv://dagibingo:<password>@cluster0.xxxxx.mongodb.net/dagibingo?retryWrites=true&w=majority` | Your MongoDB Atlas connection string |
| `JWT_SECRET` | `dagi_bingo_super_secure_jwt_production_secret_key_2026` | Any strong secret string |
| `JWT_REFRESH_SECRET` | `dagi_bingo_super_secure_refresh_jwt_key_production_2026` | Any strong refresh secret string |
| `CLIENT_URL` | `https://your-frontend-url.vercel.app` (or `http://localhost:5173`) | Your frontend domain (used for CORS) |
| `CHAPA_PUBLIC_KEY` | `CHAPUBK_TEST-F8wVF0CiDxcc6xAut5vm1oFKM4VCVCG9` | Chapa Test Public Key |
| `CHAPA_SECRET_KEY` | `CHASECK_TEST-EzF8SkHTiEva3p8xXcwKREFNpIHCq5hu` | Chapa Test Secret Key |
| `CHAPA_API_URL` | `https://api.chapa.co/v1` | Chapa API endpoint |
| `GAME_MODE` | `DEMO` | Platform game mode |

*(Note: Redis is optional. If `REDIS_URL` is omitted, the server automatically uses high-performance in-memory caching).*

---

## ⚡ Step 4: Deploy & Seed Data

1. Click **Create Web Service**.
2. Render will run `npm install && npm run build:server` and start the server.
3. Once deployed, test your server health check:
   ```
   https://dagi-bingo-server.onrender.com/health
   ```
   You will receive:
   ```json
   {
     "status": "healthy",
     "mode": "DEMO",
     "uptime": 12.34,
     "timestamp": "2026-08-17T..."
   }
   ```
4. **Seed Default Bingo Rooms & Accounts** *(Optional)*:
   In Render -> go to the **Shell** tab on your Web Service -> run:
   ```bash
   npm run seed --workspace=@bingo/server
   ```

---

## 🔗 Step 5: Connect Frontend to Render Server

If your frontend is deployed on **Vercel**, **Netlify**, or running locally:
Set the environment variable in your frontend project:
```env
VITE_API_URL=https://dagi-bingo-server.onrender.com
VITE_SOCKET_URL=https://dagi-bingo-server.onrender.com
```
