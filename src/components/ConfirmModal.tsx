import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AlertTriangle, X } from 'lucide-react';

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  variant?: 'danger' | 'warning' | 'info';
}

const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  onConfirm,
  onCancel,
  variant = 'warning'
}) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onCancel}
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-md"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-md rounded-[2rem] bg-white p-8 shadow-2xl overflow-hidden"
          >
            <div className={`absolute top-0 left-0 w-full h-1.5 ${
              variant === 'danger' ? 'bg-rose-500' : 
              variant === 'warning' ? 'bg-amber-500' : 'bg-blue-500'
            }`} />
            
            <div className="flex items-start gap-4 mb-6">
              <div className={`p-3 rounded-2xl ${
                variant === 'danger' ? 'bg-rose-50 text-rose-500' : 
                variant === 'warning' ? 'bg-amber-50 text-amber-500' : 'bg-blue-50 text-blue-500'
              }`}>
                <AlertTriangle size={24} />
              </div>
              <div>
                <h3 className="text-xl font-display font-black text-slate-900 uppercase tracking-tight">
                  {title}
                </h3>
                <p className="mt-2 text-sm font-medium text-slate-400 italic">
                  {message}
                </p>
              </div>
              <button 
                onClick={onCancel}
                className="ml-auto p-2 text-slate-300 hover:text-slate-600 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="flex justify-end gap-3">
              <button
                onClick={onCancel}
                className="rounded-xl px-5 py-3 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:bg-slate-50 transition-all"
              >
                {cancelLabel}
              </button>
              <button
                onClick={() => {
                  onConfirm();
                  onCancel();
                }}
                className={`rounded-xl px-8 py-3 text-[10px] font-black uppercase tracking-widest text-white shadow-lg transition-all hover:-translate-y-0.5 active:scale-95 ${
                  variant === 'danger' ? 'bg-rose-500 shadow-rose-200 hover:bg-rose-600' : 
                  variant === 'warning' ? 'bg-amber-500 shadow-amber-200 hover:bg-amber-600' : 
                  'bg-brand-primary shadow-slate-200 hover:bg-slate-800'
                }`}
              >
                {confirmLabel}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default ConfirmModal;
