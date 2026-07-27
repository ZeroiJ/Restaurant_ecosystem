# VibeDine — Smart Restaurant Management System

> Team Skill Issue — Hackathon Project — Real-time restaurant ecosystem with AI-powered manager insights.

## The Problem

Restaurants run on chaos. Kitchen staff can't see orders in real time. Waiters run around blind. Managers guess when to restock. Customers wave their hands for the check.

## What We Built

A unified real-time platform connecting every role in a restaurant:

- **Customers** — Reserve tables via OTP, browse menu, place orders, track live status
- **Kitchen Staff** — See orders pop up in real time, mark prep stages, trigger pickup alerts
- **Wait Staff** — Receive table calls (waiter / checkout), coordinate deliveries
- **Manager** — Dashboard with revenue, inventory, staff performance, and **AI-generated operations insights**

## Team

| Name | Role |
|---|---|
| **Sujal Birwadkar** (Lead) | CI/CD deployment, Databases |
| **Mohit Malpote** | Full-stack development — built the entire app |
| **Riya Phalke** | Research, PPT, documentation |

## Architecture

- **Custom server** (`server.js`) hosts Next.js + Socket.IO on the same port
- Real-time rooms: `kitchen-staff-dashboard`, `customer-order-{id}`
- AI analytics endpoint (`/api/analytics`) calls Gemini with structured JSON prompt
- ML forecasting (`/api/ml-forecast`) pipes inventory data to Python XGBoost script
- In-memory fallbacks for DB and Redis — works out of the box with no external services

## Tech Stack

| Frontend | Backend | Infrastructure |
|---|---|---|
| Next.js 16 | Node.js + Socket.IO | Railway (hosted) |
| React 19 | Prisma + PostgreSQL | Neon (DB) |
| Tailwind CSS 4 | Redis (ioredis) | Redis Cloud |
| Lucide Icons | Gemini 2.5 Flash AI | Google AI |

Also includes an **XGBoost ML forecast script** that predicts 7-day menu demand and ingredient depletion.

## What Makes It Unique

- **Not another food delivery app** — this is an operations platform for the restaurant itself, not a Zomato/Swiggy clone
- **Every role on one real-time canvas** — customer, kitchen, waiter, and manager are all connected through Socket.IO with zero polling
- **AI that actually helps** — Gemini generates actionable ops insights (not generic chatbot), XGBoost forecasts ingredient depletion 7 days ahead
- **Graceful degradation** — DB or Redis down? Falls back to in-memory. No Gemini key? Mock insights kick in. The app never crashes.
- **Custom server architecture** — Next.js and Socket.IO share one port, one process. No separate WebSocket server to manage.

## Live Demo

[restaurantecosystem-production.up.railway.app](https://restaurantecosystem-production.up.railway.app)

## Running Locally

```bash
npm install
npx prisma generate
```

Create `.env`:

```env
GEMINI_API_KEY=your_key
DATABASE_URL=postgresql://...
REDIS_URL=redis://...
PORT=3000
```

```bash
npm run dev
```
