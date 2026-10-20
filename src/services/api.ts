import type { HouseState, HouseMember, Department, MissedReasonItem } from '../types.js';

const API_BASE_URL = 'https://house-schedule.onrender.com';

export async function fetchHouseState(): Promise<HouseState> {
  const res = await fetch(`${API_BASE_URL}/api/state`);
  if (!res.ok) {
    throw new Error('Failed to load house state');
  }
  return res.json();
}

export async function joinHouse(payload: {
  code: string;
  memberId?: string;
  name?: string;
  password: string;
  avatarEmoji?: string;
  deviceToken: string;
  isAlreadyVerified?: boolean;
}): Promise<{ success: boolean; member: HouseMember; state: HouseState; houseCode?: string }> {
  const res = await fetch(`${API_BASE_URL}/api/join-house`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Failed to connect to house');
  }
  return data;
}

export async function completeTask(
  taskType: 'cleaning' | 'trash',
  memberId: string,
  deviceToken: string,
  department?: Department
): Promise<{ success: boolean; state: HouseState }> {
  const res = await fetch(`${API_BASE_URL}/api/complete-task`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ taskType, department, memberId, deviceToken }),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Failed to complete task');
  }
  return data;
}

export async function undoTask(
  taskType: 'cleaning' | 'trash',
  memberId: string,
  deviceToken: string,
  department?: Department
): Promise<{ success: boolean; state: HouseState }> {
  const res = await fetch(`${API_BASE_URL}/api/undo-task`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ taskType, department, memberId, deviceToken }),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Failed to undo task');
  }
  return data;
}

export async function submitMissedReason(
  department: Department,
  reason: string,
  memberId: string,
  deviceToken: string
): Promise<{ success: boolean; state: HouseState; reasonItem: MissedReasonItem }> {
  const res = await fetch(`${API_BASE_URL}/api/submit-missed-reason`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ department, reason, memberId, deviceToken }),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Failed to submit reason');
  }
  return data;
}

export async function validateReason(
  reasonId: string,
  valid: boolean,
  memberId: string,
  aiVerdictNotes?: string
): Promise<{ success: boolean; state: HouseState; reasonItem: MissedReasonItem }> {
  const res = await fetch(`${API_BASE_URL}/api/validate-reason`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ reasonId, valid, memberId, aiVerdictNotes }),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Failed to review reason');
  }
  return data;
}

export async function sendAiReviewReply(
  reasonId: string,
  text: string,
  memberId: string
): Promise<{ success: boolean; reasonItem: MissedReasonItem; state: HouseState }> {
  const res = await fetch(`${API_BASE_URL}/api/ai-review/reply`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ reasonId, text, memberId }),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Failed to send message');
  }
  return data;
}

export async function fetchAdminPasswords(
  adminMemberId: string
): Promise<{ success: boolean; passwords: { id: string; name: string; password: string; hasPassword: boolean }[] }> {
  const res = await fetch(`${API_BASE_URL}/api/admin/passwords?adminMemberId=${encodeURIComponent(adminMemberId)}`);
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Failed to fetch passwords');
  }
  return data;
}

export async function removeMember(
  targetMemberId: string,
  memberId: string
): Promise<{ success: boolean; state: HouseState }> {
  const res = await fetch(`${API_BASE_URL}/api/remove-member`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ targetMemberId, memberId }),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Failed to remove housemate');
  }
  return data;
}

export async function advanceWeek(memberId: string): Promise<{ success: boolean; state: HouseState }> {
  const res = await fetch(`${API_BASE_URL}/api/advance-week`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ memberId }),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Failed to advance week');
  }
  return data;
}

export async function updateConfig(payload: {
  memberId: string;
  newHouseCode?: string;
  newHouseName?: string;
  trashIntervalDays?: number;
  members?: Partial<HouseMember>[];
}): Promise<{ success: boolean; state: HouseState }> {
  const res = await fetch(`${API_BASE_URL}/api/update-config`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Failed to update settings');
  }
  return data;
}

export async function addMember(
  name: string,
  memberId: string,
  avatarEmoji?: string
): Promise<{ success: boolean; member: HouseMember; state: HouseState }> {
  const res = await fetch(`${API_BASE_URL}/api/add-member`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, memberId, avatarEmoji }),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Failed to add housemate');
  }
  return data;
}

export async function requestPasswordReset(
  memberId: string,
  memberName: string
): Promise<{ success: boolean; message: string; state?: HouseState }> {
  const res = await fetch(`${API_BASE_URL}/api/forgot-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ memberId, memberName }),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Failed to send password reset request');
  }
  return data;
}

export async function adminResetPassword(payload: {
  adminMemberId: string;
  targetMemberId: string;
  newPassword: string;
  requestId?: string;
}): Promise<{ success: boolean; message: string; state: HouseState }> {
  const res = await fetch(`${API_BASE_URL}/api/admin-reset-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Failed to reset password');
  }
  return data;
}

export async function updateProfile(
  memberId: string,
  name: string,
  avatarEmoji?: string
): Promise<{ success: boolean; member: HouseMember; state: HouseState }> {
  const res = await fetch(`${API_BASE_URL}/api/update-profile`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ memberId, name, avatarEmoji }),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Failed to update profile');
  }
  return data;
}

