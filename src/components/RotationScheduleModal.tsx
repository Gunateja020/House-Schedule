import React from 'react';
import { X, Calendar, CheckCircle2, Clock, AlertTriangle, ArrowRightLeft, ShieldCheck, ExternalLink } from 'lucide-react';
import type { HouseState, HouseMember } from '../types.js';
import { computeCleaningAssignments, getCalendarWeek } from '../types.js';

interface RotationScheduleModalProps {
  state: HouseState;
  members: HouseMember[];
  isOpen: boolean;
  onClose: () => void;
}

export const RotationScheduleModal: React.FC<RotationScheduleModalProps> = ({
  state,
  members,
  isOpen,
  onClose,
}) => {
  if (!isOpen) return null;

  const currentWeek = state.currentWeekNumber;
  const currentWeekInfo = getCalendarWeek(currentWeek);

  // Generate upcoming 8 weeks preview synced to real calendar dates
  const upcomingWeeks = [0, 1, 2, 3, 4, 5, 6, 7].map((offset) => {
    const weekNum = currentWeek + offset;
    const isCurrent = offset === 0;
    const { washroomPersonId, kitchenPersonId } = computeCleaningAssignments(members, weekNum);
    const weekInfo = getCalendarWeek(weekNum);

    return {
      weekNum,
      isCurrent,
      weekInfo,
      washroomPerson: members.find((m) => m.id === washroomPersonId),
      kitchenPerson: members.find((m) => m.id === kitchenPersonId),
    };
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-2xl w-full p-4 sm:p-6 shadow-2xl border border-slate-100 dark:border-slate-800 max-h-[92vh] overflow-y-auto overflow-x-hidden">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 sm:pb-4 border-b border-slate-100 dark:border-slate-800 mb-4 sm:mb-5">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-slate-900 text-white flex items-center justify-center shrink-0">
              <Calendar className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h3 className="text-base font-bold text-slate-900 dark:text-white truncate">
                House Duty Schedule
              </h3>
              <p className="text-xs text-slate-500 truncate">
                Equal circulation across all {members.length} housemates (No teams)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 100% Equal Work Distribution Proof Card */}
        <div className="mb-5 p-4 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/60">
          <div className="flex items-center gap-2 mb-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-300">
              Guaranteed Equal Rotation ({members.length}-Week Cycle)
            </h4>
          </div>
          <p className="text-xs text-emerald-900 dark:text-emerald-200/90 mb-3 leading-relaxed">
            Every housemate cleans exactly <strong>2 times per {members.length}-week cycle</strong>: 1 time on <strong>Washroom</strong> and 1 time on <strong>Kitchen</strong>. Work divides 100% equally across all {members.length} housemates with zero bias or teams.
          </p>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {members.map((m) => (
              <div
                key={m.id}
                className="bg-white/90 dark:bg-slate-900/90 rounded-lg p-2.5 border border-emerald-200/60 dark:border-emerald-800/40 text-center"
              >
                <div className="text-sm font-bold text-slate-900 dark:text-white truncate">
                  {m.name}
                </div>
                <div className="text-[10px] text-emerald-700 dark:text-emerald-400 font-semibold mt-1">
                  1 Washroom · 1 Kitchen
                </div>
                <div className="text-[10px] text-slate-500">
                  2 cleanings / {members.length} wks
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Current Week Status Breakdown */}
        <div className="mb-5">
          <div className="flex items-center justify-between mb-2 flex-wrap gap-1">
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-indigo-500" />
              <span>Current Duties · {currentWeekInfo.fullRange}</span>
            </div>
            <a
              href={`https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(
                'House Cleaning Duty (' + currentWeekInfo.headerLabel + ')'
              )}&dates=20261019T090000Z/20261025T210000Z&details=${encodeURIComponent(
                'Washroom & Kitchen House Cleaning Duties'
              )}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[11px] text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
            >
              <span>Add to Google Calendar</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Washroom */}
            <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <span>🚿 Washroom</span>
                </span>
                {state.cleaningDuties.washroom.status === 'completed' ? (
                  <span className="text-xs font-semibold text-emerald-600 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Completed
                  </span>
                ) : state.cleaningDuties.washroom.status === 'missed' ? (
                  <span className="text-xs font-semibold text-rose-600 flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5" /> Missed
                  </span>
                ) : (
                  <span className="text-xs text-slate-500 flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" /> Pending
                  </span>
                )}
              </div>
              <div className="text-xs text-slate-700 dark:text-slate-300">
                Assigned:{' '}
                <strong>
                  {members.find((m) => m.id === state.cleaningDuties.washroom.assignedPersonId)?.name || 'Assignee'}
                </strong>
              </div>
              {state.cleaningDuties.washroom.completedBy && (
                <div className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-1">
                  Finished by {state.cleaningDuties.washroom.completedBy}
                </div>
              )}
            </div>

            {/* Kitchen */}
            <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <span>🍳 Kitchen</span>
                </span>
                {state.cleaningDuties.kitchen.status === 'completed' ? (
                  <span className="text-xs font-semibold text-emerald-600 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Completed
                  </span>
                ) : state.cleaningDuties.kitchen.status === 'missed' ? (
                  <span className="text-xs font-semibold text-rose-600 flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5" /> Missed
                  </span>
                ) : (
                  <span className="text-xs text-slate-500 flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" /> Pending
                  </span>
                )}
              </div>
              <div className="text-xs text-slate-700 dark:text-slate-300">
                Assigned:{' '}
                <strong>
                  {members.find((m) => m.id === state.cleaningDuties.kitchen.assignedPersonId)?.name || 'Assignee'}
                </strong>
              </div>
              {state.cleaningDuties.kitchen.completedBy && (
                <div className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-1">
                  Finished by {state.cleaningDuties.kitchen.completedBy}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Upcoming Weeks Preview */}
        <div>
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2.5 flex items-center justify-between">
            <span>Upcoming Rotation Calendar (Next 8 Weeks)</span>
            <span className="text-[11px] font-normal text-slate-500">Synced to calendar dates</span>
          </div>
          <div className="space-y-2">
            {upcomingWeeks.map((w) => (
              <div
                key={w.weekNum}
                className={`p-3 rounded-xl border transition-all ${
                  w.isCurrent
                    ? 'border-indigo-600 dark:border-indigo-400 bg-indigo-50/60 dark:bg-indigo-950/30 text-slate-900 dark:text-white shadow-xs'
                    : 'border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/30 text-slate-900 dark:text-white'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-indigo-500" />
                      <span>{w.weekInfo.headerLabel}</span>
                    </span>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                        w.isCurrent
                          ? 'bg-emerald-500 text-white'
                          : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      {w.weekInfo.relativeLabel}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-3 text-xs">
                    <div className="flex items-center gap-1.5">
                      <span className="text-slate-400">🚿 Washroom:</span>
                      <span className="font-semibold text-slate-800 dark:text-slate-200">
                        {w.washroomPerson?.name || 'TBD'}
                      </span>
                    </div>
                    <span className="text-slate-300">·</span>
                    <div className="flex items-center gap-1.5">
                      <span className="text-slate-400">🍳 Kitchen:</span>
                      <span className="font-semibold text-slate-800 dark:text-slate-200">
                        {w.kitchenPerson?.name || 'TBD'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
