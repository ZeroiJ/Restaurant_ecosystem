const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');
const { Server } = require('socket.io');

const dev = process.env.NODE_ENV !== 'production';
const port = process.env.PORT || 3000;

// Initialize Next.js app
const app = next({ dev });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const httpServer = createServer((req, res) => {
    const parsedUrl = parse(req.url, true);
    handle(req, res, parsedUrl);
  });

  const io = new Server(httpServer, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"]
    }
  });

  // Active floor staff status cache
  // Map containing staffUid -> { socketId, status: 'Online' | 'Offline' }
  const activeStaff = new Map();
  // Table calls/pings: Map containing tableNo -> { type: 'Call Staff' | 'Pay Cash', timestamp }
  const activeAlerts = new Map();
  // Active kitchen orders in prep (live memory buffer for fast push)
  const activeOrders = new Map();

  io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);

    // Join room based on role or specific order tracking
    socket.on('join-room', (roomName) => {
      socket.join(roomName);
      console.log(`Socket ${socket.id} joined room: ${roomName}`);
      
      // If joining kitchen-staff dashboard, emit current active lists
      if (roomName === 'kitchen-staff-dashboard') {
        socket.emit('staff-status-updated', Array.from(activeStaff.entries()));
        socket.emit('table-alerts-updated', Array.from(activeAlerts.entries()));
        socket.emit('initial-orders', Array.from(activeOrders.values()));
      }
    });

    // Staff online/offline status updates
    socket.on('staff-register', ({ staffUid, status }) => {
      activeStaff.set(staffUid, { socketId: socket.id, status });
      io.to('kitchen-staff-dashboard').emit('staff-status-updated', Array.from(activeStaff.entries()));
    });

    socket.on('staff-toggle-status', ({ staffUid, status }) => {
      if (activeStaff.has(staffUid)) {
        activeStaff.get(staffUid).status = status;
        io.to('kitchen-staff-dashboard').emit('staff-status-updated', Array.from(activeStaff.entries()));
      }
    });

    // Customer places a new order
    socket.on('place-order', (order) => {
      console.log('New order received:', order);
      activeOrders.set(order.id, order);
      // Broadcast to kitchen-staff-dashboard
      io.to('kitchen-staff-dashboard').emit('new-order', order);
    });

    // Kitchen progresses order status
    socket.on('update-order-status', ({ orderId, status }) => {
      console.log(`Order ${orderId} updated to ${status}`);
      if (activeOrders.has(orderId)) {
        const order = activeOrders.get(orderId);
        order.status = status;
        activeOrders.set(orderId, order);
      }
      
      // Notify customer (in room customer-order-${orderId})
      io.to(`customer-order-${orderId}`).emit('order-status-changed', { orderId, status });
      // Notify kitchen-staff dashboards as well
      io.to('kitchen-staff-dashboard').emit('order-status-changed', { orderId, status });
    });

    // Customer pings staff or requests checkout
    socket.on('table-alert', ({ tableNo, type }) => {
      console.log(`Table ${tableNo} triggered alert: ${type}`);
      if (type === 'Clear') {
        activeAlerts.delete(tableNo);
      } else {
        activeAlerts.set(tableNo, { type, timestamp: Date.now() });
      }
      io.to('kitchen-staff-dashboard').emit('table-alerts-updated', Array.from(activeAlerts.entries()));
    });

    socket.on('disconnect', () => {
      console.log('Client disconnected:', socket.id);
      // Clean up disconnected staff
      for (const [staffUid, data] of activeStaff.entries()) {
        if (data.socketId === socket.id) {
          activeStaff.delete(staffUid);
          io.to('kitchen-staff-dashboard').emit('staff-status-updated', Array.from(activeStaff.entries()));
          break;
        }
      }
    });
  });

  httpServer.listen(port, (err) => {
    if (err) throw err;
    console.log(`> VibeDine custom server listening on port: ${port}`);
  });
});
