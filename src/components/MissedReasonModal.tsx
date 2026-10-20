import React, { useState } from 'react';
import { X, AlertTriangle, ShieldCheck } from 'lucide-react';
import type { Department } from '../types.js';

interface MissedReasonModalProps {
  department: Department | null;
  isOpen: boolean;
  onClose: () => void;
  onSubmitReason: (department: Department, reason: string) => Promise<void>;
}

export const MissedReasonModal: React.FC<MissedReasonModalProps> = ({
  department,
  isOpen,
  onClose,
  onSubmitReason,
}) => {
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !department) return null;

  const deptLabel = department === 'washroom' ? 'Washroom & Bathroom' : 'Kitchen & Counters';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) {
      setError('Please provide a reason why you did not complete this task.');
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmitReason(department, reason.trim());
      setReason('');
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to submit reason');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100 dark:border-slate-800">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-rose-50 dark:bg-rose-950/40 text-rose-600 flex items-center justify-center">
              <AlertTriangle className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Missed Cleaning: {deptLabel}
              </h3>
              <p className="text-[11px] text-slate-500">
                Provide reason why duty was not completed
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {error && (
          <div className="mb-3 p-2.5 bg-rose-50 text-rose-700 text-xs rounded-lg border border-rose-200">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Reason why you did not complete the cleaning:
            </label>
            <textarea
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Fever and sick in bed, traveled out of town for emergency, exams..."
              className="w-full p-3 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-slate-900"
              required
            />
          </div>

          <div className="p-3 bg-indigo-50/80 dark:bg-indigo-950/40 rounded-xl text-[11px] text-indigo-950 dark:text-indigo-200 space-y-1 border border-indigo-200/60 dark:border-indigo-800/60">
            <div className="font-semibold flex items-center gap-1.5 text-indigo-700 dark:text-indigo-300">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>AI Review Policy:</span>
            </div>
            <p>• Your reason will be visible to all housemates.</p>
            <p>• +1 is added to your missed tasks count initially.</p>
            <p>• If your reason is very very valid, AI will review and deduct it from your missed tasks.</p>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 text-xs font-medium text-slate-600 hover:text-slate-900 dark:text-slate-300 rounded-lg hover:bg-slate-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-xl shadow transition-colors disabled:opacity-50 min-h-[40px] flex items-center gap-1.5"
            >
              <span>{isSubmitting ? 'Sending to AI...' : 'Submit for AI Review'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
