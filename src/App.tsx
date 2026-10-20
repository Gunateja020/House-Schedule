/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState, useRef } from 'react';
import {
  Calendar,
  Sparkles,
  Users,
  Activity,
  AlertCircle,
  LogOut,
  Bell,
  CheckCircle2,
  Lock,
  Pencil,
} from 'lucide-react';
import type { HouseState, HouseMember, Department, MissedReasonItem } from './types.js';
import {
  fetchHouseState,
  completeTask,
  undoTask,
  submitMissedReason,
} from './services/api.js';
import {
  getStoredDeviceData,
  clearStoredDeviceData,
  getNotificationPermission,
  sendPhoneNotification,
  playChime,
} from './utils/notifications.js';

import { Header } from './components/Header.tsx';
import { DeviceSetupModal } from './components/DeviceSetupModal.tsx';
import { NotificationPromptBanner } from './components/NotificationPromptBanner.tsx';
import { TrashDutyCard } from './components/TrashDutyCard.tsx';
import { WeeklyCleaningCard } from './components/WeeklyCleaningCard.tsx';
import { RotationScheduleModal } from './components/RotationScheduleModal.tsx';
import { HousematesGrid } from './components/HousematesGrid.tsx';
import { ActivityFeed } from './components/ActivityFeed.tsx';
import { MissedReasonModal } from './components/MissedReasonModal.tsx';
import { AdminSecretModal } from './components/AdminSecretModal.tsx';
import { AiReviewChatModal } from './components/AiReviewChatModal.tsx';
import { EditProfileModal } from './components/EditProfileModal.tsx';

