import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import type { HouseState, HouseMember, CleaningDuty, Department, MissedReasonItem, ActivityItem } from './src/types.js';
import { computeCleaningAssignments, getCalendarWeek } from './src/types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT) || 3000;
const DATA_DIR = path.join(__dirname, 'data');
const STATE_FILE = path.join(DATA_DIR, 'house_state.json');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

function createInitialState(): HouseState {
  const initialMembers: HouseMember[] = [
    {
      id: 'm_guna',
      name: 'Gunateja',
      isAdmin: true, // Gunateja has exclusive secret admin access!
      missedTasks: 0,
      avatarColor: 'bg-emerald-500',
      avatarEmoji: '👑',
      joinedAt: new Date().toISOString(),
    },
    {
      id: 'm_naveen',
      name: 'Naveen',
      isAdmin: false,
      missedTasks: 0,
      avatarColor: 'bg-indigo-500',
      avatarEmoji: '🚀',
      joinedAt: new Date().toISOString(),
    },
    {
      id: 'm_aditya_m',
      name: 'Aditya M',
      isAdmin: false,
      missedTasks: 0,
      avatarColor: 'bg-amber-500',
      avatarEmoji: '🌟',
      joinedAt: new Date().toISOString(),
    },
    {
      id: 'm_aditya',
      name: 'Aditya',
      isAdmin: false,
      missedTasks: 0,
      avatarColor: 'bg-rose-500',
      avatarEmoji: '🎯',
      joinedAt: new Date().toISOString(),
    },
  ];

  const assignments = computeCleaningAssignments(initialMembers, 1);
  const initialTrashDate = new Date(Date.now() - 4.2 * 24 * 60 * 60 * 1000).toISOString();

  return {
    houseName: 'Our House',
    houseCode: 'HOUSE2026',
    adminMemberId: 'm_guna',
    currentWeekNumber: 1,
    members: initialMembers,
    cleaningDuties: {
      washroom: {
        department: 'washroom',
        assignedPersonId: assignments.washroomPersonId,
        status: 'pending',
        completedAt: null,
        completedBy: null,
        missedReason: null,
        reasonValidated: false,
      },
      kitchen: {
        department: 'kitchen',
        assignedPersonId: assignments.kitchenPersonId,
        status: 'pending',
        completedAt: null,
        completedBy: null,
        missedReason: null,
        reasonValidated: false,
      },
    },
    trashRotation: {
      order: initialMembers.map((m) => m.id),
      currentIndex: 0,
      currentAssignedPersonId: initialMembers[0].id,
      lastThrownAt: initialTrashDate,
      lastThrownBy: initialMembers[initialMembers.length - 1].name,
      thresholdDays: 4,
    },
    missedReasons: [],
    activityLog: [
      {
        id: 'act_init',
        type: 'week_advanced',
        personId: 'system',
        personName: 'House Duty',
        title: 'Week 1 Cleaning Started',
        details: 'Gunateja on Washroom · Naveen on Kitchen. (Aditya M & Aditya on duty Week 2)',
        timestamp: new Date().toISOString(),
      },
    ],
  };
}

let state: HouseState = (() => {
  if (fs.existsSync(STATE_FILE)) {
    try {
      const data = fs.readFileSync(STATE_FILE, 'utf-8');
      const parsed = JSON.parse(data);
      // Ensure Gunateja, Naveen, aditya M, aditya exist
      const hasGuna = parsed.members && parsed.members.some((m: HouseMember) => m.name.toLowerCase().includes('guna'));
      if (!hasGuna) {
        const s = createInitialState();
        fs.writeFileSync(STATE_FILE, JSON.stringify(s, null, 2));
        return s;
      }
      return parsed;
    } catch {
      const s = createInitialState();
      fs.writeFileSync(STATE_FILE, JSON.stringify(s, null, 2));
      return s;
    }
  } else {
    const s = createInitialState();
    fs.writeFileSync(STATE_FILE, JSON.stringify(s, null, 2));
    return s;
  }
})();

function saveState() {
  try {
    fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
  } catch (err) {
    console.error('Failed to save house state', err);
  }
}

