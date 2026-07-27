'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useSocket } from '@/context/SocketContext';
import {
  ChefHat, Users, Bell, AlertTriangle, Play, CheckCircle2, Clock, Check,
  User, Power, Loader2, Sparkles, RefreshCw, AudioLines
} from 'lucide-react';

export default function KitchenStaffUnified() {
  const router = useRouter();
  const { socket, connected } = useSocket();

  // Staff info
  const [staffUid, setStaffUid] = useState('');
  const [isRegistered, setIsRegistered] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [staffLogs, setStaffLogs] = useState([]);

  // Active tickets
  const [orders, setOrders] = useState([]);
  const [alerts, setAlerts] = useState([]); // Array of [tableNo, {type, timestamp}]
  
  // Stats
  const [averageDeliveryTime, setAverageDeliveryTime] = useState(0);

  // Sound ref for high-priority chime (simulated via AudioContext to be zero-dependency)
  const audioContextRef = useRef(null);

  const playChime = () => {
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
      }
      const ctx = audioContextRef.current;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
      osc.frequency.setValueAtTime(880, ctx.currentTime + 0.15); // A5

      gain.gain.setValueAtTime(0.1, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.4);
    } catch (e) {
      console.warn('Audio chime failed to play: ', e);
    }
  };

  // Connect & register on socket
  useEffect(() => {
    if (!socket) return;

    socket.emit('join-room', 'kitchen-staff-dashboard');

    socket.on('initial-orders', (initialOrders) => {
      setOrders(initialOrders);
    });

    socket.on('staff-status-updated', (staffList) => {
      console.log('Online staff status updated:', staffList);
    });

    // Listen for new table pings
    socket.on('table-alerts-updated', (updatedAlerts) => {
      setAlerts(updatedAlerts);
      if (updatedAlerts.length > 0) {
        playChime();
      }
    });

    // Listen for incoming orders
    socket.on('new-order', (newOrder) => {
      setOrders((prev) => {
        // Prevent duplicate append
        if (prev.some(o => o.id === newOrder.id)) return prev;
        return [newOrder, ...prev];
      });
      playChime();
    });

    // Listen for general order status modifications
    socket.on('order-status-changed', ({ orderId, status }) => {
      setOrders((prev) =>
        prev.map((o) => (o.id === orderId ? { ...o, status } : o))
      );
    });

    return () => {
      socket.off('initial-orders');
      socket.off('staff-status-updated');
      socket.off('table-alerts-updated');
      socket.off('new-order');
      socket.off('order-status-changed');
    };
  }, [socket]);

  // Load existing orders and logs from DB
  useEffect(() => {
    const loadInitialDbData = async () => {
      try {
        const res = await fetch('/api/orders');
        if (res.ok) {
          const dbOrders = await res.json();
          // Filter out completed served orders if they are very old, keep current ones
          setOrders(dbOrders);
        }

        const logRes = await fetch('/api/analytics');
        if (logRes.ok) {
          const analytics = await logRes.json();
          setAverageDeliveryTime(analytics.metrics.averagePrepTimeSeconds);
        }
      } catch (err) {
        console.warn('Failed to load initial DB records:', err);
      }
    };
    loadInitialDbData();
  }, []);

  const handleRegisterStaff = (e) => {
    e.preventDefault();
    if (!staffUid.trim()) return;

    setIsRegistered(true);
    if (socket) {
      socket.emit('staff-register', { staffUid, status: 'Online' });
    }
  };

  const handleToggleOnline = () => {
    const nextStatus = !isOnline ? 'Online' : 'Offline';
    setIsOnline(!isOnline);
    if (socket) {
      socket.emit('staff-toggle-status', { staffUid, status: nextStatus });
    }
  };

  const progressOrderStatus = async (orderId, currentStatus) => {
    let nextStatus = '';
    if (currentStatus === 'PENDING') nextStatus = 'PREPARING';
    else if (currentStatus === 'PREPARING') nextStatus = 'SERVED';
    else return;

    // Log staff delivery speed if it was just served
    if (nextStatus === 'SERVED') {
      const order = orders.find(o => o.id === orderId);
      if (order) {
        const elapsedSecs = Math.floor((Date.now() - new Date(order.createdAt).getTime()) / 1000);
        
        try {
          const logPayload = {
            staffUid: staffUid || 'ANONYMOUS_STAFF',
            actionType: 'order_delivery',
            responseTimeSeconds: elapsedSecs
          };

          await fetch('/api/analytics', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(logPayload)
          });

          setStaffLogs((prev) => [
            {
              id: Date.now(),
              message: `Order ${orderId} served in ${Math.floor(elapsedSecs / 60)}m ${elapsedSecs % 60}s`
            },
            ...prev
          ]);
        } catch (e) {
          console.warn('Failed to post staff delivery log:', e);
        }
      }
    }

    // Update in UI locally first
    setOrders((prev) => prev.map(o => o.id === orderId ? { ...o, status: nextStatus } : o));

    // Send status change through websocket
    if (socket) {
      socket.emit('update-order-status', { orderId, status: nextStatus });
    }

    // Also persist in the Database
    try {
      await fetch('/api/orders', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: orderId, status: nextStatus })
      });
    } catch (e) {
      console.warn('Failed to update order status in DB:', e);
    }
  };

  const handleClearAlert = (tableNo) => {
    if (socket) {
      socket.emit('table-alert', { tableNo, type: 'Clear' });
    }
  };

  const activeTickets = orders.filter(o => o.status !== 'PAID');

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col font-sans">
      
      {/* Header */}
      <header className="sticky top-0 bg-zinc-950/90 border-b border-zinc-900 z-30 px-6 py-4">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-amber-500 rounded-xl text-black flex items-center justify-center">
              <ChefHat className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-lg font-bold font-outfit text-white tracking-tight">Staff & Kitchen Workspace</h1>
              <p className="text-[10px] text-zinc-500 font-light">Real-time KDS & Floor Management Pipeline</p>
            </div>
          </div>

          <div className="flex items-center gap-6">
            {isRegistered ? (
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-zinc-900 border border-zinc-800 text-xs">
                  <User className="h-3.5 w-3.5 text-amber-500" />
                  <span className="text-zinc-300 font-medium">{staffUid}</span>
                </div>

                <button
                  onClick={handleToggleOnline}
                  className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all duration-300 cursor-pointer ${
                    isOnline 
                      ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400' 
                      : 'bg-rose-500/10 border border-rose-500/20 text-rose-400'
                  }`}
                >
                  <Power className="h-3 w-3 animate-pulse" />
                  <span>{isOnline ? 'Active Online' : 'Offline Mode'}</span>
                </button>
              </div>
            ) : (
              <form onSubmit={handleRegisterStaff} className="flex gap-2 items-center">
                <input
                  type="text"
                  placeholder="Enter Staff Name / UID"
                  required
                  value={staffUid}
                  onChange={(e) => setStaffUid(e.target.value)}
                  className="bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-1.5 text-xs text-zinc-200 focus:outline-none focus:border-amber-500"
                />
                <button
                  type="submit"
                  className="bg-amber-500 hover:bg-amber-600 text-black px-4 py-1.5 rounded-xl text-xs font-bold transition-all duration-300 cursor-pointer"
                >
                  Sign In
                </button>
              </form>
            )}

            <div className="text-[10px] text-zinc-500 font-medium">
              SOCKET CON: {connected ? <span className="text-emerald-400">CONNECTED</span> : <span className="text-rose-400">CONNECTING...</span>}
            </div>
          </div>
        </div>
      </header>

      {/* Main Panel */}
      <main className="max-w-7xl mx-auto px-6 py-8 flex-1 grid grid-cols-1 lg:grid-cols-4 gap-8 w-full">
        
        {/* Left Column: Alerts & Logs */}
        <div className="lg:col-span-1 space-y-8">
          
          {/* Floor / Table Alerts */}
          <div className="rounded-3xl border border-zinc-800 bg-zinc-900/15 p-6 backdrop-blur-md">
            <h3 className="text-base font-bold font-outfit text-zinc-100 flex items-center gap-2 mb-6 pb-4 border-b border-zinc-900">
              <Bell className="h-4.5 w-4.5 text-rose-500" />
              Active Table Pings
            </h3>

            {alerts.length === 0 ? (
              <div className="py-12 text-center">
                <Bell className="h-8 w-8 text-zinc-800 mx-auto mb-3" />
                <p className="text-zinc-600 text-xs font-light">No floor requests. All quiet.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {alerts.map(([tableNo, item]) => (
                  <div
                    key={tableNo}
                    className={`p-4 rounded-2xl border flex flex-col justify-between gap-3 ${
                      item.type === 'Pay Cash'
                        ? 'bg-amber-500/10 border-amber-500/30'
                        : 'bg-rose-500/10 border-rose-500/30 animate-pulse'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <AlertTriangle className={`h-4.5 w-4.5 ${item.type === 'Pay Cash' ? 'text-amber-400' : 'text-rose-400'}`} />
                      <div>
                        <span className="font-bold text-sm text-zinc-100">Table {tableNo}</span>
                        <span className={`block text-[10px] font-semibold uppercase ${item.type === 'Pay Cash' ? 'text-amber-400' : 'text-rose-400'}`}>
                          {item.type}
                        </span>
                      </div>
                    </div>

                    <div className="flex justify-between items-center mt-2.5">
                      <span className="text-[10px] text-zinc-500">
                        Piped {Math.floor((Date.now() - item.timestamp) / 1000)}s ago
                      </span>
                      <button
                        onClick={() => handleClearAlert(tableNo)}
                        className="px-3.5 py-1.5 rounded-lg bg-zinc-950 border border-zinc-850 hover:border-zinc-700 text-zinc-300 hover:text-white text-[10px] font-bold transition-all duration-300 cursor-pointer"
                      >
                        Acknowledge
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Average Prep Speed */}
          <div className="rounded-3xl border border-zinc-800 bg-zinc-900/10 p-6 text-center">
            <h4 className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2 flex items-center justify-center gap-2">
              <Clock className="h-3.5 w-3.5 text-amber-500" />
              Delivery Efficiency
            </h4>
            <span className="text-3xl font-extrabold text-zinc-100 font-outfit">
              {averageDeliveryTime ? Math.floor(averageDeliveryTime / 60) : 12}m {averageDeliveryTime ? Math.floor(averageDeliveryTime % 60) : 0}s
            </span>
            <p className="text-[10px] text-zinc-600 font-light mt-1">Average fulfillment log speed</p>
          </div>

          {/* Staff response speed logs */}
          <div className="rounded-3xl border border-zinc-800 bg-zinc-900/10 p-6">
            <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400 mb-4">Your Session Logs</h3>
            {staffLogs.length === 0 ? (
              <p className="text-zinc-600 text-xs font-light">No logs recorded this session yet.</p>
            ) : (
              <div className="space-y-2 max-h-[150px] overflow-y-auto pr-1">
                {staffLogs.map((log) => (
                  <div key={log.id} className="text-[10px] text-zinc-400 border-l-2 border-amber-500/40 pl-2 py-0.5 font-light">
                    {log.message}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Columns: KDS Grid */}
        <div className="lg:col-span-3 space-y-6">
          <h2 className="text-xl font-bold font-outfit text-zinc-100 flex items-center justify-between">
            <span className="flex items-center gap-2">
              <ChefHat className="h-5 w-5 text-amber-500" />
              Active KDS Order Tickets
            </span>
            <span className="text-xs font-semibold text-zinc-500 bg-zinc-900 border border-zinc-850 px-3 py-1 rounded-xl">
              {activeTickets.length} active
            </span>
          </h2>

          {activeTickets.length === 0 ? (
            <div className="rounded-3xl border border-zinc-900 bg-zinc-900/10 py-24 text-center">
              <ChefHat className="h-10 w-10 text-zinc-800 mx-auto mb-4" />
              <p className="text-zinc-500 text-sm font-light">KDS queue is empty.</p>
              <p className="text-zinc-600 text-xs font-light mt-1">Orders placed by customers will stream here instantly.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {activeTickets.map((order) => {
                const itemsList = Array.isArray(order.items) ? order.items : JSON.parse(order.items || '[]');
                const elapsedSecs = Math.floor((Date.now() - new Date(order.createdAt).getTime()) / 1000);
                
                return (
                  <div
                    key={order.id}
                    className={`rounded-3xl border bg-zinc-900/40 p-6 flex flex-col justify-between gap-6 transition-all duration-300 hover:border-zinc-700 ${
                      order.status === 'PENDING'
                        ? 'border-rose-500/20'
                        : order.status === 'PREPARING'
                        ? 'border-amber-500/20'
                        : 'border-zinc-800'
                    }`}
                  >
                    <div>
                      {/* Ticket Title */}
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <span className="text-zinc-500 text-[10px] font-bold uppercase tracking-wider block">ORDER {order.id}</span>
                          <span className="text-lg font-extrabold font-outfit text-zinc-200 mt-0.5">Table {order.tableNo}</span>
                        </div>
                        
                        <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider ${
                          order.status === 'PENDING'
                            ? 'bg-rose-500/10 text-rose-400'
                            : order.status === 'PREPARING'
                            ? 'bg-amber-500/10 text-amber-400'
                            : 'bg-emerald-500/10 text-emerald-400'
                        }`}>
                          {order.status}
                        </span>
                      </div>

                      {/* Items details */}
                      <div className="space-y-2 border-y border-zinc-950 py-4 my-2">
                        {itemsList.map((item, idx) => (
                          <div key={idx} className="flex justify-between text-xs">
                            <span className="text-zinc-300 font-medium">
                              {item.quantity}x <span className="text-zinc-400 font-light">{item.name}</span>
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Footer / Progression Controls */}
                    <div className="flex justify-between items-center mt-auto">
                      <div className="flex items-center gap-1.5 text-zinc-500 text-xs font-light">
                        <Clock className="h-3.5 w-3.5 text-zinc-600 animate-spin" />
                        <span>Placed {Math.floor(elapsedSecs / 60)}m ago</span>
                      </div>

                      {order.status === 'PENDING' && (
                        <button
                          onClick={() => progressOrderStatus(order.id, 'PENDING')}
                          className="px-4 py-2 bg-rose-500 hover:bg-rose-600 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all duration-300 cursor-pointer shadow-md shadow-rose-950/20"
                        >
                          <Play className="h-3 w-3" /> Start Preparing
                        </button>
                      )}

                      {order.status === 'PREPARING' && (
                        <button
                          onClick={() => progressOrderStatus(order.id, 'PREPARING')}
                          className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-black text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all duration-300 cursor-pointer shadow-md shadow-amber-950/20"
                        >
                          <Check className="h-3 w-3" /> Ready to Serve
                        </button>
                      )}

                      {order.status === 'SERVED' && (
                        <span className="text-emerald-400 text-xs font-bold flex items-center gap-1">
                          <CheckCircle2 className="h-3.5 w-3.5" /> Served
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
