'use client';

import React from 'react';

const STATUS_COLUMNS = ['PENDING', 'PREPARING', 'READY_TO_SERVE', 'SERVED', 'PAID'];
const COLORS = {
  green: 'border-emerald-500/30 bg-emerald-500/5',
  yellow: 'border-amber-500/30 bg-amber-500/10',
  red: 'border-rose-500/30 bg-rose-500/10'
};

function getColor(count) {
  if (count <= 2) return COLORS.green;
  if (count <= 4) return COLORS.yellow;
  return COLORS.red;
}

function getIndicator(count) {
  if (count <= 2) return 'bg-emerald-500';
  if (count <= 4) return 'bg-amber-500';
  return 'bg-rose-500';
}

export default function PipelineVisualization({ orders = [] }) {
  const buckets = {};
  for (const s of STATUS_COLUMNS) buckets[s] = [];
  for (const o of orders) {
    if (buckets[o.status]) buckets[o.status].push(o);
  }

  return (
    <div className="rounded-3xl border border-zinc-800 bg-zinc-900/15 p-6">
      <h3 className="text-sm font-bold text-zinc-200 font-outfit mb-4 flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
        Pipeline Visualization
      </h3>
      <div className="grid grid-cols-5 gap-3">
        {STATUS_COLUMNS.map((status) => {
          const items = buckets[status] || [];
          const count = items.length;
          return (
            <div key={status} className={`rounded-2xl border p-3 ${getColor(count)} transition-colors duration-500`}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">{status}</span>
                <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${getIndicator(count)} text-white`}>{count}</span>
              </div>
              <div className="space-y-1.5 max-h-[200px] overflow-y-auto">
                {items.map((order) => (
                  <div key={order.id} className="bg-zinc-950/60 rounded-xl px-2.5 py-2 text-[10px] border border-zinc-800/50">
                    <div className="font-bold text-zinc-200">#{order.id}</div>
                    <div className="text-zinc-500">T{tableNoLabel(order.tableNo)}</div>
                    <div className="text-zinc-600 truncate">{itemSummary(order.items)}</div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function tableNoLabel(t) {
  return t || '?';
}

function itemSummary(items) {
  if (!items || !items.length) return '';
  const list = typeof items === 'string' ? JSON.parse(items) : items;
  return list.map(i => `${i.quantity}x ${i.name}`).join(', ');
}
