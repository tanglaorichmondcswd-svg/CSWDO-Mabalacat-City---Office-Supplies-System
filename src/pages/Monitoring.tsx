import React, { useState, useEffect } from 'react';
import { History, Search, Download, Database, DownloadCloud } from 'lucide-react';
import { Item, InventoryMovement } from '../types';
import { motion } from 'motion/react';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import ExportModal from '../components/ExportModal';
import { exportToExcel, printTable } from '../lib/exportUtils';

const Monitoring: React.FC = () => {
  const [items, setItems] = useState<Item[]>([]);
  const [movements, setMovements] = useState<InventoryMovement[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [exportModal, setExportModal] = useState(false);

  const getExportData = (startDate: string, endDate: string) => {
    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    return items
      .filter(item => {
        const desc = item.description || '';
        const id = item.itemId || '';
        const cat = item.category || '';
        return desc.toLowerCase().includes(searchTerm.toLowerCase()) ||
               id.toLowerCase().includes(searchTerm.toLowerCase()) ||
               cat.toLowerCase().includes(searchTerm.toLowerCase());
      })
      .map((item, index) => {
        const safeItemId = String(item.itemId).trim();
        const itemMovements = movements.filter(m => {
          if (String(m.itemId).trim() !== safeItemId) return false;
          let date: Date;
          if (m.date && typeof (m.date as any).toDate === 'function') {
            date = (m.date as any).toDate();
          } else if (m.date && typeof m.date === 'object' && 'seconds' in m.date) {
            date = new Date((m.date as any).seconds * 1000);
          } else if (m.date) {
            date = new Date(m.date as any);
          } else {
            date = new Date(0);
          }
          return date >= start && date <= end;
        });

        const newDelivery = Math.max(0, itemMovements
          .filter(m => m.type === 'IN')
          .reduce((sum, m) => sum + (Number(m.qty) || 0), 0));
        const outMovements = Math.max(0, itemMovements
          .filter(m => m.type === 'OUT')
          .reduce((sum, m) => sum + (Number(m.qty) || 0), 0));

        const totalOnHand = item.qty;
        const stockLevel = item.stockLevel || 0;

        return {
          '#': index + 1,
          'Item ID': item.itemId,
          'Category': item.category,
          'Description': item.description,
          'UOM': item.uom,
          'Qty/UOM': item.qtyPerUom || '--',
          'Price': `₱${item.amount?.toLocaleString() || '0'}`,
          'Beg. Inv.': item.beginningInventory || '0',
          'IN': newDelivery || 0,
          'OUT': outMovements || 0,
          'STOCK': totalOnHand,
          'REORDER': stockLevel
        };
      });
  };

  const handleExportExcel = (startDate: string, endDate: string) => {
    const dataForExport = getExportData(startDate, endDate);
    exportToExcel(dataForExport, `Monitoring_${startDate}_to_${endDate}`);
    setExportModal(false);
  };

  const handlePrint = (startDate: string, endDate: string) => {
    const columns = ['#', 'Item ID', 'Category', 'Description', 'UOM', 'Qty/UOM', 'Price', 'Beg. Inv.', 'IN', 'OUT', 'STOCK', 'REORDER'];
    const data = getExportData(startDate, endDate).map(item => [
      item['#'],
      item['Item ID'],
      item['Category'],
      item['Description'],
      item['UOM'],
      item['Qty/UOM'],
      item['Price'],
      item['Beg. Inv.'],
      item['IN'],
      item['OUT'],
      item['STOCK'],
      item['REORDER']
    ]);
    printTable(`Inventory Monitoring Report (${startDate} to ${endDate})`, columns, data);
    setExportModal(false);
  };

  useEffect(() => {
    let unsubscribeItems: () => void;
    let unsubscribeMovements: () => void;

    const setupListeners = async () => {
      try {
        setLoading(true);
        
        const itemsQuery = query(collection(db, 'items'), orderBy('itemId', 'asc'));
        unsubscribeItems = onSnapshot(itemsQuery, (snapshot) => {
          setItems(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Item)));
        }, (error) => {
          console.error("Items listener failed:", error);
        });

        const movementsQuery = query(collection(db, 'inventory_movements'), orderBy('date', 'desc'));
        unsubscribeMovements = onSnapshot(movementsQuery, (snapshot) => {
          setMovements(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as InventoryMovement)));
          setLoading(false);
        }, (error) => {
          console.error("Movements listener failed:", error);
          setLoading(false);
        });
      } catch (err) {
        console.error("Setup listeners failed:", err);
        setLoading(false);
      }
    };

    setupListeners();
    return () => {
      unsubscribeItems?.();
      unsubscribeMovements?.();
    };
  }, []);

  const filteredItems = items.filter(item => {
    const desc = item.description || '';
    const id = item.itemId || '';
    const cat = item.category || '';
    return desc.toLowerCase().includes(searchTerm.toLowerCase()) ||
           id.toLowerCase().includes(searchTerm.toLowerCase()) ||
           cat.toLowerCase().includes(searchTerm.toLowerCase());
  });

  return (
    <div className="space-y-8 font-sans">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-xl shadow-slate-200/40">
        <div>
          <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.25em] text-brand-accent mb-2">
            <div className="h-1 w-8 bg-brand-accent rounded-full" />
            Live Intelligence
          </div>
          <h1 className="text-3xl font-display font-black text-slate-900 tracking-tighter uppercase leading-none">
            Inventory <span className="text-brand-accent">Monitoring</span>
          </h1>
          <p className="mt-4 text-slate-400 font-medium leading-relaxed max-w-xl text-sm italic">
            Visual cluster of active item nodes and stock availability thresholding.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setExportModal(true)}
            className="flex items-center gap-2 rounded-2xl bg-slate-900 px-6 py-3.5 text-xs font-black uppercase tracking-widest text-white shadow-xl shadow-slate-200 transition-all hover:bg-brand-primary active:scale-95"
          >
            <DownloadCloud size={18} />
            Export Data
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
          <input
            type="text"
            placeholder="Search items by name, ID, or category..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-xl border border-slate-100 bg-slate-50 px-12 py-3 text-sm font-medium focus:border-brand-accent/30 focus:bg-white focus:outline-none transition-all"
          />
        </div>
        <div className="flex items-center gap-4 px-4 border-l border-slate-100 hidden md:flex">
          <div className="flex flex-col">
            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none">Total Nodes</span>
            <span className="text-lg font-display font-black text-slate-900 leading-none mt-1">{items.length}</span>
          </div>
          <div className="h-8 w-px bg-slate-100" />
          <div className="flex flex-col">
            <span className="text-[9px] font-black text-rose-400 uppercase tracking-widest leading-none">Low Stock</span>
            <span className="text-lg font-display font-black text-rose-600 leading-none mt-1">
              {items.filter(i => i.qty <= (i.stockLevel || 0)).length}
            </span>
          </div>
        </div>
      </div>

      <div className="rounded-[2.5rem] border border-slate-100 bg-white shadow-2xl shadow-slate-200/50 overflow-hidden">
        {loading ? (
          <div className="flex h-96 flex-col items-center justify-center gap-4">
            <div className="h-12 w-12 animate-spin rounded-[1rem] border-4 border-brand-accent border-t-transparent shadow-lg" />
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest animate-pulse">Syncing logistics data...</p>
          </div>
        ) : (
          <div className="overflow-x-auto custom-scrollbar no-scrollbar scroll-smooth">
            <table className="w-full text-left text-[11px] border-collapse">
              <thead className="bg-[#0f172a] text-white font-extrabold uppercase tracking-tight">
                <tr className="divide-x divide-slate-800">
                  <th className="px-3 py-5 text-center w-12 text-slate-500 font-mono">ID</th>
                  <th className="px-4 py-5 whitespace-nowrap">Item ID</th>
                  <th className="px-4 py-5 font-bold">Category</th>
                  <th className="px-4 py-5">Description</th>
                  <th className="px-3 py-5 text-center">UOM</th>
                  <th className="px-3 py-5 text-center bg-slate-800/30 font-medium">Qty/UOM</th>
                  <th className="px-4 py-5 text-right font-medium">Price</th>
                  <th className="px-3 py-5 text-center opacity-60">Beg. Inv.</th>
                  <th className="px-3 py-5 text-center bg-emerald-900/40 text-emerald-400 font-black">IN</th>
                  <th className="px-3 py-5 text-center bg-rose-900/40 text-rose-400 font-black">OUT</th>
                  <th className="px-4 py-5 text-center bg-brand-accent text-white font-black text-xs">STOCK</th>
                  <th className="px-3 py-5 text-center opacity-60">REORDER</th>
                  <th className="px-6 py-5 text-right min-w-[280px]">AVAILABILITY</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredItems.map((item, index) => {
                  const safeItemId = String(item.itemId).trim();
                  const itemMovements = movements.filter(m => String(m.itemId).trim() === safeItemId);
                  const newDelivery = Math.max(0, itemMovements
                    .filter(m => m.type === 'IN')
                    .reduce((sum, m) => sum + (Number(m.qty) || 0), 0));
                  const outMovements = Math.max(0, itemMovements
                    .filter(m => m.type === 'OUT')
                    .reduce((sum, m) => sum + (Number(m.qty) || 0), 0));
                  
                  const totalOnHand = item.qty;
                  const stockLevel = item.stockLevel || 0;
                  const percent = stockLevel > 0 ? (totalOnHand / stockLevel) * 100 : 0;
                  const cappedPercent = Math.min(100, Math.max(0, percent));

                  return (
                    <tr key={item.id} className="group hover:bg-slate-50/80 transition-all font-bold divide-x divide-slate-50">
                      <td className="px-3 py-4 text-center text-slate-300 font-mono text-[10px]">{index + 1}</td>
                      <td className="px-4 py-4 font-mono text-slate-600 tracking-tighter">{item.itemId}</td>
                      <td className="px-4 py-4"><span className="text-[10px] bg-slate-50 border border-slate-100 px-2 py-1 rounded-md text-slate-500 uppercase tracking-widest">{item.category}</span></td>
                      <td className="px-4 py-4 uppercase text-slate-900 font-display tracking-tight leading-none text-[10px]">{item.description}</td>
                      <td className="px-3 py-4 text-center text-slate-400 font-medium lowercase tracking-tighter italic">{item.uom}</td>
                      <td className="px-3 py-4 text-center text-slate-500 font-medium bg-slate-50/50">{item.qtyPerUom || '--'}</td>
                      <td className="px-4 py-4 text-right font-display text-slate-900">₱{item.amount?.toLocaleString() || '0'}</td>
                      <td className="px-3 py-4 text-center font-medium text-slate-400">{item.beginningInventory || '0'}</td>
                      <td className="px-3 py-4 text-center text-emerald-600 font-black bg-emerald-50/20">+{newDelivery || 0}</td>
                      <td className="px-3 py-4 text-center text-rose-600 font-black bg-rose-50/20">-{outMovements || 0}</td>
                      <td className={`px-4 py-4 text-center font-black text-sm transition-colors ${
                        totalOnHand <= stockLevel ? 'bg-rose-500 text-white' : 'bg-blue-50/50 text-brand-accent group-hover:bg-brand-accent group-hover:text-white'
                      }`}>{totalOnHand}</td>
                      <td className="px-3 py-4 text-center font-medium text-slate-300">{stockLevel}</td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center gap-4">
                          <div className="flex-1 h-4 bg-slate-100 rounded-full relative overflow-hidden shadow-inner p-1">
                            <motion.div 
                              initial={{ width: 0 }}
                              animate={{ width: `${cappedPercent}%` }}
                              className={`h-full rounded-full transition-all duration-1000 ${
                                cappedPercent < 20 ? 'bg-gradient-to-r from-rose-600 to-rose-400 shadow-[0_0_10px_rgba(225,29,72,0.4)]' : 
                                cappedPercent < 50 ? 'bg-gradient-to-r from-amber-500 to-amber-400 shadow-[0_0_10px_rgba(245,158,11,0.4)]' : 
                                'bg-gradient-to-r from-brand-accent to-blue-400 shadow-[0_0_10px_rgba(59,130,246,0.4)]'
                              }`}
                            />
                          </div>
                          <span className={`text-[12px] font-display font-black min-w-[42px] ${cappedPercent < 20 ? 'text-rose-600 animate-pulse' : 'text-slate-900'}`}>{Math.round(percent)}%</span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <ExportModal
        isOpen={exportModal}
        onClose={() => setExportModal(false)}
        onExportExcel={handleExportExcel}
        onPrint={handlePrint}
        title="Export Monitoring Data"
      />
    </div>
  );
};

export default Monitoring;
