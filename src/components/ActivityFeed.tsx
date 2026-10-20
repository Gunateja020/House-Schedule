import React from 'react';
import { CheckCircle2, Trash2, Calendar, AlertTriangle, ShieldCheck, UserPlus, UserMinus, Ban, Sparkles } from 'lucide-react';
import type { ActivityItem } from '../types.js';

interface ActivityFeedProps {
  activityLog: ActivityItem[];
}

export const ActivityFeed: React.FC<ActivityFeedProps> = ({ activityLog }) => {
  // Only household activity is recorded! Filter out any legacy password activities
  const cleanLogs = activityLog.filter((item) => !item.type.includes('password'));

  if (cleanLogs.length === 0) {
    return (
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-8 text-center text-slate-500 shadow-sm">
        <p className="text-sm font-medium">No activity recorded yet.</p>
        <p className="text-xs text-slate-400 mt-1">Completed duties and announcements appear here.</p>
      </div>
    );
  }

  const getIcon = (type: ActivityItem['type']) => {
    switch (type) {
      case 'cleaning_completed':
        return <CheckCircle2 className="w-4 h-4 text-emerald-500" />;
      case 'trash_completed':
        return <Trash2 className="w-4 h-4 text-amber-500" />;
      case 'task_missed':
        return <AlertTriangle className="w-4 h-4 text-rose-500" />;
      case 'reason_validated':
        return <Sparkles className="w-4 h-4 text-emerald-500" />;
      case 'reason_disapproved':
        return <Ban className="w-4 h-4 text-rose-500" />;
      case 'member_joined':
        return <UserPlus className="w-4 h-4 text-indigo-500" />;
      case 'member_removed':
        return <UserMinus className="w-4 h-4 text-slate-500" />;
      default:
        return <Calendar className="w-4 h-4 text-slate-500" />;
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 sm:p-6 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base font-bold text-slate-900 dark:text-white">
          House Activity Stream
        </h3>
        <span className="text-xs text-slate-500">Live sync across all devices</span>
      </div>

      <div className="space-y-3">
        {cleanLogs.map((item) => (
          <div
            key={item.id}
            className="flex items-start gap-3 p-3.5 rounded-xl border border-slate-100 dark:border-slate-800/80 bg-slate-50/60 dark:bg-slate-800/30"
          >
            <div className="p-2 rounded-lg bg-white dark:bg-slate-800 shadow-xs shrink-0 mt-0.5">
              {getIcon(item.type)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <h4 className="text-xs font-bold text-slate-900 dark:text-white truncate">
                  {item.title}
                </h4>
                <time className="text-[10px] text-slate-400 shrink-0 tabular-nums">
                  {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </time>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">
                {item.details}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