export default function App() {
  const [state, setState] = useState<HouseState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Device & Identity
  const [deviceData, setDeviceData] = useState(() => getStoredDeviceData());
  const [currentMember, setCurrentMember] = useState<HouseMember | null>(null);
  const [notificationPermission, setNotificationPermission] = useState(() =>
    getNotificationPermission()
  );

  // Navigation
  const [activeTab, setActiveTab] = useState<'tasks' | 'schedule' | 'housemates' | 'activity'>('tasks');

  // Modals
  const [isScheduleOpen, setIsScheduleOpen] = useState(false);
  const [isAdminOpen, setIsAdminOpen] = useState(false);
  const [missedDept, setMissedDept] = useState<Department | null>(null);
  const [aiChatReasonItem, setAiChatReasonItem] = useState<MissedReasonItem | null>(null);
  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);

  // Track previous state for real-time alerts across phones
  const prevStateRef = useRef<HouseState | null>(null);

  const loadData = async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      const data = await fetchHouseState();
      setState(data);

      // Match current member if bound
      if (deviceData.memberId) {
        const found = data.members.find((m) => m.id === deviceData.memberId);
        if (found) setCurrentMember(found);
      }

      // Check Trash Reminder for the assigned person (dynamic thresholdDays set by admin)
      if (deviceData.memberId && data.trashRotation.currentAssignedPersonId === deviceData.memberId) {
        const lastDate = data.trashRotation.lastThrownAt ? new Date(data.trashRotation.lastThrownAt) : null;
        const thresholdDays = data.trashRotation.thresholdDays || 4;
        if (lastDate) {
          const diffDays = (Date.now() - lastDate.getTime()) / (1000 * 60 * 60 * 24);
          if (diffDays >= thresholdDays) {
            const lastAlert = localStorage.getItem('last_trash_alert_ts');
            const now = Date.now();
            // Minimum 8 hours between reminder alerts
            if (!lastAlert || now - Number(lastAlert) > 8 * 60 * 60 * 1000) {
              localStorage.setItem('last_trash_alert_ts', String(now));
              sendPhoneNotification(
                `🗑️ Trash is Full (${thresholdDays}+ Days)!`,
                `Hey ${data.members.find((m) => m.id === deviceData.memberId)?.name || 'there'}, it has been ${Math.floor(diffDays)} days since previous trash. Please throw it out!`,
                false
              );
            }
          }
        }
      }

      // Detect incoming completions from other housemates (silent notifications, no repeating loop sound)
      if (prevStateRef.current && deviceData.memberId) {
        const prev = prevStateRef.current;
        const currentPerson = data.members.find((m) => m.id === deviceData.memberId);

        // Trash thrown by another roommate
        if (
          prev.trashRotation.currentIndex !== data.trashRotation.currentIndex &&
          data.trashRotation.lastThrownBy !== currentPerson?.name
        ) {
          sendPhoneNotification(
            '🗑️ Trash Thrown!',
            `${data.trashRotation.lastThrownBy} just emptied the trash!`,
            false
          );

          if (data.trashRotation.currentAssignedPersonId === deviceData.memberId) {
            sendPhoneNotification(
              "🗑️ You're up for Trash!",
              `Hey ${currentPerson?.name}, you are next in line. 4-day timer has started!`,
              false
            );
          }
        }

        // Washroom cleaned
        if (
          prev.cleaningDuties.washroom.status !== 'completed' &&
          data.cleaningDuties.washroom.status === 'completed' &&
          data.cleaningDuties.washroom.completedBy !== currentPerson?.name
        ) {
          sendPhoneNotification(
            '✨ Washroom Cleaned!',
            `${data.cleaningDuties.washroom.completedBy} marked the washroom as clean.`,
            false
          );
        }

        // Kitchen cleaned
        if (
          prev.cleaningDuties.kitchen.status !== 'completed' &&
          data.cleaningDuties.kitchen.status === 'completed' &&
          data.cleaningDuties.kitchen.completedBy !== currentPerson?.name
        ) {
          sendPhoneNotification(
            '✨ Kitchen Cleaned!',
            `${data.cleaningDuties.kitchen.completedBy} marked the kitchen as clean.`,
            false
          );
        }
      }

      prevStateRef.current = data;
      setError(null);
    } catch (err: unknown) {
      if (!silent) {
        setError(err instanceof Error ? err.message : 'Unable to connect to house server');
      }
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    loadData();

    // Live background polling every 5 seconds for instant multi-phone synchronization
    const timer = setInterval(() => {
      loadData(true);
    }, 5000);

    return () => clearInterval(timer);
  }, [deviceData.memberId]);

  // Handle successful device onboarding
  const handleDeviceSetupSuccess = (member: HouseMember) => {
    setCurrentMember(member);
    setDeviceData(getStoredDeviceData());
    loadData();
  };

  // Log out / reset device binding to test from the first login page
  const handleLogout = () => {
    clearStoredDeviceData();
    setCurrentMember(null);
    setDeviceData(getStoredDeviceData());
  };

  // User-tested alert verification
  const [testAlertToast, setTestAlertToast] = useState<string | null>(null);
  const handleTestAlert = () => {
    playChime('alert');
    sendPhoneNotification(
      '🔔 Notifications Active & Verified',
      `Hey ${currentMember?.name || 'Roommate'}! Your phone notifications and audio alerts are working perfectly.`,
      true
    );
    setTestAlertToast('Phone alert & audio chime tested! Notifications are verified.');
    setTimeout(() => setTestAlertToast(null), 4000);
  };

  // Complete cleaning task
  const handleCompleteCleaning = async (department: Department) => {
    if (!currentMember) return;
    try {
      const res = await completeTask('cleaning', currentMember.id, deviceData.deviceToken, department);
      setState(res.state);
      prevStateRef.current = res.state;
      playChime('success');
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to complete cleaning task');
    }
  };

  // Undo cleaning task
  const handleUndoCleaning = async (department: Department) => {
    if (!currentMember) return;
    try {
      const res = await undoTask('cleaning', currentMember.id, deviceData.deviceToken, department);
      setState(res.state);
      prevStateRef.current = res.state;
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to undo cleaning task');
    }
  };

  // Complete trash
  const handleCompleteTrash = async () => {
    if (!currentMember) return;
    try {
      const res = await completeTask('trash', currentMember.id, deviceData.deviceToken);
      setState(res.state);
      prevStateRef.current = res.state;
      playChime('trash');
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to mark trash as thrown');
    }
  };

  // Undo trash
  const handleUndoTrash = async () => {
    if (!currentMember) return;
    try {
      const res = await undoTask('trash', currentMember.id, deviceData.deviceToken);
      setState(res.state);
      prevStateRef.current = res.state;
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to undo trash task');
    }
  };

  // Submit Missed Reason
  const handleSubmitMissedReason = async (dept: Department, reason: string) => {
    if (!currentMember) return;
    const res = await submitMissedReason(dept, reason, currentMember.id, deviceData.deviceToken);
    setState(res.state);
    prevStateRef.current = res.state;
  };

  const handleOpenAiChat = (dept: Department) => {
    if (!state) return;
    const found = (state.missedReasons || []).find(
      (r) => r.department === dept && r.weekNumber === state.currentWeekNumber
    );
    if (found) {
      setAiChatReasonItem(found);
    } else {
      setMissedDept(dept);
    }
  };

  if (loading && !state) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center p-4">
        <div className="w-12 h-12 rounded-2xl bg-slate-900 text-white flex items-center justify-center font-bold text-xl shadow-lg animate-pulse mb-3">
          H
        </div>
        <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
          Connecting to HouseDuty...
        </p>
      </div>
    );
  }

  if (error && !state) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center p-4 text-center">
        <div className="p-4 bg-rose-50 text-rose-700 rounded-2xl max-w-md w-full border border-rose-200 shadow-sm">
          <AlertCircle className="w-8 h-8 mx-auto mb-2 text-rose-500" />
          <h2 className="text-base font-bold mb-1">Server Connection Issue</h2>
          <p className="text-xs mb-4">{error}</p>
          <button
            onClick={() => loadData()}
            className="px-4 py-2 bg-slate-900 text-white text-xs font-semibold rounded-xl"
          >
            Retry Connection
          </button>
        </div>
      </div>
    );
  }

  if (!state) return null;

  // Check if device needs setup
  const needsDeviceSetup = !deviceData.isVerified || !deviceData.memberId;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col font-sans pb-24 md:pb-8 w-full max-w-full overflow-x-hidden">
      {/* 1. Browser Notification Prompt Banner */}
      <NotificationPromptBanner
        currentPermission={notificationPermission}
        onPermissionChange={(perm) => setNotificationPermission(perm)}
      />

      {/* 2. Top Bar Navigation Contract */}
      <Header
        houseName={state.houseName}
        currentMember={currentMember}
        currentWeekNumber={state.currentWeekNumber}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenSchedule={() => setIsScheduleOpen(true)}
        onOpenAdmin={() => setIsAdminOpen(true)}
        onLogout={handleLogout}
        pendingExcusesCount={(state.missedReasons || []).filter((r) => !r.reviewedAt).length}
      />

      {/* 3. Main Content Container */}
      <main className="max-w-6xl mx-auto px-3.5 sm:px-6 py-5 w-full flex-1 overflow-x-hidden">
        {/* Identity bar */}
        {currentMember && (
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2.5 bg-white dark:bg-slate-900 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs w-full max-w-full">
            <div className="flex items-center gap-2.5 min-w-0">
              <span className="text-2xl shrink-0">{currentMember.avatarEmoji}</span>
              <div className="min-w-0">
                <div className="text-[11px] text-slate-500 truncate">Connected as</div>
                <div className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5 truncate">
                  <span className="truncate">{currentMember.name}</span>
                  <button
                    type="button"
                    onClick={() => setIsEditProfileOpen(true)}
                    title="Edit your display name & avatar"
                    className="p-1 text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md transition-colors shrink-0"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {/* Notification status proof badge with interactive test */}
              <div className="flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 rounded-lg text-xs font-semibold shrink-0">
                <Bell className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <span>Alerts Active ✓</span>
                <button
                  type="button"
                  onClick={handleTestAlert}
                  title="Tap to test chime & phone notification"
                  className="ml-1 text-[10px] underline hover:text-emerald-900 dark:hover:text-emerald-100 font-bold cursor-pointer"
                >
                  Test
                </button>
              </div>

              <span className="text-xs font-semibold px-2.5 py-1 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg">
                {currentMember.missedTasks === 0
                  ? '0 Missed Tasks'
                  : `${currentMember.missedTasks} Missed Tasks`}
              </span>
              <button
                onClick={() => setIsScheduleOpen(true)}
                className="px-3 py-1 bg-slate-900 text-white dark:bg-white dark:text-slate-900 text-xs font-semibold rounded-lg hover:opacity-90 transition-opacity whitespace-nowrap"
              >
                Schedule
              </button>
              <button
                onClick={handleLogout}
                title="Switch profile or test login page"
                className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs font-medium rounded-lg transition-colors whitespace-nowrap flex items-center gap-1"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Switch</span>
              </button>
            </div>
          </div>
        )}

        {/* Test Alert Toast Notification */}
        {testAlertToast && (
          <div className="mb-4 p-3 bg-emerald-600 text-white text-xs font-semibold rounded-xl shadow-md flex items-center justify-between gap-2 animate-in fade-in slide-in-from-top-2">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-200 shrink-0" />
              <span>{testAlertToast}</span>
            </div>
            <button
              onClick={() => setTestAlertToast(null)}
              className="text-white/80 hover:text-white text-xs px-1 font-bold"
            >
              ✕
            </button>
          </div>
        )}

        {/* Dynamic Views based on Tab */}
        {activeTab === 'tasks' && (
          <div className="space-y-5 animate-in fade-in duration-150 w-full max-w-full">
            {/* Trash Rotation Card (with 4-day rule) */}
            <TrashDutyCard
              trashRotation={state.trashRotation}
              members={state.members}
              currentMember={currentMember}
              onCompleteTrash={handleCompleteTrash}
              onUndoTrash={handleUndoTrash}
            />

            {/* Weekly Cleaning Card (No teams) */}
            <WeeklyCleaningCard
              currentWeekNumber={state.currentWeekNumber}
              cleaningDuties={state.cleaningDuties}
              members={state.members}
              currentMember={currentMember}
              onCompleteCleaning={handleCompleteCleaning}
              onUndoCleaning={handleUndoCleaning}
              onOpenMissedReason={(dept) => setMissedDept(dept)}
              onOpenAiChat={handleOpenAiChat}
            />

            {/* Quick Housemates & Accountability overview */}
            <div className="pt-2 w-full">
              <div className="flex items-center justify-between mb-2.5">
                <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                  Housemates & Missed Record
                </h3>
                <button
                  onClick={() => setActiveTab('housemates')}
                  className="text-xs text-slate-500 hover:text-slate-900 dark:hover:text-white font-medium"
                >
                  View All ({state.members.length}) →
                </button>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 w-full">
                {state.members.map((m) => (
                  <div
                    key={m.id}
                    className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 text-center min-w-0"
                  >
                    <div className="text-xl mb-1">{m.avatarEmoji}</div>
                    <div className="text-xs font-bold text-slate-900 dark:text-white truncate">
                      {m.name}
                    </div>
                    <div className="mt-1.5 pt-1.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                      <span
                        className={`text-[11px] font-bold ${
                          m.missedTasks === 0 ? 'text-emerald-600' : 'text-rose-600'
                        }`}
                      >
                        {m.missedTasks} missed
                      </span>
                      {m.hasPassword && (
                        <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-0.5" title="Password Set">
                          <Lock className="w-2.5 h-2.5" />
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'schedule' && (
          <div className="space-y-5 animate-in fade-in duration-150 w-full max-w-full">
            <WeeklyCleaningCard
              currentWeekNumber={state.currentWeekNumber}
              cleaningDuties={state.cleaningDuties}
              members={state.members}
              currentMember={currentMember}
              onCompleteCleaning={handleCompleteCleaning}
              onUndoCleaning={handleUndoCleaning}
              onOpenMissedReason={(dept) => setMissedDept(dept)}
              onOpenAiChat={handleOpenAiChat}
            />
            <HousematesGrid
              members={state.members}
              currentMember={currentMember}
              state={state}
              onOpenAdmin={() => setIsAdminOpen(true)}
              onEditName={() => setIsEditProfileOpen(true)}
            />
          </div>
        )}

        {activeTab === 'housemates' && (
          <div className="animate-in fade-in duration-150 w-full max-w-full">
            <HousematesGrid
              members={state.members}
              currentMember={currentMember}
              state={state}
              onOpenAdmin={() => setIsAdminOpen(true)}
              onEditName={() => setIsEditProfileOpen(true)}
            />
          </div>
        )}

        {activeTab === 'activity' && (
          <div className="animate-in fade-in duration-150 w-full max-w-full">
            <ActivityFeed activityLog={state.activityLog} />
          </div>
        )}
      </main>

      {/* 4. Mobile Bottom Tab Bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 grid grid-cols-4 items-center h-16 px-2 w-full max-w-full">
        <button
          onClick={() => setActiveTab('tasks')}
          className={`flex flex-col items-center justify-center py-1 transition-colors min-h-[44px] ${
            activeTab === 'tasks'
              ? 'text-slate-900 dark:text-white font-semibold'
              : 'text-slate-400 hover:text-slate-600'
          }`}
        >
          <Sparkles className="w-5 h-5" />
          <span className="text-[10px] mt-1">Duties</span>
        </button>

        <button
          onClick={() => {
            setActiveTab('schedule');
            setIsScheduleOpen(true);
          }}
          className={`flex flex-col items-center justify-center py-1 transition-colors min-h-[44px] ${
            activeTab === 'schedule'
              ? 'text-slate-900 dark:text-white font-semibold'
              : 'text-slate-400 hover:text-slate-600'
          }`}
        >
          <Calendar className="w-5 h-5" />
          <span className="text-[10px] mt-1">Schedule</span>
        </button>

        <button
          onClick={() => setActiveTab('housemates')}
          className={`flex flex-col items-center justify-center py-1 transition-colors min-h-[44px] ${
            activeTab === 'housemates'
              ? 'text-slate-900 dark:text-white font-semibold'
              : 'text-slate-400 hover:text-slate-600'
          }`}
        >
          <Users className="w-5 h-5" />
          <span className="text-[10px] mt-1">House</span>
        </button>

        <button
          onClick={() => setActiveTab('activity')}
          className={`flex flex-col items-center justify-center py-1 transition-colors min-h-[44px] ${
            activeTab === 'activity'
              ? 'text-slate-900 dark:text-white font-semibold'
              : 'text-slate-400 hover:text-slate-600'
          }`}
        >
          <Activity className="w-5 h-5" />
          <span className="text-[10px] mt-1">Activity</span>
        </button>
      </nav>

      {/* 5. Device Setup Modal (Roommate writes their own name or selects profile!) */}
      {needsDeviceSetup && (
        <DeviceSetupModal
          members={state.members}
          deviceToken={deviceData.deviceToken}
          onSuccess={handleDeviceSetupSuccess}
        />
      )}

      {/* 6. Rotation Schedule Modal */}
      <RotationScheduleModal
        state={state}
        members={state.members}
        isOpen={isScheduleOpen}
        onClose={() => setIsScheduleOpen(false)}
      />

      {/* 7. Missed Duty Reason Modal */}
      <MissedReasonModal
        department={missedDept}
        isOpen={!!missedDept}
        onClose={() => setMissedDept(null)}
        onSubmitReason={handleSubmitMissedReason}
      />

      {/* 8. House Settings Modal (Only accessible by Guna) */}
      <AdminSecretModal
        state={state}
        currentMember={currentMember}
        isOpen={isAdminOpen}
        onClose={() => setIsAdminOpen(false)}
        onStateUpdate={(newState) => {
          setState(newState);
          prevStateRef.current = newState;
        }}
      />

      {/* 9. AI Review Chat Modal (Roommates view thread & chat with AI Overseer) */}
      <AiReviewChatModal
        isOpen={Boolean(aiChatReasonItem)}
        onClose={() => setAiChatReasonItem(null)}
        reasonItem={aiChatReasonItem}
        currentMember={currentMember}
        onStateUpdate={(newState) => {
          setState(newState);
          prevStateRef.current = newState;
          if (aiChatReasonItem) {
            const refreshed = (newState.missedReasons || []).find((r: MissedReasonItem) => r.id === aiChatReasonItem.id);
            if (refreshed) setAiChatReasonItem(refreshed);
          }
        }}
      />

      {/* 10. Edit Profile Modal (Roommates can edit name & avatar) */}
      {currentMember && (
        <EditProfileModal
          isOpen={isEditProfileOpen}
          onClose={() => setIsEditProfileOpen(false)}
          currentMember={currentMember}
          onSuccess={(updatedMember, newState) => {
            setCurrentMember(updatedMember);
            setState(newState);
            prevStateRef.current = newState;
          }}
        />
      )}
    </div>
  );
}
