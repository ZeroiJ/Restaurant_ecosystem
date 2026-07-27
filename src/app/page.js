'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Utensils, Shield, ChefHat, LogIn, ArrowRight } from 'lucide-react';

export default function Home() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isRegister, setIsRegister] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authRole, setAuthRole] = useState('CUSTOMER'); // 'CUSTOMER', 'STAFF', 'MANAGER'
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleAuthSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: isRegister ? 'register' : 'login',
          email,
          password,
          role: authRole
        })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Authentication failed');
      }

      // Save user session in localStorage (simple mock auth state)
      localStorage.setItem('user', JSON.stringify(data));
      setShowAuthModal(false);

      // Route based on role
      if (data.role === 'MANAGER') {
        router.push('/manager');
      } else if (data.role === 'STAFF' || data.role === 'KITCHEN') {
        router.push('/kitchen-staff');
      } else {
        router.push('/customer');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGuestMode = () => {
    localStorage.removeItem('user'); // Clear any previous user
    router.push('/customer?guest=true');
  };

  const triggerAuthFlow = (role) => {
    setAuthRole(role);
    setIsRegister(false);
    setError('');
    setEmail('');
    setPassword('');
    setShowAuthModal(true);
  };

  return (
    <div className="relative min-h-screen bg-zinc-950 flex flex-col justify-between overflow-hidden font-sans">
      
      {/* Background Decorative Blobs */}
      <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] rounded-full bg-rose-900/10 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[600px] h-[600px] rounded-full bg-amber-900/10 blur-[150px] pointer-events-none" />

      {/* Header */}
      <header className="w-full max-w-6xl mx-auto px-6 py-8 flex justify-between items-center z-10">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-rose-600 rounded-2xl shadow-lg shadow-rose-900/40 flex items-center justify-center">
            <Utensils className="h-6 w-6 text-white" />
          </div>
          <span className="text-2xl font-bold tracking-tight bg-gradient-to-r from-white via-zinc-200 to-zinc-400 bg-clip-text text-transparent font-outfit">
            VibeDine
          </span>
        </div>
        <button
          onClick={() => triggerAuthFlow('CUSTOMER')}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold border border-zinc-800 bg-zinc-900/80 hover:bg-zinc-800/80 text-zinc-100 transition-all duration-300 hover:border-zinc-700 shadow-md backdrop-blur-md cursor-pointer"
        >
          <LogIn className="h-4 w-4 text-rose-500" />
          Sign In
        </button>
      </header>

      {/* Hero Section */}
      <main className="w-full max-w-6xl mx-auto px-6 py-12 flex-1 flex flex-col justify-center items-center text-center z-10">
        <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight mb-6 font-outfit leading-tight">
          Next-Gen Dining, <br className="hidden md:block"/>
          <span className="bg-gradient-to-r from-rose-500 via-pink-500 to-amber-500 bg-clip-text text-transparent animate-gradient-x">
            Synchronized in Real Time.
          </span>
        </h1>
        
        <p className="text-zinc-400 text-lg max-w-2xl mb-12 font-light leading-relaxed">
          Welcome to VibeDine. Experience dynamic menus, live order tracking, and seamless kitchen integration. Select your interface flow to begin.
        </p>

        {/* Roles Portals Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 w-full max-w-4xl">
          
          {/* Customer Portal */}
          <div 
            className="group relative rounded-3xl border border-zinc-800 bg-zinc-900/30 p-8 hover:border-rose-500/30 hover:bg-zinc-900/50 hover:shadow-2xl hover:shadow-rose-950/10 transition-all duration-500 backdrop-blur-md flex flex-col justify-between items-start text-left cursor-pointer"
            onClick={handleGuestMode}
          >
            <div className="mb-6 p-4 rounded-2xl bg-rose-500/10 text-rose-400 group-hover:scale-110 transition-all duration-500">
              <Utensils className="h-8 w-8" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-zinc-100 mb-2 font-outfit">Customer Flow</h3>
              <p className="text-zinc-400 text-sm leading-relaxed mb-6 font-light">
                Browse dynamic specials, personalize menus, track orders instantly, and settle bills.
              </p>
            </div>
            <span className="flex items-center gap-2 text-rose-400 text-sm font-semibold group-hover:gap-3 transition-all duration-300">
              Enter Guest Mode <ArrowRight className="h-4 w-4" />
            </span>
          </div>

          {/* Kitchen / Staff Portal */}
          <div 
            className="group relative rounded-3xl border border-zinc-800 bg-zinc-900/30 p-8 hover:border-amber-500/30 hover:bg-zinc-900/50 hover:shadow-2xl hover:shadow-amber-950/10 transition-all duration-500 backdrop-blur-md flex flex-col justify-between items-start text-left cursor-pointer"
            onClick={() => triggerAuthFlow('STAFF')}
          >
            <div className="mb-6 p-4 rounded-2xl bg-amber-500/10 text-amber-400 group-hover:scale-110 transition-all duration-500">
              <ChefHat className="h-8 w-8" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-zinc-100 mb-2 font-outfit">Kitchen & Staff Portal</h3>
              <p className="text-zinc-400 text-sm leading-relaxed mb-6 font-light">
                Unified live workspace. Cook incoming orders, manage tickets, and service active table alerts.
              </p>
            </div>
            <span className="flex items-center gap-2 text-amber-400 text-sm font-semibold group-hover:gap-3 transition-all duration-300">
              Access Workspace <ArrowRight className="h-4 w-4" />
            </span>
          </div>

          {/* Manager Portal */}
          <div 
            className="group relative rounded-3xl border border-zinc-800 bg-zinc-900/30 p-8 hover:border-cyan-500/30 hover:bg-zinc-900/50 hover:shadow-2xl hover:shadow-cyan-950/10 transition-all duration-500 backdrop-blur-md flex flex-col justify-between items-start text-left cursor-pointer"
            onClick={() => triggerAuthFlow('MANAGER')}
          >
            <div className="mb-6 p-4 rounded-2xl bg-cyan-500/10 text-cyan-400 group-hover:scale-110 transition-all duration-500">
              <Shield className="h-8 w-8" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-zinc-100 mb-2 font-outfit">Manager Dashboard</h3>
              <p className="text-zinc-400 text-sm leading-relaxed mb-6 font-light">
                Monitor live operations, track stock limits, and query Gemini AI for smart restocking plans.
              </p>
            </div>
            <span className="flex items-center gap-2 text-cyan-400 text-sm font-semibold group-hover:gap-3 transition-all duration-300">
              Admin Console <ArrowRight className="h-4 w-4" />
            </span>
          </div>

        </div>
      </main>

      {/* Footer */}
      <footer className="w-full text-center py-8 border-t border-zinc-900 z-10 text-zinc-600 text-xs tracking-wider">
        &copy; {new Date().getFullYear()} VIBEDINE. POWERED BY NEXT.JS, TAILWIND V4 & SOCKET.IO.
      </footer>

      {/* Authentication Modal */}
      {showAuthModal && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md flex items-center justify-center z-50 p-4 transition-all duration-300">
          <div className="relative w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-3xl p-8 shadow-2xl animate-in fade-in zoom-in-95 duration-300">
            <h2 className="text-2xl font-bold font-outfit mb-2 text-zinc-100">
              {isRegister ? 'Create Credentials' : 'Secure Login'}
            </h2>
            <p className="text-zinc-400 text-xs mb-6">
              Accessing {authRole === 'MANAGER' ? 'Manager Dashboard' : authRole === 'STAFF' ? 'Staff & Kitchen Panel' : 'Customer Account'}.
            </p>

            <form onSubmit={handleAuthSubmit} className="space-y-4">
              <div>
                <label className="block text-zinc-300 text-xs font-semibold mb-2 uppercase tracking-wider">Email Address</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@restaurant.com"
                  required
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-zinc-100 focus:outline-none focus:border-rose-500 transition-all duration-300"
                />
              </div>

              <div>
                <label className="block text-zinc-300 text-xs font-semibold mb-2 uppercase tracking-wider">Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
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
                disabled={loading}
                className="w-full py-3.5 rounded-xl bg-gradient-to-r from-rose-500 to-rose-600 hover:from-rose-600 hover:to-rose-700 text-white font-semibold text-sm transition-all duration-300 flex items-center justify-center gap-2 shadow-lg shadow-rose-950/30 cursor-pointer disabled:opacity-50"
              >
                {loading ? 'Authenticating...' : isRegister ? 'Register' : 'Login'}
              </button>
            </form>

            <div className="mt-6 flex justify-between items-center text-xs text-zinc-500">
              <button 
                onClick={() => setIsRegister(!isRegister)} 
                className="hover:text-zinc-300 transition-all duration-300 cursor-pointer"
              >
                {isRegister ? 'Already have an account? Sign In' : 'Need an account? Register'}
              </button>
              
              <button 
                onClick={() => setShowAuthModal(false)} 
                className="hover:text-zinc-300 font-semibold cursor-pointer"
              >
                Cancel
              </button>
            </div>
            
            {/* Quick Demo Hint */}
            <div className="mt-5 p-3 rounded-xl bg-zinc-950/60 border border-zinc-800/40 text-[10px] text-zinc-500 leading-normal">
              <span className="font-bold text-zinc-400 block mb-1">Demo Credentials:</span>
              * Manager: <code className="text-rose-400">manager@vibedine.com</code> / <code className="text-rose-400">password123</code><br/>
              * Kitchen/Staff: <code className="text-amber-400">staff@vibedine.com</code> / <code className="text-amber-400">password123</code>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
