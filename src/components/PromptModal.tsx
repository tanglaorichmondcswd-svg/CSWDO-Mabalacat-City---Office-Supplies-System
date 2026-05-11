import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { User, X } from 'lucide-react';

interface PromptModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  initialValue?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: (value: string) => void;
  onCancel: () => void;
}

const PromptModal: React.FC<PromptModalProps> = ({
  isOpen,
  title,
  message,
  initialValue = '',
  confirmLabel = 'Submit',
  cancelLabel = 'Cancel',
  onConfirm,
  onCancel,
}) => {
  const [value, setValue] = useState(initialValue);

  useEffect(() => {
    if (isOpen) setValue(initialValue);
  }, [isOpen, initialValue]);

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
            className="relative w-full max-w-md rounded-[2.5rem] bg-white p-10 shadow-2xl"
          >
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-2xl font-display font-black text-slate-900 uppercase tracking-tight">
                {title}
              </h3>
              <button 
                onClick={onCancel}
                className="p-2 text-slate-300 hover:text-slate-600 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <p className="mb-6 text-sm font-medium text-slate-400 italic">
              {message}
            </p>

            <div className="space-y-4">
              <div className="relative">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-accent">
                  <User size={18} />
                </div>
                <input
                  autoFocus
                  type="text"
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  className="w-full rounded-2xl border border-slate-100 bg-slate-50 pl-12 pr-4 py-4 text-sm font-bold text-slate-900 focus:border-brand-accent/30 focus:bg-white focus:outline-none transition-all shadow-inner uppercase"
                  placeholder="Enter name..."
                />
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button
                  onClick={onCancel}
                  className="rounded-2xl px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:bg-slate-50 transition-all"
                >
                  {cancelLabel}
                </button>
                <button
                  onClick={() => onConfirm(value)}
                  className="rounded-2xl bg-brand-primary px-8 py-4 text-[10px] font-black uppercase tracking-widest text-white shadow-xl shadow-slate-200 hover:bg-slate-800 hover:-translate-y-0.5 transition-all"
                >
                  {confirmLabel}
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default PromptModal;
