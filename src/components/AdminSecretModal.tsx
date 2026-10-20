import React, { useState, useEffect } from 'react';
import {
  X,
  ShieldCheck,
  Check,
  Ban,
  Users,
  Trash2,
  CheckCircle2,
  KeyRound,
  UserPlus,
  Lock,
  Eye,
  EyeOff,
  Send,
  Bot,
  AlertCircle,
  Clock,
  Sparkles,
} from 'lucide-react';
import type { HouseState, HouseMember } from '../types.js';
import {
  validateReason,
  sendAiReviewReply,
  fetchAdminPasswords,
  updateConfig,
  removeMember,
  addMember,
  adminResetPassword,
} from '../services/api.js';

interface AdminSecretModalProps {
  state: HouseState;
  currentMember: HouseMember | null;
  isOpen: boolean;
  onClose: () => void;
  onStateUpdate: (newState: HouseState) => void;
}

export const AdminSecretModal: React.FC<AdminSecretModalProps> = ({
  state,
  currentMember,
  isOpen,
  onClose,
  onStateUpdate,
}) => {
  const [newHouseCode, setNewHouseCode] = useState(state.houseCode);
  const [newHouseName, setNewHouseName] = useState(state.houseName);
  const [trashDays, setTrashDays] = useState<number>(state.trashRotation.thresholdDays || 4);
  const [saveStatus, setSaveStatus] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Add new roommate form
  const [showAddMember, setShowAddMember] = useState(false);
  const [newMemberName, setNewMemberName] = useState('');

  // Password visibility and update state
  const [memberPasswords, setMemberPasswords] = useState<Record<string, string>>({});
  const [showPasswords, setShowPasswords] = useState<Record<string, boolean>>({});
  const [editingPasswordFor, setEditingPasswordFor] = useState<string | null>(null);
  const [newPasswordInput, setNewPasswordInput] = useState('');

  // AI Review chat state (Admin replying disguised as AI)
  const [aiCustomReplies, setAiCustomReplies] = useState<Record<string, string>>({});
  const [verdictNotes, setVerdictNotes] = useState<Record<string, string>>({});

  const adminMemberId = currentMember?.id || 'm_guna';

  // Fetch all plain text passwords when opened so Guna can see and tell roommates directly!
  useEffect(() => {
    if (isOpen) {
      fetchAdminPasswords(adminMemberId)
        .then((res) => {
          const map: Record<string, string> = {};
          res.passwords.forEach((p) => {
            map[p.id] = p.password;
          });
          setMemberPasswords(map);
        })
        .catch((err) => console.error('Failed to load member passwords', err));
    }
  }, [isOpen, adminMemberId]);

  if (!isOpen) return null;

  // AI Decision: Validate reason (Approve deducts 1, Disapprove keeps +1)
  const handleValidateReason = async (reasonId: string, valid: boolean) => {
    setActionLoading(true);
    try {
      const note = verdictNotes[reasonId];
      const res = await validateReason(reasonId, valid, adminMemberId, note);
      onStateUpdate(res.state);
      setSaveStatus(
        valid
          ? 'AI Decision logged: Excuse approved! 1 missed task was deducted (-1).'
          : 'AI Decision logged: Excuse rejected. Missed task remains (+1).'
      );
      setVerdictNotes((prev) => {
        const next = { ...prev };
        delete next[reasonId];
        return next;
      });
      setTimeout(() => setSaveStatus(null), 4000);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Action failed');
    } finally {
      setActionLoading(false);
    }
  };

  // Send message disguised as AI
  const handleSendAiMessage = async (reasonId: string, textOverride?: string) => {
    const textToSend = textOverride || aiCustomReplies[reasonId];
    if (!textToSend || !textToSend.trim()) return;

    setActionLoading(true);
    try {
      const res = await sendAiReviewReply(reasonId, textToSend.trim(), adminMemberId);
      onStateUpdate(res.state);
      setSaveStatus('Message sent as AI Overseer to roommate!');
      setAiCustomReplies((prev) => ({ ...prev, [reasonId]: '' }));
      setTimeout(() => setSaveStatus(null), 3000);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to send AI message');
    } finally {
      setActionLoading(false);
    }
  };

  // Remove housemate
  const handleRemovePerson = async (memberId: string, memberName: string) => {
    if (!confirm(`Are you sure you want to remove ${memberName} from the house?`)) {
      return;
    }
    setActionLoading(true);
    try {
      const res = await removeMember(memberId, adminMemberId);
      onStateUpdate(res.state);
      setSaveStatus(`${memberName} was removed from the house.`);
      setTimeout(() => setSaveStatus(null), 3500);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to remove member');
    } finally {
      setActionLoading(false);
    }
  };

  // Add new roommate directly
  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMemberName.trim()) return;
    setActionLoading(true);
    try {
      const res = await addMember(newMemberName.trim(), adminMemberId);
      onStateUpdate(res.state);
      setSaveStatus(`${newMemberName.trim()} added! Work circulation updated equally.`);
      setNewMemberName('');
      setShowAddMember(false);
      setTimeout(() => setSaveStatus(null), 3500);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to add roommate');
    } finally {
      setActionLoading(false);
    }
  };

  // Admin updates a roommate's password
  const handleUpdatePassword = async (targetMemberId: string, targetName: string) => {
    if (!newPasswordInput || newPasswordInput.trim().length < 2) {
      alert('Password must be at least 2 characters.');
      return;
    }
    setActionLoading(true);
    try {
      const res = await adminResetPassword({
        adminMemberId,
        targetMemberId,
        newPassword: newPasswordInput.trim(),
      });
      onStateUpdate(res.state);
      setMemberPasswords((prev) => ({ ...prev, [targetMemberId]: newPasswordInput.trim() }));
      setSaveStatus(`Password for ${targetName} updated to "${newPasswordInput.trim()}"!`);
      setEditingPasswordFor(null);
      setNewPasswordInput('');
      setTimeout(() => setSaveStatus(null), 4000);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to update password');
    } finally {
      setActionLoading(false);
    }
  };

  // Update House Security Code, Name, or Trash Frequency
  const handleSaveSettings = async (e?: React.FormEvent, customTrashDays?: number) => {
    if (e) e.preventDefault();
    const finalTrashDays = customTrashDays !== undefined ? customTrashDays : trashDays;

    setActionLoading(true);
    try {
      const res = await updateConfig({
        memberId: adminMemberId,
        newHouseCode: newHouseCode.trim().toUpperCase(),
        newHouseName: newHouseName.trim(),
        trashIntervalDays: finalTrashDays,
      });
      onStateUpdate(res.state);
      setSaveStatus('House Settings & Trash Interval successfully saved!');
      setTimeout(() => setSaveStatus(null), 3500);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to update settings');
    } finally {
      setActionLoading(false);
    }
  };

  const pendingExcuses = (state.missedReasons || []).filter((r) => r.status === 'pending_ai_review' || !r.reviewedAt);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-2xl w-full p-4 sm:p-6 shadow-2xl border border-slate-100 dark:border-slate-800 max-h-[92vh] overflow-y-auto overflow-x-hidden">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 sm:pb-4 border-b border-slate-100 dark:border-slate-800 mb-4 sm:mb-5">
          <div className="flex items-center gap-2.5 sm:gap-3">
            <div className="w-9 h-9 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 flex items-center justify-center shadow-sm shrink-0 font-bold">
              ⚙️
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                House Settings & Controls
              </h3>
              <p className="text-xs text-slate-500">
                Discreet management · Passwords · Trash Interval · AI Review Console
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

        {saveStatus && (
          <div className="mb-4 p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 text-xs font-semibold rounded-xl flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{saveStatus}</span>
          </div>
        )}

        <div className="space-y-6">
          {/* 1. AI Review Console (Admin replies disguised as AI) */}
          <section className="bg-indigo-50/70 dark:bg-indigo-950/30 p-4 rounded-xl border border-indigo-200/70 dark:border-indigo-800/60">
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-indigo-600 text-white flex items-center justify-center text-xs">
                  <Bot className="w-3.5 h-3.5" />
                </div>
                <h4 className="text-sm font-bold text-indigo-950 dark:text-indigo-200">
                  AI Review Console ({pendingExcuses.length} Pending Review)
                </h4>
              </div>
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-indigo-200/70 dark:bg-indigo-900 text-indigo-800 dark:text-indigo-200">
                Disguised as AI
              </span>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300 mb-3">
              Roommates believe the AI reviews their missed chores. You can ask questions, send warnings, or accept/reject. Roommates only see responses coming from "AI Overseer".
            </p>

            {pendingExcuses.length === 0 ? (
              <div className="p-3 bg-white dark:bg-slate-900 rounded-lg border border-indigo-100 dark:border-indigo-900/40 text-center text-xs text-slate-400">
                No pending missed chores under AI review. Everything is up to date!
              </div>
            ) : (
              <div className="space-y-3">
                {pendingExcuses.map((excuse) => (
                  <div
                    key={excuse.id}
                    className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-indigo-200 dark:border-slate-800 space-y-3 shadow-xs"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="text-xs font-bold text-slate-900 dark:text-white">
                          {excuse.personName}
                        </span>
                        <span className="text-xs text-slate-500">
                          {' '}
                          · Week {excuse.weekNumber} ({excuse.department === 'washroom' ? 'Washroom' : 'Kitchen'})
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-400">
                        {new Date(excuse.submittedAt).toLocaleDateString()}
                      </span>
                    </div>

                    {/* Chat / Conversation Messages */}
                    <div className="p-2.5 bg-slate-50 dark:bg-slate-800/60 rounded-lg border border-slate-100 dark:border-slate-800 max-h-48 overflow-y-auto space-y-2 text-xs">
                      {(excuse.messages || [
                        {
                          id: 'msg_initial',
                          sender: 'roommate' as const,
                          senderName: excuse.personName,
                          text: excuse.reason,
                          timestamp: excuse.submittedAt,
                        },
                      ]).map((msg) => (
                        <div
                          key={msg.id}
                          className={`p-2 rounded-lg text-xs ${
                            msg.sender === 'ai'
                              ? 'bg-indigo-600 text-white ml-3 shadow-xs'
                              : 'bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 mr-3 border border-slate-200 dark:border-slate-700'
                          }`}
                        >
                          <div className="flex items-center justify-between text-[10px] font-bold opacity-80 mb-0.5">
                            <span>{msg.sender === 'ai' ? '🤖 House AI Overseer' : msg.senderName}</span>
                            <span>{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          </div>
                          <div>{msg.text}</div>
                        </div>
                      ))}
                    </div>

                    {/* AI Response Templates */}
                    <div>
                      <div className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                        Quick AI Replies:
                      </div>
                      <div className="flex flex-wrap gap-1.5 mb-2">
                        <button
                          type="button"
                          onClick={() =>
                            handleSendAiMessage(
                              excuse.id,
                              'How severe is your condition and how long is it expected to last approx?'
                            )
                          }
                          className="text-[10px] px-2 py-1 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded hover:bg-indigo-100 dark:hover:bg-indigo-950 transition-colors"
                        >
                          "How severe is it & how long will it last?"
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            handleSendAiMessage(
                              excuse.id,
                              'This is your final warning. Next time you must complete your cleaning on schedule.'
                            )
                          }
                          className="text-[10px] px-2 py-1 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded hover:bg-indigo-100 dark:hover:bg-indigo-950 transition-colors"
                        >
                          "This is your final warning..."
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            handleSendAiMessage(
                              excuse.id,
                              'Why was this not swapped with another housemate in advance?'
                            )
                          }
                          className="text-[10px] px-2 py-1 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded hover:bg-indigo-100 dark:hover:bg-indigo-950 transition-colors"
                        >
                          "Why not swapped in advance?"
                        </button>
                      </div>

                      {/* Custom AI Reply Input */}
                      <div className="flex gap-1.5">
                        <input
                          type="text"
                          placeholder="Type response as AI Overseer (roommate sees this from AI)..."
                          value={aiCustomReplies[excuse.id] || ''}
                          onChange={(e) =>
                            setAiCustomReplies({ ...aiCustomReplies, [excuse.id]: e.target.value })
                          }
                          className="flex-1 px-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                        />
                        <button
                          type="button"
                          onClick={() => handleSendAiMessage(excuse.id)}
                          disabled={actionLoading || !aiCustomReplies[excuse.id]?.trim()}
                          className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg flex items-center gap-1 shadow-xs disabled:opacity-50"
                        >
                          <Send className="w-3 h-3" />
                          <span>Send as AI</span>
                        </button>
                      </div>
                    </div>

                    {/* AI Decision Actions */}
                    <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleValidateReason(excuse.id, true)}
                        disabled={actionLoading}
                        className="flex-1 py-2 px-3 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 transition-colors shadow-xs"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>AI Accepts Reason (-1 Missed Deducted)</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleValidateReason(excuse.id, false)}
                        disabled={actionLoading}
                        className="py-2 px-3 bg-rose-100 hover:bg-rose-200 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 text-xs font-bold rounded-lg flex items-center justify-center gap-1 transition-colors"
                      >
                        <Ban className="w-3.5 h-3.5" />
                        <span>AI Rejects (+1 Remains)</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* 2. Roommates & Password Directory (Admin can view or update!) */}
          <section className="bg-slate-50 dark:bg-slate-800/40 p-4 rounded-xl border border-slate-200 dark:border-slate-700/60">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-slate-700 dark:text-slate-300" />
                <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                  Roommates & Passwords Directory ({state.members.length})
                </h4>
              </div>
              <button
                type="button"
                onClick={() => setShowAddMember(!showAddMember)}
                className="text-xs font-semibold px-2.5 py-1 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-lg hover:opacity-90 flex items-center gap-1 shadow-xs"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>{showAddMember ? 'Cancel' : '+ Add Roommate'}</span>
              </button>
            </div>

            <p className="text-xs text-slate-500 mb-3">
              You can see any roommate's current password directly to tell them, or click "Update Password" to set a new one.
            </p>

            {showAddMember && (
              <form onSubmit={handleAddMember} className="mb-3 p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 flex gap-2">
                <input
                  type="text"
                  placeholder="New roommate name (e.g. Rahul)"
                  value={newMemberName}
                  onChange={(e) => setNewMemberName(e.target.value)}
                  className="flex-1 px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-slate-900"
                  required
                />
                <button
                  type="submit"
                  disabled={actionLoading || !newMemberName.trim()}
                  className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg shadow-xs whitespace-nowrap"
                >
                  {actionLoading ? 'Adding...' : 'Add Roommate'}
                </button>
              </form>
            )}

            <div className="space-y-2">
              {state.members.map((m) => {
                const pass = memberPasswords[m.id];
                const isShowing = showPasswords[m.id];
                const isEditing = editingPasswordFor === m.id;

                return (
                  <div
                    key={m.id}
                    className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="text-xl">{m.avatarEmoji}</span>
                        <div className="min-w-0">
                          <div className="text-xs font-bold text-slate-900 dark:text-white truncate">
                            {m.name}
                          </div>
                          <div className="text-[10px] text-slate-400">
                            {m.missedTasks} missed tasks
                          </div>
                        </div>
                      </div>

                      {/* Password Viewer & Action Buttons */}
                      <div className="flex items-center gap-2 flex-wrap">
                        {/* Plain text password display */}
                        <div className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-100 dark:bg-slate-800 rounded-lg text-xs font-mono">
                          <Lock className="w-3 h-3 text-slate-400" />
                          <span className="text-slate-800 dark:text-slate-200 font-bold">
                            {pass ? (isShowing ? pass : '••••••••') : '(No password set)'}
                          </span>
                          {pass && (
                            <button
                              type="button"
                              onClick={() =>
                                setShowPasswords((prev) => ({ ...prev, [m.id]: !prev[m.id] }))
                              }
                              title={isShowing ? 'Hide password' : 'View password'}
                              className="p-0.5 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 ml-1"
                            >
                              {isShowing ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                            </button>
                          )}
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            setEditingPasswordFor(isEditing ? null : m.id);
                            setNewPasswordInput('');
                          }}
                          className="px-2.5 py-1 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 rounded-lg transition-colors flex items-center gap-1 border border-indigo-200/50 dark:border-indigo-900/50"
                        >
                          <KeyRound className="w-3 h-3" />
                          <span>{isEditing ? 'Cancel' : 'Update Password'}</span>
                        </button>

                        {!m.isAdmin && (
                          <button
                            onClick={() => handleRemovePerson(m.id, m.name)}
                            disabled={actionLoading}
                            title={`Remove ${m.name}`}
                            className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Inline password editor */}
                    {isEditing && (
                      <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex gap-2 animate-in fade-in">
                        <input
                          type="text"
                          placeholder={`Set new password for ${m.name}`}
                          value={newPasswordInput}
                          onChange={(e) => setNewPasswordInput(e.target.value)}
                          className="flex-1 px-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                        />
                        <button
                          type="button"
                          onClick={() => handleUpdatePassword(m.id, m.name)}
                          disabled={actionLoading || !newPasswordInput.trim()}
                          className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow-xs whitespace-nowrap"
                        >
                          Save New Password
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>

          {/* 3. Configurable Trash Removal Frequency (Manually set by Admin) */}
          <section className="bg-slate-50 dark:bg-slate-800/40 p-4 rounded-xl border border-slate-200 dark:border-slate-700/60">
            <div className="flex items-center gap-2 mb-1.5">
              <Clock className="w-4 h-4 text-slate-700 dark:text-slate-300" />
              <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                Trash Removal Frequency (Days)
              </h4>
            </div>
            <p className="text-xs text-slate-500 mb-3">
              Set how many days once trash should be thrown out. The filling timer and reminder alerts will automatically adapt to your chosen schedule.
            </p>

            <div className="flex flex-wrap items-center gap-2 mb-3">
              {[1, 2, 3, 4, 5, 7].map((days) => (
                <button
                  key={days}
                  type="button"
                  onClick={() => {
                    setTrashDays(days);
                    handleSaveSettings(undefined, days);
                  }}
                  className={`px-3 py-1.5 text-xs font-bold rounded-lg border transition-all ${
                    trashDays === days
                      ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 border-slate-900 shadow-xs'
                      : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700 hover:border-slate-400'
                  }`}
                >
                  {days === 1 ? 'Every Day' : `${days} Days`}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-600 dark:text-slate-400 font-medium">
                Custom Interval:
              </span>
              <input
                type="number"
                min={1}
                max={30}
                value={trashDays}
                onChange={(e) => setTrashDays(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-20 px-2.5 py-1 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-bold text-center"
              />
              <span className="text-xs text-slate-500">days once</span>
              <button
                type="button"
                onClick={() => handleSaveSettings(undefined, trashDays)}
                disabled={actionLoading}
                className="ml-auto px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg shadow-xs"
              >
                Save Interval
              </button>
            </div>
          </section>

          {/* 4. House Security Code & House Name */}
          <section className="bg-slate-50 dark:bg-slate-800/40 p-4 rounded-xl border border-slate-200 dark:border-slate-700/60">
            <div className="flex items-center gap-2 mb-1.5">
              <KeyRound className="w-4 h-4 text-slate-700 dark:text-slate-300" />
              <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                House Security Code
              </h4>
            </div>
            <p className="text-xs text-slate-500 mb-3">
              Only needed when a new roommate joins or sets their password for the first time. Even if you change this code now, existing roommates with passwords can still log in without any issues.
            </p>

            <form onSubmit={handleSaveSettings} className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                    Security Code
                  </label>
                  <input
                    type="text"
                    value={newHouseCode}
                    onChange={(e) => setNewHouseCode(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm font-mono tracking-wider uppercase font-semibold"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                    House Name
                  </label>
                  <input
                    type="text"
                    value={newHouseName}
                    onChange={(e) => setNewHouseName(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm"
                  />
                </div>
              </div>
              <button
                type="submit"
                disabled={actionLoading}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors"
              >
                Save Security Code
              </button>
            </form>
          </section>
        </div>
      </div>
    </div>
  );
};
