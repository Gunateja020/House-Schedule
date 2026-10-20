import React, { useState } from 'react';
import { Bell, CheckCircle2 } from 'lucide-react';
import { requestNotificationPermission, isAlertsConfirmed, setAlertsConfirmed } from '../utils/notifications.js';

interface NotificationPromptBannerProps {
  currentPermission: NotificationPermission | 'unsupported';
  onPermissionChange: (perm: NotificationPermission) => void;
}

export const NotificationPromptBanner: React.FC<NotificationPromptBannerProps> = ({
  currentPermission,
  onPermissionChange,
}) => {
  const [dismissed, setDismissed] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  if (isAlertsConfirmed() || currentPermission === 'granted' || currentPermission === 'unsupported' || dismissed) {
    return null;
  }

  const handleEnable = async () => {
    const res = await requestNotificationPermission();
    setAlertsConfirmed(true);
    if (res.permission === 'granted') {
      onPermissionChange('granted');
    } else {
      setFeedback(res.message || 'Alert reminders active.');
      setTimeout(() => setFeedback(null), 4000);
    }
  };

  return (
    <div className="bg-amber-500 text-slate-950 px-4 py-2.5 shadow-sm text-xs font-medium">
      <div className="max-w-6xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Bell className="w-4 h-4 shrink-0 animate-bounce" />
          <span>
            <strong>Action required:</strong> Enable browser notifications to receive 4-day trash reminders & chore alerts on your phone.
          </span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={handleEnable}
            className="px-3.5 py-1.5 bg-slate-950 text-white rounded-lg font-semibold hover:bg-slate-800 transition-colors whitespace-nowrap min-h-[36px] flex items-center gap-1.5 shadow-xs"
          >
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            Enable Alerts
          </button>
          <button
            onClick={() => setDismissed(true)}
            className="text-slate-900/80 hover:text-slate-950 underline px-1 text-[11px]"
          >
            Dismiss
          </button>
        </div>
      </div>
      {feedback && (
        <div className="max-w-6xl mx-auto mt-1 text-[11px] font-normal opacity-95">
          {feedback}
        </div>
      )}
    </div>
  );
};
