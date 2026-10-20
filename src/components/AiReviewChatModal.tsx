import React, { useState } from 'react';
import { X, Bot, Send, Sparkles, AlertCircle, CheckCircle2, ShieldAlert } from 'lucide-react';
import type { MissedReasonItem, HouseMember } from '../types.js';
import { sendAiReviewReply } from '../services/api.js';

interface AiReviewChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  reasonItem: MissedReasonItem | null;
  currentMember: HouseMember | null;
  onStateUpdate: (newState: any) => void;
}

export const AiReviewChatModal: React.FC<AiReviewChatModalProps> = ({
  isOpen,
  onClose,
  reasonItem,
  currentMember,
  onStateUpdate,
}) => {
  const [replyText, setReplyText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !reasonItem) return null;

  const isMyReason = currentMember && currentMember.id === reasonItem.personId;
  const isResolved = reasonItem.status === 'ai_approved' || reasonItem.status === 'ai_disapproved';

  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyText.trim() || !currentMember) return;

    setIsSubmitting(true);
    setError(null);
    try {
      const res = await sendAiReviewReply(reasonItem.id, replyText.trim(), currentMember.id);
      onStateUpdate(res.state);
      setReplyText('');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to send message to AI');
    } finally {
      setIsSubmitting(false);
    }
  };

  const messages = reasonItem.messages || [
    {
      id: 'msg_initial',
      sender: 'roommate' as const,
      senderName: reasonItem.personName,
      text: reasonItem.reason,
      timestamp: reasonItem.submittedAt,
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-lg w-full p-4 sm:p-6 shadow-2xl border border-slate-100 dark:border-slate-800 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 mb-4 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-xs">
              <Bot className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  AI Duty Assessment
                </h3>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-300 border border-indigo-200/50">
                  {reasonItem.status === 'ai_approved'
                    ? 'AI Approved (-1)'
                    : reasonItem.status === 'ai_disapproved'
                    ? 'AI Rejected (+1)'
                    : 'Pending AI Review'}
                </span>
              </div>
              <p className="text-[11px] text-slate-500">
                {reasonItem.personName} · {reasonItem.department === 'washroom' ? 'Washroom' : 'Kitchen'} (Week {reasonItem.weekNumber})
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
          <div className="mb-3 p-2.5 bg-rose-50 text-rose-700 text-xs rounded-xl border border-rose-200 shrink-0">
            {error}
          </div>
        )}

        {/* Message Thread */}
        <div className="flex-1 overflow-y-auto space-y-3 p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-800 mb-3 text-xs">
          {messages.map((msg) => {
            const isAi = msg.sender === 'ai';
            return (
              <div
                key={msg.id}
                className={`p-3 rounded-xl max-w-[88%] ${
                  isAi
                    ? 'bg-indigo-600 text-white ml-auto shadow-sm'
                    : 'bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 mr-auto border border-slate-200 dark:border-slate-700 shadow-xs'
                }`}
              >
                <div className="flex items-center justify-between text-[10px] font-bold opacity-80 mb-1 gap-2">
                  <span className="flex items-center gap-1">
                    {isAi && <Sparkles className="w-2.5 h-2.5" />}
                    <span>{isAi ? 'House AI Overseer' : msg.senderName}</span>
                  </span>
                  <span>{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
                <div className="text-xs leading-relaxed">{msg.text}</div>
              </div>
            );
          })}
        </div>

        {/* Status Banner */}
        {isResolved ? (
          <div
            className={`p-3 rounded-xl text-xs font-semibold flex items-center gap-2 shrink-0 ${
              reasonItem.status === 'ai_approved'
                ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-200 border border-emerald-200'
                : 'bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-200 border border-rose-200'
            }`}
          >
            {reasonItem.status === 'ai_approved' ? (
              <>
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>AI Final Verdict: Excuse approved! 1 missed task was deducted (-1).</span>
              </>
            ) : (
              <>
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>AI Final Verdict: Excuse rejected. Missed chore penalty (+1) remains.</span>
              </>
            )}
          </div>
        ) : isMyReason ? (
          <form onSubmit={handleSendReply} className="flex gap-2 shrink-0">
            <input
              type="text"
              placeholder="Reply to AI Overseer with details..."
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              className="flex-1 px-3.5 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-600"
              required
            />
            <button
              type="submit"
              disabled={isSubmitting || !replyText.trim()}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl shadow transition-colors flex items-center gap-1.5 disabled:opacity-50 min-h-[40px]"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Send</span>
            </button>
          </form>
        ) : (
          <p className="text-[11px] text-slate-400 text-center italic shrink-0">
            Only the assigned roommate ({reasonItem.personName}) can reply to the AI.
          </p>
        )}
      </div>
    </div>
  );
};
