# VibeDine — Smart Restaurant Management System

Real-time restaurant ecosystem with customer reservation, kitchen display, floor staff coordination, manager analytics, and ML forecasting.

Built with **Next.js 16**, **React 19**, **Socket.IO**, **Prisma** (Neon DB), **Redis**, and **Gemini AI**.

## Live Demo

Deployed on Railway: [restaurantecosystem-production.up.railway.app](https://restaurantecosystem-production.up.railway.app)

## Features

- **Customer Portal** — Table reservation, menu browsing, order placement, real-time order tracking
- **Kitchen Display** — Live incoming orders, prep timer, status progression
- **Staff Dashboard** — Table alerts (call waiter / pay cash), staff status management
- **Manager Dashboard** — Revenue metrics, inventory tracking, waiter leaderboard, AI-powered insights
- **ML Forecasting** — XGBoost-based 7-day demand and ingredient depletion prediction
- **Reservation Page** — Standalone table booking with date/time picker

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (custom server with Socket.IO) |
| UI | React 19, Tailwind CSS 4, Lucide Icons |
| Database | PostgreSQL via Prisma (Neon) |
| Cache | Redis (ioredis) |
| Real-time | Socket.IO |
| AI | Gemini 2.5 Flash (Google Gen AI) |
| ML | XGBoost / scikit-learn (Python script) |

## Local Development

### Prerequisites

- Node.js 20+
- PostgreSQL (or use the Neon connection string)
- Redis (optional — falls back to in-memory cache)

### Setup

```bash
npm install
npx prisma generate
```

### Environment Variables

Create a `.env` file in the root:

```env
GEMINI_API_KEY=your_gemini_api_key
DATABASE_URL="postgresql://..."
REDIS_URL="redis://..."
PORT=3000
```

### Run

```bash
npm run dev
```

Opens at [http://localhost:3000](http://localhost:3000).

Login credentials (dev):

| Role | Email | Password |
|---|---|---|
| Customer | — | OTP-based signup |
| Kitchen Staff | kitchen@vibedine.com | password123 |
| Manager | — | — |

## Deploy on Railway

1. **Push to GitHub** and link your repo on [Railway Dashboard](https://railway.com/new)
2. **Set environment variables** in Railway → your service → Variables tab:

   | Variable | Value |
   |---|---|
   | `GEMINI_API_KEY` | Your Gemini API key |
   | `DATABASE_URL` | PostgreSQL connection string |
   | `REDIS_URL` | Redis connection string (optional) |
   | `PORT` | `3000` |

3. No extra config needed — Railway auto-detects Node.js and runs `npm run build` + `npm start`.

The app uses a custom server (`server.js`) with Socket.IO for real-time features. Railway handles this correctly with the default Node.js builder.
