import React, { useState, useEffect } from 'react';
import { Package, Plus, Search, Filter, History, Database, ArrowUpRight, ArrowDownLeft, Edit2, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import ConfirmModal from '../components/ConfirmModal';
import { inventoryService } from '../services/inventoryService';
import { userService } from '../services/userService';
import { Item, InventoryMovement, User as UserProfile } from '../types';
import { format } from 'date-fns';
import { motion, AnimatePresence } from 'motion/react';
import { collection, query, orderBy, onSnapshot, limit } from 'firebase/firestore';
import { db, auth } from '../lib/firebase';

const Inventory: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'database' | 'movements'>('database');
  const [items, setItems] = useState<Item[]>([]);
  const [movements, setMovements] = useState<InventoryMovement[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewItemModal, setShowNewItemModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingItem, setEditingItem] = useState<Item | null>(null);
  const [currentUserProfile, setCurrentUserProfile] = useState<UserProfile | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ isOpen: boolean; id: string; itemId: string }>({ 
    isOpen: false, id: '', itemId: '' 
  });

  // New Item State
  const [newItem, setNewItem] = useState({
    itemId: '',
    category: '',
    description: '',
    uom: '',
    qty: 0,
    qtyPerUom: '',
    amount: 0,
    beginningInventory: 0,
    stockLevel: 10
  });

  const generateItemId = () => {
    // Extract the numbers from existing CSWDO-ITEM-X IDs to find the max
    const existingIds = items
      .map(i => {
        const match = i.itemId.match(/CSWDO-ITEM-(\d+)/);
        return match ? parseInt(match[1]) : 0;
      })
      .filter(n => !isNaN(n));
    
    const maxId = existingIds.length > 0 ? Math.max(...existingIds) : 0;
    return `CSWDO-ITEM-${maxId + 1}`;
  };

  useEffect(() => {
    if (showNewItemModal) {
      setNewItem(prev => ({ ...prev, itemId: generateItemId() }));
    }
  }, [showNewItemModal, items.length]);

  useEffect(() => {
    let unsubscribeItems: () => void;
    let unsubscribeMovements: () => void;

    const setupListeners = async () => {
      try {
        setLoading(true);
        
        if (auth.currentUser) {
          const profile = await userService.getUser(auth.currentUser.uid);
          setCurrentUserProfile(profile || null);
        }
        
        const itemsQuery = query(collection(db, 'items'), orderBy('itemId', 'asc'));
        unsubscribeItems = onSnapshot(itemsQuery, (snapshot) => {
          setItems(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Item)));
        }, (error) => {
          console.error("Items listener failed:", error);
        });

        const movementsQuery = query(collection(db, 'inventory_movements'), orderBy('date', 'desc'), limit(1000));
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

  const handleCreateItem = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await inventoryService.createItem(newItem);
      toast.success('Item created successfully');
      setShowNewItemModal(false);
      setNewItem({ 
        itemId: '', 
        category: '', 
        description: '', 
        uom: '', 
        qty: 0,
        qtyPerUom: '',
        amount: 0,
        beginningInventory: 0,
        stockLevel: 10
      });
    } catch (err) {
      toast.error('Failed to create item');
    }
  };

  const isAdmin = currentUserProfile?.role === 'Admin' || 
                  currentUserProfile?.role === 'System Admin' ||
                  auth.currentUser?.email === 'tanglaorichmond.cswd@gmail.com';

  const handleUpdateItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;
    try {
      await inventoryService.updateItem(editingItem.id, editingItem);
      toast.success('Item updated successfully');
      setEditingItem(null);
    } catch (err) {
      toast.error('Failed to update item');
    }
  };

  const handleDeleteItem = async (id: string, itemId: string) => {
    try {
      await inventoryService.deleteItem(id);
      toast.success('Item deleted successfully');
      setDeleteConfirm({ isOpen: false, id: '', itemId: '' });
    } catch (err) {
      toast.error('Failed to delete item');
    }
  };

  const filteredItems = items.filter(item => 
    item.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.itemId.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-8 font-sans">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-xl shadow-slate-200/40">
        <div>
          <h1 className="text-2xl sm:text-3xl font-display font-extrabold tracking-tight text-slate-900 uppercase">
            Item List <span className="text-brand-accent">Management</span>
          </h1>
          <p className="mt-1 text-[10px] sm:text-sm font-medium text-slate-400 uppercase tracking-widest flex items-center gap-2">
            <Database size={14} className="text-brand-accent" />
            Track warehouse items and stock levels.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowNewItemModal(true)}
            className="group flex items-center gap-2 rounded-2xl bg-brand-primary px-6 py-3.5 text-sm font-bold text-white shadow-xl shadow-slate-200 transition-all hover:bg-slate-800 hover:-translate-y-0.5 active:scale-95"
          >
            <Plus size={18} className="transition-transform group-hover:rotate-90" />
            Add Item
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 bg-white p-2 rounded-[1.5rem] border border-slate-100 shadow-sm w-full overflow-x-auto no-scrollbar scroll-smooth">
        <div className="flex items-center gap-2 min-w-max">
          {[
            { id: 'database', label: 'Item List', icon: Database },
            { id: 'movements', label: 'Movements', icon: History },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 sm:px-6 py-2.5 sm:py-3 rounded-2xl text-[10px] sm:text-xs font-extrabold uppercase tracking-widest transition-all ${
                activeTab === tab.id 
                  ? 'bg-slate-900 text-white shadow-lg' 
                  : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'
              }`}
            >
              <tab.icon size={14} className="sm:w-4 sm:h-4" />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Filters */}
      {activeTab === 'database' && (
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
            <input
              type="text"
              placeholder="Search items by name, ID, or category..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-xl border border-slate-100 bg-slate-50 px-12 py-3 text-sm font-medium focus:border-brand-accent/30 focus:bg-white focus:outline-none focus:ring-4 focus:ring-brand-accent/5 transition-all"
            />
          </div>
          <button className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-3 text-xs font-extrabold uppercase tracking-widest text-slate-500 hover:bg-slate-50 hover:text-slate-900 transition-all">
            <Filter size={18} className="text-brand-accent" />
            Filter items
          </button>
        </div>
      )}

      {/* Content */}
      <div className="rounded-[2.5rem] border border-slate-100 bg-white shadow-2xl shadow-slate-200/50 overflow-hidden">
        {loading ? (
          <div className="flex h-96 items-center justify-center">
            <div className="h-10 w-10 animate-spin rounded-full border-[3px] border-brand-accent border-t-transparent shadow-lg shadow-blue-100" />
          </div>
        ) : activeTab === 'database' ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-[10px] font-extrabold uppercase tracking-[0.2em] text-slate-400 border-b border-slate-100">
                <tr>
                  <th className="px-8 py-5">Item ID</th>
                  <th className="px-8 py-5">Category</th>
                  <th className="px-8 py-5">Description</th>
                  <th className="px-8 py-5">UOM</th>
                  <th className="px-8 py-5 text-right">Stock</th>
                  <th className="px-8 py-5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filteredItems.map((item) => (
                  <tr key={item.id} className="group hover:bg-slate-50 transition-all duration-200">
                    <td className="px-8 py-5 font-mono font-bold text-brand-accent tracking-tighter">{item.itemId}</td>
                    <td className="px-8 py-5">
                      <span className="rounded-xl bg-white border border-slate-100 px-3 py-1.5 text-[10px] font-extrabold text-slate-500 uppercase tracking-widest shadow-sm">
                        {item.category}
                      </span>
                    </td>
                    <td className="px-8 py-5 font-display font-bold text-slate-800 tracking-tight">{item.description}</td>
                    <td className="px-8 py-5 text-slate-400 font-medium">{item.uom}</td>
                    <td className="px-8 py-5 text-right">
                      <span className={`text-base font-display font-extrabold ${item.qty < 5 ? 'text-rose-500 animate-pulse' : 'text-slate-900'}`}>
                        {item.qty}
                      </span>
                    </td>
                    <td className="px-8 py-5 text-right">
                      {isAdmin ? (
                        <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button 
                            onClick={() => setEditingItem(item)}
                            className="p-2.5 text-blue-600 hover:bg-blue-50 rounded-xl transition-colors shadow-sm bg-white border border-slate-50"
                          >
                            <Edit2 size={16} />
                          </button>
                          <button 
                            onClick={() => setDeleteConfirm({ isOpen: true, id: item.id, itemId: item.itemId })}
                            className="p-2.5 text-rose-500 hover:bg-rose-50 rounded-xl transition-colors shadow-sm bg-white border border-slate-50"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      ) : (
                        <span className="text-[10px] text-slate-300 font-bold uppercase tracking-widest italic">Restricted</span>
                      )}
                    </td>
                  </tr>
                ))}
                {filteredItems.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-8 py-20 text-center text-slate-400 font-medium italic">
                      No items found matching your search.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-[10px] font-extrabold uppercase tracking-[0.2em] text-slate-400 border-b border-slate-100">
                <tr>
                  <th className="px-8 py-5">Date</th>
                  <th className="px-8 py-5">Item ID</th>
                  <th className="px-8 py-5">Type</th>
                  <th className="px-8 py-5 text-right">Qty</th>
                  <th className="px-8 py-5">Reference / OR</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {movements.map((move) => (
                  <tr key={move.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-8 py-5 text-slate-400 font-medium">
                      {move.date?.toDate ? format(move.date.toDate(), 'MMM dd, HH:mm') : '---'}
                    </td>
                    <td className="px-8 py-5 font-display font-bold text-slate-800 tracking-tight">{move.itemId}</td>
                    <td className="px-8 py-5">
                      <span className={`inline-flex items-center gap-2 font-extrabold text-[10px] tracking-widest uppercase px-3 py-1 rounded-full ${
                        move.type === 'IN' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'
                      }`}>
                        {move.type === 'IN' ? <ArrowDownLeft size={14} /> : <ArrowUpRight size={14} />}
                        {move.type === 'IN' ? 'Restocked' : 'Allocated'}
                      </span>
                    </td>
                    <td className="px-8 py-5 text-right font-display font-extrabold text-lg">{move.qty}</td>
                    <td className="px-8 py-5 text-[10px] text-slate-300 font-mono italic tracking-tighter truncate max-w-[120px]">{move.referenceId}</td>
                  </tr>
                ))}
                {movements.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-8 py-20 text-center text-slate-300">
                      No recent inventory movements found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* New Item Modal */}
      <AnimatePresence>
        {showNewItemModal && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowNewItemModal(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-md"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 30 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 30 }}
              className="relative w-full max-w-xl rounded-[2.5rem] bg-white p-10 shadow-2xl shadow-slate-900/20"
            >
              <div className="mb-8">
                <h3 className="text-2xl font-display font-extrabold text-slate-900 uppercase tracking-tight">
                  Add <span className="text-brand-accent">New Item</span>
                </h3>
                <p className="text-sm font-medium text-slate-400 mt-1 uppercase tracking-widest">Enter item details to build your database.</p>
              </div>

              <form onSubmit={handleCreateItem} className="space-y-6">
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-[0.2em] ml-1">Item ID</label>
                    <input
                      required
                      value={newItem.itemId}
                      onChange={(e) => setNewItem({ ...newItem, itemId: e.target.value })}
                      className="w-full rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3.5 text-sm font-mono font-bold text-brand-accent focus:border-brand-accent/30 focus:bg-white focus:outline-none focus:ring-4 focus:ring-brand-accent/5 transition-all shadow-inner"
                      placeholder="e.g. CSWDO-ITEM-X"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-[0.2em] ml-1">Category</label>
                    <input
                      required
                      value={newItem.category}
                      onChange={(e) => setNewItem({ ...newItem, category: e.target.value })}
                      className="w-full rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3.5 text-sm font-bold text-slate-900 focus:border-brand-accent/30 focus:bg-white focus:outline-none focus:ring-4 focus:ring-brand-accent/5 transition-all shadow-inner"
                      placeholder="e.g. INFRASTRUCTURE"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-[0.2em] ml-1">Description</label>
                  <textarea
                    required
                    value={newItem.description}
                    onChange={(e) => setNewItem({ ...newItem, description: e.target.value })}
                    className="w-full rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3.5 text-sm font-bold text-slate-900 focus:border-brand-accent/30 focus:bg-white focus:outline-none focus:ring-4 focus:ring-brand-accent/5 transition-all shadow-inner"
                    placeholder="Provide technical description..."
                    rows={2}
                  />
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-[0.2em] ml-1">Unit of Measure</label>
                    <select
                      required
                      value={newItem.uom}
                      onChange={(e) => setNewItem({ ...newItem, uom: e.target.value })}
                      className="w-full rounded-xl border border-slate-100 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-900 focus:border-brand-accent/30 focus:bg-white focus:outline-none transition-all shadow-inner uppercase"
                    >
                      <option value="">Select UOM...</option>
                      <option value="Pieces">Pieces</option>
                      <option value="Boxes">Boxes</option>
                      <option value="Kg">Kg</option>
                      <option value="Liters">Liters</option>
                      <option value="Packs">Packs</option>
                      <option value="Rolls">Rolls</option>
                      <option value="Pairs">Pairs</option>
                      <option value="Sets">Sets</option>
                      <option value="Reams">Reams</option>
                      <option value="Cans">Cans</option>
                      <option value="Bottles">Bottles</option>
                      <option value="Units">Units</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-[0.2em] ml-1">Qty per UOM</label>
                    <input
                      value={newItem.qtyPerUom}
                      onChange={(e) => setNewItem({ ...newItem, qtyPerUom: e.target.value })}
                      className="w-full rounded-xl border border-slate-100 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-900 focus:border-brand-accent/30 focus:bg-white focus:outline-none transition-all shadow-inner"
                      placeholder="e.g. 10/BX"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-[0.2em] ml-1">Price</label>
                    <input
                      type="number"
                      value={newItem.amount}
                      onChange={(e) => setNewItem({ ...newItem, amount: parseFloat(e.target.value) || 0 })}
                      className="w-full rounded-xl border border-slate-100 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-900 focus:border-brand-accent/30 focus:bg-white focus:outline-none transition-all shadow-inner"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4 bg-slate-50 p-4 rounded-3xl border border-slate-100">
                  <div className="space-y-2">
                    <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-[0.2em] ml-1">Beg. Inventory</label>
                    <input
                      type="number"
                      value={newItem.beginningInventory}
                      onChange={(e) => setNewItem({ ...newItem, beginningInventory: parseInt(e.target.value) || 0 })}
                      className="w-full rounded-xl border border-white bg-white px-4 py-3 text-sm font-bold text-slate-900 focus:border-brand-accent/30 focus:outline-none transition-all shadow-sm"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-[0.2em] ml-1">Stock</label>
                    <input
                      type="number"
                      value={newItem.qty}
                      onChange={(e) => setNewItem({ ...newItem, qty: parseInt(e.target.value) || 0 })}
                      className="w-full rounded-xl border border-white bg-white px-4 py-3 text-sm font-bold text-slate-900 focus:border-brand-accent/30 focus:outline-none transition-all shadow-sm"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-[0.2em] ml-1">Stock Level Alert</label>
                    <input
                      type="number"
                      value={newItem.stockLevel}
                      onChange={(e) => setNewItem({ ...newItem, stockLevel: parseInt(e.target.value) || 0 })}
                      className="w-full rounded-xl border border-white bg-white px-4 py-3 text-sm font-bold text-rose-500 focus:border-rose-200 focus:outline-none transition-all shadow-sm"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-6 border-t border-slate-50">
                  <button
                    type="button"
                    onClick={() => setShowNewItemModal(false)}
                    className="rounded-2xl px-6 py-4 text-xs font-extrabold uppercase tracking-[0.2em] text-slate-400 hover:bg-slate-50 hover:text-slate-600 transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="rounded-2xl bg-brand-primary px-10 py-4 text-xs font-extrabold uppercase tracking-[0.2em] text-white shadow-xl shadow-slate-200 hover:bg-slate-800 hover:-translate-y-0.5 transition-all"
                  >
                    Add Item
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Edit Item Modal */}
      <AnimatePresence>
        {editingItem && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setEditingItem(null)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-md"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 30 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 30 }}
              className="relative w-full max-w-xl rounded-[2.5rem] bg-white p-10 shadow-2xl shadow-slate-900/20"
            >
              <div className="mb-8">
                <h3 className="text-2xl font-display font-extrabold text-slate-900 uppercase tracking-tight">
                  Edit <span className="text-brand-accent">Item</span>
                </h3>
                <p className="text-sm font-medium text-slate-400 mt-1 uppercase tracking-widest">Update inventory item details.</p>
              </div>

              <form onSubmit={handleUpdateItem} className="space-y-6">
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-[0.2em] ml-1">Item ID</label>
                    <div className="w-full rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3.5 text-sm font-mono font-bold text-slate-400 opacity-60">
                      {editingItem.itemId}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-[0.2em] ml-1">Category</label>
                    <input
                      required
                      value={editingItem.category}
                      onChange={(e) => setEditingItem({ ...editingItem, category: e.target.value })}
                      className="w-full rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3.5 text-sm font-bold text-slate-900 focus:border-brand-accent/30 focus:bg-white focus:outline-none focus:ring-4 focus:ring-brand-accent/5 transition-all shadow-inner"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-[0.2em] ml-1">Description</label>
                  <textarea
                    required
                    value={editingItem.description}
                    onChange={(e) => setEditingItem({ ...editingItem, description: e.target.value })}
                    className="w-full rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3.5 text-sm font-bold text-slate-900 focus:border-brand-accent/30 focus:bg-white focus:outline-none focus:ring-4 focus:ring-brand-accent/5 transition-all shadow-inner"
                    rows={2}
                  />
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-[0.2em] ml-1">UOM</label>
                    <select
                      required
                      value={editingItem.uom}
                      onChange={(e) => setEditingItem({ ...editingItem, uom: e.target.value })}
                      className="w-full rounded-xl border border-slate-100 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-900 focus:border-brand-accent/30 focus:bg-white focus:outline-none transition-all shadow-inner uppercase"
                    >
                      <option value="">Select UOM...</option>
                      <option value="Pieces">Pieces</option>
                      <option value="Boxes">Boxes</option>
                      <option value="Kg">Kg</option>
                      <option value="Liters">Liters</option>
                      <option value="Packs">Packs</option>
                      <option value="Rolls">Rolls</option>
                      <option value="Pairs">Pairs</option>
                      <option value="Sets">Sets</option>
                      <option value="Reams">Reams</option>
                      <option value="Cans">Cans</option>
                      <option value="Bottles">Bottles</option>
                      <option value="Units">Units</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-[0.2em] ml-1">Qty per UOM</label>
                    <input
                      value={editingItem.qtyPerUom}
                      onChange={(e) => setEditingItem({ ...editingItem, qtyPerUom: e.target.value })}
                      className="w-full rounded-xl border border-slate-100 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-900 focus:border-brand-accent/30 focus:bg-white focus:outline-none transition-all shadow-inner"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-[0.2em] ml-1">Price</label>
                    <input
                      type="number"
                      value={editingItem.amount}
                      onChange={(e) => setEditingItem({ ...editingItem, amount: parseFloat(e.target.value) || 0 })}
                      className="w-full rounded-xl border border-slate-100 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-900 focus:border-brand-accent/30 focus:bg-white focus:outline-none transition-all shadow-inner"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-6 bg-slate-900 p-6 rounded-3xl text-white shadow-2xl shadow-slate-900/30">
                  <div className="space-y-2">
                    <label className="text-[10px] font-extrabold text-slate-500 uppercase tracking-[0.2em]">Stock Alert Level</label>
                    <input
                      type="number"
                      value={editingItem.stockLevel}
                      onChange={(e) => setEditingItem({ ...editingItem, stockLevel: parseInt(e.target.value) || 0 })}
                      className="w-full rounded-xl border border-slate-800 bg-slate-800 px-4 py-3 text-sm font-black text-rose-400 focus:border-rose-400/30 focus:outline-none transition-all"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-extrabold text-brand-accent uppercase tracking-[0.2em]">Adjust Stock Quantity</label>
                    <input
                      type="number"
                      value={editingItem.qty}
                      onChange={(e) => setEditingItem({ ...editingItem, qty: parseInt(e.target.value) || 0 })}
                      className="w-full rounded-xl border border-brand-accent/20 bg-brand-accent/10 px-4 py-3 text-sm font-black text-brand-accent focus:border-brand-accent/50 focus:outline-none transition-all"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-6 border-t border-slate-50">
                  <button
                    type="button"
                    onClick={() => setEditingItem(null)}
                    className="rounded-2xl px-6 py-4 text-xs font-extrabold uppercase tracking-[0.2em] text-slate-400 hover:bg-slate-50 hover:text-slate-600 transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="rounded-2xl bg-brand-accent px-10 py-4 text-xs font-extrabold uppercase tracking-[0.2em] text-white shadow-xl shadow-blue-200 hover:bg-blue-600 hover:-translate-y-0.5 transition-all"
                  >
                    Save Changes
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <ConfirmModal
        isOpen={deleteConfirm.isOpen}
        title="Delete Item"
        message={`Are you sure you want to delete item ${deleteConfirm.itemId}? This will remove it from the database and cannot be undone.`}
        confirmLabel="Delete Item"
        variant="danger"
        onConfirm={() => handleDeleteItem(deleteConfirm.id, deleteConfirm.itemId)}
        onCancel={() => setDeleteConfirm({ ...deleteConfirm, isOpen: false })}
      />
    </div>
  );
};

export default Inventory;
