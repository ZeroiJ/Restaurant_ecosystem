'use client';

import React, { useState, useEffect, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSocket } from '@/context/SocketContext';
import {
  Utensils, ShoppingBag, Bell, CreditCard, ChevronRight, CheckCircle2,
  Trash2, ArrowLeft, LogOut, Loader2, Sparkles, User, Award, Check
} from 'lucide-react';

function CustomerContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isGuest = searchParams.get('guest') === 'true';
  const { socket, connected } = useSocket();

  const [user, setUser] = useState(null);
  const [tableNo, setTableNo] = useState('');
  const [showTableModal, setShowTableModal] = useState(false);

  // Menu items list
  const [menuItems, setMenuItems] = useState([]);
  const [loadingMenu, setLoadingMenu] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('All');
  
  // Cart state
  const [cart, setCart] = useState([]);
  
  // Active order state
  const [activeOrder, setActiveOrder] = useState(null);
  const [orderStatus, setOrderStatus] = useState(''); // 'PENDING', 'PREPARING', 'READY_TO_SERVE', 'SERVED', 'PAID'
  const [tableAlertStatus, setTableAlertStatus] = useState(null); // 'Call Staff' or 'Pay Cash'
  
  // Recommendation system states
  const [pastOrders, setPastOrders] = useState([]);
  
  // Sentiment-gated review state
  const [showSentiment, setShowSentiment] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
  const [sentimentFeedback, setSentimentFeedback] = useState('');
  const [sentimentDone, setSentimentDone] = useState(false);
  const [sentimentType, setSentimentType] = useState('happy');

  // Custom toast notifications for socket events
  const [toasts, setToasts] = useState([]);

  const addToast = (message, type = 'info') => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  };

  // Load user session, reservations and past orders
  useEffect(() => {
    if (!isGuest) {
      const stored = localStorage.getItem('user');
      if (stored) {
        const currentUser = JSON.parse(stored);
        setTimeout(() => {
          setUser(currentUser);
        }, 0);
        
        // Fetch active reservation to auto-populate Table number
        const fetchReservation = async () => {
          try {
            const res = await fetch(`/api/reservations?userId=${currentUser.id}`);
            const data = await res.json();
            if (res.ok && data && data.tableNo) {
              setTableNo(data.tableNo);
              setShowTableModal(false); // Bypasses selection modal
              addToast(`Assigned to Reserved Table ${data.tableNo}!`, 'success');
            } else {
              setShowTableModal(true);
            }
          } catch (err) {
            setShowTableModal(true);
          }
        };
        fetchReservation();

        // Fetch past orders for recommendation scoring
        const fetchPastOrders = async () => {
          try {
            const res = await fetch(`/api/orders?customerId=${currentUser.id}`);
            const ordersData = await res.json();
            if (res.ok) {
              setPastOrders(ordersData);
            }
          } catch (err) {
            console.error('Failed to load user order logs:', err);
          }
        };
        fetchPastOrders();
        
      } else {
        router.push('/');
      }
    } else {
      setTimeout(() => {
        setUser({ name: 'Guest Diner', email: 'guest@vibedine.com', role: 'CUSTOMER', loyaltyPoints: 0 });
        setShowTableModal(true);
      }, 0);
    }
  }, [isGuest, router]);

  // Load Menu items
  useEffect(() => {
    const fetchMenu = async () => {
      try {
        const res = await fetch('/api/menu');
        const data = await res.json();
        if (res.ok) {
          setMenuItems(data);
        }
      } catch (err) {
        addToast('Failed to load menu.', 'error');
      } finally {
        setLoadingMenu(false);
      }
    };
    fetchMenu();
  }, []);

  // Listen to order status socket channel
  useEffect(() => {
    if (!socket || !activeOrder) return;

    socket.emit('join-room', `customer-order-${activeOrder.id}`);

    const handleStatusChange = ({ orderId, status }) => {
      if (orderId === activeOrder.id) {
        setOrderStatus(status);
        addToast(`Your order status is now: ${status}!`, 'success');
        if (status === 'SERVED') {
          setActiveOrder((prev) => ({ ...prev, status: 'SERVED' }));
        }
        if (status === 'PAID') {
          setOrderStatus('PAID');
          setShowSentiment(true);
          addToast('Payment confirmed! How was your meal?', 'success');
        }
      }
    };

    socket.on('order-status-changed', handleStatusChange);

    return () => {
      socket.off('order-status-changed', handleStatusChange);
    };
  }, [socket, activeOrder]);

  const categories = ['All', ...new Set(menuItems.map((item) => item.category))];

  const addToCart = (item) => {
    setCart((prev) => {
      const existing = prev.find((i) => i.id === item.id);
      if (existing) {
        return prev.map((i) => (i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i));
      }
      return [...prev, { ...item, quantity: 1 }];
    });
    addToast(`${item.name} added to basket.`, 'success');
  };

  const updateQuantity = (itemId, change) => {
    setCart((prev) => {
      return prev
        .map((item) => {
          if (item.id === itemId) {
            const nextQty = item.quantity + change;
            return nextQty > 0 ? { ...item, quantity: nextQty } : null;
          }
          return item;
        })
        .filter(Boolean);
    });
  };

  const cartTotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

  const handlePlaceOrder = async () => {
    if (cart.length === 0) return;
    if (!tableNo) {
      setShowTableModal(true);
      return;
    }

    try {
      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tableNo,
          customerId: isGuest ? null : user.id,
          items: cart,
          totalAmount: parseFloat(cartTotal.toFixed(2))
        })
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to place order');

      setActiveOrder(data);
      setOrderStatus('PENDING');
      setCart([]);
      addToast('Order placed successfully!', 'success');

      // Emit through WebSockets to Kitchen
      if (socket) {
        socket.emit('place-order', data);
      }
    } catch (err) {
      addToast(err.message, 'error');
    }
  };

  const handleCallStaff = () => {
    if (!socket || !tableNo) return;
    const type = tableAlertStatus === 'Call Waiter' ? 'Clear' : 'Call Waiter';
    socket.emit('table-alert', { tableNo, type });
    setTableAlertStatus(type === 'Clear' ? null : 'Call Waiter');
    addToast(type === 'Clear' ? 'Staff ping cancelled.' : 'Waiter called to Table ' + tableNo, 'success');
  };

  const handlePayCash = () => {
    if (!socket || !tableNo) return;
    const type = tableAlertStatus === 'Pay Cash' ? 'Clear' : 'Pay Cash';
    socket.emit('table-alert', { tableNo, type });
    setTableAlertStatus(type === 'Clear' ? null : 'Pay Cash');
    addToast(type === 'Clear' ? 'Cash settlement flag cleared.' : 'Requested Cash settlement for Table ' + tableNo, 'success');
  };

  const handleLogout = () => {
    localStorage.removeItem('user');
    router.push('/');
  };

  // ----------------------------------------------------
  // Dynamic Personalization Recommendation Scoring Engine
  // ----------------------------------------------------
  const recommendedItems = React.useMemo(() => {
    if (menuItems.length === 0) return [];
    
    // For Guests or new users without orders, recommend top popularity score items
    if (isGuest || pastOrders.length === 0) {
      return [...menuItems]
        .filter(item => item.isAvailable)
        .sort((a, b) => b.popularityScore - a.popularityScore)
        .slice(0, 3);
    }
    
    // Calculate category and item frequency
    const categoryCounts = {};
    const itemCounts = {};
    
    pastOrders.forEach(order => {
      const itemsList = Array.isArray(order.items) ? order.items : JSON.parse(order.items || '[]');
      itemsList.forEach(item => {
        const menuItem = menuItems.find(m => m.name === item.name || m.id === item.id);
        if (menuItem) {
          categoryCounts[menuItem.category] = (categoryCounts[menuItem.category] || 0) + item.quantity;
        }
        itemCounts[item.name] = (itemCounts[item.name] || 0) + item.quantity;
      });
    });
    
    // Sort favorite categories and items desc
    const favoriteCategories = Object.entries(categoryCounts)
      .sort((a, b) => b[1] - a[1])
      .map(entry => entry[0]);
      
    const favoriteItems = Object.entries(itemCounts)
      .sort((a, b) => b[1] - a[1])
      .map(entry => entry[0]);

    // Rank available menu items dynamically
    return [...menuItems]
      .filter(item => item.isAvailable)
      .map(item => {
        let rankScore = item.popularityScore;
        
        // Exact past item boost
        if (favoriteItems.includes(item.name)) {
          const index = favoriteItems.indexOf(item.name);
          rankScore += (10 - index) * 3;
        }
        
        // Category affinity boost
        if (favoriteCategories.includes(item.category)) {
          const index = favoriteCategories.indexOf(item.category);
          rankScore += (5 - index) * 1.5;
        }
        
        return { item, rankScore };
      })
      .sort((a, b) => b.rankScore - a.rankScore)
      .map(entry => entry.item)
      .slice(0, 3);
  }, [menuItems, pastOrders, isGuest]);

  // Group menu list for active category display
  const sortedMenuItems = [...menuItems].sort((a, b) => {
    if (a.isAvailable !== b.isAvailable) return a.isAvailable ? -1 : 1;
    return b.popularityScore - a.popularityScore;
  });

  const filteredMenuItems = sortedMenuItems.filter(
    (item) => selectedCategory === 'All' || item.category === selectedCategory
  );

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col justify-between font-sans">
      
      {/* Toast container */}
      <div className="fixed top-4 right-4 z-50 flex flex-col gap-2">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`px-4 py-3 rounded-2xl shadow-lg border text-sm flex items-center gap-3 backdrop-blur-md animate-in slide-in-from-top-4 duration-300 ${
              t.type === 'success'
                ? 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                : t.type === 'error'
                ? 'bg-red-500/10 border-red-500/30 text-red-300'
                : 'bg-zinc-900/90 border-zinc-800 text-zinc-300'
            }`}
          >
            <div className={`w-2 h-2 rounded-full ${t.type === 'success' ? 'bg-rose-400' : t.type === 'error' ? 'bg-red-400' : 'bg-blue-400'}`} />
            {t.message}
          </div>
        ))}
      </div>

      {/* Header bar */}
      <header className="sticky top-0 bg-zinc-950/80 backdrop-blur-md border-b border-zinc-900 z-30">
        <div className="max-w-6xl mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <button 
              onClick={() => router.push('/')}
              className="p-2 hover:bg-zinc-900 rounded-xl text-zinc-400 hover:text-zinc-100 transition-all duration-300 cursor-pointer"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            <span className="text-xl font-bold font-outfit text-white tracking-tight">VibeDine</span>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 bg-zinc-900 border border-zinc-800 px-3.5 py-1.5 rounded-xl text-xs font-semibold text-zinc-300">
              <User className="h-3.5 w-3.5 text-rose-500" />
              <span>Table {tableNo || 'N/A'}</span>
            </div>
            
            {!isGuest && (
              <div className="flex items-center gap-1.5 bg-rose-500/10 border border-rose-500/20 px-3.5 py-1.5 rounded-xl text-xs font-semibold text-rose-400">
                <Award className="h-3.5 w-3.5" />
                <span>{user?.loyaltyPoints || 0} pts</span>
              </div>
            )}

            <button 
              onClick={handleLogout} 
              className="p-2 hover:bg-zinc-900 rounded-xl text-zinc-400 hover:text-zinc-100 transition-all duration-300 cursor-pointer"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Body */}
      <main className="max-w-6xl mx-auto px-6 py-8 flex-1 grid grid-cols-1 lg:grid-cols-3 gap-8 w-full">
        
        {/* Left/Middle: Recommendations & Menu list */}
        <div className="lg:col-span-2 space-y-8">
          
          {/* Active order tracker (if exists) */}
          {activeOrder && (
            <div className="rounded-3xl border border-zinc-800 bg-zinc-900/20 p-6 backdrop-blur-md relative overflow-hidden animate-pulse">
              <div className="absolute top-0 right-0 bg-rose-500/10 text-rose-400 px-3 py-1.5 rounded-bl-2xl text-[10px] uppercase font-bold tracking-wider">
                Live Status Tracker
              </div>
              <h3 className="text-lg font-bold text-zinc-100 mb-4 font-outfit">Active Order ({activeOrder.id})</h3>
              
              <div className="flex items-center justify-between gap-2 max-w-md mb-6">
                <div className="flex flex-col items-center flex-1">
                  <div className={`p-2.5 rounded-xl flex items-center justify-center ${orderStatus === 'PENDING' || orderStatus === 'PREPARING' || orderStatus === 'READY_TO_SERVE' || orderStatus === 'SERVED' ? 'bg-rose-500 text-white' : 'bg-zinc-900 text-zinc-600'}`}>
                    <Utensils className="h-4 w-4" />
                  </div>
                  <span className="text-[10px] mt-2 font-semibold text-zinc-300">Pending</span>
                </div>
                <div className="h-0.5 bg-zinc-800 flex-1 relative">
                  <div className={`absolute top-0 left-0 h-full bg-rose-500 transition-all duration-1000 ${orderStatus === 'PREPARING' || orderStatus === 'READY_TO_SERVE' || orderStatus === 'SERVED' ? 'w-full' : 'w-0'}`} />
                </div>
                <div className="flex flex-col items-center flex-1">
                  <div className={`p-2.5 rounded-xl flex items-center justify-center ${orderStatus === 'PREPARING' || orderStatus === 'READY_TO_SERVE' || orderStatus === 'SERVED' ? 'bg-rose-500 text-white' : 'bg-zinc-900 text-zinc-600'}`}>
                    <Sparkles className="h-4 w-4" />
                  </div>
                  <span className="text-[10px] mt-2 font-semibold text-zinc-300">Preparing</span>
                </div>
                <div className="h-0.5 bg-zinc-800 flex-1 relative">
                  <div className={`absolute top-0 left-0 h-full bg-rose-500 transition-all duration-1000 ${orderStatus === 'READY_TO_SERVE' || orderStatus === 'SERVED' ? 'w-full' : 'w-0'}`} />
                </div>
                <div className="flex flex-col items-center flex-1">
                  <div className={`p-2.5 rounded-xl flex items-center justify-center ${orderStatus === 'READY_TO_SERVE' || orderStatus === 'SERVED' ? 'bg-rose-500 text-white' : 'bg-zinc-900 text-zinc-600'}`}>
                    <Bell className="h-4 w-4" />
                  </div>
                  <span className="text-[10px] mt-2 font-semibold text-zinc-300">Ready</span>
                </div>
                <div className="h-0.5 bg-zinc-800 flex-1 relative">
                  <div className={`absolute top-0 left-0 h-full bg-rose-500 transition-all duration-1000 ${orderStatus === 'SERVED' ? 'w-full' : 'w-0'}`} />
                </div>
                <div className="flex flex-col items-center flex-1">
                  <div className={`p-2.5 rounded-xl flex items-center justify-center ${orderStatus === 'SERVED' ? 'bg-rose-500 text-white' : 'bg-zinc-900 text-zinc-600'}`}>
                    <CheckCircle2 className="h-4 w-4" />
                  </div>
                  <span className="text-[10px] mt-2 font-semibold text-zinc-300">Served</span>
                </div>
              </div>

              {orderStatus === 'READY_TO_SERVE' && (
                <div className="bg-amber-500/10 border border-amber-500/20 p-3.5 rounded-xl mb-4 text-xs text-amber-400 font-semibold flex items-center gap-2 animate-bounce">
                  <Sparkles className="h-4 w-4 animate-spin text-amber-400" /> Waiter has been pinged to serve your fresh dish!
                </div>
              )}

              {orderStatus === 'SERVED' ? (
                <div className="bg-emerald-500/10 border border-emerald-500/20 p-4 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <span className="font-bold text-emerald-400 block mb-0.5">Enjoy Your Meal!</span>
                    <span className="text-zinc-400 text-xs font-light">Your items have been served. Settle bill or request help.</span>
                  </div>
                  
                  <div className="flex items-center gap-3.5">
                    <button
                      onClick={handleCallStaff}
                      className={`px-4 py-2 text-xs font-bold rounded-xl transition-all duration-300 cursor-pointer ${tableAlertStatus === 'Call Waiter' ? 'bg-rose-500 text-white shadow-lg shadow-rose-950/40' : 'border border-zinc-800 text-zinc-300 hover:bg-zinc-900'}`}
                    >
                      {tableAlertStatus === 'Call Waiter' ? 'Staff Pinged' : 'Call Waiter'}
                    </button>
                    <button
                      onClick={handlePayCash}
                      className={`px-4 py-2 text-xs font-bold rounded-xl transition-all duration-300 cursor-pointer ${tableAlertStatus === 'Pay Cash' ? 'bg-amber-500 text-black shadow-lg shadow-amber-950/40' : 'border border-zinc-800 text-zinc-300 hover:bg-zinc-900'}`}
                    >
                      {tableAlertStatus === 'Pay Cash' ? 'Pay Cash Alert' : 'Pay by Cash'}
                    </button>
                    <button
                      onClick={() => addToast('Scan UPI payment simulator QR below.', 'info')}
                      className="px-4 py-2 text-xs font-bold rounded-xl bg-white text-black transition-all duration-300 cursor-pointer"
                    >
                      Instant UPI Pay
                    </button>
                  </div>
                </div>
              ) : (
                <p className="text-zinc-400 text-xs font-light leading-relaxed">
                  Our culinary team is preparing your selection. Live status synchronization active.
                </p>
              )}
            </div>
          )}

          {/* Dynamic Personalized Recommendations Shelf */}
          {recommendedItems.length > 0 && (
            <div className="rounded-3xl border border-rose-500/10 bg-gradient-to-r from-rose-950/5 to-zinc-900/30 p-6 backdrop-blur-md">
              <h3 className="text-sm font-bold uppercase tracking-wider text-rose-400 mb-4 flex items-center gap-1.5 font-outfit">
                <Sparkles className="h-4 w-4 text-rose-500 animate-pulse" />
                {isGuest ? "Chef's Handpicked Indian Specials" : `Suited For You, ${user?.name || 'Diner'}`}
              </h3>
              
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {recommendedItems.map(item => (
                  <div 
                    key={`rec-${item.id}`} 
                    className="p-4 rounded-2xl bg-zinc-900/40 border border-zinc-800/60 hover:border-rose-500/20 hover:bg-zinc-900/80 transition-all duration-300 flex flex-col justify-between text-left"
                  >
                    <div>
                      <span className="text-[10px] text-rose-400 font-bold uppercase tracking-wider block mb-1">{item.category}</span>
                      <h4 className="text-sm font-bold text-zinc-100 font-outfit leading-tight mb-2 line-clamp-1">{item.name}</h4>
                    </div>
                    <div className="flex justify-between items-center mt-3">
                      <span className="text-sm font-bold text-zinc-200 font-outfit">${item.price.toFixed(2)}</span>
                      <button
                        onClick={() => addToCart(item)}
                        className="p-1.5 bg-rose-500 hover:bg-rose-600 rounded-lg text-white transition-all duration-300"
                      >
                        <ShoppingBag className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Category Scroller */}
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-zinc-800">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-4.5 py-2.5 rounded-xl text-xs font-bold tracking-wide transition-all duration-300 cursor-pointer ${
                  selectedCategory === cat
                    ? 'bg-rose-500 text-white shadow-lg shadow-rose-950/20'
                    : 'bg-zinc-900 text-zinc-400 border border-zinc-800/40 hover:bg-zinc-800'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Dishes Grid */}
          <div className="space-y-6">
            <h2 className="text-xl font-bold font-outfit text-zinc-100 flex items-center gap-2">
              <Utensils className="h-5 w-5 text-rose-500" />
              {selectedCategory} Delicacies
            </h2>

            {loadingMenu ? (
              <div className="flex flex-col items-center justify-center py-20 gap-3">
                <Loader2 className="h-8 w-8 text-rose-500 animate-spin" />
                <span className="text-zinc-500 text-sm font-light">Loading VibeDine menu...</span>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {filteredMenuItems.map((item) => {
                  const isPersonalized = recommendedItems.some(rec => rec.id === item.id);
                  return (
                    <div
                      key={item.id}
                      className={`group relative border rounded-3xl p-5 flex flex-col justify-between transition-all duration-300 bg-zinc-900/30 hover:bg-zinc-900/60 ${
                        item.isAvailable ? 'border-zinc-800' : 'border-zinc-900 opacity-60'
                      }`}
                    >
                      {isPersonalized && item.isAvailable && (
                        <div className="absolute top-4 right-4 flex items-center gap-1 text-[10px] bg-rose-500/10 border border-rose-500/20 text-rose-400 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider animate-pulse">
                          <Sparkles className="h-3 w-3" /> Recommended
                        </div>
                      )}

                      <div>
                        <span className="text-zinc-500 text-xs font-medium uppercase tracking-wider">{item.category}</span>
                        <h4 className="text-lg font-bold text-zinc-100 mt-1 mb-2 font-outfit">{item.name}</h4>
                        <p className="text-zinc-400 text-xs font-light leading-relaxed mb-6">
                          Authentic Indian recipe made with fresh ingredients. Popularity: {item.popularityScore.toFixed(1)}/10.
                        </p>
                      </div>

                      <div className="flex justify-between items-center mt-auto">
                        <span className="text-lg font-bold text-zinc-200 font-outfit">${item.price.toFixed(2)}</span>
                        
                        {item.isAvailable ? (
                          <button
                            onClick={() => addToCart(item)}
                            className="px-4 py-2 rounded-xl text-xs font-semibold bg-rose-500 hover:bg-rose-600 text-white transition-all duration-300 shadow-md shadow-rose-950/20 cursor-pointer"
                          >
                            Add to Cart
                          </button>
                        ) : (
                          <span className="px-3.5 py-2 rounded-xl text-xs font-bold bg-zinc-950 border border-zinc-900 text-zinc-600">
                            Sold Out
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right Pane: Cart & Payment */}
        <div className="space-y-8">
          
          {/* Cart Box */}
          <div className="rounded-3xl border border-zinc-800 bg-zinc-900/15 p-6 backdrop-blur-md flex flex-col min-h-[400px]">
            <h3 className="text-lg font-bold text-zinc-100 mb-6 font-outfit flex items-center gap-2 pb-4 border-b border-zinc-900">
              <ShoppingBag className="h-5 w-5 text-rose-500" />
              Basket Details
            </h3>

            {cart.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
                <ShoppingBag className="h-10 w-10 text-zinc-700 mb-4" />
                <p className="text-zinc-500 text-sm font-light">Basket is empty.</p>
                <p className="text-zinc-600 text-xs font-light mt-1.5">Add premium items from the menu to get started.</p>
              </div>
            ) : (
              <div className="flex-1 flex flex-col justify-between">
                <div className="space-y-4 max-h-[300px] overflow-y-auto pr-1">
                  {cart.map((item) => (
                    <div key={item.id} className="flex justify-between items-center gap-3 py-2">
                      <div className="flex-1">
                        <span className="font-semibold text-sm text-zinc-200 block">{item.name}</span>
                        <span className="text-xs text-zinc-500">${item.price.toFixed(2)} each</span>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => updateQuantity(item.id, -1)}
                          className="w-7 h-7 rounded-lg border border-zinc-800 flex items-center justify-center text-zinc-400 hover:text-zinc-100 transition-all duration-300 cursor-pointer"
                        >
                          -
                        </button>
                        <span className="text-sm font-semibold text-zinc-200 w-5 text-center">{item.quantity}</span>
                        <button
                          onClick={() => updateQuantity(item.id, 1)}
                          className="w-7 h-7 rounded-lg border border-zinc-800 flex items-center justify-center text-zinc-400 hover:text-zinc-100 transition-all duration-300 cursor-pointer"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="pt-6 border-t border-zinc-900 space-y-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-zinc-400">Subtotal</span>
                    <span className="text-zinc-300 font-medium">${cartTotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-zinc-400">CGST & SGST (5%)</span>
                    <span className="text-zinc-300 font-medium">${(cartTotal * 0.05).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-base font-bold pt-2 border-t border-zinc-900">
                    <span className="text-zinc-100 font-outfit">Total Amount</span>
                    <span className="text-rose-400 font-outfit">${(cartTotal * 1.05).toFixed(2)}</span>
                  </div>

                  <button
                    onClick={handlePlaceOrder}
                    className="w-full py-4 rounded-2xl bg-rose-500 hover:bg-rose-600 text-white font-bold text-sm transition-all duration-300 flex items-center justify-center gap-2 shadow-lg shadow-rose-950/20 cursor-pointer"
                  >
                    Place Kitchen Order
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* UPI Simulator widget */}
          {activeOrder && activeOrder.status === 'SERVED' && (
            <div className="rounded-3xl border border-zinc-800 bg-zinc-900/10 p-6 backdrop-blur-md text-center">
              <h4 className="text-sm font-bold text-zinc-200 uppercase tracking-wider mb-4 flex items-center justify-center gap-2">
                <CreditCard className="h-4 w-4 text-rose-500" />
                Simulated UPI QR Payment
              </h4>
              
              <div className="mx-auto w-[180px] h-[180px] bg-white rounded-2xl p-4 flex flex-col justify-center items-center relative overflow-hidden shadow-inner mb-4">
                <div className="grid grid-cols-5 gap-1.5 w-full h-full opacity-90">
                  {Array.from({ length: 25 }).map((_, idx) => {
                    const isFilled = (idx * 17) % 3 === 0 || (idx > 4 && idx < 10) || idx % 7 === 0;
                    return (
                      <div
                        key={idx}
                        className={`rounded-sm transition-all duration-500 ${isFilled ? 'bg-zinc-950' : 'bg-transparent'}`}
                      />
                    );
                  })}
                </div>
                <div className="absolute inset-0 bg-transparent flex justify-center items-center">
                  <div className="w-10 h-10 bg-white border-2 border-zinc-950 rounded-lg flex items-center justify-center">
                    <Utensils className="h-5 w-5 text-rose-600" />
                  </div>
                </div>
              </div>

              <code className="text-[10px] text-zinc-500 break-all select-all font-mono block mb-4 bg-zinc-950 p-2 rounded-lg border border-zinc-900">
                {`upi://pay?pa=vibedine@hdfcbank&pn=VibeDine&am=${(activeOrder.totalAmount * 1.05).toFixed(2)}&cu=INR`}
              </code>

              <button
                onClick={async () => {
                  try {
                    // Update order in database to PAID
                    const res = await fetch('/api/orders', {
                      method: 'PUT',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ id: activeOrder.id, status: 'PAID' })
                    });
                    
                    if (res.ok) {
                      // Broadcast PAID status update via WebSockets to KDS & Waiter
                      if (socket) {
                        socket.emit('update-order-status', { orderId: activeOrder.id, status: 'PAID' });
                      }
                      
                      setOrderStatus('PAID');
                      setActiveOrder(null);
                      setTableAlertStatus(null);
                      addToast('Payment Confirmed! Database & Cache updated.', 'success');
                    }
                  } catch (err) {
                    addToast('Payment sync failed.', 'error');
                  }
                }}
                className="w-full py-2.5 rounded-xl border border-zinc-800 hover:border-emerald-500/30 hover:bg-emerald-500/10 text-zinc-300 hover:text-emerald-400 text-xs font-bold transition-all duration-300 cursor-pointer"
              >
                Mock Success Confirm
              </button>
            </div>
          )}
        </div>
      </main>

      {/* Sentiment-Gated Review after PAID */}
      {orderStatus === 'PAID' && showSentiment && !sentimentDone && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div className="w-full max-w-sm bg-zinc-900 border border-zinc-800 rounded-3xl p-8 text-center shadow-2xl animate-in fade-in zoom-in-95 duration-300">
            <h3 className="text-xl font-bold font-outfit text-zinc-100 mb-2">How was your meal?</h3>
            <p className="text-zinc-400 text-xs mb-6">Your feedback helps us improve.</p>
            <div className="flex justify-center gap-6 mb-6">
              <button
                onClick={() => {
                  setSentimentType('happy');
                  setShowFeedback(true);
                  setSentimentFeedback('');
                }}
                className="text-4xl p-4 rounded-2xl bg-zinc-800/50 hover:bg-zinc-800 hover:scale-110 transition-all cursor-pointer"
              >
                <span role="img" aria-label="Happy">😊</span>
              </button>
              <button
                onClick={() => {
                  setSentimentType('sad');
                  setShowFeedback(true);
                  setSentimentFeedback('');
                }}
                className="text-4xl p-4 rounded-2xl bg-zinc-800/50 hover:bg-zinc-800 hover:scale-110 transition-all cursor-pointer"
              >
                <span role="img" aria-label="Unhappy">😞</span>
              </button>
            </div>
            <p className="text-[10px] text-zinc-500 font-light">😊 Happy → Private &nbsp;·&nbsp; 😞 Unhappy → Private</p>
          </div>
        </div>
      )}

      {/* Private feedback form */}
      {showSentiment && showFeedback && !sentimentDone && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div className="w-full max-w-sm bg-zinc-900 border border-zinc-800 rounded-3xl p-8 text-center shadow-2xl animate-in fade-in zoom-in-95 duration-300">
            <h3 className="text-xl font-bold font-outfit text-zinc-100 mb-2">
              {sentimentType === 'happy' ? "We're so glad!" : "We're sorry"}
            </h3>
            <p className="text-zinc-400 text-xs mb-4">
              {sentimentType === 'happy' ? "Tell us what you loved (private)" : "Tell us what went wrong (private)"}
            </p>
            <textarea
              value={sentimentFeedback}
              onChange={(e) => setSentimentFeedback(e.target.value)}
              placeholder="Share your feedback..."
              className={`w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-zinc-100 focus:outline-none transition-all duration-300 mb-4 min-h-[100px] ${
                sentimentType === 'happy' ? 'focus:border-emerald-500' : 'focus:border-rose-500'
              }`}
            />
            <button
              onClick={() => {
                const fb = { feedback: sentimentFeedback, type: sentimentType, date: new Date().toISOString() };
                const existing = JSON.parse(localStorage.getItem('vibedine:feedback') || '[]');
                existing.push(fb);
                localStorage.setItem('vibedine:feedback', JSON.stringify(existing));
                console.log('[Feedback]', fb);
                setSentimentDone(true);
                setTimeout(() => { setActiveOrder(null); setOrderStatus(''); setShowSentiment(false); setShowFeedback(false); }, 1000);
              }}
              className={`w-full py-3 rounded-xl text-white font-bold text-sm transition-all cursor-pointer ${
                sentimentType === 'happy' ? 'bg-emerald-500 hover:bg-emerald-600' : 'bg-rose-500 hover:bg-rose-600'
              }`}
            >
              Submit Feedback
            </button>
          </div>
        </div>
      )}

      {/* Table number Selection modal (ONLY for Guests) */}
      {showTableModal && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-3xl p-8 text-center shadow-2xl animate-in fade-in zoom-in-95 duration-300">
            <div className="p-4 bg-rose-500/10 text-rose-400 rounded-full w-fit mx-auto mb-6">
              <Utensils className="h-8 w-8" />
            </div>
            
            <h3 className="text-2xl font-bold font-outfit text-zinc-100 mb-2">Welcome to VibeDine</h3>
            <p className="text-zinc-400 text-xs mb-8">Please select or input your table number to access the dynamic menu.</p>

            <div className="space-y-4">
              <div className="grid grid-cols-5 gap-3.5">
                {['1', '2', '3', '4', '5', '6', '7', '8', '9', '10'].map((num) => (
                  <button
                    key={num}
                    onClick={() => setTableNo(num)}
                    className={`h-11 rounded-xl text-sm font-bold border transition-all duration-300 cursor-pointer ${
                      tableNo === num
                        ? 'bg-rose-500 border-rose-500 text-white shadow-lg shadow-rose-950/30'
                        : 'border-zinc-850 bg-zinc-950 text-zinc-400 hover:bg-zinc-900'
                    }`}
                  >
                    {num}
                  </button>
                ))}
              </div>

              <div className="flex gap-3 pt-6">
                <button
                  disabled={!tableNo}
                  onClick={() => setShowTableModal(false)}
                  className="flex-1 py-3.5 rounded-xl bg-gradient-to-r from-rose-500 to-rose-600 text-white font-bold text-sm shadow-lg shadow-rose-950/20 cursor-pointer disabled:opacity-50"
                >
                  Start Dining
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function CustomerFlow() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center gap-3">
        <Loader2 className="h-8 w-8 text-rose-500 animate-spin" />
        <span className="text-zinc-500 text-sm font-light font-outfit">Loading dining session...</span>
      </div>
    }>
      <CustomerContent />
    </Suspense>
  );
}
