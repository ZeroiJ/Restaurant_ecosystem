# VibeDine — Master Prompt for Anti Gravity

## System & Architecture Directives
Act as a Senior Full-Stack Architect and Lead Engineer. Build a high-performance, real-time Smart Restaurant Management System (SaaS) called **"VibeDine"**.

The stack must use **Next.js (App Router)** or **React.js + Express/Node.js**, **Tailwind CSS**, **Socket.io**, **Neon DB (PostgreSQL) with Prisma/Drizzle ORM**, and **Redis** for state caching.

---

## Core System Architecture & Roles
Build four distinct role-based flows within the application:

### 1. Customer Flow (Dynamic Menu & Ordering)
* **Entry Options:** Upon landing, present three options: **Login**, **Sign Up**, or **Skip to Ordering (Guest Mode)**.
* **Dynamic Menu:** Fetch menu items cached via Redis. Sort available items to the top (`is_available: true`) and sort by popularity score.
* **Personalization:** For logged-in users, prioritize dishes based on order history using a simple recommendation query. For guests, display a "Chef's Specials / Top Rated" section.
* **Order Tracking & Table View:** Real-time updates on order status (`Pending` → `Preparing` → `Served`).
* **Post-Fulfillment Screen:** Display an "Enjoy Your Meal" screen with three action triggers: **Order More**, **Call Staff**, and **Proceed to Billing**.
* **Flexible Billing Flow:**
  * If the customer checked out as a Guest, show options: **Sign In / Sign Up to Earn Loyalty Points** OR **Skip to Direct Billing**.
  * Provide an instant **UPI QR Code** simulator (using `upi://pay` URI parameters rendering dynamic QR UI) and an option for **Pay by Cash** (which triggers a staff ping).

### 2. Kitchen Interface (KDS - Kitchen Display System)
* Real-time grid view receiving incoming orders instantly via WebSockets (`Socket.io`).
* Interactive ticket statuses: `Received` → `In Prep` → `Ready for Pick/Serve`.
* Audio alert or visual highlight on high-priority pings.

### 3. Staff Interface (Service & Floor Tracking)
* Unique Staff UID tracking for response times, order delivery speed, and table calls.
* **Status Toggle:** A real-time toggle switch for `Online` / `Offline` status so offline staff do not receive auto-routed calls.
* Interactive alerts when a customer clicks **Call Staff** or **Pay by Cash**.

### 4. Manager / Admin Dashboard (Analytics & Inventory)
* Live operational stats: Active tables, total revenue, average prep time.
* **Inventory & Demand Forecasting Engine:** Integration-ready service that processes order volume history and flags inventory depletion warnings.
* Integrated Gemini API utility endpoint to ingest sales summaries and output smart operational insights and inventory restock predictions.

---

## Database & Data Modeling (PostgreSQL / Neon DB)
Create modular schemas/models for:
* `Users` (id, email, password_hash, role: CUSTOMER/STAFF/KITCHEN/MANAGER, loyalty_points)
* `MenuItems` (id, name, category, price, is_available, popularity_score)
* `Orders` (id, table_no, status, customer_id, items: JSON, total_amount, created_at)
* `StaffLogs` (id, staff_uid, action_type, response_time_seconds, timestamp)
* `Inventory` (id, item_name, quantity, min_threshold_warning)

---

## Design & UX Guidelines
* Use a modern dark or clean modern light theme with high-contrast UI elements (Tailwind CSS).
* Implement crisp responsive layouts optimized for mobile (Customers), tablets (Kitchen/Staff), and desktop (Manager Dashboard).
* Provide fallback states, clean loading skeletons, and interactive toast notifications for socket events.

---

## Execution Instructions
Generate the full folder structure, configuration files, database schemas, WebSocket setup, and page components step-by-step.