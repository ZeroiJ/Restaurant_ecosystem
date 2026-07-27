'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Calendar, Clock, ArrowRight, Sparkles } from 'lucide-react';

export default function ReservationPage() {
  const router = useRouter();
  const [userId, setUserId] = useState('');
  const [userName, setUserName] = useState('');
  const [selectedTable, setSelectedTable] = useState('');
  const [reservationTime, setReservationTime] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem('user');
    if (stored) {
      const u = JSON.parse(stored);
      setUserId(u.id);
      setUserName(u.name || u.email);
    } else {
      router.push('/');
    }
  }, [router]);

  const handleReservationSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Connect to the relative API endpoint
      const response = await fetch('/api/reservations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: userId,
          tableNo: selectedTable,
          dateTime: reservationTime || new Date().toISOString()
        })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to create reservation');
      }

      setSuccess(true);
      
      // Save reservation to local session
      localStorage.setItem('reservation', JSON.stringify(data));

      // Redirect back to Customer Portal
      setTimeout(() => {
        router.push('/customer');
      }, 1500);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4 selection:bg-rose-500 selection:text-white">
      <div className="relative w-full max-w-lg bg-zinc-900 border border-zinc-800 rounded-3xl p-8 shadow-2xl animate-in fade-in zoom-in-95 duration-300">
        
        {/* Glow Effects */}
        <div className="absolute -top-12 -left-12 w-48 h-48 bg-rose-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-12 -right-12 w-48 h-48 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex justify-between items-center mb-6 border-b border-zinc-800 pb-4 relative z-10">
          <div>
            <h2 className="text-2xl font-bold font-outfit text-zinc-100 flex items-center gap-2">
              <Calendar className="h-6 w-6 text-rose-500" />
              Table Reservation
            </h2>
            <p className="text-[10px] text-zinc-500 mt-1">
              Hello {userName || 'Valued Diner'}, book your seat for the dynamic dining session
            </p>
          </div>
          <div className="flex items-center gap-1 text-[10px] bg-rose-500/10 text-rose-400 px-2 py-1 rounded-full font-bold">
            <Sparkles className="h-3 w-3 animate-spin" /> VIP Dine
          </div>
        </div>

        {success ? (
          <div className="py-10 text-center space-y-3 relative z-10">
            <div className="w-12 h-12 rounded-full bg-emerald-500/15 text-emerald-400 flex items-center justify-center mx-auto text-xl font-bold animate-bounce">
              ✓
            </div>
            <h3 className="text-lg font-bold text-zinc-100">Table Reserved Successfully!</h3>
            <p className="text-xs text-zinc-400">Redirecting you to the dining portal...</p>
          </div>
        ) : (
          <form onSubmit={handleReservationSubmit} className="space-y-6 relative z-10">
            {/* Select Table Grid */}
            <div>
              <label className="block text-zinc-400 text-xs font-semibold mb-3 uppercase tracking-wider">
                Select Table / Seat
              </label>
              <div className="grid grid-cols-5 gap-3">
                {['1', '2', '3', '4', '5', '6', '7', '8', '9', '10'].map((num) => (
                  <button
                    key={num}
                    type="button"
                    onClick={() => setSelectedTable(num)}
                    className={`h-12 rounded-xl text-sm font-bold border transition-all duration-300 cursor-pointer ${
                      selectedTable === num
                        ? 'bg-rose-500 border-rose-500 text-white shadow-lg shadow-rose-950/40'
                        : 'border-zinc-800 bg-zinc-950 text-zinc-400 hover:bg-zinc-900 hover:border-zinc-700'
                    }`}
                  >
                    T{num}
                  </button>
                ))}
              </div>
            </div>

            {/* Time slot picker */}
            <div>
              <label className="block text-zinc-400 text-xs font-semibold mb-3 uppercase tracking-wider flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5 text-rose-500" /> Date & Time Slot
              </label>
              <input
                type="datetime-local"
                required
                value={reservationTime}
                onChange={(e) => setReservationTime(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-zinc-100 focus:outline-none focus:border-rose-500 transition-all duration-300"
              />
            </div>

            {error && (
              <div className="text-xs text-rose-400 bg-rose-500/10 border border-rose-500/20 px-4 py-2.5 rounded-xl">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !selectedTable}
              className="w-full py-4 rounded-xl bg-rose-500 hover:bg-rose-600 text-white font-bold text-sm transition-all duration-300 shadow-lg shadow-rose-950/30 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {loading ? 'Processing...' : 'Confirm Dining Table Reservation'}
              <ArrowRight className="h-4 w-4" />
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
