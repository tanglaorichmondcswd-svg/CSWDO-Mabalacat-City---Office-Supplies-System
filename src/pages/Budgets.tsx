import React, { useState, useEffect } from 'react';
import { Wallet, Plus, ChevronRight, Calendar, Target, MapPin, Package, Search, DollarSign, Edit2, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import ConfirmModal from '../components/ConfirmModal';
import { budgetService } from '../services/budgetService';
import { userService } from '../services/userService';
import { Budget, SubBudget, User as UserProfile } from '../types';
import { format } from 'date-fns';
import { motion, AnimatePresence } from 'motion/react';
import { auth } from '../lib/firebase';

const Budgets: React.FC = () => {
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [selectedBudget, setSelectedBudget] = useState<Budget | null>(null);
  const [subBudgets, setSubBudgets] = useState<SubBudget[]>([]);
  const [loading, setLoading] = useState(true);
  const [showBudgetModal, setShowBudgetModal] = useState(false);
  const [showSubModal, setShowSubModal] = useState(false);
  const [editingBudget, setEditingBudget] = useState<Budget | null>(null);
  const [editingSub, setEditingSub] = useState<SubBudget | null>(null);
  const [currentUserProfile, setCurrentUserProfile] = useState<UserProfile | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ isOpen: boolean; type: 'mother' | 'sub'; id: string; name: string }>({
    isOpen: false,
    type: 'mother',
    id: '',
    name: ''
  });

  // New Budget State
  const [newBudget, setNewBudget] = useState({
    name: '',
    description: '',
    totalAmount: 0,
    date: format(new Date(), 'yyyy-MM-dd')
  });

  // New SubBudget State
  const [newSub, setNewSub] = useState({
    name: '',
    description: '',
    totalAmount: 0,
    targetDate: format(new Date(), 'yyyy-MM-dd'),
    venue: '',
    packs: 0
  });

  useEffect(() => {
    loadBudgets();
  }, []);

  const loadBudgets = async () => {
    try {
      setLoading(true);
      const data = await budgetService.getBudgets();
      
      if (auth.currentUser) {
        const profile = await userService.getUser(auth.currentUser.uid);
        setCurrentUserProfile(profile || null);
      }

      setBudgets(data || []);
    } catch (err) {
      console.error('Failed to load budgets:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectBudget = async (budget: Budget) => {
    setSelectedBudget(budget);
    const subs = await budgetService.getSubBudgets(budget.id);
    setSubBudgets(subs || []);
  };

  const handleCreateBudget = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth.currentUser) return;
    try {
      await budgetService.createBudget({
        ...newBudget,
        createdBy: auth.currentUser.uid
      });
      toast.success('Budget created successfully');
      setShowBudgetModal(false);
      loadBudgets();
      setNewBudget({ name: '', description: '', totalAmount: 0, date: format(new Date(), 'yyyy-MM-dd') });
    } catch (err: any) {
      console.error('Failed to create budget:', err);
      toast.error(err.message || 'Failed to create budget');
    }
  };

  const handleCreateSub = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBudget || !auth.currentUser) return;
    try {
      await budgetService.createSubBudget(selectedBudget.id, {
        ...newSub,
        createdBy: auth.currentUser.uid
      });
      toast.success('Program created successfully');
      setShowSubModal(false);
      handleSelectBudget(selectedBudget);
      setNewSub({ name: '', description: '', totalAmount: 0, targetDate: format(new Date(), 'yyyy-MM-dd'), venue: '', packs: 0 });
    } catch (err: any) {
      console.error('Failed to create sub-budget:', err);
      toast.error(err.message || 'Failed to create sub-budget');
    }
  };

  const handleUpdateBudget = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingBudget) return;
    try {
      await budgetService.updateBudget(editingBudget.id, editingBudget);
      toast.success('Budget updated successfully');
      setEditingBudget(null);
      loadBudgets();
      if (selectedBudget?.id === editingBudget.id) {
        setSelectedBudget(editingBudget as Budget);
      }
    } catch (err: any) {
      toast.error('Failed to update budget');
    }
  };

  const handleDeleteBudget = async (id: string) => {
    try {
      await budgetService.deleteBudget(id);
      toast.success('Budget deleted');
      if (selectedBudget?.id === id) setSelectedBudget(null);
      loadBudgets();
    } catch (err) {
      toast.error('Failed to delete budget');
    }
  };

  const handleUpdateSub = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSub || !selectedBudget) return;
    try {
      await budgetService.updateSubBudget(selectedBudget.id, editingSub.id, editingSub);
      toast.success('Program updated successfully');
      setEditingSub(null);
      handleSelectBudget(selectedBudget);
    } catch (err: any) {
      toast.error('Failed to update program');
    }
  };

  const handleDeleteSub = async (subId: string) => {
    if (!selectedBudget) return;
    try {
      await budgetService.deleteSubBudget(selectedBudget.id, subId);
      toast.success('Program deleted');
      handleSelectBudget(selectedBudget);
    } catch (err) {
      toast.error('Failed to delete program');
    }
  };

  const isAdmin = currentUserProfile?.role === 'Admin' || 
                  currentUserProfile?.role === 'System Admin' ||
                  auth.currentUser?.email === 'tanglaorichmond.cswd@gmail.com';

  return (
    <div className="grid grid-cols-1 gap-10 lg:grid-cols-12 font-sans">
      {/* Left Panel: Mother Budgets */}
      <div className="lg:col-span-4 space-y-6">
        <div className="flex items-center justify-between bg-white p-6 py-4 rounded-3xl border border-slate-100 shadow-sm">
          <h2 className="text-sm font-extrabold tracking-[0.2em] text-slate-400 uppercase">Budgets</h2>
          <button
            onClick={() => setShowBudgetModal(true)}
            className="group rounded-xl bg-brand-primary p-2 text-white hover:bg-slate-800 transition-all shadow-lg shadow-slate-200"
          >
            <Plus size={20} className="transition-transform group-hover:rotate-90" />
          </button>
        </div>
        
        <div className="space-y-4">
          {budgets.map((b) => (
            <motion.div
              key={b.id}
              whileHover={{ x: 6 }}
              className={`group relative cursor-pointer rounded-[2rem] border-2 p-6 transition-all shadow-xl ${
                selectedBudget?.id === b.id 
                  ? 'border-brand-accent bg-white shadow-brand-accent/10 ring-4 ring-brand-accent/5' 
                  : 'border-white bg-white hover:border-slate-100 shadow-slate-200/40'
              }`}
            >
              <div 
                className="absolute right-4 top-4 hidden group-hover:flex gap-1"
                onClick={(e) => e.stopPropagation()}
              >
                {isAdmin && (
                  <>
                    <button 
                      onClick={() => setEditingBudget(b)}
                      className="p-2 text-brand-primary hover:bg-slate-100 rounded-xl transition-all"
                    >
                      <Edit2 size={14} />
                    </button>
                    <button 
                      onClick={() => setDeleteConfirm({ isOpen: true, type: 'mother', id: b.id, name: b.name })}
                      className="p-2 text-rose-500 hover:bg-rose-50 rounded-xl transition-all"
                    >
                      <Trash2 size={14} />
                    </button>
                  </>
                )}
              </div>
              <div onClick={() => handleSelectBudget(b)}>
                <div className="flex items-start justify-between">
                  <div className="flex-1 pr-6">
                    <h3 className={`font-display font-black uppercase tracking-tight text-lg leading-tight ${selectedBudget?.id === b.id ? 'text-brand-accent' : 'text-slate-900 group-hover:text-brand-accent'}`}>
                      {b.name}
                    </h3>
                    <p className="mt-2 text-[10px] font-extrabold text-slate-400 uppercase tracking-widest leading-relaxed line-clamp-1 italic">{b.description}</p>
                  </div>
                  <div className={`p-2 rounded-xl border transition-all ${selectedBudget?.id === b.id ? 'bg-brand-accent border-brand-accent text-white' : 'bg-slate-50 border-slate-100 text-slate-300'}`}>
                    <ChevronRight size={18} />
                  </div>
                </div>
                <div className="mt-6 flex items-center justify-between border-t border-slate-50 pt-4">
                  <span className={`text-sm font-display font-black ${selectedBudget?.id === b.id ? 'text-brand-accent' : 'text-slate-500'}`}>
                    ₱{b.totalAmount.toLocaleString()}
                  </span>
                  <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-50 border border-slate-100">
                    <Calendar size={10} className="text-slate-400" />
                    <span className="text-[9px] text-slate-400 font-black uppercase tracking-tighter">
                      {format(new Date(b.date), 'MMM yyyy')}
                    </span>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
          {budgets.length === 0 && !loading && (
            <div className="py-16 text-center text-slate-300 font-medium italic border-2 border-dashed border-slate-100 rounded-[2rem]">
              No budgets found.
            </div>
          )}
        </div>
      </div>

      {/* Right Panel: Selected Budget Detail & Sub Budgets */}
      <div className="lg:col-span-8 space-y-10">
        {selectedBudget ? (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            key={selectedBudget.id}
            className="space-y-10"
          >
            {/* Header / Summary */}
            <div className="rounded-[2.5rem] border border-slate-100 bg-white p-10 shadow-2xl shadow-slate-200/50 relative overflow-hidden">
              <div className="absolute top-0 right-0 p-12 opacity-[0.03] pointer-events-none">
                <Wallet size={200} />
              </div>
              <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.25em] text-brand-accent mb-2">
                    <div className="h-1 w-8 bg-brand-accent rounded-full" />
                    Budget Details
                  </div>
                  <h1 className="text-4xl font-display font-black text-slate-900 tracking-tighter uppercase leading-none">{selectedBudget.name}</h1>
                  <p className="mt-6 text-slate-400 font-medium leading-relaxed max-w-xl text-sm italic">{selectedBudget.description}</p>
                </div>
                <div className="bg-slate-50 p-6 sm:p-8 rounded-3xl border border-slate-100 shrink-0 text-center md:text-right">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">TOTAL BUDGET</p>
                  <p className="text-2xl sm:text-3xl font-display font-black text-brand-accent leading-none select-none">₱{selectedBudget.totalAmount.toLocaleString()}</p>
                  <div className="mt-3 flex items-center justify-center md:justify-end gap-2 text-[10px] font-black text-slate-400 uppercase">
                    <Calendar size={12} className="text-brand-accent" />
                    {format(new Date(selectedBudget.date), 'MMMM dd, yyyy')}
                  </div>
                </div>
              </div>
            </div>

            {/* Sub Budgets List */}
            <div className="space-y-6">
              <div className="flex items-center justify-between bg-slate-900 px-8 py-5 rounded-3xl shadow-xl shadow-slate-200">
                <div className="flex items-center gap-3 text-white">
                  <Target size={20} className="text-brand-accent" />
                  <h2 className="text-sm font-black uppercase tracking-[0.2em]">Sub-Programs / Programs</h2>
                </div>
                <button
                  onClick={() => setShowSubModal(true)}
                  className="flex items-center gap-2 rounded-xl bg-white/10 hover:bg-white text-white hover:text-slate-900 px-5 py-2.5 text-[10px] font-black uppercase tracking-widest transition-all border border-white/20 hover:border-white shadow-lg"
                >
                  <Plus size={16} />
                  New Program
                </button>
              </div>

              <div className="grid gap-6 sm:grid-cols-2">
                {subBudgets.map((sub) => (
                  <div key={sub.id} className="group relative rounded-[2rem] border-2 border-slate-50 bg-white p-8 shadow-xl shadow-slate-200/30 hover:border-brand-accent/20 hover:shadow-brand-accent/5 transition-all outline outline-0 hover:outline-4 outline-brand-accent/5">
                    <div className="absolute right-4 top-4 hidden group-hover:flex gap-1">
                      {isAdmin && (
                        <>
                          <button 
                            onClick={() => setEditingSub(sub)}
                            className="p-2 text-brand-primary hover:bg-slate-50 rounded-xl transition-all bg-white shadow-sm border border-slate-100"
                          >
                            <Edit2 size={14} />
                          </button>
                          <button 
                            onClick={() => setDeleteConfirm({ isOpen: true, type: 'sub', id: sub.id, name: sub.name })}
                            className="p-2 text-rose-500 hover:bg-rose-50 rounded-xl transition-all bg-white shadow-sm border border-slate-100"
                          >
                            <Trash2 size={14} />
                          </button>
                        </>
                      )}
                    </div>
                    <div className="flex items-start justify-between gap-4">
                      <h4 className="font-display font-black text-slate-800 uppercase tracking-tight text-lg flex-1 leading-tight">{sub.name}</h4>
                      <span className="shrink-0 rounded-xl bg-emerald-50 px-3 py-1.5 text-[10px] font-black text-emerald-600 uppercase tracking-widest border border-emerald-100">
                        ₱{sub.totalAmount.toLocaleString()}
                      </span>
                    </div>
                    <p className="mt-4 text-xs font-medium text-slate-400 leading-relaxed italic line-clamp-3">{sub.description}</p>
                    
                    <div className="mt-8 grid grid-cols-2 gap-4 border-t border-slate-50 pt-6">
                      <div className="flex items-center gap-2 text-[10px] font-black text-slate-500 uppercase tracking-[0.1em]">
                        <div className="w-6 h-6 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-center text-brand-accent shadow-sm">
                          <Calendar size={12} />
                        </div>
                        {format(new Date(sub.targetDate), 'MMM dd')}
                      </div>
                      <div className="flex items-center gap-2 text-[10px] font-black text-slate-500 uppercase tracking-[0.1em]">
                        <div className="w-6 h-6 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-center text-brand-accent shadow-sm">
                          <MapPin size={12} />
                        </div>
                        <span className="truncate">{sub.venue || 'UNASSIGNED'}</span>
                      </div>
                      <div className="col-span-2 flex items-center gap-2 text-[10px] font-black text-slate-500 uppercase tracking-[0.1em]">
                        <div className="w-6 h-6 rounded-lg bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 shadow-sm">
                          <Package size={12} />
                        </div>
                        {sub.packs || 0} packs
                      </div>
                    </div>
                  </div>
                ))}
                {subBudgets.length === 0 && (
                  <div className="sm:col-span-2 rounded-[2.5rem] border-4 border-dashed border-slate-100 p-16 text-center text-slate-300 font-bold uppercase tracking-widest text-sm italic">
                    No programs found for this budget.
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        ) : (
          <div className="flex h-full min-h-[600px] items-center justify-center rounded-[3rem] border-4 border-dashed border-slate-100 bg-white p-12 text-center shadow-inner">
            <div className="max-w-md space-y-6">
              <div className="mx-auto mb-8 flex h-32 w-32 items-center justify-center rounded-[2.5rem] bg-slate-900 text-brand-accent shadow-2xl shadow-slate-200 animate-pulse">
                <Wallet size={64} />
              </div>
              <h3 className="text-3xl font-display font-black text-slate-900 uppercase tracking-tighter">Select a Budget</h3>
              <p className="text-slate-400 font-medium uppercase tracking-[0.15em] text-xs leading-loose italic">Choose a parent budget from the list to view its sub-programs and allocation details.</p>
            </div>
          </div>
        )}
      </div>

      {/* New Budget Modal */}
      <AnimatePresence>
        {showBudgetModal && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-6">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowBudgetModal(false)} className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" />
            <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 30 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 30 }}
                className="relative w-full max-w-xl rounded-[2.5rem] bg-white p-10 shadow-2xl shadow-slate-900/10"
            >
              <div className="mb-0">
                  <h3 className="text-2xl font-display font-extrabold text-slate-900 uppercase tracking-tight">
                    New <span className="text-brand-accent">Budget</span>
                  </h3>
                  <p className="text-sm font-medium text-slate-400 mt-1 uppercase tracking-widest italic">Create a new parent budget for financial tracking.</p>
              </div>

              <form onSubmit={handleCreateBudget} className="space-y-6 mt-8">
                <div className="space-y-2">
                  <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-[0.2em] ml-1">Budget Name</label>
                  <input required value={newBudget.name} onChange={(e) => setNewBudget({ ...newBudget, name: e.target.value })} className="w-full rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3.5 text-sm font-bold text-slate-900 focus:border-brand-accent/30 focus:bg-white focus:outline-none focus:ring-4 focus:ring-brand-accent/5 transition-all shadow-inner uppercase" placeholder="e.g. FY 2026 GENERAL FUND" />
                </div>
                
                <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2">
                        <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-[0.2em] ml-1">Total Amount (PHP)</label>
                        <div className="relative">
                            <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-accent" size={16} />
                            <input type="number" required value={newBudget.totalAmount} onChange={(e) => setNewBudget({ ...newBudget, totalAmount: parseFloat(e.target.value) || 0 })} className="w-full rounded-2xl border border-slate-100 bg-slate-50 pl-10 pr-4 py-3.5 text-sm font-black text-slate-900 focus:border-brand-accent/30 focus:bg-white focus:outline-none transition-all shadow-inner" />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-[0.2em] ml-1">Date</label>
                        <input type="date" required value={newBudget.date} onChange={(e) => setNewBudget({ ...newBudget, date: e.target.value })} className="w-full rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3.5 text-sm font-bold text-slate-900 focus:border-brand-accent/30 focus:bg-white focus:outline-none transition-all shadow-inner" />
                    </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-[0.2em] ml-1">Description</label>
                  <textarea required value={newBudget.description} onChange={(e) => setNewBudget({ ...newBudget, description: e.target.value })} className="w-full rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3.5 text-sm font-medium text-slate-900 focus:border-brand-accent/30 focus:bg-white focus:outline-none transition-all shadow-inner italic" rows={3} placeholder="Define secondary objectives and resource origins..." />
                </div>

                <div className="flex justify-end gap-3 pt-6 border-t border-slate-50">
                  <button type="button" onClick={() => setShowBudgetModal(false)} className="rounded-2xl px-6 py-4 text-xs font-extrabold uppercase tracking-[0.2em] text-slate-400 hover:bg-slate-50 hover:text-slate-600 transition-all">Cancel</button>
                  <button type="submit" className="rounded-2xl bg-brand-primary px-10 py-4 text-xs font-extrabold uppercase tracking-[0.2em] text-white shadow-xl shadow-slate-200 hover:bg-slate-800 hover:-translate-y-0.5 transition-all">Save Budget</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Edit Budget Modal - Same styling but different title/action */}
      <AnimatePresence>
        {editingBudget && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-6">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setEditingBudget(null)} className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" />
            <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 30 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 30 }}
                className="relative w-full max-w-xl rounded-[2.5rem] bg-white p-10 shadow-2xl shadow-slate-900/10"
            >
              <div className="mb-0">
                  <h3 className="text-2xl font-display font-extrabold text-brand-primary uppercase tracking-tight">
                    Edit <span className="text-brand-accent">Budget</span>
                  </h3>
                  <p className="text-sm font-medium text-slate-400 mt-1 uppercase tracking-widest italic">Update parent budget details.</p>
              </div>

              <form onSubmit={handleUpdateBudget} className="space-y-6 mt-8">
                <div className="space-y-2">
                  <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-[0.2em] ml-1">Budget Name</label>
                  <input required value={editingBudget.name} onChange={(e) => setEditingBudget({ ...editingBudget, name: e.target.value })} className="w-full rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3.5 text-sm font-bold text-slate-900 focus:border-brand-accent/30 focus:bg-white focus:outline-none transition-all shadow-inner uppercase" />
                </div>
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-[0.2em] ml-1">Total Amount (PHP)</label>
                    <div className="relative">
                        <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-accent" size={16} />
                        <input type="number" required value={editingBudget.totalAmount} onChange={(e) => setEditingBudget({ ...editingBudget, totalAmount: parseFloat(e.target.value) || 0 })} className="w-full rounded-2xl border border-slate-100 bg-slate-50 pl-10 pr-4 py-3.5 text-sm font-black text-slate-900 focus:border-brand-accent/30 focus:bg-white focus:outline-none transition-all shadow-inner" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-[0.2em] ml-1">Date</label>
                    <input type="date" required value={editingBudget.date} onChange={(e) => setEditingBudget({ ...editingBudget, date: e.target.value })} className="w-full rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3.5 text-sm font-bold text-slate-900 focus:border-brand-accent/30 focus:bg-white focus:outline-none transition-all shadow-inner" />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-[0.2em] ml-1">Description</label>
                  <textarea required value={editingBudget.description} onChange={(e) => setEditingBudget({ ...editingBudget, description: e.target.value })} className="w-full rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3.5 text-sm font-medium text-slate-900 focus:border-brand-accent/30 focus:bg-white focus:outline-none transition-all shadow-inner italic" rows={3} />
                </div>
                <div className="flex justify-end gap-3 pt-6 border-t border-slate-50">
                  <button type="button" onClick={() => setEditingBudget(null)} className="rounded-2xl px-6 py-4 text-xs font-extrabold uppercase tracking-[0.2em] text-slate-400 hover:bg-slate-50 transition-all">Cancel</button>
                  <button type="submit" className="rounded-2xl bg-brand-primary px-10 py-4 text-xs font-extrabold uppercase tracking-[0.2em] text-white shadow-xl shadow-slate-200 hover:bg-slate-800 hover:-translate-y-0.5 transition-all">Save Changes</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* New SubBudget Modal */}
      <AnimatePresence>
        {showSubModal && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-6">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowSubModal(false)} className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" />
            <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 30 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 30 }}
                className="relative w-full max-w-xl rounded-[2.5rem] bg-white p-10 shadow-2xl shadow-slate-900/10"
            >
                <div className="mb-0">
                    <h3 className="text-2xl font-display font-extrabold text-slate-900 uppercase tracking-tight">
                        New <span className="text-brand-accent">Program</span>
                    </h3>
                    <p className="text-[10px] font-black text-brand-primary mt-1 uppercase tracking-[0.2em] flex items-center gap-2 italic">
                        <Target size={12} />
                        Sub-budget of {selectedBudget?.name}
                    </p>
                </div>

                <form onSubmit={handleCreateSub} className="space-y-6 mt-8">
                    <div className="space-y-2">
                        <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-[0.2em] ml-1">Program Name</label>
                        <input required value={newSub.name} onChange={(e) => setNewSub({ ...newSub, name: e.target.value })} className="w-full rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3.5 text-sm font-bold text-slate-900 focus:border-brand-accent/30 focus:bg-white focus:outline-none transition-all shadow-inner uppercase" placeholder="e.g. OPERATION RELIEF REPLENISHMENT" />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-[0.2em] ml-1">Amount (PHP)</label>
                            <input type="number" required value={newSub.totalAmount} onChange={(e) => setNewSub({ ...newSub, totalAmount: parseFloat(e.target.value) || 0 })} className="w-full rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3.5 text-sm font-black text-slate-900 focus:border-brand-accent/30 focus:bg-white focus:outline-none transition-all shadow-inner" />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-[0.2em] ml-1">Date</label>
                            <input type="date" required value={newSub.targetDate} onChange={(e) => setNewSub({ ...newSub, targetDate: e.target.value })} className="w-full rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3.5 text-sm font-bold text-slate-900 focus:border-brand-accent/30 focus:bg-white focus:outline-none transition-all shadow-inner" />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-[0.2em] ml-1">Venue</label>
                            <input value={newSub.venue} onChange={(e) => setNewSub({ ...newSub, venue: e.target.value })} className="w-full rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3.5 text-sm font-bold text-slate-900 focus:border-brand-accent/30 focus:bg-white focus:outline-none transition-all shadow-inner uppercase" placeholder="Enter location" />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-[0.2em] ml-1">Number of Packs</label>
                            <input type="number" value={newSub.packs} onChange={(e) => setNewSub({ ...newSub, packs: parseInt(e.target.value) || 0 })} className="w-full rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3.5 text-sm font-black text-slate-900 focus:border-brand-accent/30 focus:bg-white focus:outline-none transition-all shadow-inner" />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-[0.2em] ml-1">Description</label>
                        <textarea required value={newSub.description} onChange={(e) => setNewSub({ ...newSub, description: e.target.value })} className="w-full rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3.5 text-sm font-medium text-slate-900 focus:border-brand-accent/30 focus:bg-white focus:outline-none transition-all shadow-inner italic" rows={3} />
                    </div>

                    <div className="flex justify-end gap-3 pt-6 border-t border-slate-50">
                        <button type="button" onClick={() => setShowSubModal(false)} className="rounded-2xl px-6 py-4 text-xs font-extrabold uppercase tracking-[0.2em] text-slate-400 hover:bg-slate-50 transition-all">Cancel</button>
                        <button type="submit" className="rounded-2xl bg-brand-primary px-10 py-4 text-xs font-extrabold uppercase tracking-[0.2em] text-white shadow-xl shadow-slate-200 hover:bg-slate-800 hover:-translate-y-0.5 transition-all">Save Program</button>
                    </div>
                </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Edit SubBudget Modal - Unified High-Fidelity Style */}
      <AnimatePresence>
        {editingSub && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-6">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setEditingSub(null)} className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" />
            <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 30 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 30 }}
                className="relative w-full max-w-xl rounded-[2.5rem] bg-white p-10 shadow-2xl shadow-slate-900/10"
            >
                <div className="mb-0">
                    <h3 className="text-2xl font-display font-extrabold text-brand-primary uppercase tracking-tight">
                        Edit <span className="text-brand-accent">Program</span>
                    </h3>
                    <p className="text-[10px] font-black text-slate-400 mt-1 uppercase tracking-[0.2em] flex items-center gap-2 italic">
                        Update sub-program details.
                    </p>
                </div>

                <form onSubmit={handleUpdateSub} className="space-y-6 mt-8">
                    <div className="space-y-2">
                        <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-[0.2em] ml-1">Program Name</label>
                        <input required value={editingSub.name} onChange={(e) => setEditingSub({ ...editingSub, name: e.target.value })} className="w-full rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3.5 text-sm font-bold text-slate-900 focus:border-brand-accent/30 focus:bg-white focus:outline-none transition-all shadow-inner uppercase" />
                    </div>
                    <div className="grid grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-[0.2em] ml-1">Amount (PHP)</label>
                            <input type="number" required value={editingSub.totalAmount} onChange={(e) => setEditingSub({ ...editingSub, totalAmount: parseFloat(e.target.value) || 0 })} className="w-full rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3.5 text-sm font-black text-slate-900 focus:border-brand-accent/30 focus:bg-white focus:outline-none transition-all shadow-inner" />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-[0.2em] ml-1">Date</label>
                            <input type="date" required value={editingSub.targetDate} onChange={(e) => setEditingSub({ ...editingSub, targetDate: e.target.value })} className="w-full rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3.5 text-sm font-bold text-slate-900 focus:border-brand-accent/30 focus:bg-white focus:outline-none transition-all shadow-inner" />
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-[0.2em] ml-1">Venue</label>
                            <input value={editingSub.venue} onChange={(e) => setEditingSub({ ...editingSub, venue: e.target.value })} className="w-full rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3.5 text-sm font-bold text-slate-900 focus:border-brand-accent/30 focus:bg-white focus:outline-none transition-all shadow-inner uppercase" />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-[0.2em] ml-1">Number of Packs</label>
                            <input type="number" value={editingSub.packs} onChange={(e) => setEditingSub({ ...editingSub, packs: parseInt(e.target.value) || 0 })} className="w-full rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3.5 text-sm font-black text-slate-900 focus:border-brand-accent/30 focus:bg-white focus:outline-none transition-all shadow-inner" />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-[0.2em] ml-1">Description</label>
                        <textarea required value={editingSub.description} onChange={(e) => setEditingSub({ ...editingSub, description: e.target.value })} className="w-full rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3.5 text-sm font-medium text-slate-900 focus:border-brand-accent/30 focus:bg-white focus:outline-none transition-all shadow-inner italic" rows={3} />
                    </div>
                    <div className="flex justify-end gap-3 pt-6 border-t border-slate-50">
                        <button type="button" onClick={() => setEditingSub(null)} className="rounded-2xl px-6 py-4 text-xs font-extrabold uppercase tracking-[0.2em] text-slate-400 hover:bg-slate-50 transition-all">Cancel</button>
                        <button type="submit" className="rounded-2xl bg-brand-primary px-10 py-4 text-xs font-extrabold uppercase tracking-[0.2em] text-white shadow-xl shadow-slate-200 hover:bg-slate-800 hover:-translate-y-0.5 transition-all">Save Changes</button>
                    </div>
                </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <ConfirmModal
        isOpen={deleteConfirm.isOpen}
        title={`Delete ${deleteConfirm.type === 'mother' ? 'Budget' : 'Program'}`}
        message={deleteConfirm.type === 'mother' 
          ? `Delete mother budget "${deleteConfirm.name}"? This will NOT delete sub-programs but they will be orphaned.` 
          : `Are you sure you want to delete program "${deleteConfirm.name}"?`}
        confirmLabel="Delete"
        variant="danger"
        onConfirm={() => {
          if (deleteConfirm.type === 'mother') handleDeleteBudget(deleteConfirm.id);
          else handleDeleteSub(deleteConfirm.id);
          setDeleteConfirm({ ...deleteConfirm, isOpen: false, id: '', name: '' });
        }}
        onCancel={() => setDeleteConfirm({ ...deleteConfirm, isOpen: false, id: '', name: '' })}
      />
    </div>
  );
};

export default Budgets;
