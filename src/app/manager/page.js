'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSocket } from '@/context/SocketContext';
import KitchenTimeMachine from '@/app/components/KitchenTimeMachine';
import {
  Shield, TrendingUp, AlertTriangle, Users, Cpu, FileText, ArrowUpRight,
  TrendingDown, CheckCircle, RefreshCw, BarChart2, Plus, ArrowLeft, LogOut,
  Loader2, Sparkles, Inbox, ChevronRight, Award, Trophy, Timer, Clock
} from 'lucide-react';

export default function ManagerDashboard() {
  const router = useRouter();
  const { socket } = useSocket();

  // Active Tab: 'inventory' | 'operations' | 'staff' | 'timeline'
  const [activeTab, setActiveTab] = useState('timeline');

  // Metrics
  const [metrics, setMetrics] = useState({
    totalRevenue: 0,
    activeTables: 0,
    averagePrepTimeSeconds: 0,
    totalServed: 0,
    totalPending: 0
  });

  // Data lists
  const [inventory, setInventory] = useState([]);
  const [lowStockItems, setLowStockItems] = useState([]);
  const [waiterLeaderboard, setWaiterLeaderboard] = useState([]);
  const [onlineStaff, setOnlineStaff] = useState([]);

  // Gemini AI report
  const [aiReport, setAiReport] = useState(null);
  const [generatingReport, setGeneratingReport] = useState(false);
  const [loadingDashboard, setLoadingDashboard] = useState(true);

  // Manual stock restock inputs
  const [restockItemId, setRestockItemId] = useState('');
  const [restockQty, setRestockQty] = useState('');
  const [restockSuccessMessage, setRestockSuccessMessage] = useState('');

  const fetchDashboardData = async (triggerAI = false) => {
    if (triggerAI) {
      setGeneratingReport(true);
    }
    try {
      const url = `/api/analytics${triggerAI ? '?triggerAI=true' : ''}`;
      const res = await fetch(url);
      const data = await res.json();
      
      if (res.ok) {
        setMetrics(data.metrics);
        setInventory(data.inventory);
        setLowStockItems(data.lowStockItems);
        setWaiterLeaderboard(data.waiterLeaderboard || []);
        if (triggerAI && data.aiInsights) {
          setAiReport(data.aiInsights);
        }
      }
    } catch (err) {
      console.error('Failed to load dashboard statistics:', err);
    } finally {
      setLoadingDashboard(false);
      setGeneratingReport(false);
    }
  };

  useEffect(() => {
    // Authenticate manager session
    const stored = localStorage.getItem('user');
    if (stored) {
      const u = JSON.parse(stored);
      if (u.role !== 'MANAGER') {
        router.push('/');
      }
    } else {
      router.push('/');
    }

    fetchDashboardData();
  }, [router]);

  // Hook into Socket room for staff status
  useEffect(() => {
    if (!socket) return;
    
    socket.emit('join-room', 'kitchen-staff-dashboard');

    socket.on('staff-status-updated', (staffList) => {
      // staffList is an array of [staffUid, {socketId, role, status}]
      setOnlineStaff(staffList);
    });

    return () => {
      socket.off('staff-status-updated');
    };
  }, [socket]);

  const handleRestockSubmit = async (e) => {
    e.preventDefault();
    if (!restockItemId || !restockQty) return;

    try {
      const selectedItem = inventory.find(i => i.id === restockItemId);
      if (!selectedItem) return;

      const newQty = selectedItem.quantity + parseInt(restockQty, 10);

      const res = await fetch('/api/analytics', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: restockItemId, quantity: newQty })
      });

      if (res.ok) {
        setRestockSuccessMessage(`Restocked ${selectedItem.itemName} by +${restockQty} units.`);
        setRestockQty('');
        setRestockItemId('');
        fetchDashboardData();
        setTimeout(() => setRestockSuccessMessage(''), 4000);
      }
    } catch (err) {
      console.warn('Failed to update stock quantity:', err);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('user');
    router.push('/');
  };

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col font-sans text-zinc-150">
      
      {/* Top Header */}
      <header className="sticky top-0 bg-zinc-950/80 backdrop-blur-md border-b border-zinc-900 z-30 px-6 py-4">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => router.push('/')}
              className="p-2 hover:bg-zinc-900 rounded-xl text-zinc-400 hover:text-zinc-100 transition-all duration-300 cursor-pointer"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            <div className="p-2.5 bg-cyan-500 rounded-xl text-black flex items-center justify-center">
              <Shield className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-lg font-bold font-outfit text-white tracking-tight">Manager Dashboard</h1>
              <p className="text-[10px] text-zinc-500 font-light">Analytics, Restocking & Gemini Operations Strategy Portal</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={() => fetchDashboardData()}
              className="p-2 bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-zinc-100 rounded-xl hover:bg-zinc-800 transition-all duration-300 cursor-pointer"
            >
              <RefreshCw className="h-4 w-4" />
            </button>
            <button
              onClick={handleLogout}
              className="p-2.5 bg-rose-500/10 border border-rose-500/20 hover:border-rose-500/40 text-rose-400 rounded-xl transition-all duration-300 cursor-pointer"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Tabs Subheader Navigation */}
      <nav className="w-full bg-zinc-950/60 border-b border-zinc-900">
        <div className="max-w-7xl mx-auto px-6 flex gap-8">
          {[
            { id: 'inventory', label: 'Inventory & Forecasting' },
            { id: 'operations', label: 'Operations & Business Charts' },
            { id: 'staff', label: 'Staff Performance & Availability' },
            { id: 'timeline', label: 'Kitchen Time Machine' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`py-4.5 text-xs font-bold uppercase tracking-wider relative transition-all duration-300 cursor-pointer ${
                activeTab === tab.id ? 'text-cyan-400 font-extrabold' : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              {tab.label}
              {activeTab === tab.id && (
                <div className="absolute bottom-0 left-0 w-full h-[2px] bg-cyan-400 rounded-t-full shadow-lg shadow-cyan-400/50" />
              )}
            </button>
          ))}
        </div>
      </nav>

      {loadingDashboard ? (
        <div className="flex-1 flex flex-col items-center justify-center py-20 gap-3">
          <Loader2 className="h-10 w-10 text-cyan-500 animate-spin" />
          <span className="text-zinc-500 text-sm font-light">Loading manager statistics...</span>
        </div>
      ) : (
        <main className="max-w-7xl mx-auto px-6 py-8 flex-1 w-full">
          
          {/* TAB 1: INVENTORY STATUS & FORECASTS */}
          {activeTab === 'inventory' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 w-full animate-in fade-in duration-300">
              {/* Left/Middle Column: List of items */}
              <div className="lg:col-span-2 space-y-6">
                
                {/* Stock table */}
                <div className="rounded-3xl border border-zinc-800 bg-zinc-900/15 p-6 backdrop-blur-md">
                  <h3 className="text-base font-bold font-outfit text-zinc-100 flex items-center gap-2 mb-6 pb-4 border-b border-zinc-900">
                    <BarChart2 className="h-4.5 w-4.5 text-cyan-400" />
                    Live Ingredient Stock Levels
                  </h3>

                  <div className="space-y-4.5">
                    {inventory.map((item) => {
                      const isLow = item.quantity <= item.minThresholdWarning;
                      const pct = Math.min(100, Math.round((item.quantity / 50) * 100)); // assume max capacity 50 for gauge
                      return (
                        <div key={item.id} className="p-4 rounded-2xl border border-zinc-850 bg-zinc-900/30">
                          <div className="flex justify-between items-center mb-2.5">
                            <div>
                              <span className="font-bold text-sm text-zinc-200">{item.itemName}</span>
                              <span className="text-[10px] text-zinc-500 block">Min Threshold: {item.minThresholdWarning} units</span>
                            </div>
                            
                            <div className="text-right">
                              <span className={`text-base font-extrabold font-outfit ${isLow ? 'text-amber-400' : 'text-zinc-250'}`}>
                                {item.quantity} units
                              </span>
                              <span className={`block text-[9px] font-bold uppercase tracking-wider ${isLow ? 'text-amber-400' : 'text-emerald-400'}`}>
                                {isLow ? 'Low Stock alert' : 'Stock levels normal'}
                              </span>
                            </div>
                          </div>

                          {/* Horizontal stock progress gauge */}
                          <div className="w-full h-1.5 bg-zinc-950 rounded-full overflow-hidden">
                            <div 
                              style={{ width: `${pct}%` }} 
                              className={`h-full rounded-full transition-all duration-1000 ${
                                isLow ? 'bg-gradient-to-r from-amber-500 to-red-500' : 'bg-gradient-to-r from-cyan-500 to-emerald-500'
                              }`}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Restock submit form */}
                <div className="rounded-3xl border border-zinc-800 bg-zinc-900/10 p-6">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-400 mb-4 flex items-center gap-2">
                    <Plus className="h-4 w-4 text-cyan-400" /> Replenish Stock Levels
                  </h3>

                  <form onSubmit={handleRestockSubmit} className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
                    <div>
                      <label className="block text-zinc-500 text-[10px] uppercase font-semibold mb-2">Select Ingredient</label>
                      <select
                        value={restockItemId}
                        onChange={(e) => setRestockItemId(e.target.value)}
                        required
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2.5 text-xs text-zinc-300 focus:outline-none focus:border-cyan-500 cursor-pointer"
                      >
                        <option value="">-- Choose Ingredient --</option>
                        {inventory.map(i => (
                          <option key={i.id} value={i.id}>{i.itemName}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-zinc-500 text-[10px] uppercase font-semibold mb-2">Restock Quantity</label>
                      <input
                        type="number"
                        min="1"
                        placeholder="e.g. 10"
                        required
                        value={restockQty}
                        onChange={(e) => setRestockQty(e.target.value)}
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2.5 text-xs text-zinc-300 focus:outline-none focus:border-cyan-500"
                      />
                    </div>

                    <button
                      type="submit"
                      className="w-full py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-600 text-black text-xs font-bold transition-all duration-300 cursor-pointer shadow-md"
                    >
                      Apply Restock
                    </button>
                  </form>

                  {restockSuccessMessage && (
                    <div className="mt-4 text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-4 py-2.5 rounded-xl">
                      {restockSuccessMessage}
                    </div>
                  )}
                </div>

              </div>

              {/* Right Column: AI Inventory Restock Forecast */}
              <div className="lg:col-span-1 space-y-6">
                <div className="rounded-3xl border border-zinc-800 bg-zinc-900/20 p-6 backdrop-blur-md">
                  <h3 className="text-base font-bold font-outfit text-zinc-100 flex items-center gap-2 mb-6 pb-4 border-b border-zinc-900">
                    <Cpu className="h-4.5 w-4.5 text-cyan-400 animate-pulse" />
                    Gemini AI Stock Forecasts
                  </h3>

                  <p className="text-zinc-400 text-xs font-light leading-relaxed mb-6">
                    Feed current sales velocities and raw ingredients stock levels to Gemini to forecast exact depletion dates and Restock plans.
                  </p>

                  <button
                    onClick={() => fetchDashboardData(true)}
                    disabled={generatingReport}
                    className="w-full py-3.5 rounded-xl bg-gradient-to-r from-cyan-500 to-cyan-600 hover:from-cyan-600 hover:to-cyan-700 text-black font-bold text-xs shadow-lg cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {generatingReport ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin text-black" />
                        Analyzing with Gemini...
                      </>
                    ) : (
                      <>
                        <Cpu className="h-4 w-4 text-black" />
                        Predict Depletion Dates
                      </>
                    )}
                  </button>

                  {aiReport && (
                    <div className="mt-8 space-y-6 animate-in fade-in duration-500">
                      <div>
                        <span className="text-[9px] font-bold text-cyan-450 uppercase tracking-wider block mb-1">Executive Summary</span>
                        <p className="text-zinc-300 text-xs leading-relaxed font-light">{aiReport.executiveSummary}</p>
                      </div>

                      <div>
                        <span className="text-[9px] font-bold text-amber-400 uppercase tracking-wider block mb-2">Depletion Alerts</span>
                        <div className="space-y-1.5">
                          {aiReport.inventoryWarnings.map((warning, idx) => (
                            <div key={idx} className="text-[10px] text-zinc-400 border-l-2 border-amber-500 pl-2 py-0.5 font-light leading-relaxed">
                              {warning}
                            </div>
                          ))}
                        </div>
                      </div>

                      <div>
                        <span className="text-[9px] font-bold text-emerald-450 uppercase tracking-wider block mb-1">Demand Projection</span>
                        <p className="text-zinc-300 text-xs leading-relaxed font-light">{aiReport.demandForecast}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: OPERATIONS INSIGHTS & BUSINESS CHARTS */}
          {activeTab === 'operations' && (
            <div className="space-y-8 animate-in fade-in duration-300">
              
              {/* Operations KPI metrics bar */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                <div className="rounded-3xl border border-zinc-800 bg-zinc-900/30 p-6 flex flex-col justify-between">
                  <div>
                    <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block">Total Sales Revenue</span>
                    <span className="text-3xl font-extrabold text-zinc-150 font-outfit block mt-2">
                      ${metrics.totalRevenue.toFixed(2)}
                    </span>
                  </div>
                  <span className="text-[10px] text-emerald-400 font-semibold flex items-center gap-1 mt-4">
                    <TrendingUp className="h-3.5 w-3.5" /> Served {metrics.totalServed} orders
                  </span>
                </div>

                <div className="rounded-3xl border border-zinc-800 bg-zinc-900/30 p-6 flex flex-col justify-between">
                  <div>
                    <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block">Active Dining Tables</span>
                    <span className="text-3xl font-extrabold text-zinc-150 font-outfit block mt-2">
                      {metrics.activeTables} tables
                    </span>
                  </div>
                  <span className="text-[10px] text-amber-400 font-semibold flex items-center gap-1 mt-4">
                    <AlertTriangle className="h-3.5 w-3.5" /> {metrics.totalPending} orders in queue
                  </span>
                </div>

                <div className="rounded-3xl border border-zinc-800 bg-zinc-900/30 p-6 flex flex-col justify-between">
                  <div>
                    <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block">Avg Preparation Speed</span>
                    <span className="text-3xl font-extrabold text-zinc-150 font-outfit block mt-2">
                      {Math.floor(metrics.averagePrepTimeSeconds / 60)}m {Math.floor(metrics.averagePrepTimeSeconds % 60)}s
                    </span>
                  </div>
                  <span className="text-[10px] text-cyan-400 font-semibold flex items-center gap-1 mt-4">
                    <CheckCircle className="h-3.5 w-3.5" /> Core workflow optimized
                  </span>
                </div>
              </div>

              {/* Charts grid */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                
                {/* 1. Daily Sales Trend Area Chart */}
                <div className="rounded-3xl border border-zinc-800 bg-zinc-900/15 p-6 lg:col-span-2">
                  <h3 className="text-sm font-bold text-zinc-200 mb-6 font-outfit flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-cyan-400" />
                    Weekly Sales Progression (INR)
                  </h3>

                  <div className="w-full overflow-hidden flex items-center justify-center">
                    <svg className="w-full max-w-2xl h-[200px]" viewBox="0 0 600 200">
                      <defs>
                        <linearGradient id="sales-gradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.4"/>
                          <stop offset="100%" stopColor="#06b6d4" stopOpacity="0.0"/>
                        </linearGradient>
                      </defs>
                      {/* Gridlines */}
                      <line x1="50" y1="30" x2="570" y2="30" stroke="#1f2937" strokeWidth="1" strokeDasharray="4 4" />
                      <line x1="50" y1="80" x2="570" y2="80" stroke="#1f2937" strokeWidth="1" strokeDasharray="4 4" />
                      <line x1="50" y1="130" x2="570" y2="130" stroke="#1f2937" strokeWidth="1" strokeDasharray="4 4" />
                      <line x1="50" y1="170" x2="570" y2="170" stroke="#374151" strokeWidth="1.5" />

                      {/* Area Fill */}
                      <path 
                        d="M 50 170 L 100 140 L 180 120 L 260 135 L 340 100 L 420 70 L 500 50 L 570 65 L 570 170 Z" 
                        fill="url(#sales-gradient)" 
                      />

                      {/* Line Path */}
                      <path 
                        d="M 50 170 L 100 140 L 180 120 L 260 135 L 340 100 L 420 70 L 500 50 L 570 65" 
                        fill="none" 
                        stroke="#06b6d4" 
                        strokeWidth="3.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />

                      {/* Data Dots */}
                      <circle cx="100" cy="140" r="5" fill="#ffffff" stroke="#06b6d4" strokeWidth="2" />
                      <circle cx="180" cy="120" r="5" fill="#ffffff" stroke="#06b6d4" strokeWidth="2" />
                      <circle cx="260" cy="135" r="5" fill="#ffffff" stroke="#06b6d4" strokeWidth="2" />
                      <circle cx="340" cy="100" r="5" fill="#ffffff" stroke="#06b6d4" strokeWidth="2" />
                      <circle cx="420" cy="70" r="5" fill="#ffffff" stroke="#06b6d4" strokeWidth="2" />
                      <circle cx="500" cy="50" r="5" fill="#ffffff" stroke="#06b6d4" strokeWidth="2" />
                      <circle cx="570" cy="65" r="5" fill="#ffffff" stroke="#06b6d4" strokeWidth="2" />

                      {/* X Axis Labels */}
                      <text x="50" y="190" fill="#6b7280" fontSize="10" textAnchor="middle">Mon</text>
                      <text x="100" y="190" fill="#6b7280" fontSize="10" textAnchor="middle">Tue</text>
                      <text x="180" y="190" fill="#6b7280" fontSize="10" textAnchor="middle">Wed</text>
                      <text x="260" y="190" fill="#6b7280" fontSize="10" textAnchor="middle">Thu</text>
                      <text x="340" y="190" fill="#6b7280" fontSize="10" textAnchor="middle">Fri</text>
                      <text x="420" y="190" fill="#6b7280" fontSize="10" textAnchor="middle">Sat</text>
                      <text x="500" y="190" fill="#6b7280" fontSize="10" textAnchor="middle">Sun</text>

                      {/* Y Axis Labels */}
                      <text x="40" y="34" fill="#6b7280" fontSize="10" textAnchor="end">1.5k</text>
                      <text x="40" y="84" fill="#6b7280" fontSize="10" textAnchor="end">1.0k</text>
                      <text x="40" y="134" fill="#6b7280" fontSize="10" textAnchor="end">0.5k</text>
                    </svg>
                  </div>
                </div>

                {/* 2. Menu Category Popularity breakdown donut chart */}
                <div className="rounded-3xl border border-zinc-800 bg-zinc-900/15 p-6 lg:col-span-1 flex flex-col justify-between">
                  <h3 className="text-sm font-bold text-zinc-200 mb-6 font-outfit">
                    Category Breakdown
                  </h3>

                  <div className="flex items-center justify-center mb-4">
                    <svg width="150" height="150" viewBox="0 0 42 42" className="rotate-[-90deg]">
                      <circle cx="21" cy="21" r="15.915" fill="transparent" stroke="#1f2937" strokeWidth="5.5" />
                      {/* Mains: 45% (dasharray: 45 55) */}
                      <circle cx="21" cy="21" r="15.915" fill="transparent" stroke="#f43f5e" strokeWidth="5.5" strokeDasharray="45 55" strokeDashoffset="0" />
                      {/* Appetizers: 25% (dasharray: 25 75, offset: -45) */}
                      <circle cx="21" cy="21" r="15.915" fill="transparent" stroke="#fbbf24" strokeWidth="5.5" strokeDasharray="25 75" strokeDashoffset="-45" />
                      {/* Beverages: 15% (dasharray: 15 85, offset: -70) */}
                      <circle cx="21" cy="21" r="15.915" fill="transparent" stroke="#06b6d4" strokeWidth="5.5" strokeDasharray="15 85" strokeDashoffset="-70" />
                      {/* Desserts: 15% (dasharray: 15 85, offset: -85) */}
                      <circle cx="21" cy="21" r="15.915" fill="transparent" stroke="#a78bfa" strokeWidth="5.5" strokeDasharray="15 85" strokeDashoffset="-85" />
                    </svg>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-[10px] text-zinc-400">
                    <div className="flex items-center gap-1.5">
                      <div className="w-2.5 h-2.5 rounded bg-rose-500 shrink-0" />
                      <span>Mains (45%)</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="w-2.5 h-2.5 rounded bg-amber-400 shrink-0" />
                      <span>Starters (25%)</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="w-2.5 h-2.5 rounded bg-cyan-500 shrink-0" />
                      <span>Drinks (15%)</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="w-2.5 h-2.5 rounded bg-violet-400 shrink-0" />
                      <span>Desserts (15%)</span>
                    </div>
                  </div>
                </div>

                {/* 3. Busy Dining Hours Peak Bar Chart */}
                <div className="rounded-3xl border border-zinc-800 bg-zinc-900/15 p-6 lg:col-span-1.5">
                  <h3 className="text-sm font-bold text-zinc-200 mb-6 font-outfit">
                    Peak Dining Hours (Orders Filled)
                  </h3>

                  <div className="w-full flex items-center justify-center">
                    <svg className="w-full max-w-sm h-[180px]" viewBox="0 0 300 150">
                      {/* gridline */}
                      <line x1="30" y1="120" x2="280" y2="120" stroke="#374151" strokeWidth="1" />
                      
                      {/* Bars */}
                      {/* 12 PM (Qty 45 -> H 90) */}
                      <rect x="50" y="30" width="18" height="90" rx="3" fill="#ec4899" opacity="0.9" />
                      {/* 2 PM (Qty 20 -> H 40) */}
                      <rect x="90" y="80" width="18" height="40" rx="3" fill="#f43f5e" opacity="0.8" />
                      {/* 6 PM (Qty 30 -> H 60) */}
                      <rect x="130" y="60" width="18" height="60" rx="3" fill="#f43f5e" opacity="0.8" />
                      {/* 8 PM (Qty 55 -> H 110) */}
                      <rect x="170" y="10" width="18" height="110" rx="3" fill="#ec4899" opacity="0.9" />
                      {/* 10 PM (Qty 35 -> H 70) */}
                      <rect x="210" y="50" width="18" height="70" rx="3" fill="#f43f5e" opacity="0.8" />

                      {/* X Labels */}
                      <text x="59" y="136" fill="#6b7280" fontSize="9" textAnchor="middle">12pm</text>
                      <text x="99" y="136" fill="#6b7280" fontSize="9" textAnchor="middle">2pm</text>
                      <text x="139" y="136" fill="#6b7280" fontSize="9" textAnchor="middle">6pm</text>
                      <text x="179" y="136" fill="#6b7280" fontSize="9" textAnchor="middle">8pm</text>
                      <text x="219" y="136" fill="#6b7280" fontSize="9" textAnchor="middle">10pm</text>

                      {/* Y Labels */}
                      <text x="22" y="15" fill="#6b7280" fontSize="8" textAnchor="end">60</text>
                      <text x="22" y="65" fill="#6b7280" fontSize="8" textAnchor="end">30</text>
                      <text x="22" y="122" fill="#6b7280" fontSize="8" textAnchor="end">0</text>
                    </svg>
                  </div>
                </div>

                {/* Gemini strategic recommendations panel */}
                <div className="rounded-3xl border border-zinc-800 bg-zinc-900/10 p-6 lg:col-span-1.5">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-400 mb-4 flex items-center gap-2">
                    <Cpu className="h-4 w-4 text-cyan-400 animate-pulse" />
                    Gemini Business Strategy Insights
                  </h3>
                  
                  {aiReport && aiReport.operationalRecommendations ? (
                    <div className="space-y-3">
                      {aiReport.operationalRecommendations.map((rec, idx) => (
                        <div key={idx} className="p-3 rounded-2xl bg-zinc-950 border border-zinc-900 text-xs text-zinc-450 leading-relaxed font-light flex gap-2">
                          <Sparkles className="h-4 w-4 text-cyan-400 shrink-0 mt-0.5" />
                          <span>{rec}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="py-8 text-center">
                      <Cpu className="h-8 w-8 text-zinc-800 mx-auto mb-3" />
                      <p className="text-xs text-zinc-550 leading-relaxed font-light mb-4">
                        Perform an operations prediction query in the "Inventory" tab to pull smart business advice.
                      </p>
                      <button
                        onClick={() => fetchDashboardData(true)}
                        className="px-4 py-2 text-xs font-bold rounded-xl bg-cyan-500 hover:bg-cyan-600 text-black shadow-md transition-all duration-300 cursor-pointer"
                      >
                        Request Strategy Report
                      </button>
                    </div>
                  )}
                </div>

              </div>

            </div>
          )}

          {/* TAB 3: STAFF PERFORMANCE & ROSTER AVAILABILITY */}
          {activeTab === 'staff' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 w-full animate-in fade-in duration-300">
              
              {/* Leaderboard stats */}
              <div className="lg:col-span-2 space-y-6">
                <div className="rounded-3xl border border-zinc-800 bg-zinc-900/15 p-6 backdrop-blur-md">
                  <h3 className="text-base font-bold font-outfit text-zinc-100 flex items-center gap-2 mb-6 pb-4 border-b border-zinc-900">
                    <Trophy className="h-4.5 w-4.5 text-yellow-500 animate-bounce" />
                    Waiter Service Efficiency Leaderboard
                  </h3>

                  {waiterLeaderboard.length === 0 ? (
                    <div className="py-16 text-center">
                      <Inbox className="h-10 w-10 text-zinc-800 mx-auto mb-3" />
                      <p className="text-zinc-650 text-xs font-light">No logs recorded yet. Once waiters deliver orders, their metrics will list here.</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {waiterLeaderboard.map((waiter, idx) => {
                        const isTop = idx === 0;
                        return (
                          <div 
                            key={waiter.staffUid} 
                            className={`p-4 rounded-2xl border flex justify-between items-center transition-all duration-300 ${
                              isTop ? 'bg-amber-500/5 border-amber-500/30' : 'bg-zinc-900/30 border-zinc-850'
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${
                                isTop ? 'bg-amber-500 text-black shadow-md' : 'bg-zinc-800 text-zinc-400'
                              }`}>
                                #{idx + 1}
                              </div>
                              <div>
                                <span className="font-bold text-sm text-zinc-200 block">{waiter.staffUid}</span>
                                <span className="text-[10px] text-zinc-500 block mt-0.5">Assigned Service Role</span>
                              </div>
                            </div>

                            <div className="flex items-center gap-8 text-right">
                              <div>
                                <span className="text-xs text-zinc-500 block">Orders Served</span>
                                <span className="font-bold text-sm text-zinc-200">{waiter.ordersServed}</span>
                              </div>
                              
                              <div>
                                <span className="text-xs text-zinc-500 block flex items-center gap-1 justify-end">
                                  <Timer className="h-3 w-3" /> Avg Turnaround
                                </span>
                                <span className={`font-bold text-sm ${isTop ? 'text-amber-400' : 'text-zinc-200'}`}>
                                  {Math.floor(waiter.avgDeliveryTimeSeconds / 60)}m {waiter.avgDeliveryTimeSeconds % 60}s
                                </span>
                              </div>
                            </div>

                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              {/* Live Availability Connection Roster */}
              <div className="lg:col-span-1 space-y-6">
                <div className="rounded-3xl border border-zinc-800 bg-zinc-900/20 p-6 backdrop-blur-md">
                  <h3 className="text-base font-bold font-outfit text-zinc-100 flex items-center gap-2 mb-6 pb-4 border-b border-zinc-900">
                    <Users className="h-4.5 w-4.5 text-cyan-400" />
                    Online Staff Connections
                  </h3>

                  {onlineStaff.length === 0 ? (
                    <div className="py-12 text-center">
                      <Users className="h-8 w-8 text-zinc-800 mx-auto mb-3" />
                      <p className="text-zinc-600 text-xs font-light">No staff connected via websockets currently.</p>
                    </div>
                  ) : (
                    <div className="space-y-3.5">
                      {onlineStaff.map(([uid, details]) => (
                        <div key={uid} className="p-3.5 rounded-2xl bg-zinc-950 border border-zinc-900 flex justify-between items-center text-xs">
                          <div>
                            <span className="font-bold text-zinc-200 block">{uid}</span>
                            <span className="text-[9px] text-zinc-550 block mt-0.5 uppercase tracking-wide">{details.role}</span>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            <div className={`w-2 h-2 rounded-full ${details.status === 'Online' ? 'bg-emerald-400 animate-pulse' : 'bg-rose-400'}`} />
                            <span className={`font-semibold uppercase text-[9px] ${details.status === 'Online' ? 'text-emerald-450' : 'text-rose-450'}`}>
                              {details.status}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

            </div>
          )}

          {/* TAB 4: KITCHEN TIME MACHINE */}
          {activeTab === 'timeline' && socket && (
            <KitchenTimeMachine socket={socket} />
          )}

        </main>
      )}
    </div>
  );
}
