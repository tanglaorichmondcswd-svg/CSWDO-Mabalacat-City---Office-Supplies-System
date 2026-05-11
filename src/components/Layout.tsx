import React, { useState, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { 
  Users, 
  Wallet, 
  Package, 
  Truck, 
  ClipboardList, 
  BarChart3, 
  LogOut, 
  Menu, 
  X,
  ChevronRight,
  Plus,
  UserPlus,
  LayoutDashboard,
  Activity
} from 'lucide-react';
import { auth, signInWithGoogle } from '../lib/firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { User, UserRole } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { userService } from '../services/userService';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const [isSidebarOpen, setSidebarOpen] = useState(window.innerWidth >= 1024);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 1024;
      setIsMobile(mobile);
      if (mobile) {
        setSidebarOpen(false);
      } else {
        setSidebarOpen(true);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    console.log('Layout useEffect: setting up auth listener');
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      console.log('LA: onAuthStateChanged triggered:', fbUser ? 'User logged in' : 'User signed out');
      try {
        if (fbUser) {
          console.log('LA: Fetching user document for', fbUser.uid, fbUser.email);
          let userDoc = await Promise.race([
            getDoc(doc(db, 'users', (fbUser.email || '').toLowerCase() || fbUser.uid)),
            new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 5000))
          ]) as any;
          
          if (!userDoc.exists() && fbUser.uid !== fbUser.email) {
            console.log('LA: Not found by email, trying UID:', fbUser.uid);
            userDoc = await getDoc(doc(db, 'users', fbUser.uid)) as any;
          }
          console.log('LA: Fetch complete, exists:', userDoc.exists());
          if (userDoc.exists()) {
            setUser(userDoc.data() as User);
            // If the document has a different UID than current Auth UID, maybe update? 
            // For now, just set the user.
          } else {
            console.log('LA: User does not exist');
            if (fbUser.email === 'tanglaorichmond.cswd@gmail.com') {
              console.log('LA: Admin user, auto-creating');
              const adminProfile: User = {
                uid: fbUser.uid,
                name: fbUser.displayName || 'Richmond Tanglao',
                position: 'System Administrator',
                role: 'System Admin',
                createdAt: {} as any
              };
              await userService.createUser(fbUser.uid, {
                name: adminProfile.name,
                position: adminProfile.position,
                role: adminProfile.role
              });
              setUser(adminProfile);
            } else {
              console.log('LA: User not registered, signing out');
              await signOut(auth);
              setAuthError('Your account is not registered to access this system. Please contact the administrator.');
              setUser(null);
              setLoading(false);
              return;
            }
          }
        } else {
          console.log('LA: No user');
          setUser(null);
          setAuthError(null);
        }
      } catch (error) {
        console.error('Error in onAuthStateChanged:', error);
      } finally {
        console.log('LA: Setting loading false');
        setLoading(false);
      }
    });
    return () => unsubscribe();
  }, []);

  const handleOnboardingSubmit = async (data: { name: string, position: string }) => {
    if (!auth.currentUser) return;
    await userService.createUser(auth.currentUser.uid, {
      name: data.name,
      position: data.position,
      role: 'User'
    });
    const updated = await userService.getUser(auth.currentUser.uid);
    setUser(updated || null);
  };

  const handleLogout = async () => {
    await signOut(auth);
    navigate('/');
  };

  const menuItems = [
    { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard, roles: ['User', 'Admin', 'System Admin'] },
    { name: 'Inventory Monitoring', path: '/monitoring', icon: Activity, roles: ['User', 'Admin', 'System Admin'] },
    { name: 'Item List', path: '/inventory', icon: Package, roles: ['User', 'Admin', 'System Admin'] },
    { name: 'Deliveries', path: '/deliveries', icon: Truck, roles: ['Admin', 'System Admin'] },
    { name: 'Requests', path: '/requests', icon: ClipboardList, roles: ['User', 'Admin', 'System Admin'] },
    { name: 'Budgets', path: '/budgets', icon: Wallet, roles: ['Admin', 'System Admin'] },
    { name: 'Users', path: '/users', icon: Users, roles: ['System Admin'] },
    { name: 'Reports', path: '/reports', icon: BarChart3, roles: ['Admin', 'System Admin'] },
  ];

  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-surface-bg">
        <motion.div 
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
          className="h-10 w-10 border-[3px] border-brand-accent border-t-transparent rounded-full shadow-lg shadow-blue-100"
        />
      </div>
    );
  }

  if (authError) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-surface-bg p-4 text-center font-sans">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-md rounded-2xl bg-white p-8 shadow-xl border border-rose-100"
        >
          <h2 className="text-xl font-bold text-rose-600">Access Denied</h2>
          <p className="mt-4 text-slate-700">{authError}</p>
          <button 
            onClick={() => window.location.reload()}
            className="mt-6 rounded-xl bg-brand-primary px-6 py-3 font-bold text-white transition-all hover:bg-slate-800"
          >
            Try Again
          </button>
        </motion.div>
      </div>
    );
  }

  if (!user || user.position === 'Pending Onboarding') {
    return (
      <div className="flex h-screen w-full flex-col items-center justify-center bg-surface-bg p-4 text-center font-sans">
        {!user ? (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center max-w-sm"
          >
            <div className="mb-8 flex flex-col items-center">
              <div className="relative mb-6">
                <div className="absolute inset-0 bg-blue-100 rounded-full blur-2xl opacity-50 animate-pulse" />
                <img 
                  src="https://raw.githubusercontent.com/tanglaorichmondcswd-svg/MABALACAT-CITY-LOGO/8c7a0930ac6461db3f8065442df9d3a97e5f8ac7/image.png" 
                  alt="Logo" 
                  className="relative h-28 w-28 object-contain drop-shadow-xl"
                  referrerPolicy="no-referrer"
                />
              </div>
              <h1 className="text-3xl font-display font-extrabold tracking-tight text-brand-primary uppercase">
                Office Supply <span className="text-brand-accent">System</span>
              </h1>
              <div className="mt-2 flex items-center gap-2">
                <span className="h-px w-8 bg-slate-200" />
                <p className="text-sm font-bold text-slate-500 uppercase tracking-widest">CSWDO Mabalacat</p>
                <span className="h-px w-8 bg-slate-200" />
              </div>
            </div>
            
            <button
              onClick={signInWithGoogle}
              className="group relative flex items-center gap-3 rounded-2xl bg-white px-10 py-4 font-bold text-slate-700 shadow-xl shadow-slate-200/50 transition-all hover:shadow-2xl hover:-translate-y-0.5 border border-slate-100 active:scale-95"
            >
              <img src="https://www.google.com/favicon.ico" alt="Google" className="h-5 w-5" />
              Sign in with Google
              <div className="absolute inset-0 rounded-2xl border-2 border-brand-accent opacity-0 group-hover:opacity-10 transition-opacity" />
            </button>
            <p className="mt-8 text-xs font-semibold text-slate-400 uppercase tracking-tighter">Safe & Secure Corporate Login</p>
          </motion.div>
        ) : (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-md rounded-[2.5rem] bg-white p-10 shadow-2xl shadow-slate-200/60 border border-slate-50"
          >
            <div className="mb-8 flex justify-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-[1.5rem] bg-blue-50 text-blue-600 shadow-inner">
                <UserPlus size={32} />
              </div>
            </div>
            <h2 className="text-3xl font-display font-extrabold tracking-tight text-slate-900">Final Step</h2>
            <p className="mt-2 text-slate-500 mb-10 font-medium">Please complete your employee profile to start.</p>
            <form 
              onSubmit={(e) => {
                e.preventDefault();
                const target = e.target as any;
                handleOnboardingSubmit({
                  name: target.name.value,
                  position: target.position.value
                });
              }}
              className="space-y-6 text-left"
            >
              <div className="space-y-2">
                <label className="text-xs font-extrabold text-slate-400 uppercase tracking-wider ml-1">Full Name</label>
                <input name="name" required defaultValue={user.name} className="w-full rounded-2xl border-2 border-slate-50 bg-slate-50/50 px-5 py-4 font-semibold text-slate-900 outline-none transition-all focus:border-brand-accent/20 focus:bg-white focus:ring-4 focus:ring-brand-accent/5" />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-extrabold text-slate-400 uppercase tracking-wider ml-1">Your Position</label>
                <input name="position" required className="w-full rounded-2xl border-2 border-slate-50 bg-slate-50/50 px-5 py-4 font-semibold text-slate-900 outline-none transition-all focus:border-brand-accent/20 focus:bg-white focus:ring-4 focus:ring-brand-accent/5" placeholder="e.g. Social Worker I" />
              </div>
              <button 
                type="submit"
                className="w-full rounded-2xl bg-brand-primary py-4 font-bold text-white shadow-xl shadow-slate-300 transition-all hover:bg-slate-800 hover:shadow-2xl active:scale-[0.98]"
              >
                Enter Workspace
              </button>
            </form>
          </motion.div>
        )}
      </div>
    );
  }

  const filteredMenuItems = menuItems.filter(item => item.roles.includes(user.role));

  return (
    <div className="flex h-screen bg-[#FBFBFC] text-slate-900 font-sans overflow-hidden">
      {/* Mobile Backdrop */}
      <AnimatePresence>
        {isMobile && isSidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSidebarOpen(false)}
            className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-sm"
          />
        )}
      </AnimatePresence>

      <motion.aside
        initial={false}
        animate={{ 
          width: isSidebarOpen ? (isMobile ? '100%' : 280) : (isMobile ? 0 : 88),
          x: isMobile && !isSidebarOpen ? '-100%' : 0,
          maxWidth: isMobile ? 300 : 'none'
        }}
        className={`fixed inset-y-0 left-0 z-50 flex flex-col border-r border-slate-200 bg-white transition-all duration-500 ease-[cubic-bezier(0.23,1,0.32,1)] ${isMobile ? 'shadow-2xl' : ''}`}
      >
        <div className="flex min-h-[5.5rem] items-center justify-between px-5 pt-2">
          <div className={`flex items-center gap-3.5 ${(!isSidebarOpen && !isMobile) && 'justify-center w-full'}`}>
            <div className="relative">
              <div className="absolute inset-0 bg-brand-accent rounded-full blur-xl opacity-20 animate-pulse" />
              <img 
                src="https://raw.githubusercontent.com/tanglaorichmondcswd-svg/MABALACAT-CITY-LOGO/8c7a0930ac6461db3f8065442df9d3a97e5f8ac7/image.png" 
                alt="Logo" 
                className="relative h-12 w-12 shrink-0 object-contain drop-shadow-lg"
                referrerPolicy="no-referrer"
              />
            </div>
            {(isSidebarOpen || isMobile) && (
              <div className="flex flex-col gap-0.5">
                <span className="text-[10px] font-black text-brand-accent uppercase tracking-[0.2em] leading-none">CSWDO</span>
                <span className="font-display font-black text-slate-900 text-xl tracking-tighter leading-none italic">INVENTORY</span>
                <span className="text-[8px] text-slate-400 font-extrabold uppercase tracking-widest leading-none mt-1">Mabalacat City</span>
              </div>
            )}
          </div>
          {isMobile && (
            <button onClick={() => setSidebarOpen(false)} className="p-2 text-slate-400">
              <X size={20} />
            </button>
          )}
        </div>

        {!isMobile && (
          <div className="my-6 px-4">
            <button 
              onClick={() => setSidebarOpen(!isSidebarOpen)}
              className="flex w-full items-center justify-center rounded-xl p-2.5 text-slate-400 border border-slate-50 transition-all hover:bg-slate-50 hover:text-slate-600 active:scale-95"
            >
              {isSidebarOpen ? <X size={18} /> : <Menu size={18} />}
            </button>
          </div>
        )}

        <nav className="flex-1 space-y-1.5 px-4 mt-6 overflow-y-auto custom-scrollbar" onClick={() => isMobile && setSidebarOpen(false)}>
          {filteredMenuItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `group flex items-center gap-4 rounded-2xl px-5 py-4 transition-all duration-300 relative overflow-hidden ${
                  isActive 
                    ? 'bg-slate-900 text-white shadow-2xl shadow-slate-300' 
                    : 'text-slate-400 hover:bg-slate-50 hover:text-slate-900'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  {isActive && (
                    <motion.div 
                      layoutId="activeTabGlow"
                      className="absolute inset-0 bg-gradient-to-r from-brand-accent/20 to-transparent pointer-events-none" 
                    />
                  )}
                  <item.icon size={20} className={`shrink-0 relative z-10 transition-transform group-hover:scale-110 ${isActive ? 'text-brand-accent' : ''}`} />
                  <AnimatePresence mode="wait">
                    {(isSidebarOpen || isMobile) && (
                      <motion.span
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -10 }}
                        className={`font-black text-[11px] whitespace-nowrap tracking-[0.1em] uppercase relative z-10 italic ${isActive ? 'text-white' : 'text-inherit'}`}
                      >
                        {item.name}
                      </motion.span>
                    )}
                  </AnimatePresence>
                  {isActive && (isSidebarOpen || isMobile) && (
                    <motion.div 
                      layoutId="activeInd" 
                      className="ml-auto h-1.5 w-1.5 rounded-full bg-brand-accent shadow-[0_0_12px_rgba(59,130,246,0.8)] relative z-10" 
                    />
                  )}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="mt-auto border-t border-slate-100 p-6 bg-slate-50/30">
          <div className={`flex items-center gap-4 p-4 rounded-3xl bg-white shadow-xl shadow-slate-200/40 border border-white ${(!isSidebarOpen && !isMobile) && 'justify-center border-none shadow-none bg-transparent p-0'}`}>
            <div className="h-12 w-12 shrink-0 rounded-2xl bg-slate-900 flex items-center justify-center text-brand-accent shadow-lg shadow-slate-200 relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent pointer-events-none" />
              <Users size={20} className="relative z-10" />
            </div>
            {(isSidebarOpen || isMobile) && (
              <div className="overflow-hidden">
                <p className="truncate text-xs font-black text-slate-900 uppercase tracking-tight">{user.name}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]" />
                  <p className="truncate text-[9px] font-black text-slate-400 uppercase tracking-[0.1em]">{user.role}</p>
                </div>
              </div>
            )}
          </div>
          <button
            onClick={handleLogout}
            className="mt-4 flex w-full items-center gap-4 rounded-2xl px-5 py-4 text-slate-400 font-black text-[10px] uppercase tracking-[0.2em] transition-all hover:bg-rose-50 hover:text-rose-500 group italic"
          >
            <LogOut size={18} className="transition-transform group-hover:-translate-x-1" />
            {(isSidebarOpen || isMobile) && <span>Sign Out</span>}
          </button>
        </div>
      </motion.aside>

      <div className="flex flex-1 flex-col overflow-hidden min-w-0">
        {isMobile && (
          <header className="flex h-20 shrink-0 items-center justify-between border-b border-slate-100 bg-white px-6">
            <div className="flex items-center gap-3">
              <img 
                src="https://raw.githubusercontent.com/tanglaorichmondcswd-svg/MABALACAT-CITY-LOGO/8c7a0930ac6461db3f8065442df9d3a97e5f8ac7/image.png" 
                alt="Logo" 
                className="h-10 w-10 object-contain"
                referrerPolicy="no-referrer"
              />
              <div className="flex flex-col">
                <span className="font-display font-black text-slate-900 text-lg uppercase leading-tight">INVENTORY</span>
                <span className="text-[8px] text-slate-400 font-extrabold uppercase tracking-widest leading-none">Mabalacat City</span>
              </div>
            </div>
            <button
              onClick={() => setSidebarOpen(true)}
              className="rounded-xl border border-slate-100 p-2.5 text-slate-400 hover:bg-slate-50 transition-all hover:text-slate-900"
            >
              <Menu size={20} />
            </button>
          </header>
        )}

        <main 
          className="flex-1 transition-all duration-500 ease-[cubic-bezier(0.23,1,0.32,1)] overflow-y-auto"
          style={{ paddingLeft: !isMobile ? (isSidebarOpen ? 280 : 88) : 0 }}
        >
          <div className="mx-auto max-w-7xl px-4 py-8 sm:px-8 lg:px-12">
            <AnimatePresence mode="wait">
              <motion.div
                key={window.location.pathname}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.35, ease: [0.23, 1, 0.32, 1] }}
              >
                {children}
              </motion.div>
            </AnimatePresence>
          </div>
        </main>
      </div>
    </div>
  );
};

export default Layout;
