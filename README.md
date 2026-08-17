# 🎰 BINGO ARENA — Enterprise Multiplayer Platform

> **Your Luck. Your Moment. Your Bingo.**  
> A high-performance, real-time multiplayer 75-ball online Bingo gaming platform engineered with a MERN stack, Redis, Socket.IO, Web Speech synthesis, and double-entry transaction ledger.

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
│   │   ├── payments/           # PaymentProvider abstraction & MockPaymentProvider
│   │   ├── socket/             # Real-time WebSocket connection manager
│   │   └── seeds/              # Comprehensive seed script (Demo admin & players)
│   └── tests/                  # Unit and integration test suites
└── client/                     # Vite + React 18 + TypeScript + Tailwind CSS client
    ├── src/
    │   ├── components/         # UI Design kit, Bingo cards, Balls, Voice caller, Chat, Wallet
    │   ├── pages/              # Landing, Lobby, Live Game Room, Wallet, Profile, Admin Portal
    │   ├── stores/             # Zustand stores (Auth, Game Room, Wallet)
    │   └── utils/              # VoiceController (Web Speech API announcer)
```

---

## ⚖️ Legal & Sandbox Compliance Gate

Bingo Arena operates with a strict separation between **DEMO / SANDBOX MODE** and **REGULATED REAL MONEY**:

- **Default Mode (`GAME_MODE=DEMO`)**:
  - Operates solely with virtual ETB test credits.
  - No real financial transactions occur.
  - Payment providers use mock adapters (`MockPaymentProvider`).
  - Withdrawals and deposits are simulated.
- **Payment Abstraction**: The `PaymentProvider` interface ensures licensed payment gateways can be integrated modularly once all jurisdictional, KYC/AML, age-verification, and gaming commission licenses are satisfied.

---

## 🚀 Quick Start (Local Development)

### 1. Prerequisites
- Node.js >= 18.0.0
- MongoDB running locally on port `27017` (or Docker)
- Redis running on port `6379` (Optional, in-memory fallback enabled)

### 2. Installation
```bash
# Install all monorepo dependencies
npm install

# Build shared types
npm run build:shared
```

### 3. Environment Setup
```bash
# Copy template
cp .env.example .env
```

### 4. Seed Development Data
Populates the database with demo users, wallets, live game rooms, and sample transactions:
```bash
npm run seed
```

**Pre-Configured Test Credentials:**
- **👑 Admin**: `admin@bingoarena.com` / `Admin@123456`
- **🎮 Player 1**: `player1@bingoarena.com` / `Player@123456`
- **🎯 Player 2**: `player2@bingoarena.com` / `Player@123456`

### 5. Run Platform Locally
```bash
npm run dev
```
- Frontend Client: `http://localhost:5173`
- Backend API & WebSockets: `http://localhost:5000`

---

## 🧪 Automated Testing

Execute backend game-engine tests verifying 75-ball RNG non-repetition, ticket constraints, and pattern validations:
```bash
npm run test
```

---

## 🐳 Docker Deployment

Run the complete stack (MongoDB, Redis, API, and Nginx Web Proxy) with one command:
```bash
docker-compose up --build -d
```
Access the application at `http://localhost`.

---

## 🎮 Key Features & Highlights

- **Authoritative Server**: Backend controls ball draws, timestamps, winning pattern detection, and prize allocation. Frontend claims are strictly validated.
- **Voice Calling Engine**: Web Speech API audio announcer speaks out called balls (e.g. *"G 42, G forty-two"*).
- **Double-Entry Wallet**: Immutable ledger with idempotency keys, balance locks, and simulated deposit/withdrawal lifecycles.
- **Multiplayer Live Chat**: Interactive game room chat with rate limiting and quick emoji reactions.
- **Admin Management Portal**: Real-time room controller, KYC approval workflow, fraud anomaly alerts, and immutable security audit logs.
