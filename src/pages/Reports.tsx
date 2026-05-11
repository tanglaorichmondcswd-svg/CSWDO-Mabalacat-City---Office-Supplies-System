import React, { useState, useEffect } from 'react';
import { BarChart3, Download, Truck, ClipboardList, Filter, Calendar } from 'lucide-react';
import { inventoryService } from '../services/inventoryService';
import { Delivery, Request } from '../types';
import { format, startOfMonth, endOfMonth, isWithinInterval } from 'date-fns';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import ExportModal from '../components/ExportModal';
import * as XLSX from 'xlsx';
import { printTable } from '../lib/exportUtils';

const Reports: React.FC = () => {
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [requests, setRequests] = useState<Request[]>([]);
  const [loading, setLoading] = useState(true);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [dateRange, setDateRange] = useState({
    start: format(startOfMonth(new Date()), 'yyyy-MM-dd'),
    end: format(endOfMonth(new Date()), 'yyyy-MM-dd')
  });

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    loadData();
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const loadData = async () => {
    setLoading(true);
    const [dels, reqs] = await Promise.all([
      inventoryService.getDeliveries(),
      inventoryService.getRequests()
    ]);
    setDeliveries(dels || []);
    setRequests(reqs || []);
    setLoading(false);
  };

  const filteredDeliveries = deliveries.filter(d => 
    isWithinInterval(new Date(d.dateDelivered), { 
      start: new Date(dateRange.start), 
      end: new Date(dateRange.end) 
    })
  );

  const filteredRequests = requests.filter(r => 
    isWithinInterval(new Date(r.dateRequested), { 
      start: new Date(dateRange.start), 
      end: new Date(dateRange.end) 
    })
  );

  // Group by category for chart
  const categoryData = [...filteredDeliveries, ...filteredRequests].reduce((acc: any, curr: any) => {
    const cat = curr.category;
    if (!acc[cat]) acc[cat] = { name: cat, deliveries: 0, requests: 0 };
    if ('dateDelivered' in curr) acc[cat].deliveries += curr.qty;
    else acc[cat].requests += curr.qty;
    return acc;
  }, {});

  const chartData = Object.values(categoryData);

  return (
    <div className="space-y-10 font-sans italic">
      <div className="hidden print:block w-full mb-8">
        <img 
          src="https://raw.githubusercontent.com/tanglaorichmondcswd-svg/MABALACAT-CITY-LOGO/787904c28a569b18cc4e23d3f6f16d7aaa024907/2025%20%20letter%20head.png" 
          alt="Mabalacat City Letterhead" 
          className="w-full"
          referrerPolicy="no-referrer"
        />
      </div>
      <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.25em] text-brand-accent mb-2">
            <div className="h-1 w-8 bg-brand-accent rounded-full" />
            Strategic Intelligence Registry
          </div>
          <h1 className="text-4xl font-display font-black text-slate-900 tracking-tighter uppercase leading-none">Analytical Intelligence</h1>
          <p className="mt-4 text-slate-400 font-medium leading-relaxed max-w-xl text-sm italic">Aggregate surveillance of operational throughput, ingress logistics, and resource dissemination.</p>
        </div>
        
        <div className="flex items-center gap-4 bg-white p-2 rounded-2xl border border-slate-100 shadow-xl shadow-slate-200/40">
          <div className="flex items-center gap-3 px-4 py-2 bg-slate-50 rounded-xl border border-slate-100">
            <Calendar size={14} className="text-brand-accent" />
            <div className="flex items-center gap-2">
              <input 
                type="date" 
                value={dateRange.start} 
                onChange={e => setDateRange({ ...dateRange, start: e.target.value })}
                className="bg-transparent text-[10px] font-black uppercase text-slate-900 focus:outline-none cursor-pointer" 
              />
              <span className="text-slate-300 font-black px-1">/</span>
              <input 
                type="date" 
                value={dateRange.end} 
                onChange={e => setDateRange({ ...dateRange, end: e.target.value })}
                className="bg-transparent text-[10px] font-black uppercase text-slate-900 focus:outline-none cursor-pointer" 
              />
            </div>
          </div>
          <button className="p-3 bg-slate-900 text-brand-accent rounded-xl hover:bg-brand-primary hover:text-white transition-all shadow-lg active:scale-95">
            <Filter size={16} />
          </button>
        </div>
      </div>

      <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 italic">
        {[
          { label: 'Logistics Ingress', value: filteredDeliveries.length, icon: Truck, color: 'text-indigo-600', bg: 'bg-indigo-50/50', border: 'border-indigo-100' },
          { label: 'Requisition Yield', value: filteredRequests.length, icon: ClipboardList, color: 'text-brand-accent', bg: 'bg-brand-accent/5', border: 'border-brand-accent/10' },
          { label: 'Quantum Inflow', value: filteredDeliveries.reduce((a, c) => a + c.qty, 0), icon: BarChart3, color: 'text-emerald-600', bg: 'bg-emerald-50/50', border: 'border-emerald-100' },
          { label: 'Quantum Outflow', value: filteredRequests.filter(r => r.status === 'Released').reduce((a, c) => a + c.qty, 0), icon: BarChart3, color: 'text-rose-600', bg: 'bg-rose-50/50', border: 'border-rose-100' },
        ].map((stat, i) => (
          <div key={i} className={`group relative rounded-[2rem] border-2 bg-white p-6 sm:p-8 shadow-xl shadow-slate-200/30 transition-all hover:translate-y-[-4px] ${stat.border}`}>
            <div className={`mb-4 sm:mb-6 flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-2xl ${stat.bg} ${stat.color} shadow-sm group-hover:scale-110 transition-transform`}>
              <stat.icon size={20} className="sm:w-6 sm:h-6" />
            </div>
            <p className="text-[9px] sm:text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">{stat.label}</p>
            <p className="mt-2 text-3xl sm:text-4xl font-display font-black text-slate-900 tracking-tighter">{stat.value.toLocaleString()}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-10 lg:grid-cols-12 italic">
        {/* Charts Section */}
        <div className="lg:col-span-7 rounded-[2.5rem] border border-slate-100 bg-white p-6 sm:p-10 shadow-2xl shadow-slate-200/50">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 sm:mb-10 gap-4">
            <div>
              <h3 className="text-lg sm:text-xl font-display font-black text-slate-900 uppercase tracking-tight">Throughput Velocity</h3>
              <p className="text-[9px] sm:text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Resource distribution</p>
            </div>
            <div className="flex gap-4">
                <div className="flex items-center gap-1.5 text-[9px] sm:text-[10px] font-black text-indigo-600 uppercase">
                    <div className="h-2 w-2 rounded-full bg-indigo-600" /> Ingress
                </div>
                <div className="flex items-center gap-1.5 text-[9px] sm:text-[10px] font-black text-brand-accent uppercase">
                    <div className="h-2 w-2 rounded-full bg-brand-accent" /> Egress
                </div>
            </div>
          </div>
          
          <div className="h-[300px] sm:h-[400px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 0, right: 0, left: -30, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 9, fill: '#94a3b8', fontWeight: 900, textTransform: 'uppercase' }} 
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 9, fill: '#94a3b8', fontWeight: 900 }} 
                />
                <Tooltip 
                  cursor={{ fill: '#f8fafc' }}
                  contentStyle={{ 
                    borderRadius: '16px', 
                    border: '1px solid #f1f5f9', 
                    boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)',
                    fontSize: '9px',
                    fontWeight: 900,
                    textTransform: 'uppercase'
                  }}
                />
                <Bar dataKey="deliveries" fill="#4f46e5" radius={[4, 4, 0, 0]} name="Ingress" barSize={isMobile ? 16 : 32} />
                <Bar dataKey="requests" fill="#FFB800" radius={[4, 4, 0, 0]} name="Egress" barSize={isMobile ? 16 : 32} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Global Activity Feed */}
        <div className="lg:col-span-5 rounded-[2.5rem] border border-slate-100 bg-slate-900 p-10 shadow-2xl shadow-slate-950/20 text-white relative overflow-hidden">
          <div className="absolute top-0 right-0 p-12 opacity-5 pointer-events-none">
            <ClipboardList size={200} />
          </div>
          
          <div className="flex items-center justify-between mb-10 relative z-10">
            <div>
              <h3 className="text-xl font-display font-black text-white uppercase tracking-tight">Ledger Feed</h3>
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mt-1">Real-time mutation log</p>
            </div>
            <button
              onClick={() => setIsExportOpen(true)}
              className="group flex items-center gap-2 rounded-xl bg-white/10 hover:bg-white text-white hover:text-slate-900 px-5 py-2.5 text-[10px] font-black uppercase tracking-widest transition-all border border-white/20 hover:border-white shadow-lg"
            >
              <Download size={14} className="group-hover:translate-y-0.5 transition-transform" />
              Ledger Report Export
            </button>
          </div>

          <div className="space-y-6 relative z-10">
            {[...filteredDeliveries, ...filteredRequests].sort((a: any, b: any) => {
              const dateA = new Date(a.dateDelivered || a.dateRequested);
              const dateB = new Date(b.dateDelivered || b.dateRequested);
              return dateB.getTime() - dateA.getTime();
            }).slice(0, 10).map((item: any, i) => (
              <div key={i} className="flex items-center justify-between group">
                <div className="flex items-center gap-4">
                  <div className={`h-10 w-10 rounded-xl flex items-center justify-center border transition-colors ${
                    'dateDelivered' in item 
                      ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20 group-hover:bg-indigo-500 group-hover:text-white' 
                      : 'bg-brand-accent/10 text-brand-accent border-brand-accent/20 group-hover:bg-brand-accent group-hover:text-slate-900'
                  }`}>
                    {'dateDelivered' in item ? <Truck size={16} /> : <ClipboardList size={16} />}
                  </div>
                  <div>
                    <p className="text-[9px] font-black text-slate-500 uppercase tracking-[0.1em]">{item.itemId}</p>
                    <p className="text-sm font-bold text-white uppercase tracking-tight truncate max-w-[180px]">{item.description}</p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="flex items-end gap-1.5 justify-end">
                    <span className={`text-base font-display font-black ${
                      'dateDelivered' in item ? 'text-indigo-400' : 'text-brand-accent'
                    }`}>
                      {'dateDelivered' in item ? '+' : '-'}{item.qty}
                    </span>
                  </div>
                  <p className="text-[9px] text-slate-500 font-black uppercase tracking-widest mt-0.5">
                    {format(new Date(item.dateDelivered || item.dateRequested), 'MMM dd')}
                  </p>
                </div>
              </div>
            ))}
            {loading && (
                <div className="py-20 text-center opacity-30 italic font-black uppercase tracking-[0.3em] text-xs">Awaiting Cluster Decryption...</div>
            )}
          </div>
        </div>
      </div>
      <ExportModal 
        isOpen={isExportOpen}
        onClose={() => setIsExportOpen(false)}
        title="Ledger Report Export"
                onExportExcel={(s, e) => {
            const startDate = new Date(s);
            const endDate = new Date(e);
            
            const filteredAll = [...deliveries, ...requests].filter(item => {
                const itemDate = new Date('dateDelivered' in item ? item.dateDelivered : item.dateRequested);
                return isWithinInterval(itemDate, { start: startDate, end: endDate });
            });

            // Convert to Excel
            const worksheet = XLSX.utils.json_to_sheet(filteredAll);
            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, "Ledger Report");
            XLSX.writeFile(workbook, `Ledger_Report_${s}_to_${e}.xlsx`);
            
            setIsExportOpen(false);
        }}
        onPrint={(s, e) => {
            const startDate = new Date(s);
            const endDate = new Date(e);

            const filteredAll = [...deliveries, ...requests].filter(item => {
                const itemDate = new Date('dateDelivered' in item ? item.dateDelivered : item.dateRequested);
                return isWithinInterval(itemDate, { start: startDate, end: endDate });
            });

            const columns = ['Item ID', 'Description', 'Quantity', 'Date', 'Type'];
            const data = filteredAll.map(item => [
                item.itemId,
                item.description,
                item.qty,
                format(new Date('dateDelivered' in item ? item.dateDelivered : item.dateRequested), 'yyyy-MM-dd'),
                'dateDelivered' in item ? 'Delivery' : 'Request'
            ]);

            printTable(`Ledger Report (${s} to ${e})`, columns, data);
            
            setIsExportOpen(false);
        }}
      />
    </div>
  );
};

export default Reports;
