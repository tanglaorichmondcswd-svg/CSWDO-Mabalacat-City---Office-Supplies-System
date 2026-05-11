import React, { useState, useEffect } from 'react';
import { 
  Package, 
  Truck, 
  ClipboardList, 
  BarChart3, 
  TrendingUp, 
  AlertCircle,
  PackageCheck,
  PackageX,
  History,
  ArrowRight,
  ArrowDownLeft,
  ArrowUpRight
} from 'lucide-react';
import { inventoryService } from '../services/inventoryService';
import { Item, InventoryMovement, Delivery, Request } from '../types';
import { format } from 'date-fns';
import { motion, AnimatePresence } from 'motion/react';
import { collection, query, orderBy, onSnapshot, limit } from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { Link } from 'react-router-dom';

const Dashboard: React.FC = () => {
  const [items, setItems] = useState<Item[]>([]);
  const [movements, setMovements] = useState<InventoryMovement[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalItems: 0,
    lowStock: 0,
    outOfStock: 0,
    pendingRequests: 0
  });

  useEffect(() => {
    let unsubscribeItems: () => void;
    let unsubscribeMovements: () => void;
    let unsubscribeRequests: () => void;

    const setupListeners = async () => {
      try {
        setLoading(true);
        const itemsQuery = query(collection(db, 'items'), orderBy('itemId', 'asc'));
        unsubscribeItems = onSnapshot(itemsQuery, (snapshot) => {
          const fetchedItems = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Item));
          setItems(fetchedItems);
          setStats(prev => ({
            ...prev,
            totalItems: fetchedItems.length,
            lowStock: fetchedItems.filter(i => i.qty > 0 && i.qty <= (i.stockLevel || 5)).length,
            outOfStock: fetchedItems.filter(i => i.qty <= 0).length
          }));
        });

        const movementsQuery = query(collection(db, 'inventory_movements'), orderBy('date', 'desc'), limit(10));
        unsubscribeMovements = onSnapshot(movementsQuery, (snapshot) => {
          setMovements(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as InventoryMovement)));
        });

        const requestsQuery = query(collection(db, 'requests'), orderBy('dateRequested', 'desc'));
        unsubscribeRequests = onSnapshot(requestsQuery, (snapshot) => {
          const reqs = snapshot.docs.map(d => d.data() as Request);
          setStats(prev => ({
            ...prev,
            pendingRequests: reqs.filter(r => r.status === 'Pending').length
          }));
          setLoading(false);
        });

      } catch (err) {
        console.error("Dashboard setup failed:", err);
        setLoading(false);
      }
    };

    setupListeners();
    return () => {
      unsubscribeItems?.();
      unsubscribeMovements?.();
      unsubscribeRequests?.();
    };
  }, []);

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-[3px] border-brand-accent border-t-transparent shadow-lg shadow-blue-100" />
      </div>
    );
  }

  return (
    <div className="space-y-12 font-sans italic-serif-headers">
      <header className="flex flex-col md:flex-row md:items-end md:justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.3em] text-brand-accent mb-2">
            <div className="h-1 w-6 sm:w-10 bg-brand-accent rounded-full" />
            System Overview
          </div>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-display font-black text-slate-900 tracking-tighter uppercase leading-none italic">
            Workspace <span className="text-brand-accent">Dashboard</span>
          </h1>
          <p className="mt-3 sm:mt-4 text-slate-400 font-medium leading-relaxed max-w-xl text-xs sm:text-sm uppercase tracking-tight">Real-time supply intelligence portal.</p>
        </div>
        <div className="flex items-center gap-4 bg-white px-6 py-4 rounded-[2rem] border border-slate-100 shadow-2xl shadow-slate-200/50">
          <div className="flex flex-col items-end">
            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none">System Status</span>
            <span className="text-xs font-black text-emerald-500 uppercase tracking-tighter mt-1">Operational</span>
          </div>
          <div className="h-10 w-10 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-500">
            <div className="h-3 w-3 rounded-full bg-emerald-500 animate-pulse ring-4 ring-emerald-100" />
          </div>
        </div>
      </header>

      <div className="flex flex-col xl:flex-row gap-8">
        <div className="flex-1 space-y-8">
          {/* Stats Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 italic">
            {[
              { label: 'Asset Groups', value: stats.totalItems, icon: Package, color: 'text-indigo-600', bg: 'bg-indigo-50/50', border: 'border-indigo-100' },
              { label: 'Low Stock', value: stats.lowStock, icon: AlertCircle, color: 'text-amber-600', bg: 'bg-amber-50/50', border: 'border-amber-100' },
              { label: 'Out of Stock', value: stats.outOfStock, icon: PackageX, color: 'text-rose-600', bg: 'bg-rose-50/50', border: 'border-rose-100' },
              { label: 'Pending Requests', value: stats.pendingRequests, icon: ClipboardList, color: 'text-brand-accent', bg: 'bg-brand-accent/5', border: 'border-brand-accent/10' },
            ].map((stat, i) => (
              <motion.div 
                key={i}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                className={`relative overflow-hidden group rounded-[2.5rem] border-2 bg-white p-8 shadow-xl shadow-slate-200/30 transition-all hover:shadow-2xl hover:-translate-y-1 ${stat.border}`}
              >
                <div className={`relative mb-6 flex h-12 w-12 items-center justify-center rounded-2xl shadow-sm ${stat.bg} ${stat.color} group-hover:scale-110 transition-transform`}>
                  <stat.icon size={24} />
                </div>
                <p className="relative text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">{stat.label}</p>
                <p className="relative mt-2 text-4xl font-display font-black text-slate-900 tracking-tighter">{stat.value}</p>
                <div className="absolute top-4 right-6 opacity-[0.03] pointer-events-none group-hover:opacity-10 transition-opacity">
                    <stat.icon size={64} />
                </div>
              </motion.div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 italic">
            {/* Quick Actions */}
            <section className="rounded-[2.5rem] bg-slate-900 p-10 shadow-2xl text-white relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-brand-accent/20 to-transparent pointer-events-none" />
              <h3 className="relative z-10 mb-8 text-xl font-display font-black text-white uppercase tracking-tight flex items-center gap-3">
                <TrendingUp size={22} className="text-brand-accent" />
                Quick Actions
              </h3>
              <div className="relative z-10 grid grid-cols-2 gap-4">
                {[
                  { to: '/inventory', label: 'Item List', icon: Package, color: 'hover:bg-indigo-600 border-white/5' },
                  { to: '/deliveries', label: 'Deliveries', icon: Truck, color: 'hover:bg-emerald-600 border-white/5' },
                  { to: '/requests', label: 'Requests', icon: ClipboardList, color: 'hover:bg-brand-accent border-white/5' },
                  { to: '/reports', label: 'Reports', icon: BarChart3, color: 'hover:bg-amber-600 border-white/5' },
                ].map((action, i) => (
                  <Link 
                    key={i} 
                    to={action.to} 
                    className={`flex flex-col gap-4 rounded-3xl border bg-white/5 p-6 transition-all hover:scale-[1.02] active:scale-95 group ${action.color}`}
                  >
                    <div className="h-10 w-10 flex items-center justify-center bg-white/10 rounded-xl shadow-lg ring-1 ring-white/10 transition-all group-hover:bg-white group-hover:text-slate-900">
                      <action.icon size={18} />
                    </div>
                    <span className="text-xs font-black uppercase tracking-[0.1em]">{action.label}</span>
                  </Link>
                ))}
              </div>
            </section>

            {/* Recent Activity */}
            <section className="rounded-[2.5rem] border border-slate-100 bg-white p-10 shadow-2xl shadow-slate-200/50">
              <div className="flex items-center justify-between mb-10">
                <h3 className="text-xl font-display font-black text-slate-900 uppercase tracking-tight flex items-center gap-3">
                  <History size={22} className="text-brand-accent" />
                  Recent Activity
                </h3>
                <Link to="/inventory" className="text-[10px] font-black text-brand-accent uppercase tracking-[0.2em] hover:bg-blue-50 px-4 py-2 rounded-xl transition-all">Explore All</Link>
              </div>
              <div className="space-y-6">
                {movements.map((move) => (
                  <div key={move.id} className="flex items-center justify-between group">
                    <div className="flex items-center gap-4">
                      <div className={`h-12 w-12 rounded-2xl flex items-center justify-center shadow-sm transition-all group-hover:-rotate-6 ${
                        move.type === 'IN' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-rose-50 text-rose-600 border border-rose-100'
                      }`}>
                        {move.type === 'IN' ? <ArrowDownLeft size={18} /> : <ArrowUpRight size={18} />}
                      </div>
                      <div>
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.15em] mb-0.5">{move.itemId}</p>
                        <p className="text-sm font-black text-slate-900 uppercase tracking-tight">{move.type === 'IN' ? 'Restocked' : 'Allocated'}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`text-lg font-display font-black ${
                        move.type === 'IN' ? 'text-emerald-500' : 'text-rose-500'
                      }`}>
                        {move.type === 'IN' ? '+' : '-'}{move.qty}
                      </p>
                      <p className="text-[9px] text-slate-300 font-black uppercase tracking-widest mt-0.5">
                        {move.date?.toDate ? format(move.date.toDate(), 'HH:mm:ss') : 'TEMPORAL NULL'}
                      </p>
                    </div>
                  </div>
                ))}
                {movements.length === 0 && <p className="text-center text-xs text-slate-300 py-10 font-black uppercase tracking-[0.3em] animate-pulse">No recent activity recorded.</p>}
              </div>
            </section>
          </div>
        </div>

        {/* Real-Time Monitor Panel */}
        <div className="w-full xl:w-96">
          <div className="rounded-[2.5rem] border border-slate-100 bg-white p-6 shadow-2xl shadow-slate-200/60 sticky top-10 border-t-8 border-brand-accent">
            <div className="flex items-center justify-between mb-8 px-2">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className="absolute inset-0 bg-rose-400 rounded-full blur-md opacity-20 animate-pulse" />
                  <History className="text-slate-400 relative z-10" size={24} />
                </div>
                <h3 className="text-lg font-display font-extrabold uppercase tracking-tight">Inventory Monitor</h3>
              </div>
              <div className="flex items-center gap-1.5 bg-rose-50 px-3 py-1 rounded-full border border-rose-100 capitalize">
                <div className="h-1.5 w-1.5 rounded-full bg-rose-500 animate-pulse" />
                <span className="text-[10px] font-extrabold text-rose-600">LIVE</span>
              </div>
            </div>

            <div className="space-y-4 max-h-[calc(100vh-360px)] overflow-y-auto pr-3 custom-scrollbar italic">
              {items.sort((a, b) => {
                const percA = a.stockLevel > 0 ? (a.qty / a.stockLevel) : 1;
                const percB = b.stockLevel > 0 ? (b.qty / b.stockLevel) : 1;
                return percA - percB;
              }).map((item) => {
                const percent = item.stockLevel > 0 ? Math.round((item.qty / item.stockLevel) * 100) : 0;
                const cappedPercent = Math.min(100, Math.max(0, percent));
                
                return (
                  <div key={item.id} className="group relative bg-slate-50/50 p-5 rounded-[2rem] transition-all hover:bg-white hover:shadow-2xl hover:shadow-slate-100 border border-transparent hover:border-slate-100 italic">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex flex-col">
                        <span className="text-[9px] font-black font-mono text-slate-300 tracking-[0.2em] mb-1">#{item.itemId}</span>
                        <span className="text-sm font-black text-slate-900 leading-none truncate max-w-[150px] uppercase tracking-tighter">{item.description}</span>
                      </div>
                      <div className="text-right">
                        <span className={`text-xl font-display font-black ${
                          cappedPercent < 20 ? 'text-rose-600 animate-pulse' : 
                          cappedPercent < 50 ? 'text-amber-600' : 
                          'text-brand-accent'
                        }`}>
                          {item.qty}
                        </span>
                        <span className="ml-1 text-[9px] font-black text-slate-400 uppercase tracking-widest">{item.uom}</span>
                      </div>
                    </div>
                    
                    <div className="relative h-2.5 w-full bg-slate-100 rounded-full overflow-hidden shadow-inner mb-3">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.min(100, (item.qty / (item.stockLevel || 1)) * 100)}%` }}
                        className={`h-full relative rounded-full ${
                          cappedPercent < 20 ? 'bg-gradient-to-r from-rose-500 to-rose-400' : 
                          cappedPercent < 50 ? 'bg-gradient-to-r from-amber-500 to-amber-400' : 
                          'bg-gradient-to-r from-brand-accent to-indigo-400'
                        }`}
                      >
                        <div className="absolute inset-0 bg-[linear-gradient(45deg,transparent_25%,rgba(255,255,255,0.2)_50%,transparent_75%)] bg-[length:40px_40px] animate-shimmer" />
                      </motion.div>
                    </div>
                    
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-1">
                        <div className="h-1.5 w-1.5 rounded-full bg-slate-300" />
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Target: {item.stockLevel}</span>
                      </div>
                      <span className={`text-[9px] font-black uppercase tracking-[0.2em] ${cappedPercent < 20 ? 'text-rose-600' : 'text-slate-400'}`}>
                        {cappedPercent}% CAPACITY
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mt-8 pt-6 border-t border-slate-100 font-sans">
              <Link 
                to="/inventory" 
                className="group flex items-center justify-center gap-2 w-full py-4 bg-brand-primary rounded-2xl text-[11px] font-extrabold uppercase tracking-[0.2em] text-white hover:bg-slate-800 transition-all shadow-xl shadow-slate-200 hover:shadow-2xl"
              >
                View Full Inventory
                <ArrowRight size={14} className="transition-transform group-hover:translate-x-1" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
