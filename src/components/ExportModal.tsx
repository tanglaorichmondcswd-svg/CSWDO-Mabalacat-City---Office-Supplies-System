import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Calendar as CalendarIcon, FileSpreadsheet, Printer } from 'lucide-react';
import { format } from 'date-fns';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onExportExcel: (startDate: string, endDate: string) => void;
  onPrint: (startDate: string, endDate: string) => void;
  title: string;
}

const ExportModal: React.FC<ExportModalProps> = ({ isOpen, onClose, onExportExcel, onPrint, title }) => {
  const [startDate, setStartDate] = useState(format(new Date(), 'yyyy-MM-01'));
  const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/20 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className="bg-white rounded-[2.5rem] p-8 w-full max-w-md shadow-2xl border border-slate-100"
        >
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-slate-800">{title}</h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-slate-100 rounded-full transition-colors"
            >
              <X size={20} className="text-slate-400" />
            </button>
          </div>

          <div className="space-y-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-[0.2em] ml-1">Start Date</label>
                <div className="relative">
                  <CalendarIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input
                    type="date"
                    required
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full rounded-2xl border border-slate-100 bg-slate-50 pl-11 pr-4 py-3.5 text-sm font-bold text-slate-900 focus:border-brand-accent/30 focus:bg-white focus:outline-none focus:ring-4 focus:ring-brand-accent/5 transition-all"
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-[0.2em] ml-1">End Date</label>
                <div className="relative">
                  <CalendarIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input
                    type="date"
                    required
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full rounded-2xl border border-slate-100 bg-slate-50 pl-11 pr-4 py-3.5 text-sm font-bold text-slate-900 focus:border-brand-accent/30 focus:bg-white focus:outline-none focus:ring-4 focus:ring-brand-accent/5 transition-all"
                  />
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-3">
              <button
                type="button"
                onClick={() => onExportExcel(startDate, endDate)}
                className="flex items-center justify-center gap-2 w-full rounded-2xl px-6 py-3.5 text-sm font-bold text-emerald-700 shadow-sm border border-emerald-200 bg-emerald-50 transition-all hover:-translate-y-0.5 hover:shadow-emerald-200/50 hover:bg-emerald-100 active:scale-95 font-sans"
              >
                <FileSpreadsheet size={18} />
                Export to Excel
              </button>
              <button
                type="button"
                onClick={() => onPrint(startDate, endDate)}
                className="flex items-center justify-center gap-2 w-full rounded-2xl px-6 py-3.5 text-sm font-bold text-blue-700 shadow-sm border border-blue-200 bg-blue-50 transition-all hover:-translate-y-0.5 hover:shadow-blue-200/50 hover:bg-blue-100 active:scale-95 font-sans"
              >
                <Printer size={18} />
                Print PDF
              </button>
            </div>
            
            <button
              type="button"
              onClick={onClose}
              className="mt-4 w-full rounded-2xl border border-slate-200 bg-white px-6 py-3.5 text-sm font-bold text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-all font-sans"
            >
              Cancel
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default ExportModal;
