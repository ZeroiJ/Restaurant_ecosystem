'use client';

import React, { useState, useEffect } from 'react';

export default function AutoPilotToggle({ socket }) {
  const [enabled, setEnabled] = useState(false);
  const [status, setStatus] = useState('idle');
  const [saturation, setSaturation] = useState(0);
  const [affectedCategories, setAffectedCategories] = useState([]);

  useEffect(() => {
    if (!socket) return;

    const handleAction = (data) => {
      setSaturation(data.saturation);
      setAffectedCategories(data.categories);

      if (data.action === 'pause') {
        setStatus('paused');
        fetch('/api/menu')
          .then((r) => r.json())
          .then((menuItems) => {
            const toUpdate = menuItems.filter(
              (item) => data.categories.includes(item.category) && item.isAvailable
            );
            return Promise.all(
              toUpdate.map((item) =>
                fetch('/api/menu', {
                  method: 'PUT',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ id: item.id, isAvailable: false }),
                })
              )
            );
          })
          .catch((e) => console.error('[Auto-Pilot] pause failed:', e));
      } else if (data.action === 'resume') {
        setStatus('resumed');
        fetch('/api/menu')
          .then((r) => r.json())
          .then((menuItems) => {
            const toUpdate = menuItems.filter(
              (item) => data.categories.includes(item.category) && !item.isAvailable
            );
            return Promise.all(
              toUpdate.map((item) =>
                fetch('/api/menu', {
                  method: 'PUT',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ id: item.id, isAvailable: true }),
                })
              )
            );
          })
          .catch((e) => console.error('[Auto-Pilot] resume failed:', e));
      }
    };

    socket.on('auto-pilot-action', handleAction);
    return () => socket.off('auto-pilot-action', handleAction);
  }, [socket]);

  const handleToggle = () => {
    const next = !enabled;
    setEnabled(next);
    setStatus(next ? 'monitoring' : 'idle');
    socket.emit('toggle-auto-pilot', { enabled: next });
  };

  return (
    <div className="rounded-3xl border border-zinc-800 bg-zinc-900/15 p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div
            className={`w-2 h-2 rounded-full ${enabled ? 'bg-emerald-400 animate-pulse' : 'bg-zinc-600'}`}
          />
          <h3 className="text-sm font-bold text-zinc-200 font-outfit">Auto-Pilot Mode</h3>
        </div>
        <button
          onClick={handleToggle}
          className={`relative w-12 h-6 rounded-full transition-colors duration-300 cursor-pointer ${
            enabled ? 'bg-cyan-500' : 'bg-zinc-700'
          }`}
        >
          <div
            className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform duration-300 ${
              enabled ? 'translate-x-6' : 'translate-x-0'
            }`}
          />
        </button>
      </div>

      <p className="text-[10px] text-zinc-500 font-light mb-4">
        Automatically pauses menu categories when the kitchen is overloaded, and resumes them when
        workload drops.
      </p>

      {enabled && (
        <div className="space-y-3 text-xs">
          <div className="flex items-center justify-between text-zinc-400">
            <span>Status</span>
            <span
              className={
                status === 'paused'
                  ? 'text-rose-400 font-bold'
                  : status === 'resumed'
                    ? 'text-emerald-400 font-bold'
                    : 'text-cyan-400'
              }
            >
              {status === 'idle'
                ? 'Idle'
                : status === 'monitoring'
                  ? 'Monitoring...'
                  : status === 'paused'
                    ? '⚠ Items Paused'
                    : '✓ Items Resumed'}
            </span>
          </div>
          <div className="flex items-center justify-between text-zinc-400">
            <span>Kitchen Saturation</span>
            <span className={`font-bold ${saturation > 4 ? 'text-rose-400' : 'text-emerald-400'}`}>
              {saturation} orders
            </span>
          </div>
          {affectedCategories.length > 0 && (
            <div className="flex items-center justify-between text-zinc-400">
              <span>Affected Categories</span>
              <span className="text-zinc-300 text-right">{affectedCategories.join(', ')}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
