import React, { useState } from 'react';
import { CheckCircle2, RotateCcw, Lock, AlertTriangle, ArrowRightLeft, Calendar, Bot, Sparkles } from 'lucide-react';
import type { HouseState, HouseMember, Department } from '../types.js';
import { getCalendarWeek } from '../types.js';
import { playChime } from '../utils/notifications.js';

interface WeeklyCleaningCardProps {
  currentWeekNumber: number;
  cleaningDuties: HouseState['cleaningDuties'];
  members: HouseMember[];
  currentMember: HouseMember | null;
  onCompleteCleaning: (department: Department) => Promise<void>;
  onUndoCleaning: (department: Department) => Promise<void>;
  onOpenMissedReason: (department: Department) => void;
  onOpenAiChat?: (department: Department) => void;
}

export const WeeklyCleaningCard: React.FC<WeeklyCleaningCardProps> = ({
  currentWeekNumber,
  cleaningDuties,
  members,
  currentMember,
  onCompleteCleaning,
  onUndoCleaning,
  onOpenMissedReason,
  onOpenAiChat,
}) => {
  const [loadingDept, setLoadingDept] = useState<Department | null>(null);
  const [undoLoadingDept, setUndoLoadingDept] = useState<Department | null>(null);

  const departments: { key: Department; title: string; subtitle: string; icon: string }[] = [
    {
      key: 'washroom',
      title: 'Washroom & Bathroom',
      subtitle: 'Toilet, shower, mirror & floor sanitation',
      icon: '🚿',
    },
    {
      key: 'kitchen',
      title: 'Kitchen & Counters',
      subtitle: 'Stove, sink, countertops & floor sweeping',
      icon: '🍳',
    },
  ];

  const handleComplete = async (dept: Department) => {
    setLoadingDept(dept);
    try {
      playChime('success');
      await onCompleteCleaning(dept);
    } finally {
      setLoadingDept(null);
    }
  };

  const handleUndo = async (dept: Department) => {
    setUndoLoadingDept(dept);
    try {
      await onUndoCleaning(dept);
    } finally {
      setUndoLoadingDept(null);
    }
  };

  const weekInfo = getCalendarWeek(currentWeekNumber);

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 sm:p-6 shadow-sm">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6 pb-4 border-b border-slate-100 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-700 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 px-2.5 py-1 rounded-md border border-indigo-200 dark:border-indigo-900/50 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5" />
              <span>{weekInfo.fullRange}</span>
            </span>
            <span className="text-slate-300">·</span>
            <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
              Clean anytime this week (Sun – Sat)
            </span>
          </div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white mt-1.5">
            Weekly Cleaning Rotation
          </h2>
        </div>

        <div className="flex items-center gap-2 text-xs text-slate-500 bg-slate-50 dark:bg-slate-800/60 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 shrink-0">
          <ArrowRightLeft className="w-3.5 h-3.5 text-slate-400" />
          <span>Fair equal circulation (No teams)</span>
        </div>
      </div>

      {/* 2 Department Cards: Washroom and Kitchen */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {departments.map(({ key, title, subtitle, icon }) => {
          const duty = cleaningDuties[key];
          const assignee = members.find((m) => m.id === duty.assignedPersonId);
          const isMyDuty = currentMember && currentMember.id === duty.assignedPersonId;
          const isCompleted = duty.status === 'completed';
          const isMissed = duty.status === 'missed';
          const canUndo = isCompleted && currentMember && currentMember.id === duty.assignedPersonId;

          return (
            <div
              key={key}
              className={`rounded-xl border p-4.5 flex flex-col justify-between transition-all ${
                isCompleted
                  ? 'border-emerald-200 dark:border-emerald-900/60 bg-emerald-50/40 dark:bg-emerald-950/20'
                  : isMissed
                  ? 'border-rose-200 dark:border-rose-900/60 bg-rose-50/40 dark:bg-rose-950/20'
                  : isMyDuty
                  ? 'border-slate-900 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/40 shadow-sm'
                  : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/80'
              }`}
            >
              <div>
                {/* Department top line */}
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="flex items-center gap-2.5">
                    <span className="text-2xl p-1.5 bg-slate-100 dark:bg-slate-800 rounded-lg">
                      {icon}
                    </span>
                    <div>
                      <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                        {title}
                      </h4>
                      <p className="text-[11px] text-slate-500 leading-tight">
                        {subtitle}
                      </p>
                    </div>
                  </div>

                  {/* Status Indicator */}
                  {isCompleted ? (
                    <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 flex items-center gap-1 shrink-0">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Done
                    </span>
                  ) : isMissed ? (
                    <span className="text-xs font-semibold text-rose-700 dark:text-rose-400 flex items-center gap-1 shrink-0">
                      <AlertTriangle className="w-3.5 h-3.5" /> Missed (+1)
                    </span>
                  ) : (
                    <span className="text-xs text-slate-500 shrink-0">
                      Pending
                    </span>
                  )}
                </div>

                {/* Assignee Info */}
                <div className="flex items-center justify-between py-2.5 px-3 bg-white/80 dark:bg-slate-800/80 rounded-lg border border-slate-200/60 dark:border-slate-700/60 mb-4">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{assignee?.avatarEmoji || '👤'}</span>
                    <div>
                      <div className="text-xs font-semibold text-slate-900 dark:text-white flex items-center gap-1.5">
                        <span>{assignee?.name || 'Assignee'}</span>
                        {isMyDuty && (
                          <span className="text-[10px] font-semibold px-1.5 py-0.5 bg-slate-900 text-white rounded">
                            You
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] text-slate-500">
                        {assignee?.missedTasks ? `${assignee.missedTasks} missed tasks` : '0 missed'}
                      </div>
                    </div>
                  </div>

                  {isCompleted && duty.completedAt && (
                    <div className="text-right text-[10px] text-slate-500">
                      Cleaned {new Date(duty.completedAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                    </div>
                  )}
                </div>

                {/* Missed Reason Box (Visible to ALL housemates with AI Review status!) */}
                {isMissed && (
                  <div className="mb-4 p-3 bg-rose-50 dark:bg-rose-950/40 rounded-xl border border-rose-200 dark:border-rose-900/60 text-xs text-rose-900 dark:text-rose-200 space-y-2">
                    <div className="font-semibold flex items-center justify-between flex-wrap gap-1">
                      <span>Reason Submitted:</span>
                      {duty.reasonValidated ? (
                        <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 dark:bg-emerald-950 px-2 py-0.5 rounded-full flex items-center gap-1">
                          <CheckCircle2 className="w-2.5 h-2.5" />
                          AI Approved (-1 Deducted)
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold text-indigo-700 dark:text-indigo-300 bg-indigo-100 dark:bg-indigo-950/80 px-2 py-0.5 rounded-full flex items-center gap-1">
                          <Bot className="w-2.5 h-2.5 text-indigo-600 dark:text-indigo-400" />
                          Pending AI Review
                        </span>
                      )}
                    </div>

                    {duty.missedReason ? (
                      <p className="italic">"{duty.missedReason}"</p>
                    ) : (
                      <p className="text-[11px] text-rose-600 dark:text-rose-300">
                        Marked missed (+1). Reason can be submitted to AI within 3 days.
                      </p>
                    )}

                    {onOpenAiChat && (
                      <div className="pt-1.5 flex items-center justify-between border-t border-rose-200/50 dark:border-rose-900/40">
                        <span className="text-[10px] text-slate-500">AI Overseer Review</span>
                        <button
                          type="button"
                          onClick={() => onOpenAiChat(key)}
                          className="px-2.5 py-1 text-[11px] font-bold text-indigo-700 dark:text-indigo-300 bg-white dark:bg-slate-800 border border-indigo-200 dark:border-indigo-800 rounded-lg hover:bg-indigo-50 flex items-center gap-1 shadow-2xs"
                        >
                          <Bot className="w-3 h-3 text-indigo-600" />
                          <span>View AI Assessment</span>
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80">
                {!isCompleted && !isMissed ? (
                  isMyDuty ? (
                    <div className="flex flex-col sm:flex-row items-center gap-2">
                      <button
                        onClick={() => handleComplete(key)}
                        disabled={loadingDept === key}
                        className="w-full sm:flex-1 py-2.5 px-3 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-xl shadow transition-colors flex items-center justify-center gap-1.5 min-h-[44px]"
                      >
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        <span>{loadingDept === key ? 'Marking...' : 'Mark as Completed'}</span>
                      </button>

                      <button
                        onClick={() => onOpenMissedReason(key)}
                        title="Submit reason why you missed or cannot complete"
                        className="w-full sm:w-auto px-3 py-2.5 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 text-xs font-medium rounded-xl border border-rose-200 dark:border-rose-900 transition-colors text-center min-h-[44px]"
                      >
                        Cannot complete / Missed
                      </button>
                    </div>
                  ) : (
                    <div className="p-2.5 bg-slate-100 dark:bg-slate-800 text-slate-400 text-xs rounded-xl flex items-center justify-center gap-1.5 select-none min-h-[44px]">
                      <Lock className="w-3.5 h-3.5 text-slate-400" />
                      <span>Locked · Assigned to {assignee?.name}</span>
                    </div>
                  )
                ) : isCompleted ? (
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-emerald-700 dark:text-emerald-400 font-medium">
                      Completed by {duty.completedBy || assignee?.name} ✓
                    </span>
                    {canUndo && (
                      <button
                        onClick={() => handleUndo(key)}
                        disabled={undoLoadingDept === key}
                        className="text-xs text-slate-500 hover:text-slate-900 dark:hover:text-white flex items-center gap-1 px-2.5 py-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                      >
                        <RotateCcw className="w-3 h-3" />
                        <span>{undoLoadingDept === key ? 'Reverting...' : 'Undo'}</span>
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-2">
                    <span className="text-xs text-rose-600 font-medium py-1">
                      Missed for Week {currentWeekNumber} (+1 recorded)
                    </span>
                    {isMyDuty && !duty.missedReason && (
                      <button
                        onClick={() => onOpenMissedReason(key)}
                        className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold rounded-lg shadow-xs flex items-center gap-1.5 transition-colors"
                      >
                        <Bot className="w-3.5 h-3.5" />
                        <span>Submit Reason to AI (3-Day Grace)</span>
                      </button>
                    )}
                    {duty.missedReason && onOpenAiChat && (
                      <button
                        onClick={() => onOpenAiChat(key)}
                        className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 text-xs font-semibold rounded-lg border border-indigo-200 dark:border-indigo-800 flex items-center gap-1.5 transition-colors"
                      >
                        <Bot className="w-3.5 h-3.5 text-indigo-600" />
                        <span>Open AI Review</span>
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
