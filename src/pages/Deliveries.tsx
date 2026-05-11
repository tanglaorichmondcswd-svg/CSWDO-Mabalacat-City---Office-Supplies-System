import React, { useState, useEffect } from 'react';
import { Truck, Plus, Package, Calendar, User, Search, Download, Trash2, Printer, FileSpreadsheet, DownloadCloud } from 'lucide-react';
import { toast } from 'sonner';
import ConfirmModal from '../components/ConfirmModal';
import ExportModal from '../components/ExportModal';
import { inventoryService } from '../services/inventoryService';
import { userService } from '../services/userService';
import { Delivery, Item, User as UserProfile } from '../types';
import { format } from 'date-fns';
import { motion, AnimatePresence } from 'motion/react';
import { auth } from '../lib/firebase';
import { exportToExcel, printTable } from '../lib/exportUtils';

const Deliveries: React.FC = () => {
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [exportModal, setExportModal] = useState(false);
  const [currentUserProfile, setCurrentUserProfile] = useState<UserProfile | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ isOpen: boolean; delivery: Delivery | null }>({
    isOpen: false,
    delivery: null
  });
  
  // New Delivery State
  const [deliveryDetails, setDeliveryDetails] = useState({
    dateDelivered: format(new Date(), 'yyyy-MM-dd'),
    orNumber: '',
    receivedBy: ''
  });
  const [receivedBySuggestions, setReceivedBySuggestions] = useState<string[]>([]);
  
  const [deliveryItems, setDeliveryItems] = useState([
    { itemId: '', category: '', description: '', uom: '', qty: 0, qtyPerUom: '' }
  ]);
  const [searchTerms, setSearchTerms] = useState<string[]>(['']);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [dels, its] = await Promise.all([
        inventoryService.getDeliveries(),
        inventoryService.getItems()
      ]);
      
      if (auth.currentUser) {
        const profile = await userService.getUser(auth.currentUser.uid);
        setCurrentUserProfile(profile || null);
      }

      setDeliveries(dels || []);
      setItems(its || []);
      
      // Extract unique receivedBy names
      const uniqueNames = Array.from(new Set(
        dels.filter(d => d.receivedBy).map(d => d.receivedBy!)
      ));
      setReceivedBySuggestions(uniqueNames);
      
    } catch (err) {
      console.error('Failed to load data:', err);
    } finally {
      setLoading(false);
    }
  };

  const isAdmin = currentUserProfile?.role === 'Admin' || 
                  currentUserProfile?.role === 'System Admin' ||
                  auth.currentUser?.email === 'tanglaorichmond.cswd@gmail.com';

  const handleSelectItem = (index: number, itemId: string) => {
    const item = items.find(i => i.itemId === itemId);
    const newItems = [...deliveryItems];
    if (item) {
      newItems[index] = {
        ...newItems[index],
        itemId: item.itemId,
        category: item.category,
        description: item.description,
        uom: item.uom,
        qtyPerUom: item.qtyPerUom || ''
      };
      const newSearchTerms = [...searchTerms];
      newSearchTerms[index] = `${item.itemId} - ${item.description}`;
      setSearchTerms(newSearchTerms);
    } else {
      newItems[index] = { ...newItems[index], itemId };
    }
    setDeliveryItems(newItems);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth.currentUser) return;
    
    // Filter out rows without itemId or zero/negative qty
    const validItems = deliveryItems.filter(di => di.itemId && di.qty > 0);
    if (validItems.length === 0) {
      toast.error('Please add at least one valid item with quantity > 0');
      return;
    }
    
    try {
      await Promise.all(validItems.map(di => 
        inventoryService.addDelivery({
          ...di,
          ...deliveryDetails
        })
      ));
      toast.success('Delivery recorded successfully');
      setShowModal(false);
      loadData();
      setDeliveryDetails({
        dateDelivered: format(new Date(), 'yyyy-MM-dd'), orNumber: '', receivedBy: ''
      });
      setDeliveryItems([{ itemId: '', category: '', description: '', uom: '', qty: 0 }]);
    } catch (err: any) {
      console.error('Failed to add delivery:', err);
      let message = 'Failed to save delivery';
      try {
        const errorDetail = JSON.parse(err.message);
        message = `Error: ${errorDetail.error}`;
      } catch {
        message = err.message || 'Failed to save delivery';
      }
      toast.error(message);
    }
  };

  const handleDelete = async (del: Delivery) => {
    try {
      await inventoryService.deleteDelivery(del.id, del.itemId, del.qty);
      toast.success('Delivery record deleted');
      loadData();
    } catch (err) {
      toast.error('Failed to delete delivery');
    }
  };

  const handleExportExcel = (startDate: string, endDate: string) => {
    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    const dataForExport = deliveries
      .filter(del => {
        const date = new Date(del.dateDelivered);
        return date >= start && date <= end;
      })
      .map(del => ({
        'Date Delivered': format(new Date(del.dateDelivered), 'yyyy-MM-dd'),
        'Item ID': del.itemId,
        'Description': del.description,
        'Category': del.category,
        'UOM': del.uom,
        'Quantity': del.qty,
        'OR Number': del.orNumber || '',
        'Received By': del.receivedBy || ''
      }));
    exportToExcel(dataForExport, `Deliveries_${startDate}_to_${endDate}`);
    setExportModal({ ...exportModal, isOpen: false });
  };

  const handlePrint = (startDate: string, endDate: string) => {
    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    const columns = ['Date', 'Item ID', 'Description', 'Category', 'Qty', 'OR Number', 'Received By'];
    const data = deliveries
      .filter(del => {
        const date = new Date(del.dateDelivered);
        return date >= start && date <= end;
      })
      .map(del => [
        format(new Date(del.dateDelivered), 'MMM dd, yyyy'),
        del.itemId,
        del.description,
        del.category,
        del.qty,
        del.orNumber || '-',
        del.receivedBy || '-'
      ]);
    printTable(`Deliveries Report (${startDate} to ${endDate})`, columns, data);
    setExportModal({ ...exportModal, isOpen: false });
  };

  return (
    <div className="space-y-8 font-sans">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-xl shadow-slate-200/40">
        <div>
          <h1 className="text-2xl sm:text-3xl font-display font-extrabold tracking-tight text-slate-900 uppercase">
            Delivery <span className="text-brand-accent">Management</span>
          </h1>
          <p className="mt-1 text-[10px] sm:text-sm font-medium text-slate-400 uppercase tracking-widest flex items-center gap-2">
            <Truck size={14} className="text-brand-accent" />
            Track incoming supplies and office stock.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => setExportModal(true)}
            className="group flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-600 shadow-sm transition-all hover:bg-slate-50 hover:text-slate-900 active:scale-95"
            title="Export to Excel or Print PDF"
          >
            <DownloadCloud size={18} />
            <span className="hidden sm:inline">Export</span>
          </button>
          <button
            onClick={() => setShowModal(true)}
            className="group flex items-center gap-2 rounded-2xl bg-brand-primary px-6 py-3.5 text-sm font-bold text-white shadow-xl shadow-slate-200 transition-all hover:bg-slate-800 hover:-translate-y-0.5 active:scale-95"
          >
            <Plus size={18} className="transition-transform group-hover:rotate-90" />
            New Delivery
          </button>
        </div>
      </div>

      <div className="rounded-[2.5rem] border border-slate-100 bg-white shadow-2xl shadow-slate-200/50 overflow-hidden">
        {loading ? (
          <div className="flex h-96 items-center justify-center">
            <div className="h-10 w-10 animate-spin rounded-full border-[3px] border-brand-accent border-t-transparent shadow-lg shadow-blue-100" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-[10px] font-extrabold uppercase tracking-[0.2em] text-slate-400 border-b border-slate-100">
                <tr>
                  <th className="px-8 py-5">Date</th>
                  <th className="px-8 py-5">Item ID</th>
                  <th className="px-8 py-5">Description</th>
                  <th className="px-8 py-5">Qty</th>
                  <th className="px-8 py-5">OR Number</th>
                  <th className="px-8 py-5">Received By</th>
                  <th className="px-8 py-5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 italic-serif-headers">
                {deliveries.map((del) => (
                  <tr key={del.id} className="group hover:bg-slate-50/80 transition-all">
                    <td className="px-8 py-5 whitespace-nowrap text-slate-400 font-medium">
                      {format(new Date(del.dateDelivered), 'MMM dd, yyyy')}
                    </td>
                    <td className="px-8 py-5 whitespace-nowrap font-mono font-bold text-brand-accent tracking-tighter">
                      {del.itemId}
                    </td>
                    <td className="px-8 py-5">
                      <p className="font-display font-bold text-slate-800 tracking-tight leading-none uppercase">{del.description}</p>
                      <p className="mt-1 text-[10px] text-slate-400 font-extrabold uppercase tracking-widest">{del.category} • {del.uom}</p>
                    </td>
                    <td className="px-8 py-5 font-display font-black text-slate-900 text-lg">{del.qty}</td>
                    <td className="px-8 py-5 font-mono text-[11px] font-bold text-slate-400 bg-slate-50/50">{del.orNumber || '---'}</td>
                    <td className="px-8 py-5 text-slate-900 font-bold uppercase text-xs tracking-tight">{del.receivedBy}</td>
                    <td className="px-8 py-5 text-right">
                      {isAdmin && (
                        <button 
                          onClick={() => setDeleteConfirm({ isOpen: true, delivery: del })}
                          className="opacity-0 group-hover:opacity-100 p-2.5 text-rose-500 hover:bg-rose-50 rounded-xl transition-all shadow-sm bg-white border border-slate-50"
                          title="Delete"
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
                {deliveries.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-8 py-24 text-center text-slate-300 font-medium italic">
                      No delivery records found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* New Delivery Modal */}
      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowModal(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-md"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 30 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 30 }}
              className="relative w-full max-w-xl rounded-[2.5rem] bg-white p-10 shadow-2xl shadow-slate-900/20"
            >
              <div className="mb-0">
                <h3 className="text-2xl font-display font-extrabold text-slate-900 uppercase tracking-tight">
                  New <span className="text-brand-accent">Delivery</span>
                </h3>
                <p className="text-sm font-medium text-slate-400 mt-1 uppercase tracking-widest">Enter incoming stock and delivery details.</p>
              </div>

              <form onSubmit={handleCreate} className="space-y-6 mt-8">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-[0.2em] ml-1">Delivery Items</label>
                  </div>
                  <div className="overflow-x-auto border border-slate-100 rounded-2xl bg-white shadow-sm">
                    <table className="w-full text-left">
                      <thead className="bg-slate-50 text-[9px] font-extrabold text-slate-400 uppercase tracking-widest border-b border-slate-100">
                        <tr>
                          <th className="px-3 py-3 w-[45%]">Item Selection</th>
                          <th className="px-3 py-3 w-[15%]">UOM</th>
                          <th className="px-3 py-3 w-[15%]">Qty Per UOM</th>
                          <th className="px-3 py-3 w-[15%]">Qty</th>
                          <th className="px-2 py-3 w-[10%] text-center"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {deliveryItems.map((di, index) => (
                          <tr key={index} className="bg-white group">
                            <td className="p-2">
                              <div className="relative">
                                <input
                                  type="text"
                                  list={`items-${index}`}
                                  placeholder="Search/Select Item..."
                                  className="w-full rounded-xl border border-transparent bg-slate-50/50 px-3 py-2.5 text-xs font-bold text-slate-800 focus:bg-white focus:border-brand-accent/30 focus:ring-2 focus:ring-brand-accent/10 outline-none transition-all"
                                  value={searchTerms[index]}
                                  onChange={(e) => {
                                    const newSearchTerms = [...searchTerms];
                                    newSearchTerms[index] = e.target.value;
                                    setSearchTerms(newSearchTerms);
                                    
                                    const selectedItem = items.find(i => `${i.itemId} - ${i.description} (${i.uom}${i.qtyPerUom ? ' / ' + i.qtyPerUom : ''})` === e.target.value);
                                    if (selectedItem) {
                                      handleSelectItem(index, selectedItem.itemId);
                                    } else {
                                      const newItems = [...deliveryItems];
                                      newItems[index].itemId = '';
                                      newItems[index].uom = '';
                                      setDeliveryItems(newItems);
                                    }
                                  }}
                                />
                                <datalist id={`items-${index}`}>
                                  {items.map(item => (
                                    <option key={item.id} value={`${item.itemId} - ${item.description} (${item.uom}${item.qtyPerUom ? ' / ' + item.qtyPerUom : ''})`} />
                                  ))}
                                </datalist>
                              </div>
                              {di.itemId && (
                                <div className="px-2 pt-1.5 text-[8.5px] font-black text-brand-accent/60 tracking-widest uppercase">
                                  {di.category}
                                </div>
                              )}
                            </td>
                            <td className="p-2 align-top">
                              <div className="w-full rounded-xl border border-transparent bg-slate-50 px-3 py-2 text-xs font-bold text-slate-600">
                                {di.uom || '-'}
                              </div>
                            </td>
                            <td className="p-2 align-top">
                              <div className="w-full rounded-xl border border-transparent bg-slate-50 px-3 py-2 text-xs font-bold text-slate-600">
                                {di.qtyPerUom || '-'}
                              </div>
                            </td>
                            <td className="p-2 align-top">
                              <input
                                type="number"
                                required
                                min={1}
                                value={di.qty || ''}
                                onChange={(e) => {
                                  const newItems = [...deliveryItems];
                                  newItems[index].qty = parseInt(e.target.value) || 0;
                                  setDeliveryItems(newItems);
                                }}
                                className="w-full rounded-xl border border-transparent bg-slate-50/50 px-3 py-2.5 text-xs font-black text-slate-800 focus:bg-white focus:border-brand-accent/30 focus:ring-2 focus:ring-brand-accent/10 outline-none transition-all"
                                placeholder="0"
                              />
                            </td>
                            <td className="p-2 align-top text-center pt-3">
                              <button 
                                type="button" 
                                onClick={() => setDeliveryItems(deliveryItems.filter((_, i) => i !== index))}
                                className={`p-1.5 rounded-lg transition-colors ${deliveryItems.length > 1 ? 'text-rose-400 hover:bg-rose-50 hover:text-rose-600' : 'text-slate-200 cursor-not-allowed'}`}
                                disabled={deliveryItems.length <= 1}
                              >
                                <Trash2 size={14} />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  
                  <button
                    type="button"
                    onClick={() => {
                      setDeliveryItems([...deliveryItems, { itemId: '', category: '', description: '', uom: '', qty: 0 }]);
                      setSearchTerms([...searchTerms, '']);
                    }}
                    className="w-full py-2.5 border-2 border-dashed border-slate-200 rounded-2xl text-slate-400 font-bold text-[10px] uppercase tracking-widest hover:bg-slate-50 hover:border-slate-300 hover:text-slate-600 transition-colors flex items-center justify-center gap-2"
                  >
                    <Plus size={14} /> Add Another Item
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-6 pt-4 border-t border-slate-100">
                  <div className="space-y-2">
                    <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-[0.2em] ml-1">OR Number</label>
                    <input
                      value={deliveryDetails.orNumber}
                      onChange={(e) => setDeliveryDetails({ ...deliveryDetails, orNumber: e.target.value })}
                      className="w-full rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3.5 text-sm font-mono font-bold text-slate-500 focus:border-brand-accent/30 focus:bg-white focus:outline-none transition-all shadow-inner"
                      placeholder="UN-OR-XXXX"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-[0.2em] ml-1">Received By</label>
                    <input
                      required
                      list="receivedBySuggestions"
                      value={deliveryDetails.receivedBy}
                      onChange={(e) => setDeliveryDetails({ ...deliveryDetails, receivedBy: e.target.value })}
                      className="w-full rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3.5 text-sm font-bold text-slate-900 focus:border-brand-accent/30 focus:bg-white focus:outline-none transition-all shadow-inner"
                      placeholder="Enter full verification name"
                    />
                    <datalist id="receivedBySuggestions">
                      {receivedBySuggestions.map(name => (
                        <option key={name} value={name} />
                      ))}
                    </datalist>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-[0.2em] ml-1">Date</label>
                    <input
                      type="date"
                      required
                      value={deliveryDetails.dateDelivered}
                      onChange={(e) => setDeliveryDetails({ ...deliveryDetails, dateDelivered: e.target.value })}
                      className="w-full rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3.5 text-sm font-bold text-slate-900 focus:border-brand-accent/30 focus:bg-white focus:outline-none transition-all shadow-inner"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-6 border-t border-slate-50">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="rounded-2xl px-6 py-4 text-xs font-extrabold uppercase tracking-[0.2em] text-slate-400 hover:bg-slate-50 hover:text-slate-600 transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="rounded-2xl bg-brand-primary px-10 py-4 text-xs font-extrabold uppercase tracking-[0.2em] text-white shadow-xl shadow-slate-200 hover:bg-slate-800 hover:-translate-y-0.5 transition-all"
                  >
                    Save Delivery
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <ConfirmModal
        isOpen={deleteConfirm.isOpen}
        title="Delete Delivery"
        message="Are you sure you want to delete this delivery record? This will subtract the corresponding quantity from inventory. This action cannot be undone."
        confirmLabel="Delete Delivery"
        variant="danger"
        onConfirm={() => {
          if (deleteConfirm.delivery) handleDelete(deleteConfirm.delivery);
          setDeleteConfirm({ isOpen: false, delivery: null });
        }}
        onCancel={() => setDeleteConfirm({ isOpen: false, delivery: null })}
      />

      <ExportModal
        isOpen={exportModal}
        onClose={() => setExportModal(false)}
        onExportExcel={handleExportExcel}
        onPrint={handlePrint}
        title="Export Deliveries"
      />
    </div>
  );
};

export default Deliveries;
