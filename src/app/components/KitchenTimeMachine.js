'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Clock, Play, Pause, RotateCcw, Timer } from 'lucide-react';

const STATUS_COLORS = {
  PENDING: 'text-amber-400 border-amber-500/30 bg-amber-500/10',
  PREPARING: 'text-cyan-400 border-cyan-500/30 bg-cyan-500/10',
  READY_TO_SERVE: 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10',
  SERVED: 'text-blue-400 border-blue-500/30 bg-blue-500/10',
  PAID: 'text-zinc-500 border-zinc-700/30 bg-zinc-800/30',
};

const STATUS_ORDER = ['PENDING', 'PREPARING', 'READY_TO_SERVE', 'SERVED', 'PAID'];

function formatTime(ts) {
  const d = new Date(ts);
  return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

export default function KitchenTimeMachine({ socket }) {
  const [log, setLog] = useState([]);
  const [scrubPos, setScrubPos] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [timeRange, setTimeRange] = useState({ min: 0, max: 0 });
  const [duration, setDuration] = useState(0);
  const playRef = useRef(null);

  useEffect(() => {
    if (!socket) return;
    socket.emit('get-timeline');
    const handler = (data) => {
      if (!data || data.length === 0) return;
      setLog(data);
      const min = data[0].timestamp;
      const max = data[data.length - 1].timestamp;
      const dur = max - min;
      setTimeRange({ min, max });
      setDuration(dur);
      setScrubPos(dur);
      setLoaded(true);
    };
    socket.on('timeline-data', handler);
    return () => socket.off('timeline-data', handler);
  }, [socket]);

  // Playback loop
  useEffect(() => {
    if (!playing) {
      if (playRef.current) clearInterval(playRef.current);
      return;
    }
    playRef.current = setInterval(() => {
      setScrubPos((prev) => {
        if (prev <= 0) { setPlaying(false); return 0; }
        return prev - 100;
      });
    }, 80);
    return () => clearInterval(playRef.current);
  }, [playing]);

  const currentTimestamp = timeRange.min + scrubPos;

  // Compute snapshot: for each order, find latest status at or before currentTimestamp
  const snapshot = {};
  for (const entry of log) {
    if (entry.timestamp > currentTimestamp) break;
    snapshot[entry.orderId] = {
      status: entry.status,
      tableNo: entry.tableNo,
      items: entry.items || [],
    };
  }

  // Group orders by status at this snapshot point
  const ordersByStatus = {};
  for (const [orderId, info] of Object.entries(snapshot)) {
    if (!ordersByStatus[info.status]) ordersByStatus[info.status] = [];
    ordersByStatus[info.status].push({ orderId, ...info });
  }

  // Build timeline ticks (show markers at each unique status change time)
  const tickTimestamps = [...new Set(log.map(e => e.timestamp))].sort((a, b) => a - b);

  const handleScrub = (e) => {
    const val = parseInt(e.target.value, 10);
    setScrubPos(val);
    if (playing) setPlaying(false);
  };

  const togglePlay = () => {
    if (scrubPos <= 0) {
      setScrubPos(duration);
    }
    setPlaying((p) => !p);
  };

  const reset = () => {
    setPlaying(false);
    setScrubPos(duration);
  };

  const progressPct = duration > 0 ? ((duration - scrubPos) / duration) * 100 : 0;

  if (!loaded) {
    return (
      <div className="rounded-3xl border border-zinc-800 bg-zinc-900/15 p-8 text-center">
        <Clock className="h-10 w-10 text-zinc-800 mx-auto mb-3" />
        <p className="text-zinc-500 text-xs font-light">Waiting for timeline data...</p>
      </div>
    );
  }

  if (log.length === 0) {
    return (
      <div className="rounded-3xl border border-zinc-800 bg-zinc-900/15 p-8 text-center">
        <Clock className="h-10 w-10 text-zinc-800 mx-auto mb-3" />
        <p className="text-zinc-500 text-xs font-light">No order activity recorded yet. Place some orders to build a timeline.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Timeline scrubber card */}
      <div className="rounded-3xl border border-zinc-800 bg-zinc-900/15 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-bold font-outfit text-zinc-100 flex items-center gap-2">
            <Clock className="h-4.5 w-4.5 text-cyan-400" />
            Kitchen Time Machine
          </h3>
          <div className="flex items-center gap-2">
            <button
              onClick={reset}
              className="p-2 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-all cursor-pointer"
              title="Reset to latest"
            >
              <RotateCcw className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={togglePlay}
              className="p-2 rounded-xl bg-cyan-500 hover:bg-cyan-600 text-black transition-all cursor-pointer"
              title={playing ? 'Pause' : 'Play'}
            >
              {playing ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
            </button>
          </div>
        </div>

        {/* Time labels */}
        <div className="flex justify-between text-[10px] text-zinc-500 mb-2">
          <span>{formatTime(timeRange.min)}</span>
          <span className="text-zinc-400 font-semibold flex items-center gap-1">
            <Timer className="h-3 w-3" />
            {(duration / 1000).toFixed(1)}s window
          </span>
          <span>{formatTime(timeRange.max)}</span>
        </div>

        {/* Slider */}
        <div className="relative">
          <input
            type="range"
            min={0}
            max={duration}
            value={scrubPos}
            onChange={handleScrub}
            className="w-full h-2 rounded-full appearance-none cursor-pointer bg-zinc-800 accent-cyan-500 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-cyan-400 [&::-webkit-slider-thumb]:shadow-lg [&::-webkit-slider-thumb]:shadow-cyan-500/50 [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-zinc-950"
          />
          {/* Timeline ticks */}
          <div className="absolute top-0 left-0 right-0 h-full pointer-events-none">
            {tickTimestamps.map((ts) => {
              const pct = ((ts - timeRange.min) / duration) * 100;
              return (
                <div
                  key={ts}
                  className="absolute top-0 w-0.5 h-full bg-zinc-700/30"
                  style={{ left: `${pct}%` }}
                />
              );
            })}
          </div>
        </div>

        {/* Current time indicator */}
        <div className="mt-3 flex items-center gap-2 text-xs">
          <span className="text-zinc-500">Scrubbing:</span>
          <span className="font-mono font-bold text-cyan-400">{formatTime(currentTimestamp)}</span>
          <span className="text-zinc-600 mx-1">|</span>
          <span className="text-zinc-500">
            {Object.keys(snapshot).length} active orders
          </span>
        </div>
      </div>

      {/* Orders at current scrub position */}
      <div className="grid grid-cols-1 gap-4">
        {STATUS_ORDER.filter((s) => ordersByStatus[s]?.length).map((status) => (
          <div
            key={status}
            className="rounded-3xl border border-zinc-800 bg-zinc-900/10 p-5"
          >
            <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-400 mb-3 flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${STATUS_COLORS[status].split(' ')[0].replace('text-', 'bg-')}`} />
              {status.replace(/_/g, ' ')}
              <span className="text-zinc-600 font-normal ml-1">({ordersByStatus[status].length})</span>
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {ordersByStatus[status].map((order) => (
                <div
                  key={order.orderId}
                  className={`p-3 rounded-xl border text-xs ${STATUS_COLORS[status]}`}
                >
                  <div className="flex justify-between items-center mb-1.5">
                    <span className="font-bold">Order #{order.orderId}</span>
                    <span className="text-[10px] opacity-70">Table {order.tableNo}</span>
                  </div>
                  <div className="text-[10px] opacity-70 truncate">
                    {order.items && order.items.length > 0
                      ? order.items.map((i) => i.name || i).join(', ')
                      : 'No items'}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}

        {Object.keys(ordersByStatus).length === 0 && (
          <div className="rounded-3xl border border-zinc-800 bg-zinc-900/10 p-8 text-center">
            <p className="text-zinc-500 text-xs font-light">No orders at this point in time.</p>
          </div>
        )}
      </div>
    </div>
  );
}
