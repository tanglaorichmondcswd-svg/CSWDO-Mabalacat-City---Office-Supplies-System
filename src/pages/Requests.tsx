import React, { useState, useEffect } from 'react';
import { ClipboardList, Plus, Package, CheckCircle2, Truck, Calendar, Search, Building2, User, Trash2, Printer, FileSpreadsheet, DownloadCloud } from 'lucide-react';
import { toast } from 'sonner';
import ConfirmModal from '../components/ConfirmModal';
import PromptModal from '../components/PromptModal';
import ExportModal from '../components/ExportModal';
import { inventoryService } from '../services/inventoryService';
import { userService } from '../services/userService';
import { Item, Request as RequestType, User as UserProfile } from '../types';
import { format } from 'date-fns';
import { motion, AnimatePresence } from 'motion/react';
import { auth, db } from '../lib/firebase';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { exportToExcel, printTable } from '../lib/exportUtils';

const Requests: React.FC = () => {
  const [requests, setRequests] = useState<RequestType[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [exportModal, setExportModal] = useState(false);
  const [currentUserProfile, setCurrentUserProfile] = useState<UserProfile | null>(null);
  const [releaseState, setReleaseState] = useState<{ isOpen: boolean; request: RequestType | null }>({
    isOpen: false,
    request: null
  });
  const [deleteConfirm, setDeleteConfirm] = useState<{ isOpen: boolean; id: string }>({
    isOpen: false,
    id: ''
  });

  // New Request State
  const [requestDetails, setRequestDetails] = useState({
    dateRequested: format(new Date(), 'yyyy-MM-dd'),
    unitDepartment: '',
    requestedBy: ''
  });
  const [requestedBySuggestions, setRequestedBySuggestions] = useState<string[]>([]);
  const [unitDepartmentSuggestions, setUnitDepartmentSuggestions] = useState<string[]>([]);
  
  const [requestItems, setRequestItems] = useState([
    { itemId: '', category: '', description: '', uom: '', qty: 0, qtyPerUom: '' }
  ]);
  const [searchTerms, setSearchTerms] = useState<string[]>(['']);

  useEffect(() => {
    let unsubscribeRequests: () => void;
    let unsubscribeItems: () => void;

    const setupListeners = async () => {
      try {
        setLoading(true);
        
        if (auth.currentUser) {
          const profile = await userService.getUser(auth.currentUser.uid);
          setCurrentUserProfile(profile || null);
        }

        const requestsQuery = query(collection(db, 'requests'), orderBy('dateRequested', 'desc'));
        unsubscribeRequests = onSnapshot(requestsQuery, (snapshot) => {
          const reqs = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as RequestType));
          setRequests(reqs);
          
          // Extract unique requestedBy names
          const uniqueNames = Array.from(new Set(
            reqs.filter(r => r.requestedBy).map(r => r.requestedBy!)
          ));
          setRequestedBySuggestions(uniqueNames);
          
          // Extract unique unitDepartment names
          const uniqueDepts = Array.from(new Set(
            reqs.filter(r => r.unitDepartment).map(r => r.unitDepartment!)
          ));
          setUnitDepartmentSuggestions(uniqueDepts);
        }, (error) => {
          console.error("Requests listener failed:", error);
        });

        const itemsQuery = query(collection(db, 'items'), orderBy('itemId', 'asc'));
        unsubscribeItems = onSnapshot(itemsQuery, (snapshot) => {
          setItems(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Item)));
          setLoading(false);
        }, (error) => {
          console.error("Items listener failed:", error);
          setLoading(false);
        });
      } catch (err) {
        console.error("Setup listeners failed:", err);
        setLoading(false);
      }
    };

    setupListeners();
    return () => {
      unsubscribeRequests?.();
      unsubscribeItems?.();
    };
  }, []);

  const handleSelectItem = (index: number, itemId: string) => {
    const item = items.find(i => i.itemId === itemId);
    const newItems = [...requestItems];
    if (item) {
      newItems[index] = {
        ...newItems[index],
        itemId: item.itemId,
        category: item.category,
        description: item.description,
        uom: item.uom,
        qtyPerUom: item.qtyPerUom || ''
      };
    } else {
      newItems[index] = { ...newItems[index], itemId };
    }
    setRequestItems(newItems);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth.currentUser) return;
    
    const validItems = requestItems.filter(ri => ri.itemId && ri.qty > 0);
    if (validItems.length === 0) {
      toast.error('Please add at least one valid item with quantity > 0');
      return;
    }

    try {
      await Promise.all(validItems.map(ri => 
        inventoryService.createRequest({
          ...ri,
          ...requestDetails
        })
      ));
      toast.success('Request submitted successfully');
      setShowModal(false);
      setRequestDetails({
        dateRequested: format(new Date(), 'yyyy-MM-dd'), unitDepartment: '',
        requestedBy: ''
      });
      setRequestItems([{ itemId: '', category: '', description: '', uom: '', qty: 0 }]);
    } catch (err: any) {
      console.error('Failed to create request:', err);
      let message = 'Failed to create request';
      try {
        const errorDetail = JSON.parse(err.message);
        message = `Error: ${errorDetail.error}`;
      } catch {
        message = err.message || 'Failed to create request';
      }
      toast.error(message);
    }
  };

  const handleRelease = async (req: RequestType, receiverName: string) => {
    if (!receiverName.trim()) {
      toast.warning('Receiver name is required');
      return;
    }
    
    try {
      console.log('Attempting to release request:', req.id, 'for item:', req.itemId);
      await inventoryService.releaseRequest(req.id, req.itemId, req.qty, receiverName.trim());
      console.log('Release successful');
      toast.success(`Successfully released ${req.qty} units to ${receiverName}`);
    } catch (err: any) {
      console.error('Release failed:', err);
      let message = 'Failed to release item';
      try {
        const errorDetail = JSON.parse(err.message);
        message = `Permission Error: ${errorDetail.error}. 
        Please verify your account has Admin privileges. 
        Email: ${auth.currentUser?.email}`;
      } catch {
        message = err.message || 'Failed to release item';
      }
      toast.error(message);
    }
  };

  const handleDelete = async (requestId: string) => {
    try {
      await inventoryService.deleteRequest(requestId);
      toast.success('Request deleted successfully');
    } catch (err: any) {
      console.error('Delete failed:', err);
      let message = 'Failed to delete request';
      try {
        const errorDetail = JSON.parse(err.message);
        message = `Permission Error: ${errorDetail.error}. Status: ${errorDetail.operationType}`;
      } catch {
        message = err.message || 'Failed to delete request';
      }
      toast.error(message);
    }
  };

  const isAdmin = currentUserProfile?.role === 'Admin' || 
                 currentUserProfile?.role === 'System Admin' ||
                 auth.currentUser?.email === 'tanglaorichmond.cswd@gmail.com';

  const handleExportExcel = (startDate: string, endDate: string) => {
    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    const dataForExport = requests
      .filter(req => {
        const date = new Date(req.dateRequested);
        return date >= start && date <= end;
      })
      .map(req => ({
        'Status': req.status,
        'Date Requested': format(new Date(req.dateRequested), 'yyyy-MM-dd'),
        'Description': req.description,
        'Item ID': req.itemId,
        'Quantity': req.qty,
        'Requested By': req.requestedBy,
        'Received By': req.receivedBy || '',
        'Department': req.unitDepartment
      }));
    exportToExcel(dataForExport, `Requests_${startDate}_to_${endDate}`);
    setExportModal(false);
  };

  const handlePrint = (startDate: string, endDate: string) => {
    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    const columns = ['Status', 'Date', 'Description', 'Item', 'Qty', 'Requested By', 'Received By', 'Department'];
    const data = requests
      .filter(req => {
        const date = new Date(req.dateRequested);
        return date >= start && date <= end;
      })
      .map(req => [
        req.status,
        format(new Date(req.dateRequested), 'MMM dd, yyyy'),
        req.description,
        req.itemId,
        req.qty,
        req.requestedBy,
        req.receivedBy || '-',
        req.unitDepartment
      ]);
    printTable(`Requests Report (${startDate} to ${endDate})`, columns, data);
    setExportModal(false);
  };

  return (
    <div className="space-y-8 font-sans">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-xl shadow-slate-200/40">
        <div>
          <h1 className="text-2xl sm:text-3xl font-display font-extrabold tracking-tight text-slate-900 uppercase">
            Item <span className="text-brand-accent">Requests</span>
          </h1>
          <p className="mt-1 text-[10px] sm:text-sm font-medium text-slate-400 uppercase tracking-widest flex items-center gap-2">
            <ClipboardList size={14} className="text-brand-accent" />
            Manage and fulfill department item requests.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => setExportModal(true)}
            className="group flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-600 shadow-sm transition-all hover:bg-slate-50 hover:text-slate-900 active:scale-95"
            title="Export to Excel or Print"
          >
            <DownloadCloud size={18} />
            <span className="hidden sm:inline">Export</span>
          </button>
          <button
            onClick={() => setShowModal(true)}
            className="group flex items-center gap-2 rounded-2xl bg-brand-primary px-6 py-3.5 text-sm font-bold text-white shadow-xl shadow-slate-200 transition-all hover:bg-slate-800 hover:-translate-y-0.5 active:scale-95"
          >
            <Plus size={18} className="transition-transform group-hover:rotate-90" />
            New Request
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
                  <th className="px-8 py-5">Status</th>
                  <th className="px-8 py-5">Date Requested</th>
                  <th className="px-8 py-5">Items Requested</th>
                  <th className="px-8 py-5">Quantity</th>
                  <th className="px-8 py-5">Requested By</th>
                  <th className="px-8 py-5">Received By</th>
                  <th className="px-8 py-5">Department</th>
                  <th className="px-8 py-5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 italic-serif-headers">
                {requests.map((req) => (
                  <tr key={req.id} className="group hover:bg-slate-50/80 transition-all">
                    <td className="px-8 py-5 whitespace-nowrap">
                      <span className={`inline-flex items-center gap-2 rounded-xl px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-[0.15em] border ${
                        req.status === 'Released' 
                          ? 'bg-emerald-50 text-emerald-600 border-emerald-100 shadow-sm' 
                          : req.status === 'Approved' 
                          ? 'bg-blue-50 text-blue-700 border-blue-100 shadow-sm' 
                          : 'bg-amber-50 text-amber-700 border-amber-100 shadow-sm'
                      }`}>
                        {req.status === 'Released' && <CheckCircle2 size={12} />}
                        {req.status}
                      </span>
                    </td>
                    <td className="px-8 py-5 whitespace-nowrap text-slate-400 font-medium font-mono text-xs">
                      {format(new Date(req.dateRequested), 'MMM dd, yyyy')}
                    </td>
                    <td className="px-8 py-5">
                      <p className="font-display font-bold text-slate-800 tracking-tight leading-none uppercase">{req.description}</p>
                      <p className="mt-1 text-[10px] text-brand-accent font-extrabold uppercase tracking-widest opacity-60">{req.itemId}</p>
                    </td>
                    <td className="px-8 py-5 font-display font-black text-slate-900 text-lg">{req.qty}</td>
                    <td className="px-8 py-5 text-slate-900 font-bold uppercase text-[11px] tracking-tight">{req.requestedBy}</td>
                    <td className="px-8 py-5 text-slate-400 font-bold uppercase text-[10px] tracking-widest italic">{req.receivedBy || '---'}</td>
                    <td className="px-8 py-5">
                      <span className="px-3 py-1.5 rounded-lg bg-slate-100 text-slate-600 font-extrabold text-[10px] uppercase tracking-widest border border-slate-200">
                        {req.unitDepartment}
                      </span>
                    </td>
                    <td className="px-8 py-5 text-right">
                      <div className="flex items-center justify-end gap-3">
                        {isAdmin && req.status === 'Pending' && (
                          <button
                            onClick={() => setReleaseState({ isOpen: true, request: req })}
                            className="rounded-xl bg-brand-primary px-4 py-2 text-[10px] font-black uppercase tracking-widest text-white hover:bg-slate-800 shadow-lg shadow-slate-200"
                          >
                            Release Items
                          </button>
                        )}
                        {req.status === 'Released' && (
                          <span className="text-[10px] text-slate-300 uppercase font-mono font-bold tracking-tighter">
                            {req.releasedAt?.toDate ? format(req.releasedAt.toDate(), 'MM/dd HH:mm') : ''}
                          </span>
                        )}
                        {isAdmin && (
                          <button 
                            onClick={() => setDeleteConfirm({ isOpen: true, id: req.id })}
                            className="opacity-0 group-hover:opacity-100 p-2.5 text-rose-500 hover:bg-rose-50 rounded-xl transition-all shadow-sm bg-white border border-slate-50"
                            title="Delete"
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {requests.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-8 py-24 text-center text-slate-300 font-medium italic">
                      No inventory requests found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* New Request Modal */}
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
              <div className="mb-8">
                <h3 className="text-2xl font-display font-extrabold text-slate-900 uppercase tracking-tight">
                  New <span className="text-brand-accent">Request</span>
                </h3>
                <p className="text-sm font-medium text-slate-400 mt-1 uppercase tracking-widest">Fill out the form to request items from inventory.</p>
              </div>

              <form onSubmit={handleCreate} className="space-y-6">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-[0.2em] ml-1">Requested Items</label>
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
                        {requestItems.map((ri, index) => (
                          <tr key={index} className="bg-white group">
                            <td className="p-2">
                              <div className="relative">
                                <input
                                  type="text"
                                  list={`items-${index}`}
                                  placeholder="Search/Select Item..."
                                  className="w-full rounded-xl border border-transparent bg-slate-50/50 px-3 py-2.5 text-xs font-bold text-slate-800 focus:bg-white focus:border-brand-accent/30 focus:ring-2 focus:ring-brand-accent/10 outline-none transition-all"
                                  value={searchTerms[index] || ''}
                                  onChange={(e) => {
                                    const newSearchTerms = [...searchTerms];
                                    newSearchTerms[index] = e.target.value;
                                    setSearchTerms(newSearchTerms);
                                    
                                    const selectedItem = items.find(i => `${i.itemId} - ${i.description} (${i.uom}${i.qtyPerUom ? ' / ' + i.qtyPerUom : ''})` === e.target.value);
                                    if (selectedItem) {
                                      handleSelectItem(index, selectedItem.itemId);
                                    } else {
                                      const newItems = [...requestItems];
                                      newItems[index].itemId = '';
                                      newItems[index].uom = '';
                                      setRequestItems(newItems);
                                    }
                                  }}
                                />
                                <datalist id={`items-${index}`}>
                                  {items.map(item => (
                                    <option key={item.id} value={`${item.itemId} - ${item.description} (${item.uom}${item.qtyPerUom ? ' / ' + item.qtyPerUom : ''})`} />
                                  ))}
                                </datalist>
                              </div>
                              {ri.itemId && (
                                <div className="px-2 pt-1.5 text-[8.5px] font-black text-brand-accent/60 tracking-widest uppercase">
                                  {ri.category}
                                </div>
                              )}
                            </td>
                            <td className="p-2 align-top">
                              <div className="w-full rounded-xl border border-transparent bg-slate-50 px-3 py-2 text-xs font-bold text-slate-600">
                                {ri.uom || '-'}
                              </div>
                            </td>
                            <td className="p-2 align-top">
                              <div className="w-full rounded-xl border border-transparent bg-slate-50 px-3 py-2 text-xs font-bold text-slate-600">
                                {ri.qtyPerUom || '-'}
                              </div>
                            </td>
                            <td className="p-2 align-top">
                              <input
                                type="number"
                                required
                                min={1}
                                value={ri.qty || ''}
                                onChange={(e) => {
                                  const newItems = [...requestItems];
                                  newItems[index].qty = parseInt(e.target.value) || 0;
                                  setRequestItems(newItems);
                                }}
                                className="w-full rounded-xl border border-transparent bg-slate-50/50 px-3 py-2.5 text-xs font-black text-slate-800 focus:bg-white focus:border-brand-accent/30 focus:ring-2 focus:ring-brand-accent/10 outline-none transition-all uppercase"
                                placeholder="0"
                              />
                            </td>
                            <td className="p-2 align-top text-center pt-3">
                              <button 
                                type="button" 
                                onClick={() => setRequestItems(requestItems.filter((_, i) => i !== index))}
                                className={`p-1.5 rounded-lg transition-colors ${requestItems.length > 1 ? 'text-rose-400 hover:bg-rose-50 hover:text-rose-600' : 'text-slate-200 cursor-not-allowed'}`}
                                disabled={requestItems.length <= 1}
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
                      setRequestItems([...requestItems, { itemId: '', category: '', description: '', uom: '', qty: 0 }]);
                      setSearchTerms([...searchTerms, '']);
                    }}
                    className="w-full py-2.5 border-2 border-dashed border-slate-200 rounded-2xl text-slate-400 font-bold text-[10px] uppercase tracking-widest hover:bg-slate-50 hover:border-slate-300 hover:text-slate-600 transition-colors flex items-center justify-center gap-2 mt-4"
                  >
                    <Plus size={14} /> Add Another Item
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-6 pt-4 border-t border-slate-100">
                  <div className="space-y-2">
                    <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-[0.2em] ml-1">Unit/Department</label>
                    <input
                      required
                      list="unitDepartmentSuggestions"
                      value={requestDetails.unitDepartment}
                      onChange={(e) => setRequestDetails({ ...requestDetails, unitDepartment: e.target.value })}
                      className="w-full rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3.5 text-sm font-bold text-slate-900 focus:border-brand-accent/30 focus:bg-white focus:outline-none transition-all shadow-inner uppercase"
                      placeholder="e.g. OPERATIONS"
                    />
                    <datalist id="unitDepartmentSuggestions">
                      {unitDepartmentSuggestions.map(dept => (
                        <option key={dept} value={dept} />
                      ))}
                    </datalist>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-[0.2em] ml-1">Requested By</label>
                    <input
                      required
                      list="requestedBySuggestions"
                      value={requestDetails.requestedBy}
                      onChange={(e) => setRequestDetails({ ...requestDetails, requestedBy: e.target.value })}
                      className="w-full rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3.5 text-sm font-bold text-slate-900 focus:border-brand-accent/30 focus:bg-white focus:outline-none transition-all shadow-inner uppercase"
                      placeholder="Enter verification name"
                    />
                    <datalist id="requestedBySuggestions">
                      {requestedBySuggestions.map(name => (
                        <option key={name} value={name} />
                      ))}
                    </datalist>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-[0.2em] ml-1">Date</label>
                  <input
                    type="date"
                    required
                    value={requestDetails.dateRequested}
                    onChange={(e) => setRequestDetails({ ...requestDetails, dateRequested: e.target.value })}
                    className="w-full rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3.5 text-sm font-bold text-slate-900 focus:border-brand-accent/30 focus:bg-white focus:outline-none transition-all shadow-inner uppercase"
                  />
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
                    Save Request
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <ConfirmModal
        isOpen={deleteConfirm.isOpen}
        title="Delete Request"
        message="Are you sure you want to delete this request record? This action cannot be undone."
        confirmLabel="Delete Request"
        variant="danger"
        onConfirm={() => handleDelete(deleteConfirm.id)}
        onCancel={() => setDeleteConfirm({ isOpen: false, id: '' })}
      />

      <PromptModal
        isOpen={releaseState.isOpen}
        title="Release Items"
        message={`Enter name of the person receiving ${releaseState.request?.qty} units of ${releaseState.request?.description}:`}
        initialValue={releaseState.request?.requestedBy}
        confirmLabel="Confirm Release"
        onConfirm={(val) => {
          if (releaseState.request) handleRelease(releaseState.request, val);
          setReleaseState({ isOpen: false, request: null });
        }}
        onCancel={() => setReleaseState({ isOpen: false, request: null })}
      />

      <ExportModal
        isOpen={exportModal}
        onClose={() => setExportModal(false)}
        onExportExcel={handleExportExcel}
        onPrint={handlePrint}
        title="Export Requests"
      />
    </div>
  );
};

export default Requests;
