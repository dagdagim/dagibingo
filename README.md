# 🎰 DAGI BINGO — Real-Time Multiplayer Platform

> **Your Luck. Your Moment. Your Bingo.**  
> A high-performance, real-time multiplayer 75-ball online Bingo gaming platform engineered with Node.js, Express, React, TypeScript, Vite, Tailwind CSS, Redis, Socket.IO, Web Speech audio synthesis, double-entry financial ledger, and Chapa Payment Gateway.
> 
> **Developed by Tobiya • Developer Dagim Bekele** ([https://dagimbekelebunera.vercel.app/](https://dagimbekelebunera.vercel.app/))

---

## 🏛️ System Architecture

```
├── packages/
│   └── shared/                 # Shared TypeScript types, Zod schemas, game constants
├── server/                     # Authoritative Node.js + Express + Socket.IO + Mongoose server
│   ├── src/
│   │   ├── config/             # Environment, Database, Redis
│   │   ├── game-engine/        # 75-Ball RNG, TicketGenerator, PatternValidator, GameEngine
│   │   ├── middleware/         # Auth, RateLimiter, ErrorHandler, Zod Validator
│   │   ├── models/             # Mongoose Schemas (User, Wallet, Game, Ticket, Ledger)
│   │   ├── modules/            # Auth, Users, Games, Wallet, Admin, KYC, Fraud
│   │   ├── payments/           # ChapaPaymentProvider & MockPaymentProvider
│   │   ├── socket/             # Real-time WebSocket connection manager
│   │   └── seeds/              # Comprehensive seed script (Demo admin & players)
│   └── tests/                  # Unit and integration test suites
├── client/                     # Vite + React 18 + TypeScript + Tailwind CSS client
│   ├── src/
│   │   ├── components/         # UI Design kit, Bingo cards, Balls, Voice caller, Chat, Wallet
│   │   ├── pages/              # Landing, Lobby, Live Game Room, Wallet, Profile, Admin Suite
│   │   ├── stores/             # Zustand stores (Auth, Game Room, Wallet, Theme)
│   │   └── utils/              # VoiceController (Web Speech API announcer)
└── render.yaml                 # Infrastructure-as-Code blueprint for Render deployment
```

---

## 🌐 Deploying to Render (Step-by-Step)

### Option 1: 1-Click Render Blueprint (Recommended)
1. Go to [Render Dashboard](https://dashboard.render.com/) and click **New +** -> **Blueprint**.
2. Connect your GitHub repository: `https://github.com/dagdagim/dagibingo.git`.
3. Render will read [`render.yaml`](render.yaml) automatically.
4. Set your environment variables (e.g. `MONGODB_URI` from MongoDB Atlas).
5. Click **Apply** to deploy!

### Option 2: Manual Web Service Setup on Render
1. Click **New +** -> **Web Service**.
2. Connect `dagdagim/dagibingo`.
3. Configure the following:
   - **Name**: `dagi-bingo`
   - **Environment**: `Node`
   - **Region**: `Oregon (US West)` or your preference
   - **Branch**: `main`
   - **Build Command**: `npm run render-build`
   - **Start Command**: `npm start`
4. Add **Environment Variables**:
   - `NODE_ENV`: `production`
   - `PORT`: `10000`
   - `HOST`: `0.0.0.0`
   - `MONGODB_URI`: `mongodb+srv://<username>:<password>@cluster.mongodb.net/dagibingo?retryWrites=true&w=majority`
   - `JWT_SECRET`: `your_random_jwt_secret_key_here`
   - `JWT_REFRESH_SECRET`: `your_random_refresh_jwt_secret_here`
   - `CHAPA_PUBLIC_KEY`: `CHAPUBK_TEST-F8wVF0CiDxcc6xAut5vm1oFKM4VCVCG9`
   - `CHAPA_SECRET_KEY`: `CHASECK_TEST-EzF8SkHTiEva3p8xXcwKREFNpIHCq5hu`
   - `CHAPA_API_URL`: `https://api.chapa.co/v1`
   - `GAME_MODE`: `DEMO`
5. Click **Create Web Service**.

---

## 💳 Chapa Payment & Payout Integration

DAGI BINGO is integrated with the **Chapa API**:
- **Deposits**:
  - Secure hosted checkout portal.
  - Supports **Telebirr**, **CBE Birr**, **Awash Bank**, **Bank of Abyssinia**, and **Debit/Credit Cards**.
  - Automatic balance reconciliation on return and real-time verification.
- **Withdrawals / Payouts**:
  - Instant dispatch via Chapa Transfer API (`/v1/transfers`).
  - Supports payouts to Telebirr (`855`), CBE Birr (`128`), Commercial Bank of Ethiopia (`946`), Awash Bank (`656`), Bank of Abyssinia (`347`), and more.

---

## 🚀 Quick Start (Local Development)

### 1. Installation
```bash
npm install
npm run build:shared
```

### 2. Seed Data
```bash
npm run seed
```

**Pre-Configured Test Credentials:**
- **👑 Admin**: `admin@bingoarena.com` / `Admin@123456`
- **🎮 Player 1**: `player1@bingoarena.com` / `Player@123456`
- **🎯 Player 2**: `player2@bingoarena.com` / `Player@123456`

### 3. Run Locally
```bash
npm run dev
```
- Client: `http://localhost:5173`
- Server: `http://localhost:5000`
