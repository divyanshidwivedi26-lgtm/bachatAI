import React, { useState, useEffect, useRef } from 'react';
import { 
  Search, 
  Bell, 
  ShoppingCart, 
  TrendingDown, 
  ArrowRight, 
  Star, 
  Clock, 
  ChevronRight,
  Trash2,
  AlertCircle,
  CheckCircle2,
  Mic,
  Zap
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { GoogleGenAI } from "@google/genai";

// Types
interface Product {
  id: string;
  name: string;
  platform: string;
  price: number;
  delivery: string;
  rating: number;
  image: string;
  link: string;
}

interface Alert {
  id: number;
  product_name: string;
  target_price: number;
  platform: string;
  current_price: number;
  image_url: string;
  created_at: string;
}

export default function App() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [showAlertModal, setShowAlertModal] = useState<Product | null>(null);
  const [targetPrice, setTargetPrice] = useState('');
  const [activeTab, setActiveTab] = useState<'search' | 'alerts' | 'reminders'>('search');
  const [aiInsight, setAiInsight] = useState<string | null>(null);

  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

  useEffect(() => {
    fetchAlerts();
  }, []);

  const fetchAlerts = async () => {
    try {
      const res = await fetch('/api/alerts');
      const data = await res.json();
      setAlerts(data);
    } catch (err) {
      console.error("Failed to fetch alerts", err);
    }
  };

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    setAiInsight(null);
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
      const data = await res.json();
      setResults(data);

      // Get AI Insight with Google Search Grounding
      const prompt = `User is looking for "${query}" in India. Here are the simulated prices: ${data.map((p: Product) => `${p.platform}: ₹${p.price}`).join(', ')}. 
      1. Use Google Search to find the ACTUAL current best price and platform for "${query}" in India right now.
      2. Provide a very brief (1-2 sentences) smart shopping advice. Mention if the simulated prices are realistic and where the absolute best deal is currently.
      3. If there's a specific coupon or bank offer available today, mention it.`;
      
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
        config: {
          tools: [{ googleSearch: {} }]
        }
      });
      setAiInsight(response.text);

    } catch (err) {
      console.error("Search failed", err);
    } finally {
      setLoading(false);
    }
  };

  const createAlert = async () => {
    if (!showAlertModal || !targetPrice) return;

    try {
      await fetch('/api/alerts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          product_name: showAlertModal.name,
          target_price: parseFloat(targetPrice),
          platform: showAlertModal.platform,
          current_price: showAlertModal.price,
          image_url: showAlertModal.image
        })
      });
      setShowAlertModal(null);
      setTargetPrice('');
      fetchAlerts();
    } catch (err) {
      console.error("Failed to create alert", err);
    }
  };

  const deleteAlert = async (id: number) => {
    try {
      await fetch(`/api/alerts/${id}`, { method: 'DELETE' });
      fetchAlerts();
    } catch (err) {
      console.error("Failed to delete alert", err);
    }
  };

  const sortedResults = [...results].sort((a, b) => a.price - b.price);
  const bestDeal = sortedResults[0];

  return (
    <div className="min-h-screen pb-20">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-slate-200 px-4 py-3">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-indigo-200">
              <Zap size={24} fill="currentColor" />
            </div>
            <div>
              <h1 className="font-bold text-xl tracking-tight text-slate-900">BachatAI</h1>
              <p className="text-[10px] uppercase tracking-widest font-bold text-indigo-600 leading-none">Smart Shopping Agent</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <button className="p-2 text-slate-500 hover:bg-slate-100 rounded-full transition-colors relative">
              <Bell size={20} />
              {alerts.length > 0 && <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>}
            </button>
            <div className="w-8 h-8 rounded-full bg-slate-200 border border-slate-300 overflow-hidden">
              <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=Felix" alt="User" referrerPolicy="no-referrer" />
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 pt-6">
        {/* Search Section */}
        <section className="mb-8">
          <form onSubmit={handleSearch} className="relative group">
            <input 
              type="text" 
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search products across Amazon, Flipkart, Blinkit..."
              className="w-full h-14 pl-14 pr-32 bg-white border-2 border-slate-200 rounded-2xl focus:border-indigo-500 focus:ring-4 focus:ring-indigo-50/50 outline-none transition-all text-lg shadow-sm group-hover:border-slate-300"
            />
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" size={24} />
            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-2">
              <button type="button" className="p-2 text-slate-400 hover:text-indigo-500 transition-colors">
                <Mic size={20} />
              </button>
              <button 
                type="submit"
                disabled={loading}
                className="bg-indigo-600 text-white px-6 py-2 rounded-xl font-semibold hover:bg-indigo-700 transition-all disabled:opacity-50 shadow-md shadow-indigo-100"
              >
                {loading ? '...' : 'Search'}
              </button>
            </div>
          </form>

          {/* Quick Suggestions */}
          <div className="flex gap-2 mt-4 overflow-x-auto pb-2 no-scrollbar">
            {['Biryani', 'Pizza', 'Basmati Rice', 'iPhone 15', 'Milk 1L', 'Nike Shoes', 'Atta 5kg', 'Burgers'].map(tag => (
              <button 
                key={tag}
                onClick={() => { setQuery(tag); handleSearch(); }}
                className="whitespace-nowrap px-4 py-1.5 bg-white border border-slate-200 rounded-full text-sm text-slate-600 hover:border-indigo-300 hover:text-indigo-600 transition-colors shadow-sm"
              >
                {tag}
              </button>
            ))}
          </div>
        </section>

        {/* AI Insight */}
        <AnimatePresence>
          {aiInsight && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-8 p-4 bg-indigo-50 border border-indigo-100 rounded-2xl flex gap-3 items-start"
            >
              <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white shrink-0">
                <Zap size={16} />
              </div>
              <div>
                <h3 className="text-xs font-bold text-indigo-900 uppercase tracking-wider mb-1">BachatAI Insight</h3>
                <p className="text-indigo-800 text-sm leading-relaxed">{aiInsight}</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Content Tabs */}
        <div className="flex border-b border-slate-200 mb-6">
          {[
            { id: 'search', label: 'Price Comparison', icon: Search },
            { id: 'alerts', label: 'Price Alerts', icon: Bell },
            { id: 'reminders', label: 'Smart Reminders', icon: Clock },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-6 py-3 text-sm font-semibold transition-all relative ${
                activeTab === tab.id ? 'text-indigo-600' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <tab.icon size={18} />
              {tab.label}
              {activeTab === tab.id && (
                <motion.div layoutId="activeTab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600" />
              )}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="min-h-[400px]">
          {activeTab === 'search' && (
            <div className="space-y-4">
              {results.length === 0 && !loading && (
                <div className="text-center py-20 bg-white rounded-3xl border-2 border-dashed border-slate-200">
                  <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-300">
                    <ShoppingCart size={32} />
                  </div>
                  <h3 className="text-slate-900 font-bold text-lg">Compare prices instantly</h3>
                  <p className="text-slate-500 max-w-xs mx-auto mt-2">Search for any product to see the best deals across top Indian apps.</p>
                </div>
              )}

              {loading && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[1, 2, 3, 4].map(i => (
                    <div key={i} className="h-32 bg-slate-100 rounded-2xl animate-pulse"></div>
                  ))}
                </div>
              )}

              {results.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {sortedResults.map((product, idx) => (
                    <motion.div 
                      key={product.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.05 }}
                      className={`group relative bg-white rounded-2xl p-4 border transition-all hover:shadow-xl hover:shadow-indigo-100/50 ${
                        idx === 0 ? 'border-indigo-500 ring-1 ring-indigo-500' : 'border-slate-200'
                      }`}
                    >
                      {idx === 0 && (
                        <div className="absolute -top-3 left-4 bg-indigo-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1">
                          <Zap size={10} fill="currentColor" /> Best Deal
                        </div>
                      )}
                      
                      <div className="flex gap-4">
                        <div className="w-24 h-24 rounded-xl overflow-hidden bg-slate-50 border border-slate-100 shrink-0">
                          <img src={product.image} alt={product.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between items-start">
                            <div>
                              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">{product.platform}</p>
                              <h3 className="font-bold text-slate-900 truncate pr-2">{product.name}</h3>
                            </div>
                            <div className="text-right">
                              <p className="text-xl font-black text-slate-900">₹{product.price}</p>
                              <p className="text-[10px] text-slate-500">Delivery: {product.delivery}</p>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-3 mt-3">
                            <div className="flex items-center gap-1 text-xs font-bold text-amber-500">
                              <Star size={14} fill="currentColor" /> {product.rating}
                            </div>
                            <button 
                              onClick={() => setShowAlertModal(product)}
                              className="flex items-center gap-1 text-xs font-bold text-indigo-600 hover:text-indigo-700 transition-colors"
                            >
                              <Bell size={14} /> Alert
                            </button>
                            <button 
                              onClick={() => {
                                // Simple mock for adding a reminder
                                alert(`Reminder set for ${product.name}! We'll remind you to restock this soon.`);
                              }}
                              className="flex items-center gap-1 text-xs font-bold text-emerald-600 hover:text-emerald-700 transition-colors"
                            >
                              <Clock size={14} /> Track
                            </button>
                            <a 
                              href={product.link}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="ml-auto flex items-center gap-1 text-xs font-bold bg-slate-900 text-white px-3 py-1.5 rounded-lg hover:bg-slate-800 transition-colors"
                            >
                              Buy Now <ArrowRight size={12} />
                            </a>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'alerts' && (
            <div className="space-y-4">
              {alerts.length === 0 ? (
                <div className="text-center py-20 bg-white rounded-3xl border border-slate-200">
                  <Bell className="mx-auto mb-4 text-slate-300" size={48} />
                  <h3 className="text-slate-900 font-bold text-lg">No active alerts</h3>
                  <p className="text-slate-500 mt-2">We'll notify you when prices drop below your target.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {alerts.map(alert => (
                    <div key={alert.id} className="bg-white rounded-2xl p-4 border border-slate-200 flex gap-4 items-center">
                      <div className="w-16 h-16 rounded-xl overflow-hidden bg-slate-50 shrink-0">
                        <img src={alert.image_url} alt={alert.product_name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-slate-900 truncate">{alert.product_name}</h3>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs font-bold text-slate-400 uppercase">{alert.platform}</span>
                          <span className="text-xs text-slate-300">•</span>
                          <span className="text-xs font-bold text-indigo-600">Target: ₹{alert.target_price}</span>
                        </div>
                        <div className="flex items-center gap-2 mt-2">
                          <TrendingDown size={14} className="text-green-500" />
                          <span className="text-xs font-bold text-green-600">Current: ₹{alert.current_price}</span>
                        </div>
                      </div>
                      <button 
                        onClick={() => deleteAlert(alert.id)}
                        className="p-2 text-slate-300 hover:text-red-500 transition-colors"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'reminders' && (
            <div className="bg-white rounded-3xl border border-slate-200 p-8 text-center">
              <div className="w-20 h-20 bg-indigo-50 rounded-full flex items-center justify-center mx-auto mb-6 text-indigo-600">
                <Clock size={40} />
              </div>
              <h3 className="text-2xl font-black text-slate-900 mb-2">Smart Grocery Reminders</h3>
              <p className="text-slate-500 max-w-md mx-auto mb-8">
                BachatAI learns your buying habits and reminds you to restock before you run out.
              </p>
              
              <div className="space-y-3 max-w-sm mx-auto text-left">
                {[
                  { item: 'Amul Milk 1L', status: 'Running Low', days: '2 days left' },
                  { item: 'Aashirvaad Atta 5kg', status: 'Stock OK', days: '12 days left' },
                ].map((item, i) => (
                  <div key={i} className="p-4 rounded-2xl bg-slate-50 border border-slate-100 flex justify-between items-center">
                    <div>
                      <p className="font-bold text-slate-900">{item.item}</p>
                      <p className="text-xs text-slate-500">{item.status}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded-md">{item.days}</p>
                    </div>
                  </div>
                ))}
              </div>
              
              <button className="mt-8 text-indigo-600 font-bold flex items-center gap-2 mx-auto hover:gap-3 transition-all">
                Configure auto-reminders <ChevronRight size={18} />
              </button>
            </div>
          )}
        </div>
      </main>

      {/* Alert Modal */}
      <AnimatePresence>
        {showAlertModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowAlertModal(null)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden"
            >
              <div className="p-6">
                <div className="flex justify-between items-start mb-6">
                  <h2 className="text-2xl font-black text-slate-900">Set Price Alert</h2>
                  <button onClick={() => setShowAlertModal(null)} className="text-slate-400 hover:text-slate-600">
                    <Trash2 size={24} />
                  </button>
                </div>
                
                <div className="flex gap-4 mb-6 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                  <img src={showAlertModal.image} alt="" className="w-16 h-16 rounded-xl object-cover" referrerPolicy="no-referrer" />
                  <div>
                    <h3 className="font-bold text-slate-900">{showAlertModal.name}</h3>
                    <p className="text-sm text-slate-500">Current Price: <span className="font-bold text-slate-900">₹{showAlertModal.price}</span></p>
                    <p className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest">{showAlertModal.platform}</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Target Price (₹)</label>
                    <input 
                      type="number" 
                      value={targetPrice}
                      onChange={(e) => setTargetPrice(e.target.value)}
                      placeholder="e.g. 450"
                      className="w-full h-14 px-4 bg-slate-50 border-2 border-slate-200 rounded-2xl focus:border-indigo-500 outline-none transition-all text-xl font-bold"
                    />
                  </div>
                  <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-100 rounded-xl text-amber-800 text-xs">
                    <AlertCircle size={16} className="shrink-0" />
                    We'll send you a notification as soon as the price hits this target.
                  </div>
                  <button 
                    onClick={createAlert}
                    className="w-full h-14 bg-indigo-600 text-white rounded-2xl font-bold text-lg hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200"
                  >
                    Activate Alert
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Bottom Navigation (Mobile) */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 px-6 py-3 flex justify-between items-center z-40 md:hidden">
        {[
          { id: 'search', icon: Search, label: 'Search' },
          { id: 'alerts', icon: Bell, label: 'Alerts' },
          { id: 'reminders', icon: Clock, label: 'Reminders' },
        ].map(item => (
          <button 
            key={item.id}
            onClick={() => setActiveTab(item.id as any)}
            className={`flex flex-col items-center gap-1 transition-colors ${
              activeTab === item.id ? 'text-indigo-600' : 'text-slate-400'
            }`}
          >
            <item.icon size={20} />
            <span className="text-[10px] font-bold uppercase tracking-wider">{item.label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}