function syncCalendarWeekIfNeeded() {
  const BASE_SUNDAY = new Date('2026-10-18T00:00:00.000Z').getTime();
  const now = Date.now();
  const diffDays = Math.floor((now - BASE_SUNDAY) / (1000 * 60 * 60 * 24));
  const calculatedWeekNumber = Math.max(1, Math.floor(diffDays / 7) + 1);

  if (calculatedWeekNumber > state.currentWeekNumber) {
    // Previous week ended: any duties left pending automatically become missed!
    (['washroom', 'kitchen'] as Department[]).forEach((dept) => {
      const duty = state.cleaningDuties[dept];
      if (duty && duty.status === 'pending') {
        duty.status = 'missed';
        const assignee = state.members.find((m) => m.id === duty.assignedPersonId);
        if (assignee) {
          assignee.missedTasks = (assignee.missedTasks || 0) + 1;
          const deptName = dept === 'washroom' ? 'Washroom' : 'Kitchen';
          state.activityLog.unshift({
            id: 'act_' + Date.now() + '_' + dept,
            type: 'task_missed',
            personId: assignee.id,
            personName: assignee.name,
            title: `${assignee.name} missed cleaning ${deptName} (+1 Missed)`,
            details: `Week ended without completion (+1 added). Reason can be submitted to AI within 3 days.`,
            timestamp: new Date().toISOString(),
          });
        }
      }
    });

    state.currentWeekNumber = calculatedWeekNumber;
    const assignments = computeCleaningAssignments(state.members, state.currentWeekNumber);
    state.cleaningDuties = {
      washroom: {
        department: 'washroom',
        assignedPersonId: assignments.washroomPersonId,
        status: 'pending',
        completedAt: null,
        completedBy: null,
        missedReason: null,
        reasonValidated: false,
      },
      kitchen: {
        department: 'kitchen',
        assignedPersonId: assignments.kitchenPersonId,
        status: 'pending',
        completedAt: null,
        completedBy: null,
        missedReason: null,
        reasonValidated: false,
      },
    };

    const washName = state.members.find((m) => m.id === assignments.washroomPersonId)?.name;
    const kitName = state.members.find((m) => m.id === assignments.kitchenPersonId)?.name;
    const weekInfo = getCalendarWeek(state.currentWeekNumber);
    state.activityLog.unshift({
      id: 'act_' + Date.now(),
      type: 'week_advanced',
      personId: 'system',
      personName: 'House Schedule',
      title: `${weekInfo.headerLabel} Started (${weekInfo.relativeLabel})`,
      details: `${washName} on Washroom · ${kitName} on Kitchen`,
      timestamp: new Date().toISOString(),
    });

    saveState();
  }
}

