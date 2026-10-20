import React from 'react';
import { ArrowRight, Lock, Settings } from 'lucide-react';
import type { HouseMember, HouseState } from '../types.js';

interface HousematesGridProps {
  members: HouseMember[];
  currentMember: HouseMember | null;
  state: HouseState;
  onOpenAdmin?: () => void;
  onEditName?: () => void;
}

export const HousematesGrid: React.FC<HousematesGridProps> = ({
  members,
  currentMember,
  state,
  onOpenAdmin,
  onEditName,
}) => {
  const pendingExcusesCount = (state.missedReasons || []).filter((r) => !r.reviewedAt).length;

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 sm:p-6 shadow-sm w-full max-w-full overflow-hidden">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
        <div>
          <h3 className="text-base font-bold text-slate-900 dark:text-white">
            Housemates ({members.length})
          </h3>
          <p className="text-xs text-slate-500">
            Work circulates equally so everyone cleans Washroom & Kitchen evenly
          </p>
        </div>

        {/* Discreet Settings trigger for Guna */}
        {currentMember?.isAdmin && onOpenAdmin && (
          <button
            onClick={onOpenAdmin}
            className="self-start sm:self-auto px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors"
          >
            <Settings className="w-3.5 h-3.5 text-slate-500" />
            <span>Settings</span>
            {pendingExcusesCount > 0 && (
              <span className="px-1.5 py-0.2 text-[10px] bg-rose-500 text-white rounded-full font-bold">
                {pendingExcusesCount}
              </span>
            )}
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {members.map((member) => {
          const isMe = currentMember && currentMember.id === member.id;
          const isTrashTurn = state.trashRotation.currentAssignedPersonId === member.id;

          const isWashroom = state.cleaningDuties.washroom.assignedPersonId === member.id;
          const isKitchen = state.cleaningDuties.kitchen.assignedPersonId === member.id;
          const isCleaningThisWeek = isWashroom || isKitchen;

          const cleaningDept = isWashroom ? 'Washroom' : isKitchen ? 'Kitchen' : null;
          const cleaningStatus = isWashroom
            ? state.cleaningDuties.washroom.status
            : isKitchen
            ? state.cleaningDuties.kitchen.status
            : null;

          return (
            <div
              key={member.id}
              className={`p-3.5 rounded-xl border transition-all ${
                isMe
                  ? 'border-slate-900 dark:border-white bg-slate-50 dark:bg-slate-800/60 shadow-sm'
                  : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900'
              }`}
            >
              <div className="flex items-start justify-between gap-2 mb-2.5">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-xl shrink-0">
                    {member.avatarEmoji}
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5 truncate">
                      <span className="truncate">{member.name}</span>
                      {isMe && (
                        <div className="flex items-center gap-1 shrink-0">
                          <span className="text-[10px] font-semibold px-1.5 py-0.5 bg-slate-900 text-white rounded">
                            You
                          </span>
                          {onEditName && (
                            <button
                              type="button"
                              onClick={onEditName}
                              title="Edit your display name & avatar"
                              className="text-[10px] font-semibold text-indigo-600 dark:text-indigo-400 hover:underline px-1 py-0.2 bg-indigo-50 dark:bg-indigo-950/60 rounded"
                            >
                              Edit
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                    <div className="text-[11px] text-slate-400">
                      Housemate
                    </div>
                  </div>
                </div>

                {/* Missed Tasks Counter */}
                <div className="text-right shrink-0">
                  <span
                    title="Number of tasks missed by this housemate"
                    className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold rounded-lg ${
                      member.missedTasks === 0
                        ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200/50 dark:border-emerald-900/40'
                        : 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-900/40'
                    }`}
                  >
                    <span>{member.missedTasks}</span>
                    <span className="text-[10px] font-medium opacity-80">missed</span>
                  </span>
                </div>
              </div>

              {/* Status */}
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 text-xs space-y-1.5">
                <div className="flex items-center justify-between text-slate-600 dark:text-slate-400">
                  <span>Cleaning this week:</span>
                  <span className="font-medium text-slate-800 dark:text-slate-200">
                    {isCleaningThisWeek ? (
                      <span>
                        {cleaningDept} ({cleaningStatus === 'completed' ? 'Done ✓' : cleaningStatus === 'missed' ? 'Missed (+1)' : 'Pending'})
                      </span>
                    ) : (
                      <span className="text-slate-400">Rest Week</span>
                    )}
                  </span>
                </div>

                <div className="flex items-center justify-between text-slate-600 dark:text-slate-400">
                  <span>Trash Duty:</span>
                  <span className="font-medium">
                    {isTrashTurn ? (
                      <span className="text-amber-600 dark:text-amber-400 font-semibold">
                        Active Turn 🗑️
                      </span>
                    ) : (
                      <span className="text-slate-400">Waiting</span>
                    )}
                  </span>
                </div>

                <div className="flex items-center justify-between text-slate-600 dark:text-slate-400 pt-0.5">
                  <span>Account:</span>
                  <span className="font-medium">
                    {member.hasPassword ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/50 px-1.5 py-0.5 rounded border border-emerald-200/60 dark:border-emerald-800/60">
                        <Lock className="w-2.5 h-2.5" /> Password Set 🔒
                      </span>
                    ) : (
                      <span className="text-amber-600 dark:text-amber-400 text-[10px] font-medium">
                        First-time setup
                      </span>
                    )}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
