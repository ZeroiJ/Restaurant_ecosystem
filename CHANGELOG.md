# Changelog

## v0.1.0 — Mohit's Foundation (July 25–26)

### What was built

**Architecture:**
- Custom Next.js 16 server (`server.js`) with Socket.io for real-time bidirectional communication
- 4 portals in one app: Landing/Auth, Customer, Kitchen/Staff, Manager
- In-memory mock DB (`src/lib/db.js`) with full fallback — works with or without `DATABASE_URL`

**Backend (5 API routes):**
- `api/auth` — register, login, OTP verification, role-based redirect
- `api/menu` — menu CRUD with Redis/in-memory cache (60s TTL)
- `api/orders` — create/fetch/update orders with loyalty points (10% of total)
- `api/analytics` — dashboard metrics, waiter leaderboard, Gemini AI insights
- `api/reservations` — table booking with date/time

**Real-time (Socket.io):**
- Live order status updates (`place-order`, `update-order-status`)
- Waiter dispatch (`dish-ready-pickup`)
- Table alerts (`Call Waiter` / `Pay Cash`)
- Staff online/offline tracking

**Pages:**
- **Landing** (`page.js`) — Auth modal with login/register/OTP, table reservation grid (T1–T10), guest mode bypass
- **Customer** (`customer/page.js`) — Menu browsing with category filter, cart, order status tracker (Pending→Preparing→Ready→Served), personalized recommendation engine (popularity + past-order affinity scoring), simulated UPI QR payment
- **Kitchen/Staff** (`kitchen-staff/page.js`) — Order queue, status progression, waiter dispatch pickup board, table alerts, staff online roster, audio chime on new orders
- **Manager** (`manager/page.js`) — 3-tab dashboard (inventory, operations, staff), inventory restock, SVG charts (donut/bar), waiter leaderboard, Gemini AI insights generator

**Data models (Prisma):**
- `User` (email, password, role, loyalty points, OTP)
- `Reservation` (tableNo, dateTime, status)
- `MenuItem` (name, category, price, availability, popularityScore)
- `Order` (tableNo, status, items JSON, totalAmount)
- `StaffLog` (staffUid, actionType, responseTime)
- `InventoryItem` (itemName, quantity, minThresholdWarning)

**Seed data:**
- 4 users (manager, staff, kitchen, customer)
- 13 Indian menu items across 5 categories
- 2 sample orders
- 9 inventory items

---

## v0.2.0 — Innovation Layer (July 27, 3–5 PM)

### Added

**Pipeline Visualization** — `src/app/kitchen-staff/page.js` + `src/app/components/PipelineVisualization.js`
- 5-column status flow (PENDING → PREPARING → READY_TO_SERVE → SERVED → PAID)
- Each column color-coded: green (≤2), yellow (3-4), red (5+) based on order count
- Order cards show ID, table number, item summary
- Real-time updates via existing `orders` state + socket events
- Displayed above the kitchen staff workspace

**Kitchen Time Machine** — `server.js` + `src/app/components/KitchenTimeMachine.js` + `src/app/manager/page.js`
- Every order status change is logged with timestamp to an in-memory `statusLog` array on the server
- Play/pause scrubber UI replays any time window
- Snapshot view computes every order's latest status at the scrub position
- 4th tab on manager dashboard ("Kitchen Time Machine")

**Sentiment-Gated Reviews** — `src/app/customer/page.js`
- After PAID status, shows a popup with 😊 / 😞
- 😊 → opens Google Review link in new tab
- 😞 → shows private feedback textarea, saves to localStorage
- Feedback stored in `vibedine:feedback` key (localStorage)

### Notes
- Zero new npm dependencies
- No Prisma schema changes
- In-memory fallback compatible (no DATABASE_URL needed)
- All features work with the existing mock DB
