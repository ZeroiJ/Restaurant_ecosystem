'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Utensils, Shield, ChefHat, LogIn, ArrowRight, Sparkles, KeyRound, Calendar, Clock } from 'lucide-react';

export default function Home() {
  const router = useRouter();
  
  // Form states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [isRegister, setIsRegister] = useState(false);
  
  // Modal visibility states
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showOtpModal, setShowOtpModal] = useState(false);
  const [showReservationModal, setShowReservationModal] = useState(false);
  
  // Auth response cache
  const [pendingUser, setPendingUser] = useState(null); // User details before OTP verification
  const [verifiedUser, setVerifiedUser] = useState(null); // User details after OTP verification
  
  // OTP input
  const [otpInput, setOtpInput] = useState('');
  const [otpNotice, setOtpNotice] = useState('');
  
  // Reservation states
  const [selectedTable, setSelectedTable] = useState('');
  const [reservationTime, setReservationTime] = useState('');
  
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
          name: isRegister ? name : undefined,
          role: authRole
        })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Authentication failed');
      }

      if (isRegister) {
        // If registering, it is not verified yet. We must trigger OTP verification modal.
        setPendingUser(data);
        setShowAuthModal(false);
        setShowOtpModal(true);
        if (data.mockOtpCode) {
          setOtpNotice(`Demo OTP Code: ${data.mockOtpCode} (Printed in Server Console too)`);
        } else {
          setOtpNotice('A 4-digit verification code has been sent to your email.');
        }
      } else {
        // If logging in, check if user is verified
        if (!data.isVerified && data.role === 'CUSTOMER') {
          setPendingUser(data);
          setShowAuthModal(false);
          setShowOtpModal(true);
          setOtpNotice('Please enter the OTP sent during registration.');
          return;
        }

        // Save session
        localStorage.setItem('user', JSON.stringify(data));
        setShowAuthModal(false);

        // Redirect based on role
        if (data.role === 'MANAGER') {
          router.push('/manager');
        } else if (data.role === 'STAFF' || data.role === 'KITCHEN') {
          router.push('/kitchen-staff');
        } else {
          // If customer, fetch their active reservation to resolve seat/table
          checkActiveReservationAndRedirect(data);
        }
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleOtpSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'verify-otp',
          email: pendingUser.email,
          otpCode: otpInput
        })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'OTP verification failed');
      }

      // OTP verified successfully
      setVerifiedUser(data);
      setShowOtpModal(false);
      
      // If customer, redirect to Reservation page
      if (data.role === 'CUSTOMER') {
        router.push('/reservation');
      } else {
        localStorage.setItem('user', JSON.stringify(data));
        router.push('/kitchen-staff');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleReservationSubmit = async (e) => {
    e.preventDefault();
    if (!selectedTable) {
      setError('Please select a table number.');
      return;
    }
    setError('');
    setLoading(true);

    const activeUser = verifiedUser || pendingUser;

    try {
      const response = await fetch('/api/reservations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: activeUser.id,
          tableNo: selectedTable,
          dateTime: reservationTime || new Date().toISOString()
        })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to create reservation');
      }

      // Save user session & redirect
      localStorage.setItem('user', JSON.stringify(activeUser));
      setShowReservationModal(false);
      router.push('/customer');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const checkActiveReservationAndRedirect = async (user) => {
    try {
      const res = await fetch(`/api/reservations?userId=${user.id}`);
      const reservation = await res.json();

      if (res.ok && reservation && reservation.tableNo) {
        // Active reservation exists! Go directly to dining portal.
        router.push('/customer');
      } else {
        // No reservation found, prompt booking first
        router.push('/reservation');
      }
    } catch (err) {
      // Fallback
      router.push('/customer');
    }
  };

  const handleGuestMode = () => {
    localStorage.removeItem('user'); // Clear session
    router.push('/customer?guest=true');
  };

  const triggerAuthFlow = (role) => {
    setAuthRole(role);
    setIsRegister(false);
    setError('');
    setEmail('');
    setPassword('');
    setName('');
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
          Welcome to VibeDine. Register & reserve your favorite table, experience dynamic recommendations, and track order cycles in real-time.
        </p>

        {/* Roles Portals Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 w-full max-w-4xl">
          
          {/* Customer Portal */}
          <div 
            className="group relative rounded-3xl border border-zinc-800 bg-zinc-900/30 p-8 hover:border-rose-500/30 hover:bg-zinc-900/50 hover:shadow-2xl hover:shadow-rose-950/10 transition-all duration-500 backdrop-blur-md flex flex-col justify-between items-start text-left cursor-pointer"
            onClick={() => triggerAuthFlow('CUSTOMER')}
          >
            <div className="mb-6 p-4 rounded-2xl bg-rose-500/10 text-rose-400 group-hover:scale-110 transition-all duration-500">
              <Utensils className="h-8 w-8" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-zinc-100 mb-2 font-outfit">Reservation Portal</h3>
              <p className="text-zinc-400 text-sm leading-relaxed mb-6 font-light">
                Sign up with OTP, book tables instantly, browse Indian delicacies, and get customized menu highlights.
              </p>
            </div>
            <span className="flex items-center gap-2 text-rose-400 text-sm font-semibold group-hover:gap-3 transition-all duration-300">
              Book a Table / Log In <ArrowRight className="h-4 w-4" />
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
              <h3 className="text-xl font-bold text-zinc-100 mb-2 font-outfit">Staff & Kitchen Portal</h3>
              <p className="text-zinc-400 text-sm leading-relaxed mb-6 font-light">
                Cook incoming orders, coordinate waiter delivery dispatches, and manage active table floor calls.
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
                Oversee stock limits, analyze operational graph metrics, track staff availability, and trigger AI forecasting.
              </p>
            </div>
            <span className="flex items-center gap-2 text-cyan-400 text-sm font-semibold group-hover:gap-3 transition-all duration-300">
              Admin Console <ArrowRight className="h-4 w-4" />
            </span>
          </div>

        </div>

        {/* Guest mode link */}
        <button
          onClick={handleGuestMode}
          className="mt-8 text-zinc-500 hover:text-rose-400 text-sm font-medium transition-all duration-300 underline cursor-pointer"
        >
          Skip reservation and dine as Guest
        </button>
      </main>

      {/* Footer */}
      <footer className="w-full text-center py-8 border-t border-zinc-900 z-10 text-zinc-600 text-xs tracking-wider">
        &copy; {new Date().getFullYear()} VIBEDINE. POWERED BY NEXT.JS, TAILWIND & SOCKET.IO.
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
              {isRegister && (
                <div>
                  <label className="block text-zinc-300 text-xs font-semibold mb-2 uppercase tracking-wider">Your Name</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="E.g. Vikram Dev"
                    required
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-zinc-100 focus:outline-none focus:border-rose-500 transition-all duration-300"
                  />
                </div>
              )}

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
                {loading ? 'Authenticating...' : isRegister ? 'Register & Send OTP' : 'Login'}
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
              * Staff: <code className="text-amber-400">staff@vibedine.com</code> / <code className="text-amber-400">password123</code><br/>
              * Kitchen: <code className="text-cyan-400">kitchen@vibedine.com</code> / <code className="text-cyan-400">password123</code>
            </div>
          </div>
        </div>
      )}

      {/* OTP Verification Modal */}
      {showOtpModal && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md flex items-center justify-center z-50 p-4 transition-all duration-300">
          <div className="relative w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-3xl p-8 shadow-2xl animate-in fade-in zoom-in-95 duration-300 text-center">
            <div className="w-12 h-12 rounded-full bg-rose-500/10 text-rose-500 flex items-center justify-center mx-auto mb-4">
              <KeyRound className="h-6 w-6 animate-pulse" />
            </div>

            <h2 className="text-2xl font-bold font-outfit mb-2 text-zinc-100">
              OTP Verification
            </h2>
            <p className="text-zinc-400 text-xs mb-6">
              Enter the 4-digit code sent to <span className="text-zinc-200 font-semibold">{pendingUser?.email}</span>.
            </p>

            <form onSubmit={handleOtpSubmit} className="space-y-6">
              <input
                type="text"
                maxLength="4"
                value={otpInput}
                onChange={(e) => setOtpInput(e.target.value.replace(/\D/g, ''))}
                placeholder="E.g. 1234"
                required
                className="w-[150px] mx-auto text-center tracking-[8px] font-mono text-2xl font-extrabold bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-zinc-100 focus:outline-none focus:border-rose-500 transition-all duration-300"
              />

              {otpNotice && (
                <div className="text-xs text-rose-400 bg-rose-500/10 border border-rose-500/20 px-4 py-2.5 rounded-xl font-medium">
                  {otpNotice}
                </div>
              )}

              {error && (
                <div className="text-xs text-rose-400 bg-rose-500/10 border border-rose-500/20 px-4 py-2.5 rounded-xl">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading || otpInput.length !== 4}
                className="w-full py-3.5 rounded-xl bg-gradient-to-r from-rose-500 to-rose-600 hover:from-rose-600 hover:to-rose-700 text-white font-semibold text-sm transition-all duration-300 flex items-center justify-center gap-2 shadow-lg shadow-rose-950/30 cursor-pointer disabled:opacity-50"
              >
                {loading ? 'Verifying...' : 'Verify OTP & Continue'}
              </button>
            </form>

            <button
              onClick={() => {
                setShowOtpModal(false);
                setShowAuthModal(true);
              }}
              className="mt-6 text-xs text-zinc-500 hover:text-zinc-300 cursor-pointer"
            >
              Back to Login
            </button>
          </div>
        </div>
      )}

      {/* Reservation Portal Booking Modal */}
      {showReservationModal && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-md flex items-center justify-center z-50 p-4 transition-all duration-300">
          <div className="relative w-full max-w-lg bg-zinc-900 border border-zinc-800 rounded-3xl p-8 shadow-2xl animate-in fade-in zoom-in-95 duration-300">
            <div className="flex justify-between items-center mb-6 border-b border-zinc-800 pb-4">
              <div>
                <h2 className="text-2xl font-bold font-outfit text-zinc-100 flex items-center gap-2">
                  <Calendar className="h-6 w-6 text-rose-500" />
                  Table Reservation
                </h2>
                <p className="text-[10px] text-zinc-500 mt-1">Hello {verifiedUser?.name || verifiedUser?.email}, book your seat for the dynamic dining session</p>
              </div>
              <div className="flex items-center gap-1 text-[10px] bg-rose-500/10 text-rose-400 px-2 py-1 rounded-full font-bold">
                <Sparkles className="h-3 w-3 animate-spin" /> VIP Dine
              </div>
            </div>

            <form onSubmit={handleReservationSubmit} className="space-y-6">
              {/* Select Table Grid */}
              <div>
                <label className="block text-zinc-400 text-xs font-semibold mb-3 uppercase tracking-wider">Select Table/Seat</label>
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
                Confirm Dining Table Reservation
                <ArrowRight className="h-4 w-4" />
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
