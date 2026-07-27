'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Shield, TrendingUp, AlertTriangle, Users, Cpu, FileText, ArrowUpRight,
  TrendingDown, CheckCircle, RefreshCw, BarChart2, Plus, ArrowLeft, LogOut, Loader2
} from 'lucide-react';

export default function ManagerDashboard() {
  const router = useRouter();

  // Metrics
  const [metrics, setMetrics] = useState({
    totalRevenue: 0,
    activeTables: 0,
    averagePrepTimeSeconds: 0,
    totalServed: 0,
    totalPending: 0
  });

  // Inventory & Stock Warning list
  const [inventory, setInventory] = useState([]);
  const [lowStockItems, setLowStockItems] = useState([]);
  
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

  const handleRestockSubmit = async (e) => {
    e.preventDefault();
    if (!restockItemId || !restockQty) return;

    try {
      const selectedItem = inventory.find(i => i.id === restockItemId);
      if (!selectedItem) return;

      const newQty = selectedItem.quantity + parseInt(restockQty, 10);

      // In-memory update or direct put call
      // Let's create an endpoint in api/analytics or we can just mock-update in DB.
      // Wait, let's create a quick API path or let DB update. Let's see: we wrote db.inventoryItem.update inside db.js.
      // Do we have an endpoint to update inventory?
      // Wait, `/api/analytics` has a POST log handler, but not inventory updates.
      // We can easily support a PUT method in `api/analytics/route.js` or create an endpoint, or we can just update it locally.
      // Wait, let's add a PUT handler to `src/app/api/analytics/route.js` to update inventory levels!
      // This will ensure it persists. Let's write the fetch first:
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
    <div className="min-h-screen bg-zinc-950 flex flex-col font-sans">
      
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
              <p className="text-[10px] text-zinc-500 font-light">Analytics, Restocking & Gemini Forecasting System</p>
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

      {loadingDashboard ? (
        <div className="flex-1 flex flex-col items-center justify-center py-20 gap-3">
          <Loader2 className="h-10 w-10 text-cyan-500 animate-spin" />
          <span className="text-zinc-500 text-sm font-light">Loading manager statistics...</span>
        </div>
      ) : (
        <main className="max-w-7xl mx-auto px-6 py-8 flex-1 grid grid-cols-1 lg:grid-cols-3 gap-8 w-full">
          
          {/* Left/Middle Column: Metrics & Inventory */}
          <div className="lg:col-span-2 space-y-8">
            
            {/* KPI Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              
              {/* Total Revenue */}
              <div className="rounded-3xl border border-zinc-800 bg-zinc-900/30 p-6 flex flex-col justify-between">
                <div>
                  <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block">Total Sales</span>
                  <span className="text-2xl font-extrabold text-zinc-100 font-outfit block mt-2">
                    ${metrics.totalRevenue.toFixed(2)}
                  </span>
                </div>
                <span className="text-[10px] text-emerald-400 font-semibold flex items-center gap-1 mt-4">
                  <TrendingUp className="h-3.5 w-3.5" /> Served {metrics.totalServed} orders
                </span>
              </div>

              {/* Active Tables */}
              <div className="rounded-3xl border border-zinc-800 bg-zinc-900/30 p-6 flex flex-col justify-between">
                <div>
                  <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block">Active Dining</span>
                  <span className="text-2xl font-extrabold text-zinc-100 font-outfit block mt-2">
                    {metrics.activeTables} tables
                  </span>
                </div>
                <span className="text-[10px] text-amber-400 font-semibold flex items-center gap-1 mt-4 animate-pulse">
                  <AlertTriangle className="h-3.5 w-3.5" /> {metrics.totalPending} pending orders
                </span>
              </div>

              {/* Prep Speed */}
              <div className="rounded-3xl border border-zinc-800 bg-zinc-900/30 p-6 flex flex-col justify-between">
                <div>
                  <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block">Avg Prep Time</span>
                  <span className="text-2xl font-extrabold text-zinc-100 font-outfit block mt-2">
                    {Math.floor(metrics.averagePrepTimeSeconds / 60)}m {Math.floor(metrics.averagePrepTimeSeconds % 60)}s
                  </span>
                </div>
                <span className="text-[10px] text-zinc-500 font-semibold flex items-center gap-1 mt-4">
                  <CheckCircle className="h-3.5 w-3.5 text-cyan-400" /> System running optimized
                </span>
              </div>

            </div>

            {/* Inventory Tracker List */}
            <div className="rounded-3xl border border-zinc-800 bg-zinc-900/15 p-6">
              <h3 className="text-base font-bold font-outfit text-zinc-100 flex items-center gap-2 mb-6 pb-4 border-b border-zinc-900">
                <BarChart2 className="h-4.5 w-4.5 text-cyan-400" />
                Live Inventory Status
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {inventory.map((item) => {
                  const isLow = item.quantity <= item.minThresholdWarning;
                  return (
                    <div
                      key={item.id}
                      className={`p-4.5 rounded-2xl border bg-zinc-900/40 flex justify-between items-center transition-all duration-300 ${
                        isLow ? 'border-amber-500/20 bg-amber-500/5' : 'border-zinc-850'
                      }`}
                    >
                      <div>
                        <span className="font-bold text-sm text-zinc-200 block">{item.itemName}</span>
                        <span className="text-[10px] text-zinc-500 block mt-0.5">
                          Threshold: {item.minThresholdWarning} units
                        </span>
                      </div>

                      <div className="text-right">
                        <span className={`text-lg font-extrabold font-outfit ${isLow ? 'text-amber-400' : 'text-zinc-200'}`}>
                          {item.quantity}
                        </span>
                        <span className="text-[10px] text-zinc-500 block uppercase tracking-wider font-semibold">
                          {isLow ? 'LOW STOCK' : 'OK'}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Stock restocking input Panel */}
            <div className="rounded-3xl border border-zinc-800 bg-zinc-900/10 p-6">
              <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-400 mb-4 flex items-center gap-2">
                <Plus className="h-4 w-4 text-cyan-400" /> Replenish Stock Levels
              </h3>

              <form onSubmit={handleRestockSubmit} className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
                <div className="sm:col-span-1">
                  <label className="block text-zinc-500 text-[10px] uppercase font-semibold mb-2">Select Ingredient</label>
                  <select
                    value={restockItemId}
                    onChange={(e) => setRestockItemId(e.target.value)}
                    required
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2.5 text-xs text-zinc-300 focus:outline-none focus:border-cyan-500 cursor-pointer"
                  >
                    <option value="">-- Choose Stock --</option>
                    {inventory.map(i => (
                      <option key={i.id} value={i.id}>{i.itemName}</option>
                    ))}
                  </select>
                </div>

                <div className="sm:col-span-1">
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
                  className="w-full py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-600 text-black text-xs font-bold transition-all duration-300 cursor-pointer shadow-md shadow-cyan-950/20"
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

          {/* Right Column: AI Insights & Operations Predictions */}
          <div className="lg:col-span-1 space-y-6">
            
            <div className="rounded-3xl border border-zinc-800 bg-zinc-900/20 p-6 backdrop-blur-md">
              <h3 className="text-base font-bold font-outfit text-zinc-100 flex items-center gap-2 mb-6 pb-4 border-b border-zinc-900">
                <Cpu className="h-4.5 w-4.5 text-cyan-400" />
                Gemini Forecasting Engine
              </h3>

              <p className="text-zinc-400 text-xs font-light leading-relaxed mb-6">
                Ingest live sales distributions, inventory margins, and response speeds to get restock forecasts.
              </p>

              <button
                onClick={() => fetchDashboardData(true)}
                disabled={generatingReport}
                className="w-full py-3.5 rounded-xl bg-gradient-to-r from-cyan-500 to-cyan-600 hover:from-cyan-600 hover:to-cyan-700 text-black font-bold text-xs shadow-lg shadow-cyan-950/20 cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {generatingReport ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin text-black" />
                    Querying Gemini...
                  </>
                ) : (
                  <>
                    <Cpu className="h-4 w-4 text-black" />
                    Generate Operational Report
                  </>
                )}
              </button>

              {/* Gemini Report UI Display */}
              {aiReport && (
                <div className="mt-8 space-y-6 animate-in fade-in duration-500">
                  
                  {/* Executive Summary */}
                  <div>
                    <span className="text-[10px] font-bold text-cyan-400 uppercase tracking-wider block mb-1">Executive Summary</span>
                    <p className="text-zinc-300 text-xs leading-relaxed font-light">{aiReport.executiveSummary}</p>
                  </div>

                  {/* Stock depletion Alerts */}
                  <div>
                    <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider block mb-2">Restock Alerts</span>
                    <div className="space-y-1.5">
                      {aiReport.inventoryWarnings.map((warning, idx) => (
                        <div key={idx} className="text-[10px] text-zinc-400 border-l-2 border-amber-500 pl-2 py-0.5 font-light">
                          {warning}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Sales prediction */}
                  <div>
                    <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider block mb-1">Demand Forecast</span>
                    <p className="text-zinc-300 text-xs leading-relaxed font-light">{aiReport.demandForecast}</p>
                  </div>

                  {/* Operational Recommendations */}
                  <div>
                    <span className="text-[10px] font-bold text-rose-400 uppercase tracking-wider block mb-2">Optimizations</span>
                    <div className="space-y-2">
                      {aiReport.operationalRecommendations.map((rec, idx) => (
                        <div key={idx} className="p-2.5 rounded-xl bg-zinc-950 border border-zinc-900 text-[10px] text-zinc-400 font-light leading-relaxed">
                          {rec}
                        </div>
                      ))}
                    </div>
                  </div>

                </div>
              )}
            </div>

          </div>

        </main>
      )}
    </div>
  );
}
