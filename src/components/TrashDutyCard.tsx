import React, { useState } from 'react';
import { Trash2, CheckCircle, RotateCcw, Lock, Clock, BellRing } from 'lucide-react';
import type { HouseState, HouseMember } from '../types.js';
import { playChime } from '../utils/notifications.js';

interface TrashDutyCardProps {
  trashRotation: HouseState['trashRotation'];
  members: HouseMember[];
  currentMember: HouseMember | null;
  onCompleteTrash: () => Promise<void>;
  onUndoTrash: () => Promise<void>;
}

export const TrashDutyCard: React.FC<TrashDutyCardProps> = ({
  trashRotation,
  members,
  currentMember,
  onCompleteTrash,
  onUndoTrash,
}) => {
  const [loading, setLoading] = useState(false);
  const [undoLoading, setUndoLoading] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const assignedMember = members.find((m) => m.id === trashRotation.currentAssignedPersonId);
  const isMyTurn = currentMember && currentMember.id === trashRotation.currentAssignedPersonId;

  // Calculate days since previous person threw trash
  const lastDate = trashRotation.lastThrownAt ? new Date(trashRotation.lastThrownAt) : null;
  const now = new Date();
  const diffHours = lastDate ? (now.getTime() - lastDate.getTime()) / (1000 * 60 * 60) : 0;
  const diffDays = Math.floor(diffHours / 24);

  // Configurable threshold rule set by admin
  const thresholdDays = trashRotation.thresholdDays || 4;
  const isOverdue = diffDays >= thresholdDays;
  const daysUntilDue = Math.max(0, thresholdDays - diffDays);

  const nextIndex = (trashRotation.currentIndex + 1) % trashRotation.order.length;
  const nextPersonId = trashRotation.order[nextIndex];
  const nextMember = members.find((m) => m.id === nextPersonId);

  // Can undo if current member threw it last and within 12h
  const canUndo = currentMember && currentMember.name === trashRotation.lastThrownBy && diffHours < 12;

  const handleComplete = async () => {
    if (!isMyTurn) return;
    setLoading(true);
    try {
      playChime('trash');
      await onCompleteTrash();
      setShowConfirm(false);
    } finally {
      setLoading(false);
    }
  };

  const handleUndo = async () => {
    setUndoLoading(true);
    try {
      await onUndoTrash();
    } finally {
      setUndoLoading(false);
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 sm:p-6 shadow-sm w-full max-w-full overflow-hidden">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-3 mb-4 w-full">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
            <Trash2 className="w-5 h-5" />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-base font-bold text-slate-900 dark:text-white truncate">
              Trash & Recycling
            </h3>
            <div className="flex items-center gap-2 text-xs text-slate-500 truncate">
              <span>{members.length} housemates</span>
              <span aria-hidden="true">·</span>
              <span>{thresholdDays}-day cycle</span>
            </div>
          </div>
        </div>

        {/* Cycle Status Badge */}
        <div className="self-start sm:self-auto shrink-0 max-w-full">
          {isOverdue ? (
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs font-semibold rounded-lg max-w-full">
              <BellRing className="w-3.5 h-3.5 shrink-0 text-rose-600 animate-pulse" />
              <span className="truncate">Due now ({diffDays} days passed)</span>
            </div>
          ) : (
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs rounded-lg max-w-full">
              <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span className="truncate">Filling (Day {diffDays} of {thresholdDays})</span>
            </div>
          )}
        </div>
      </div>

      {/* Main Turn Card */}
      <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-3.5 sm:p-4 mb-4 border border-slate-100 dark:border-slate-800 w-full max-w-full overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 w-full">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-11 h-11 rounded-full bg-slate-900 text-white flex items-center justify-center text-xl font-bold shadow-sm shrink-0">
              {assignedMember?.avatarEmoji || '👤'}
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                Current Turn
              </div>
              <div className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2 truncate">
                <span className="truncate">{assignedMember?.name || 'Assignee'}</span>
                {isMyTurn && (
                  <span className="text-[10px] font-semibold px-2 py-0.5 bg-slate-900 text-white rounded shrink-0">
                    You
                  </span>
                )}
              </div>
              <div className="text-xs text-slate-500 mt-0.5 truncate">
                Previous: {trashRotation.lastThrownBy || 'someone'} ({diffDays}d ago)
              </div>
            </div>
          </div>

          {/* Action Button */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto pt-1 sm:pt-0">
            {isMyTurn ? (
              !showConfirm ? (
                <button
                  onClick={() => setShowConfirm(true)}
                  className="w-full sm:w-auto px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-xl shadow transition-all flex items-center justify-center gap-2 min-h-[44px]"
                >
                  <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>I Threw Out the Trash</span>
                </button>
              ) : (
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <button
                    onClick={handleComplete}
                    disabled={loading}
                    className="flex-1 sm:flex-initial px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl shadow transition-colors flex items-center justify-center gap-1.5 min-h-[44px]"
                  >
                    <CheckCircle className="w-4 h-4 shrink-0" />
                    <span>{loading ? 'Saving...' : 'Confirm'}</span>
                  </button>
                  <button
                    onClick={() => setShowConfirm(false)}
                    className="px-3 py-2.5 bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-medium rounded-xl transition-colors min-h-[44px]"
                  >
                    Cancel
                  </button>
                </div>
              )
            ) : (
              <div
                title="Only the assigned person can mark this done on their phone"
                className="w-full sm:w-auto px-3 py-2.5 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 text-xs font-medium rounded-xl flex items-center justify-center gap-2 min-h-[44px] select-none text-center"
              >
                <Lock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span className="truncate">Locked · Only {assignedMember?.name} can mark done</span>
              </div>
            )}

            {canUndo && (
              <button
                onClick={handleUndo}
                disabled={undoLoading}
                title="Undo last trash completion"
                className="w-full sm:w-auto px-3 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-medium rounded-xl transition-colors flex items-center justify-center gap-1 min-h-[44px] shrink-0"
              >
                <RotateCcw className="w-3.5 h-3.5 shrink-0" />
                <span>{undoLoading ? '...' : 'Undo'}</span>
              </button>
            )}
          </div>
        </div>

        {/* Dynamic Reminder Notice */}
        {isOverdue ? (
          <div className="mt-3 pt-3 border-t border-rose-200/60 dark:border-rose-900/40 flex items-start gap-2.5 text-xs text-rose-700 dark:text-rose-300 font-medium break-words w-full">
            <BellRing className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
            <div className="min-w-0 flex-1">
              <strong>{thresholdDays} Days Reached:</strong>{' '}
              {isMyTurn ? (
                <span>
                  Hey {currentMember?.name}! The {thresholdDays}-day filling limit has passed. Please take out the trash and tap the button above!
                </span>
              ) : (
                <span>
                  {assignedMember?.name} is on duty to empty the bin ({thresholdDays}+ days passed).
                </span>
              )}
            </div>
          </div>
        ) : (
          <div className="mt-2.5 text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1.5 truncate">
            <Clock className="w-3 h-3 shrink-0" />
            <span className="truncate">
              {thresholdDays}-day rule: {daysUntilDue} day(s) until reminder for {assignedMember?.name}.
            </span>
          </div>
        )}
      </div>

      {/* Turn Order Grid (Responsive for all phones) */}
      <div className="pt-1 w-full">
        <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
          Turn Order
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 w-full">
          {trashRotation.order.map((memberId, idx) => {
            const m = members.find((x) => x.id === memberId);
            const isCurrent = idx === trashRotation.currentIndex;
            const isNext = idx === nextIndex;

            return (
              <div
                key={memberId}
                className={`p-2.5 rounded-xl text-center border transition-all min-w-0 ${
                  isCurrent
                    ? 'border-slate-900 dark:border-white bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-sm font-semibold'
                    : isNext
                    ? 'border-amber-300 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/20 text-slate-800 dark:text-slate-200'
                    : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400'
                }`}
              >
                <div className="text-base">{m?.avatarEmoji || '👤'}</div>
                <div className="text-xs truncate font-medium mt-1">{m?.name}</div>
                <div className="text-[10px] mt-0.5 truncate opacity-80">
                  {isCurrent ? 'Now' : isNext ? 'Up Next' : `Turn ${idx + 1}`}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
