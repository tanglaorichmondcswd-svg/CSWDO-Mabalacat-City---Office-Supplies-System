import React, { useState, useEffect } from 'react';
import { Users as UsersIcon, Plus, Edit2, Trash2, ShieldCheck, ShieldAlert, Shield, Search } from 'lucide-react';
import { toast } from 'sonner';
import ConfirmModal from '../components/ConfirmModal';
import { userService } from '../services/userService';
import { User, UserRole } from '../types';
import { format } from 'date-fns';
import { motion, AnimatePresence } from 'motion/react';
import { auth } from '../lib/firebase';

const Users: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [currentUserProfile, setCurrentUserProfile] = useState<User | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ isOpen: boolean; uid: string }>({
    isOpen: false,
    uid: ''
  });

  // Form State
  const [formData, setFormData] = useState({
    uid: '',
    name: '',
    email: '',
    position: '',
    role: 'User' as UserRole
  });

  useEffect(() => {
    loadUsers();
    fetchCurrentProfile();
  }, []);

  const fetchCurrentProfile = async () => {
    if (auth.currentUser) {
      const profile = await userService.getUser(auth.currentUser.uid);
      setCurrentUserProfile(profile);
    }
  };

  const loadUsers = async () => {
    setLoading(true);
    const data = await userService.getAllUsers();
    setUsers(data || []);
    setLoading(false);
  };

  const handleAdd = () => {
    setEditingUser(null);
    setFormData({
      uid: `USER_${Math.random().toString(36).substring(2, 9).toUpperCase()}`,
      name: '',
      position: '',
      role: 'User'
    });
    setShowModal(true);
  };

  const handleEdit = (user: User) => {
    setEditingUser(user);
    setFormData({
      uid: user.uid,
      name: user.name,
      email: user.email || '',
      position: user.position,
      role: user.role
    });
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingUser) {
        await userService.updateUser(editingUser.uid, {
          name: formData.name,
          email: formData.email,
          position: formData.position,
          role: formData.role
        });
      } else {
        await userService.createUser(formData.uid, {
          name: formData.name,
          email: formData.email,
          position: formData.position,
          role: formData.role
        });
      }
      setShowModal(false);
      loadUsers();
      toast.success(`User ${editingUser ? 'updated' : 'created'} successfully`);
    } catch (err: any) {
      console.error('Operation failed:', err);
      toast.error(err.message || 'Operation failed');
    }
  };

  const isAdminOrSystemAdmin = currentUserProfile?.role === 'Admin' || 
                              currentUserProfile?.role === 'System Admin' || 
                              auth.currentUser?.email === 'tanglaorichmond.cswd@gmail.com';

  const isSystemAdmin = currentUserProfile?.role === 'System Admin' || 
                        auth.currentUser?.email === 'tanglaorichmond.cswd@gmail.com';

  const handleDelete = async (uid: string) => {
    if (uid === auth.currentUser?.uid) return toast.error('You cannot delete your own account.');
    try {
      await userService.deleteUser(uid);
      loadUsers();
      toast.success('User deleted successfully');
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete user');
    }
  };

  const getRoleIcon = (role: UserRole) => {
    switch (role) {
      case 'System Admin': return <ShieldAlert className="text-rose-500" size={16} />;
      case 'Admin': return <ShieldCheck className="text-indigo-500" size={16} />;
      default: return <Shield className="text-emerald-500" size={16} />;
    }
  };

  return (
    <div className="space-y-10 font-sans">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.25em] text-brand-accent mb-2">
            <div className="h-1 w-8 bg-brand-accent rounded-full" />
            User Directory
          </div>
          <h1 className="text-4xl font-display font-black text-slate-900 tracking-tighter uppercase leading-none">User Management</h1>
          <p className="mt-4 text-slate-400 font-medium leading-relaxed max-w-xl text-sm italic italic">Manage user accounts, roles, and access levels.</p>
        </div>
        {isAdminOrSystemAdmin && (
          <button 
            onClick={handleAdd}
            className="group flex items-center gap-3 rounded-[1.25rem] bg-slate-900 px-8 py-4 text-xs font-black uppercase tracking-widest text-white shadow-2xl shadow-slate-200 transition-all hover:bg-brand-primary active:scale-95 border border-white/10"
          >
            <Plus size={18} className="transition-transform group-hover:rotate-90 text-brand-accent" />
            Add User
          </button>
        )}
      </div>

      <div className="rounded-[2.5rem] border border-slate-100 bg-white shadow-2xl shadow-slate-200/50 overflow-hidden">
        {loading ? (
          <div className="flex h-96 flex-col items-center justify-center gap-4">
            <div className="h-12 w-12 animate-spin rounded-[1rem] border-4 border-brand-accent border-t-transparent shadow-lg" />
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest animate-pulse">Loading users...</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-900/5 border-b border-slate-100 uppercase tracking-[0.2em] font-black text-[10px] text-slate-400">
                  <th className="px-8 py-6">User Details</th>
                  <th className="px-8 py-6">Role</th>
                  <th className="px-8 py-6">Joined Date</th>
                  <th className="px-8 py-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 italic">
                {users.map((user) => (
                  <tr key={user.uid} className="group hover:bg-slate-50/50 transition-colors">
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-4">
                        <div className="h-12 w-12 rounded-2xl bg-slate-900/5 border border-slate-100 flex items-center justify-center text-slate-900 font-black uppercase text-lg shadow-sm group-hover:bg-brand-accent group-hover:text-white transition-all">
                          {user.name.charAt(0)}
                        </div>
                        <div>
                          <p className="font-display font-black text-slate-900 uppercase tracking-tight text-base group-hover:text-brand-accent transition-colors italic">{user.name}</p>
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{user.position}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border shadow-sm ${
                        user.role === 'System Admin' ? 'bg-rose-50 text-rose-600 border-rose-100' :
                        user.role === 'Admin' ? 'bg-indigo-50 text-indigo-600 border-indigo-100' : 
                        'bg-emerald-50 text-emerald-600 border-emerald-100'
                      }`}>
                        {getRoleIcon(user.role)}
                        {user.role}
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-2 text-xs font-black text-slate-400 uppercase tracking-tighter italic">
                        <div className="h-1.5 w-1.5 rounded-full bg-slate-200" />
                        {user.createdAt?.toDate ? format(user.createdAt.toDate(), 'MMMM dd, yyyy') : '---'}
                      </div>
                    </td>
                    <td className="px-8 py-6 text-right">
                      <div className="flex items-center justify-end gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                        {isAdminOrSystemAdmin && (
                          <button 
                            onClick={() => handleEdit(user)}
                            className="bg-white rounded-xl p-3 text-brand-primary hover:bg-brand-primary hover:text-white shadow-sm border border-slate-100 transition-all"
                          >
                            <Edit2 size={16} />
                          </button>
                        )}
                        {isSystemAdmin && (
                          <button 
                            onClick={() => setDeleteConfirm({ isOpen: true, uid: user.uid })}
                            className="bg-white rounded-xl p-3 text-rose-500 hover:bg-rose-500 hover:text-white shadow-sm border border-slate-100 transition-all"
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Edit Modal */}
      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-6">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowModal(false)} className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" />
            <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 30 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 30 }}
                className="relative w-full max-w-xl rounded-[2.5rem] bg-white p-10 shadow-2xl shadow-slate-900/10"
            >
              <div className="mb-0">
                  <h3 className="text-2xl font-display font-extrabold text-slate-900 uppercase tracking-tight">
                    {editingUser ? 'Edit' : 'Add'} <span className="text-brand-accent">User</span>
                  </h3>
                  <p className="text-sm font-medium text-slate-400 mt-1 uppercase tracking-widest italic">{editingUser ? 'Update user profile and permissions.' : 'Enter user details to create an account.'}</p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6 mt-8 italic">
                <div className="space-y-2">
                  <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-[0.2em] ml-1">User ID</label>
                  <input 
                    required 
                    readOnly={!!editingUser} 
                    value={formData.uid} 
                    onChange={(e) => setFormData({ ...formData, uid: e.target.value })} 
                    className={`w-full rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3.5 text-sm font-bold text-slate-900 focus:border-brand-accent/30 focus:bg-white focus:outline-none transition-all shadow-inner uppercase ${editingUser ? 'opacity-50 grayscale cursor-not-allowed' : ''}`} 
                    placeholder="AUTOGEN_UID"
                  />
                  {!editingUser && <p className="text-[9px] text-slate-400 font-extrabold tracking-tight uppercase mt-1 ml-1 leading-relaxed">This ID matches the Firebase Auth UID. Change only if necessary.</p>}
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-[0.2em] ml-1">Email</label>
                  <input required type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} className="w-full rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3.5 text-sm font-black text-slate-900 focus:border-brand-accent/30 focus:bg-white focus:outline-none transition-all shadow-inner italic" placeholder="email@example.com" />
                </div>
                <div className="grid grid-cols-2 gap-6 italic">
                  <div className="space-y-2">
                    <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-[0.2em] ml-1">Full Name</label>
                    <input required value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="w-full rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3.5 text-sm font-black text-slate-900 focus:border-brand-accent/30 focus:bg-white focus:outline-none transition-all shadow-inner italic" placeholder="Full Identity" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-[0.2em] ml-1">Position</label>
                    <input required value={formData.position} onChange={(e) => setFormData({ ...formData, position: e.target.value })} className="w-full rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3.5 text-sm font-bold text-slate-900 focus:border-brand-accent/30 focus:bg-white focus:outline-none transition-all shadow-inner italic uppercase" placeholder="Designation" />
                  </div>
                </div>

                <div className="space-y-2 italic">
                  <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-[0.2em] ml-1">User Role</label>
                  <select 
                    value={formData.role} 
                    onChange={(e) => setFormData({ ...formData, role: e.target.value as UserRole })} 
                    className="w-full rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3.5 text-sm font-black text-slate-900 focus:border-brand-accent/30 focus:bg-white focus:outline-none transition-all shadow-inner appearance-none uppercase"
                  >
                    <option value="User">User</option>
                    <option value="Admin">Admin</option>
                    <option value="System Admin">System Admin</option>
                  </select>
                </div>

                <div className="flex justify-end gap-3 pt-6 border-t border-slate-50">
                  <button type="button" onClick={() => setShowModal(false)} className="rounded-2xl px-6 py-4 text-xs font-extrabold uppercase tracking-[0.2em] text-slate-400 hover:bg-slate-50 transition-all">Cancel</button>
                  <button type="submit" className="rounded-2xl bg-brand-primary px-10 py-4 text-xs font-extrabold uppercase tracking-[0.2em] text-white shadow-xl shadow-slate-200 hover:bg-slate-800 hover:-translate-y-0.5 transition-all">Save User</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <ConfirmModal
        isOpen={deleteConfirm.isOpen}
        title="Delete User"
        message="Are you sure you want to delete this user account? This action will permanently remove their access to the system."
        confirmLabel="Delete User"
        variant="danger"
        onConfirm={() => handleDelete(deleteConfirm.uid)}
        onCancel={() => setDeleteConfirm({ isOpen: false, uid: '' })}
      />
    </div>
  );
};

export default Users;