async function startServer() {
  const app = express();

  // Allow requests from GitHub Pages
  app.use((req, res, next) => {
    res.header(
      'Access-Control-Allow-Origin',
      'https://gunateja020.github.io'
    );
    res.header(
      'Access-Control-Allow-Methods',
      'GET, POST, PUT, PATCH, DELETE, OPTIONS'
    );
    res.header(
      'Access-Control-Allow-Headers',
      'Content-Type, Authorization'
    );

    if (req.method === 'OPTIONS') {
      return res.sendStatus(204);
    }

    next();
  });

  app.use(express.json());

  // GET State (Strip all passwords and secret PINs!)
  app.get('/api/state', (_req, res) => {
    syncCalendarWeekIfNeeded();

    const sanitizedMembers = state.members.map((m) => ({
      ...m,
      password: undefined, // NEVER expose passwords to the client!
      hasPassword: Boolean(m.password),
    }));

    res.json({
      ...state,
      members: sanitizedMembers,
      adminPin: undefined,
    });
  });

  // Admin views all plain passwords (Guna can see passwords directly to tell roommates)
  app.get('/api/admin/passwords', (req, res) => {
    const adminMemberId = req.query.adminMemberId as string;
    const adminUser = state.members.find((m) => m.id === adminMemberId && m.isAdmin);
    if (!adminUser) {
      return res.status(403).json({ error: 'Unauthorized: Admin access required.' });
    }
    const passwords = state.members.map((m) => ({
      id: m.id,
      name: m.name,
      password: m.password || '',
      hasPassword: Boolean(m.password),
    }));
    return res.json({ success: true, passwords });
  });

  // Connect to profile with Personal Password Protection
  // House code validated ONLY for first time password setup or new roommate!
  app.post('/api/join-house', (req, res) => {
    const { code, memberId, name, password, avatarEmoji, deviceToken } = req.body;

    if (!password || password.trim().length < 2) {
      return res.status(400).json({ error: 'Please enter a personal password (at least 2 characters).' });
    }

    // Try finding existing profile by memberId or name
    let member = state.members.find(
      (m) => m.id === memberId || (name && m.name.toLowerCase() === name.trim().toLowerCase())
    );

    if (member) {
      // Existing profile
      if (member.password) {
        // Password already created: Only check personal password!
        // Login is NEVER affected by house code changes!
        if (member.password !== password.trim()) {
          return res.status(401).json({ error: 'Incorrect personal password for this profile. Try again.' });
        }
      } else {
        // First-time password creation for this profile: Validate House Security Code!
        const codeMatches = Boolean(code && code.trim().toUpperCase() === state.houseCode.trim().toUpperCase());
        if (!codeMatches) {
          return res.status(401).json({ error: 'Incorrect House Security Code for first-time password creation.' });
        }
        member.password = password.trim();
      }

      if (avatarEmoji) member.avatarEmoji = avatarEmoji;
      if (deviceToken) member.deviceToken = deviceToken;
      member.phoneRegistered = true;
    } else {
      // New roommate joining: Validate House Security Code!
      const codeMatches = Boolean(code && code.trim().toUpperCase() === state.houseCode.trim().toUpperCase());
      if (!codeMatches) {
        return res.status(401).json({ error: 'Incorrect House Security Code.' });
      }

      if (!name || !name.trim()) {
        return res.status(400).json({ error: 'Please enter your name.' });
      }

      const cleanName = name.trim();
      const emojis = ['⚡', '🚀', '🌟', '🎯', '🍀', '✨', '🔥', '👑', '🌈', '🦊'];
      const chosenEmoji = avatarEmoji || emojis[state.members.length % emojis.length];

      const newMember: HouseMember = {
        id: 'm_' + Date.now(),
        name: cleanName,
        password: password.trim(),
        isAdmin: false,
        missedTasks: 0,
        avatarColor: 'bg-indigo-600',
        avatarEmoji: chosenEmoji,
        deviceToken,
        phoneRegistered: true,
        joinedAt: new Date().toISOString(),
      };

      state.members.push(newMember);
      if (!state.trashRotation.order.includes(newMember.id)) {
        state.trashRotation.order.push(newMember.id);
      }

      const washAssignee = state.members.find((m) => m.id === state.cleaningDuties.washroom.assignedPersonId);
      const kitAssignee = state.members.find((m) => m.id === state.cleaningDuties.kitchen.assignedPersonId);
      const assignments = computeCleaningAssignments(state.members, state.currentWeekNumber);
      if (!washAssignee) {
        state.cleaningDuties.washroom.assignedPersonId = assignments.washroomPersonId;
      }
      if (!kitAssignee) {
        state.cleaningDuties.kitchen.assignedPersonId = assignments.kitchenPersonId;
      }

      state.activityLog.unshift({
        id: 'act_' + Date.now(),
        type: 'member_joined',
        personId: newMember.id,
        personName: newMember.name,
        title: `${newMember.name} joined the house`,
        details: `Work circulation updated equally across all ${state.members.length} housemates.`,
        timestamp: new Date().toISOString(),
      });

      member = newMember;
    }

    saveState();

    const sanitized = { ...member, password: undefined, hasPassword: true };
    return res.json({ success: true, member: sanitized, state, houseCode: state.houseCode });
  });

  // Admin sets or updates a housemate's password directly (NO activity log recorded!)
  app.post('/api/admin-reset-password', (req, res) => {
    const { adminMemberId, targetMemberId, newPassword } = req.body;
    const adminUser = state.members.find((m) => m.id === adminMemberId && m.isAdmin);
    if (!adminUser) {
      return res.status(403).json({ error: 'Unauthorized: Admin access required.' });
    }

    const member = state.members.find((m) => m.id === targetMemberId);
    if (!member) {
      return res.status(404).json({ error: 'Housemate profile not found.' });
    }

    if (!newPassword || newPassword.trim().length < 2) {
      return res.status(400).json({ error: 'Password must be at least 2 characters.' });
    }

    member.password = newPassword.trim();
    saveState();

    return res.json({
      success: true,
      message: `Password for ${member.name} successfully updated!`,
      state,
    });
  });

  // Complete Task (Strict: ONLY assigned person can complete)
  app.post('/api/complete-task', (req, res) => {
    const { taskType, department, memberId } = req.body;
    const member = state.members.find((m) => m.id === memberId);
    if (!member) {
      return res.status(400).json({ error: 'Member not found.' });
    }

    if (taskType === 'cleaning') {
      if (!department || (department !== 'washroom' && department !== 'kitchen')) {
        return res.status(400).json({ error: 'Invalid department.' });
      }

      const duty = state.cleaningDuties[department as Department];
      if (duty.assignedPersonId !== memberId) {
        return res.status(403).json({
          error: `Permission Denied: Only ${state.members.find((m) => m.id === duty.assignedPersonId)?.name || 'the assigned person'} can complete this task.`,
        });
      }

      duty.status = 'completed';
      duty.completedAt = new Date().toISOString();
      duty.completedBy = member.name;

      const deptName = department === 'washroom' ? 'Washroom' : 'Kitchen';
      state.activityLog.unshift({
        id: 'act_' + Date.now(),
        type: 'cleaning_completed',
        personId: member.id,
        personName: member.name,
        title: `${member.name} cleaned the ${deptName}`,
        details: `Completed cleaning for Week ${state.currentWeekNumber}.`,
        timestamp: new Date().toISOString(),
        canUndo: true,
        taskId: `cleaning_${department}`,
      });

      saveState();
      return res.json({ success: true, state });
    }

    if (taskType === 'trash') {
      const currentPersonId = state.trashRotation.currentAssignedPersonId;
      if (currentPersonId !== memberId) {
        return res.status(403).json({
          error: `Permission Denied: Only ${state.members.find((m) => m.id === currentPersonId)?.name || 'the assigned person'} can mark trash as thrown.`,
        });
      }

      const prevIndex = state.trashRotation.currentIndex;
      const nextIndex = (prevIndex + 1) % state.trashRotation.order.length;
      const nextPersonId = state.trashRotation.order[nextIndex];
      const nextPerson = state.members.find((m) => m.id === nextPersonId);

      state.trashRotation.lastThrownAt = new Date().toISOString();
      state.trashRotation.lastThrownBy = member.name;
      state.trashRotation.currentIndex = nextIndex;
      state.trashRotation.currentAssignedPersonId = nextPersonId;

      state.activityLog.unshift({
        id: 'act_' + Date.now(),
        type: 'trash_completed',
        personId: member.id,
        personName: member.name,
        title: `${member.name} threw out the trash 🗑️`,
        details: `Next turn is ${nextPerson?.name || 'the next roommate'}. 4-day filling timer restarted.`,
        timestamp: new Date().toISOString(),
        canUndo: true,
        taskId: 'trash',
      });

      saveState();
      return res.json({ success: true, state });
    }

    return res.status(400).json({ error: 'Unknown task type.' });
  });

  // Undo task completion & delete from activity log
  app.post('/api/undo-task', (req, res) => {
    const { taskType, department, memberId } = req.body;

    if (taskType === 'cleaning') {
      if (!department || (department !== 'washroom' && department !== 'kitchen')) {
        return res.status(400).json({ error: 'Invalid department.' });
      }

      const duty = state.cleaningDuties[department as Department];
      if (duty.assignedPersonId !== memberId) {
        return res.status(403).json({ error: 'Only the assigned person can undo their task.' });
      }

      duty.status = 'pending';
      duty.completedAt = null;
      duty.completedBy = null;

      state.activityLog = state.activityLog.filter(
        (item) => !(item.type === 'cleaning_completed' && item.taskId === `cleaning_${department}`)
      );

      saveState();
      return res.json({ success: true, state });
    }

    if (taskType === 'trash') {
      const curIndex = state.trashRotation.currentIndex;
      const prevIndex = (curIndex - 1 + state.trashRotation.order.length) % state.trashRotation.order.length;
      const prevPersonId = state.trashRotation.order[prevIndex];

      if (prevPersonId !== memberId) {
        return res.status(403).json({ error: 'Only the person who threw the trash can undo.' });
      }

      state.trashRotation.currentIndex = prevIndex;
      state.trashRotation.currentAssignedPersonId = prevPersonId;

      state.activityLog = state.activityLog.filter(
        (item) => !(item.type === 'trash_completed' && item.taskId === 'trash')
      );

      saveState();
      return res.json({ success: true, state });
    }

    return res.status(400).json({ error: 'Invalid undo request.' });
  });

  // Submit Missed Task Reason (+1 added immediately, status: pending_ai_review)
  app.post('/api/submit-missed-reason', (req, res) => {
    const { department, reason, memberId } = req.body;
    if (!department || !reason || !reason.trim()) {
      return res.status(400).json({ error: 'Department and reason are required.' });
    }

    const duty = state.cleaningDuties[department as Department];
    if (!duty) {
      return res.status(400).json({ error: 'Invalid department.' });
    }

    if (duty.assignedPersonId !== memberId) {
      return res.status(403).json({ error: 'Only the assigned person can submit a reason.' });
    }

    const member = state.members.find((m) => m.id === memberId);
    if (!member) {
      return res.status(400).json({ error: 'Member not found.' });
    }

    const wasAlreadyMissed = duty.status === 'missed';
    duty.status = 'missed';
    duty.missedReason = reason.trim();
    duty.reasonValidated = false;

    // Immediately add to missed tasks count (+1) if not already counted as missed
    if (!wasAlreadyMissed) {
      member.missedTasks = (member.missedTasks || 0) + 1;
    }

    let reasonItem = state.missedReasons.find(
      (r) => r.personId === member.id && r.department === department && r.weekNumber === state.currentWeekNumber
    );

    if (reasonItem) {
      reasonItem.reason = reason.trim();
      reasonItem.status = 'pending_ai_review';
      reasonItem.validated = false;
      reasonItem.submittedAt = new Date().toISOString();
      if (!reasonItem.messages) reasonItem.messages = [];
      reasonItem.messages.push({
        id: 'msg_' + Date.now(),
        sender: 'roommate',
        senderName: member.name,
        text: reason.trim(),
        timestamp: new Date().toISOString(),
      });
    } else {
      reasonItem = {
        id: 'miss_' + Date.now(),
        personId: member.id,
        personName: member.name,
        department: department as Department,
        weekNumber: state.currentWeekNumber,
        reason: reason.trim(),
        submittedAt: new Date().toISOString(),
        status: 'pending_ai_review',
        validated: false,
        messages: [
          {
            id: 'msg_' + Date.now(),
            sender: 'roommate',
            senderName: member.name,
            text: reason.trim(),
            timestamp: new Date().toISOString(),
          },
        ],
      };
      state.missedReasons.unshift(reasonItem);
    }

    const deptName = department === 'washroom' ? 'Washroom' : 'Kitchen';
    state.activityLog.unshift({
      id: 'act_' + Date.now(),
      type: 'task_missed',
      personId: member.id,
      personName: member.name,
      title: `${member.name} missed cleaning ${deptName} (+1 Missed)`,
      details: `Reason submitted: "${reason.trim()}". (Pending AI review)`,
      timestamp: new Date().toISOString(),
    });

    saveState();
    return res.json({ success: true, state, reasonItem });
  });

  // AI Review Message / Question (Admin replies disguised as AI, or roommate answers AI)
  // Chat is strictly kept in the review thread and NOT spammed into activity stream!
  app.post('/api/ai-review/reply', (req, res) => {
    const { reasonId, text, memberId } = req.body;
    if (!text || !text.trim()) {
      return res.status(400).json({ error: 'Message cannot be empty.' });
    }

    const reasonItem = state.missedReasons.find((r) => r.id === reasonId);
    if (!reasonItem) {
      return res.status(404).json({ error: 'Missed duty record not found.' });
    }

    const caller = state.members.find((m) => m.id === memberId);
    if (!caller) {
      return res.status(401).json({ error: 'Invalid member ID.' });
    }

    if (!reasonItem.messages) {
      reasonItem.messages = [
        {
          id: 'msg_init_' + Date.now(),
          sender: 'roommate',
          senderName: reasonItem.personName,
          text: reasonItem.reason,
          timestamp: reasonItem.submittedAt,
        },
      ];
    }

    if (caller.isAdmin) {
      // Admin replies disguised as AI!
      reasonItem.messages.push({
        id: 'msg_' + Date.now(),
        sender: 'ai',
        senderName: 'AI Overseer',
        text: text.trim(),
        timestamp: new Date().toISOString(),
      });
    } else if (caller.id === reasonItem.personId) {
      // Roommate replies to AI's question
      reasonItem.messages.push({
        id: 'msg_' + Date.now(),
        sender: 'roommate',
        senderName: caller.name,
        text: text.trim(),
        timestamp: new Date().toISOString(),
      });
    } else {
      return res.status(403).json({ error: 'Not authorized to reply to this AI review.' });
    }

    saveState();
    return res.json({ success: true, reasonItem, state });
  });

  // Admin AI Decision: Validates reason (Approve deducts 1, Disapprove keeps +1)
  app.post('/api/validate-reason', (req, res) => {
    const { reasonId, valid, memberId, aiVerdictNotes } = req.body;
    const adminUser = state.members.find((m) => m.id === memberId && m.isAdmin);
    if (!adminUser) {
      return res.status(403).json({ error: 'Unauthorized: Admin access required.' });
    }

    const reasonItem = state.missedReasons.find((r) => r.id === reasonId);
    if (!reasonItem) {
      return res.status(404).json({ error: 'Reason record not found.' });
    }

    const targetMember = state.members.find((m) => m.id === reasonItem.personId);
    const dept = reasonItem.department;

    if (!reasonItem.messages) {
      reasonItem.messages = [];
    }

    if (valid) {
      reasonItem.status = 'ai_approved';
      reasonItem.validated = true;
      reasonItem.reviewedAt = new Date().toISOString();
      reasonItem.aiVerdictNotes = aiVerdictNotes || 'AI Assessment: Valid excuse confirmed. 1 missed chore has been deducted (-1).';

      if (targetMember) {
        targetMember.missedTasks = Math.max(0, (targetMember.missedTasks || 0) - 1);
      }

      if (state.cleaningDuties[dept]) {
        state.cleaningDuties[dept].reasonValidated = true;
        state.cleaningDuties[dept].reasonValidatedAt = new Date().toISOString();
      }

      reasonItem.messages.push({
        id: 'msg_' + Date.now(),
        sender: 'ai',
        senderName: 'AI Overseer',
        text: aiVerdictNotes || '✅ AI Assessment: Valid excuse accepted. 1 missed task was deducted (-1).',
        timestamp: new Date().toISOString(),
      });

      // ONLY milestone log recorded in activityLog, no chat spam!
      state.activityLog.unshift({
        id: 'act_' + Date.now(),
        type: 'reason_validated',
        personId: reasonItem.personId,
        personName: reasonItem.personName,
        title: `AI Approved Excuse for ${reasonItem.personName}`,
        details: `AI verified reason: "${reasonItem.reason}". 1 missed task was deducted (-1)! Total missed: ${targetMember?.missedTasks || 0}.`,
        timestamp: new Date().toISOString(),
      });
    } else {
      reasonItem.status = 'ai_disapproved';
      reasonItem.validated = false;
      reasonItem.reviewedAt = new Date().toISOString();
      reasonItem.aiVerdictNotes = aiVerdictNotes || 'AI Assessment: Excuse not accepted. Missed chore penalty remains (+1).';

      if (state.cleaningDuties[dept]) {
        state.cleaningDuties[dept].reasonValidated = false;
      }

      reasonItem.messages.push({
        id: 'msg_' + Date.now(),
        sender: 'ai',
        senderName: 'AI Overseer',
        text: aiVerdictNotes || '❌ AI Assessment: Excuse rejected. Missed task penalty remains (+1).',
        timestamp: new Date().toISOString(),
      });

      state.activityLog.unshift({
        id: 'act_' + Date.now(),
        type: 'reason_disapproved',
        personId: reasonItem.personId,
        personName: reasonItem.personName,
        title: `AI Disapproved Excuse for ${reasonItem.personName}`,
        details: `AI reviewed and rejected excuse. Missed task remains (+1).`,
        timestamp: new Date().toISOString(),
      });
    }

    saveState();
    return res.json({ success: true, state, reasonItem });
  });

  // Admin adds a new roommate directly
  app.post('/api/add-member', (req, res) => {
    const { name, memberId, avatarEmoji } = req.body;
    const adminUser = state.members.find((m) => m.id === memberId && m.isAdmin);
    if (!adminUser) {
      return res.status(403).json({ error: 'Unauthorized: Admin access required.' });
    }

    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Please enter the roommate\'s name.' });
    }

    const cleanName = name.trim();
    const emojis = ['⚡', '🚀', '🌟', '🎯', '🍀', '✨', '🔥', '👑', '🌈', '🦊', '🎨', '🦁'];
    const chosenEmoji = avatarEmoji || emojis[state.members.length % emojis.length];

    const newMember: HouseMember = {
      id: 'm_' + Date.now(),
      name: cleanName,
      isAdmin: false,
      missedTasks: 0,
      avatarColor: 'bg-indigo-600',
      avatarEmoji: chosenEmoji,
      joinedAt: new Date().toISOString(),
    };

    state.members.push(newMember);
    if (!state.trashRotation.order.includes(newMember.id)) {
      state.trashRotation.order.push(newMember.id);
    }

    state.activityLog.unshift({
      id: 'act_' + Date.now(),
      type: 'member_joined',
      personId: newMember.id,
      personName: newMember.name,
      title: `${newMember.name} added to the house`,
      details: `Work circulation updated equally across all ${state.members.length} housemates.`,
      timestamp: new Date().toISOString(),
    });

    saveState();
    return res.json({ success: true, member: newMember, state });
  });

  // Admin removes a person
  app.post('/api/remove-member', (req, res) => {
    const { targetMemberId, memberId } = req.body;
    const adminUser = state.members.find((m) => m.id === memberId && m.isAdmin);
    if (!adminUser) {
      return res.status(403).json({ error: 'Unauthorized: Admin access required.' });
    }

    const member = state.members.find((m) => m.id === targetMemberId);
    if (!member) {
      return res.status(404).json({ error: 'Member not found.' });
    }

    state.members = state.members.filter((m) => m.id !== targetMemberId);
    state.trashRotation.order = state.trashRotation.order.filter((id) => id !== targetMemberId);

    if (state.trashRotation.order.length > 0) {
      state.trashRotation.currentIndex = state.trashRotation.currentIndex % state.trashRotation.order.length;
      state.trashRotation.currentAssignedPersonId = state.trashRotation.order[state.trashRotation.currentIndex];
    }

    const assignments = computeCleaningAssignments(state.members, state.currentWeekNumber);
    if (state.cleaningDuties.washroom.assignedPersonId === targetMemberId) {
      state.cleaningDuties.washroom.assignedPersonId = assignments.washroomPersonId;
      state.cleaningDuties.washroom.status = 'pending';
    }
    if (state.cleaningDuties.kitchen.assignedPersonId === targetMemberId) {
      state.cleaningDuties.kitchen.assignedPersonId = assignments.kitchenPersonId;
      state.cleaningDuties.kitchen.status = 'pending';
    }

    state.activityLog.unshift({
      id: 'act_' + Date.now(),
      type: 'member_removed',
      personId: member.id,
      personName: member.name,
      title: `${member.name} removed from house`,
      details: `Work circulation updated for remaining ${state.members.length} housemates.`,
      timestamp: new Date().toISOString(),
    });

    saveState();
    return res.json({ success: true, state });
  });

  // Roommate updates their own name or avatar emoji
  app.post('/api/update-profile', (req, res) => {
    const { memberId, name, avatarEmoji } = req.body;
    if (!memberId) {
      return res.status(400).json({ error: 'Member ID is required.' });
    }
    if (!name || name.trim().length < 2) {
      return res.status(400).json({ error: 'Name must be at least 2 characters.' });
    }

    const member = state.members.find((m) => m.id === memberId);
    if (!member) {
      return res.status(404).json({ error: 'Profile not found.' });
    }

    const oldName = member.name;
    const newName = name.trim();
    member.name = newName;
    if (avatarEmoji) {
      member.avatarEmoji = avatarEmoji;
    }

    // Keep assigned references updated
    if (state.trashRotation.lastThrownBy === oldName) {
      state.trashRotation.lastThrownBy = newName;
    }
    if (state.cleaningDuties.washroom.completedBy === oldName) {
      state.cleaningDuties.washroom.completedBy = newName;
    }
    if (state.cleaningDuties.kitchen.completedBy === oldName) {
      state.cleaningDuties.kitchen.completedBy = newName;
    }

    // Update missed reasons personName
    state.missedReasons.forEach((r) => {
      if (r.personId === memberId) {
        r.personName = newName;
        if (r.messages) {
          r.messages.forEach((m) => {
            if (m.sender === 'roommate') {
              m.senderName = newName;
            }
          });
        }
      }
    });

    if (oldName !== newName) {
      state.activityLog.unshift({
        id: 'act_' + Date.now(),
        type: 'member_joined',
        personId: member.id,
        personName: newName,
        title: `${oldName} changed name to ${newName}`,
        details: `Profile display name updated.`,
        timestamp: new Date().toISOString(),
      });
    }

    saveState();
    return res.json({ success: true, member, state });
  });

  // Admin updates House Security Code or settings (including trash interval)
  app.post('/api/update-config', (req, res) => {
    const { memberId, newHouseCode, newHouseName, members, trashIntervalDays } = req.body;
    const adminUser = state.members.find((m) => m.id === memberId && m.isAdmin);
    if (!adminUser) {
      return res.status(403).json({ error: 'Unauthorized: Admin access required.' });
    }

    if (newHouseCode && newHouseCode.trim().length >= 3) {
      state.houseCode = newHouseCode.trim().toUpperCase();
    }

    if (newHouseName && newHouseName.trim()) {
      state.houseName = newHouseName.trim();
    }

    if (typeof trashIntervalDays === 'number' && trashIntervalDays >= 1) {
      state.trashRotation.thresholdDays = Math.round(trashIntervalDays);
    }

    if (Array.isArray(members) && members.length >= 2) {
      members.forEach((m: Partial<HouseMember>) => {
        const existing = state.members.find((ex) => ex.id === m.id);
        if (existing) {
          if (m.name) existing.name = m.name.trim();
          if (typeof m.missedTasks === 'number') existing.missedTasks = m.missedTasks;
          if (m.avatarEmoji) existing.avatarEmoji = m.avatarEmoji;
        }
      });
    }

    saveState();
    return res.json({ success: true, state });
  });

  // Advance Cleaning Week
  app.post('/api/advance-week', (req, res) => {
    const { memberId } = req.body;
    const adminUser = state.members.find((m) => m.id === memberId && m.isAdmin);
    if (!adminUser) {
      return res.status(403).json({ error: 'Unauthorized: Admin access required.' });
    }

    (['washroom', 'kitchen'] as Department[]).forEach((dept) => {
      const duty = state.cleaningDuties[dept];
      if (duty.status === 'pending') {
        const assignee = state.members.find((m) => m.id === duty.assignedPersonId);
        if (assignee) {
          assignee.missedTasks = (assignee.missedTasks || 0) + 1;
        }
      }
    });

    state.currentWeekNumber += 1;
    const assignments = computeCleaningAssignments(state.members, state.currentWeekNumber);

    state.cleaningDuties = {
      washroom: {
        department: 'washroom',
        assignedPersonId: assignments.washroomPersonId,
        status: 'pending',
        completedAt: null,
        completedBy: null,
        missedReason: null,
        reasonValidated: false,
      },
      kitchen: {
        department: 'kitchen',
        assignedPersonId: assignments.kitchenPersonId,
        status: 'pending',
        completedAt: null,
        completedBy: null,
        missedReason: null,
        reasonValidated: false,
      },
    };

    const washName = state.members.find((m) => m.id === assignments.washroomPersonId)?.name;
    const kitName = state.members.find((m) => m.id === assignments.kitchenPersonId)?.name;

    const weekInfo = getCalendarWeek(state.currentWeekNumber);
    state.activityLog.unshift({
      id: 'act_' + Date.now(),
      type: 'week_advanced',
      personId: 'system',
      personName: 'House Schedule',
      title: `${weekInfo.headerLabel} Started (${weekInfo.relativeLabel})`,
      details: `${washName} on Washroom · ${kitName} on Kitchen`,
      timestamp: new Date().toISOString(),
    });

    saveState();
    return res.json({ success: true, state });
  });

  // Vite Integration
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`HouseDuty server running on port ${PORT}`);
  });
}

startServer();
