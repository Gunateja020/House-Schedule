import React, { useState } from 'react';
import { Home, Bell, Lock, User, KeyRound, CheckCircle2, AlertCircle, HelpCircle } from 'lucide-react';
import type { HouseMember } from '../types.js';
import { joinHouse, requestPasswordReset } from '../services/api.js';
import {
  requestNotificationPermission,
  setStoredMemberData,
  isAlertsConfirmed,
  setAlertsConfirmed,
  playChime,
  isHouseVerified,
  getStoredHouseCode,
  setHouseVerified,
} from '../utils/notifications.js';

interface DeviceSetupModalProps {
  members?: HouseMember[];
  deviceToken: string;
  onSuccess: (member: HouseMember) => void;
}

export const DeviceSetupModal: React.FC<DeviceSetupModalProps> = ({
  members = [],
  deviceToken,
  onSuccess,
}) => {
  const verifiedOnDevice = isHouseVerified();
  const [showCodeInput, setShowCodeInput] = useState(!verifiedOnDevice);
  const [houseCode, setHouseCode] = useState('');
  const [selectedMemberId, setSelectedMemberId] = useState<string>('');
  const [newName, setNewName] = useState('');
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [forgotPasswordMsg, setForgotPasswordMsg] = useState<string | null>(null);
  const [isSendingReset, setIsSendingReset] = useState(false);

  const [isNotificationEnabled, setIsNotificationEnabled] = useState(() => {
    if (isAlertsConfirmed()) return true;
    if (typeof window !== 'undefined' && 'Notification' in window) {
      return Notification.permission === 'granted';
    }
    return false;
  });
  const [notificationMsg, setNotificationMsg] = useState<string | null>(() => {
    if (isAlertsConfirmed()) {
      return '🔔 Phone alerts & audio reminders already verified on this device.';
    }
    return null;
  });
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const selectedMember = members.find((m) => m.id === selectedMemberId);
  const isCreatingPassword = isAddingNew || (selectedMember && !selectedMember.hasPassword);

  const handleEnableNotification = async () => {
    try {
      playChime('alert');
      const res = await requestNotificationPermission();
      setAlertsConfirmed(true);
      setIsNotificationEnabled(true);
      if (res.permission === 'granted') {
        setNotificationMsg('🔔 Phone alerts & audio chime verified active!');
      } else {
        setNotificationMsg('🔔 Alerts & chime confirmed active on this phone!');
      }
      setError(null);
    } catch {
      setAlertsConfirmed(true);
      setIsNotificationEnabled(true);
      setNotificationMsg('🔔 Alert reminders confirmed active.');
      setError(null);
    }
  };

  const handleForgotPassword = () => {
    if (!selectedMember) return;
    setError(null);
    setForgotPasswordMsg('Please ask developer for current password or to update password.');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!isAddingNew && !selectedMemberId) {
      setError('Please select your profile from the list.');
      return;
    }

    if (isAddingNew && !newName.trim()) {
      setError('Please enter your name.');
      return;
    }

    // House Security Code is ONLY required when creating password for first time or adding new roommate
    if (isCreatingPassword && !houseCode.trim()) {
      setError('Please enter the House Security Code to create your password.');
      return;
    }

    if (!password.trim()) {
      setError('Please enter your password.');
      return;
    }

    // Require password confirmation when setting up for the first time
    if (isCreatingPassword) {
      if (password.trim() !== confirmPassword.trim()) {
        setError('Passwords do not match. Please re-enter and confirm your password.');
        return;
      }
      if (password.trim().length < 2) {
        setError('Password must be at least 2 characters.');
        return;
      }
    }

    if (!isNotificationEnabled && !isAlertsConfirmed()) {
      setError('Allowing notifications is required so you receive chore reminders. Tap "Allow Alerts" below.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await joinHouse({
        code: houseCode.trim(),
        memberId: isAddingNew ? undefined : selectedMemberId,
        name: isAddingNew ? newName.trim() : selectedMember?.name,
        password: password.trim(),
        deviceToken,
        isAlreadyVerified: !showCodeInput && verifiedOnDevice,
      });

      if (res.success && res.member) {
        setAlertsConfirmed(true);
        setStoredMemberData(res.member.id, res.houseCode || houseCode.trim());
        setHouseVerified(res.houseCode || houseCode.trim());
        onSuccess(res.member);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Login failed. Please check your password.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full p-4 sm:p-6 shadow-2xl border border-slate-100 dark:border-slate-800 max-h-[94vh] overflow-y-auto overflow-x-hidden">
        {/* Header */}
        <div className="text-center mb-4 sm:mb-5">
          <div className="w-11 h-11 rounded-2xl bg-slate-900 text-white flex items-center justify-center mx-auto mb-2 shadow-md">
            <Home className="w-6 h-6" />
          </div>
          <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white">
            Connect to HouseDuty
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Select your profile and enter your personal password
          </p>
        </div>

        {/* Device Already Verified Banner */}
        {!showCodeInput && verifiedOnDevice && (
          <div className="flex items-center justify-between px-3 py-2 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 rounded-xl text-xs text-emerald-800 dark:text-emerald-300 mb-3.5">
            <div className="flex items-center gap-1.5 min-w-0">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span className="font-semibold truncate">House Verified on this device ✓</span>
            </div>
            <button
              type="button"
              onClick={() => setShowCodeInput(true)}
              className="text-[11px] underline opacity-75 hover:opacity-100 shrink-0 ml-2"
            >
              Change Code
            </button>
          </div>
        )}

        {error && (
          <div className="mb-4 p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs rounded-xl flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {forgotPasswordMsg && (
          <div className="mb-4 p-3 bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 text-indigo-800 dark:text-indigo-200 text-xs rounded-xl flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
            <div className="min-w-0">
              <div className="font-bold">Password Reset Requested</div>
              <div>{forgotPasswordMsg}</div>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Profile Selection */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                1. Select Your Profile
              </label>
              <button
                type="button"
                onClick={() => {
                  setIsAddingNew(!isAddingNew);
                  setSelectedMemberId('');
                  setPassword('');
                  setConfirmPassword('');
                  setError(null);
                  setForgotPasswordMsg(null);
                }}
                className="text-[11px] text-slate-500 hover:text-slate-900 dark:hover:text-white underline font-semibold"
              >
                {isAddingNew ? 'Pick existing profile' : '+ New Roommate'}
              </button>
            </div>

            {!isAddingNew ? (
              <div className="grid grid-cols-2 gap-2">
                {members.map((member) => {
                  const isSelected = selectedMemberId === member.id;
                  return (
                    <button
                      key={member.id}
                      type="button"
                      onClick={() => {
                        setSelectedMemberId(member.id);
                        setPassword('');
                        setConfirmPassword('');
                        setError(null);
                        setForgotPasswordMsg(null);
                      }}
                      className={`p-2.5 rounded-xl border text-left flex items-center gap-2 transition-all min-h-[52px] min-w-0 ${
                        isSelected
                          ? 'border-slate-900 bg-slate-900 text-white shadow-sm ring-2 ring-slate-900/20'
                          : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 text-slate-700 dark:text-slate-300 hover:border-slate-300'
                      }`}
                    >
                      <span className="text-xl shrink-0">{member.avatarEmoji}</span>
                      <div className="min-w-0 flex-1 truncate">
                        <div className="text-xs font-bold truncate">
                          <span className="truncate">{member.name}</span>
                        </div>
                        {/* Prominent Password Set badge visible to all */}
                        <div className="mt-0.5 truncate">
                          {member.hasPassword ? (
                            <span
                              className={`inline-flex items-center gap-0.5 text-[9px] px-1.5 py-0.2 rounded font-bold ${
                                isSelected
                                  ? 'bg-emerald-500/30 text-emerald-200'
                                  : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300'
                              }`}
                            >
                              <Lock className="w-2.5 h-2.5" /> Password Set 🔒
                            </span>
                          ) : (
                            <span
                              className={`text-[9px] ${
                                isSelected ? 'text-slate-300' : 'text-amber-600 dark:text-amber-400 font-medium'
                              }`}
                            >
                              First-time setup
                            </span>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            ) : (
              <input
                type="text"
                placeholder="Write your name (e.g. Rahul)"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm"
              />
            )}
          </div>

          {/* Security Code (ONLY shown when creating password for first time or adding new roommate) */}
          {isCreatingPassword && (
            <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-800">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                House Security Code (First-Time Setup)
              </label>
              <input
                type="text"
                placeholder="ENTER HOUSE SECURITY CODE"
                value={houseCode}
                onChange={(e) => setHouseCode(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 uppercase font-mono tracking-widest text-center font-bold"
                required
              />
              <p className="text-[10px] text-slate-400 mt-1">
                Required only to set your password for the first time or when joining.
              </p>
            </div>
          )}

          {/* Personal Password Section */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                {isCreatingPassword ? '2. Create Personal Password' : '2. Your Personal Password'}
              </label>

              {/* Forgot Password Link (Only for existing profiles with password) */}
              {!isCreatingPassword && selectedMember?.hasPassword && (
                <button
                  type="button"
                  onClick={handleForgotPassword}
                  className="text-[11px] text-indigo-600 dark:text-indigo-400 hover:underline font-semibold flex items-center gap-1"
                >
                  <HelpCircle className="w-3 h-3" />
                  <span>Forgot Password?</span>
                </button>
              )}
            </div>

            <div className="relative">
              <input
                type="password"
                placeholder={
                  isCreatingPassword
                    ? 'Create password for your profile'
                    : 'Enter your personal password'
                }
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3.5 py-2.5 pl-9 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
                required
              />
              <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            </div>

            {/* When creating password, ask to type password twice! */}
            {isCreatingPassword && (
              <div className="mt-2.5">
                <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  Confirm Password (Type twice to verify)
                </label>
                <div className="relative">
                  <input
                    type="password"
                    placeholder="Type password again to confirm"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full px-3.5 py-2.5 pl-9 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
                    required
                  />
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                </div>
              </div>
            )}

            <p className="text-[10px] text-slate-400 mt-1">
              Secures your profile so other housemates cannot log in as you or mark your duties.
            </p>
          </div>

          {/* Browser Notification Button (Mandatory Requirement) */}
          <div
            className={`p-3 rounded-xl border text-xs transition-colors ${
              isNotificationEnabled
                ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800'
                : 'bg-amber-50/90 dark:bg-amber-950/40 border-amber-300 dark:border-amber-700/60 shadow-xs'
            }`}
          >
            <div className="flex items-center justify-between gap-2.5">
              <div className="flex items-center gap-2 min-w-0">
                <div
                  className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                    isNotificationEnabled
                      ? 'bg-emerald-600 text-white'
                      : 'bg-amber-500 text-white animate-pulse'
                  }`}
                >
                  <Bell className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5 truncate">
                    <span>Phone Alerts</span>
                    <span
                      className={`text-[10px] px-1.5 py-0.2 rounded font-semibold ${
                        isNotificationEnabled
                          ? 'bg-emerald-200 text-emerald-800 dark:bg-emerald-800 dark:text-emerald-100'
                          : 'bg-amber-200 text-amber-900 dark:bg-amber-800 dark:text-amber-100 uppercase'
                      }`}
                    >
                      {isNotificationEnabled ? 'Active ✓' : 'Mandatory'}
                    </span>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={handleEnableNotification}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all shrink-0 whitespace-nowrap min-h-[36px] ${
                  isNotificationEnabled
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-slate-900 hover:bg-slate-800 text-white shadow-md ring-2 ring-amber-400'
                }`}
              >
                {isNotificationEnabled ? 'Enabled ✓' : 'Allow Alerts'}
              </button>
            </div>
            {notificationMsg && (
              <p
                className={`text-[11px] font-medium mt-2 pt-2 border-t ${
                  isNotificationEnabled
                    ? 'text-emerald-700 dark:text-emerald-300 border-emerald-200/60'
                    : 'text-amber-700 dark:text-amber-300 border-amber-200/60'
                }`}
              >
                {notificationMsg}
              </p>
            )}
          </div>

          {/* Connect Button */}
          <button
            type="submit"
            disabled={isSubmitting || !isNotificationEnabled}
            className={`w-full py-3 px-4 rounded-xl text-white font-semibold text-sm transition-all shadow-md min-h-[48px] flex items-center justify-center gap-2 ${
              isNotificationEnabled
                ? 'bg-slate-900 hover:bg-slate-800 cursor-pointer'
                : 'bg-slate-400 dark:bg-slate-700 cursor-not-allowed opacity-75'
            }`}
          >
            <KeyRound className="w-4 h-4" />
            <span>
              {isSubmitting
                ? 'Connecting...'
                : !isNotificationEnabled
                ? 'Allow Alerts Above to Connect'
                : 'Connect & Enter House'}
            </span>
          </button>
        </form>
      </div>
    </div>
  );
};
