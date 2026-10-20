export type Department = 'washroom' | 'kitchen';

export interface HouseMember {
  id: string;
  name: string;
  missedTasks: number; // Publicly visible missed count
  avatarColor: string;
  avatarEmoji: string;
  deviceToken?: string;
  phoneRegistered?: boolean;
  joinedAt?: string;
  isAdmin?: boolean; // True ONLY for Gunateja (Guna)
  hasPassword?: boolean; // Protected by their own personal password
  password?: string;
}

export interface CleaningDuty {
  department: Department;
  assignedPersonId: string;
  status: 'pending' | 'completed' | 'missed';
  completedAt: string | null;
  completedBy: string | null;
  missedReason?: string | null;
  reasonValidated?: boolean; // Validated by Guna (deducts 1 from missedTasks)
  reasonValidatedAt?: string | null;
}

export interface AiReviewMessage {
  id: string;
  sender: 'roommate' | 'ai';
  senderName: string;
  text: string;
  timestamp: string;
}

export interface MissedReasonItem {
  id: string;
  personId: string;
  personName: string;
  department: Department;
  weekNumber: number;
  reason: string;
  submittedAt: string;
  status: 'pending_ai_review' | 'ai_approved' | 'ai_disapproved';
  validated: boolean;
  reviewedAt?: string;
  aiVerdictNotes?: string;
  messages?: AiReviewMessage[];
}

export interface ActivityItem {
  id: string;
  type:
    | 'cleaning_completed'
    | 'trash_completed'
    | 'task_missed'
    | 'reason_validated'
    | 'reason_disapproved'
    | 'member_joined'
    | 'member_removed'
    | 'week_advanced';
  personId: string;
  personName: string;
  title: string;
  details: string;
  timestamp: string;
  canUndo?: boolean;
  taskId?: string;
}

export interface HouseState {
  houseName: string;
  houseCode: string;
  adminMemberId?: string;
  currentWeekNumber: number;
  members: HouseMember[];
  cleaningDuties: {
    washroom: CleaningDuty;
    kitchen: CleaningDuty;
  };
  trashRotation: {
    order: string[]; // member IDs in sequence
    currentIndex: number;
    currentAssignedPersonId: string;
    lastThrownAt: string;
    lastThrownBy: string;
    thresholdDays: number; // Configurable days threshold (default 4)
  };
  missedReasons: MissedReasonItem[];
  activityLog: ActivityItem[];
}

/**
 * 100% Balanced & Equal Rotation Algorithm for ANY Number of Housemates (N):
 *
 * Guaranteed Properties:
 * 1. EQUAL WORK: Over every cycle of N weeks, every single roommate cleans
 *    an identical number of times (exactly 1 Washroom and 1 Kitchen).
 * 2. NO TEAMS & NO BIAS: Washroom and Kitchen duties are never monopolized
 *    by the same person; departments alternate fairly.
 * 3. NO CONSECUTIVE WEEKS: Rest intervals are evenly spread so no roommate
 *    is stuck cleaning two weeks in a row (whenever N >= 4).
 * 4. DYNAMIC & SAFE: Works seamlessly whether there are 3, 4, 5, 6, 7 or more
 *    roommates. Adding or removing a roommate never crashes or creates uneven work.
 */
export function computeCleaningAssignments(
  members: HouseMember[],
  weekNumber: number
): { washroomPersonId: string; kitchenPersonId: string } {
  const n = members.length;
  if (n === 0) return { washroomPersonId: '', kitchenPersonId: '' };
  if (n === 1) return { washroomPersonId: members[0].id, kitchenPersonId: members[0].id };

  const s = ((weekNumber - 1) % n + n) % n;

  if (n === 2) {
    if (s === 0) {
      return { washroomPersonId: members[0].id, kitchenPersonId: members[1].id };
    } else {
      return { washroomPersonId: members[1].id, kitchenPersonId: members[0].id };
    }
  }

  let washIdx = 0;
  let kitIdx = 1;

  if (n % 2 === 0) {
    // Even number of housemates (e.g., 4, 6, 8):
    // Divide into pairs: in first half of cycle (s < K), P_2s cleans Wash, P_2s+1 cleans Kitchen.
    // In second half of cycle (s >= K), the roles flip (P_2k+1 cleans Wash, P_2k cleans Kitchen).
    const kPairs = n / 2;
    if (s < kPairs) {
      washIdx = 2 * s;
      kitIdx = 2 * s + 1;
    } else {
      const k = s - kPairs;
      washIdx = 2 * k + 1;
      kitIdx = 2 * k;
    }
  } else {
    // Odd number of housemates (e.g., 3, 5, 7):
    // Stagger washroom and kitchen by floor(n/2) so no two housemates collide,
    // and every person does exactly 1 Washroom and 1 Kitchen per n weeks.
    const shift = Math.floor(n / 2);
    washIdx = s % n;
    kitIdx = (s + shift) % n;
  }

  // Safe bounds guard
  const pA = members[washIdx]?.id || members[0]?.id || '';
  const pB = members[kitIdx]?.id || members[(washIdx + 1) % n]?.id || members[0]?.id || '';

  return { washroomPersonId: pA, kitchenPersonId: pB };
}

/**
 * Real Calendar Week Calculation:
 * Week ALWAYS starts on Sunday and runs through Saturday!
 * Week 1: Sunday Oct 18 – Saturday Oct 24, 2026
 * Week 2: Sunday Oct 25 – Saturday Oct 31, 2026
 * Week 3: Sunday Nov 1 – Saturday Nov 7, 2026
 * Week 4: Sunday Nov 8 – Saturday Nov 14, 2026
 */
export interface CalendarWeekInfo {
  weekNumber: number;
  startDate: Date;
  endDate: Date;
  shortRange: string;
  fullRange: string;
  headerLabel: string;
  relativeLabel: string;
  isCurrent: boolean;
}

export function getCalendarWeek(
  weekNumber: number,
  baseDateIso = '2026-10-18T00:00:00.000Z'
): CalendarWeekInfo {
  const base = new Date(baseDateIso);
  const day = base.getUTCDay(); // 0 is Sunday
  const baseSunday = new Date(base);
  baseSunday.setUTCDate(base.getUTCDate() - day);
  baseSunday.setUTCHours(0, 0, 0, 0);

  const start = new Date(baseSunday);
  start.setUTCDate(baseSunday.getUTCDate() + (weekNumber - 1) * 7);

  const end = new Date(start);
  end.setUTCDate(start.getUTCDate() + 6);
  end.setUTCHours(23, 59, 59, 999);

  const startMonth = start.toLocaleDateString('en-US', { month: 'short', timeZone: 'UTC' });
  const endMonth = end.toLocaleDateString('en-US', { month: 'short', timeZone: 'UTC' });
  const startDay = start.getUTCDate();
  const endDay = end.getUTCDate();
  const year = end.getUTCFullYear();

  const shortRange =
    startMonth === endMonth
      ? `${startMonth} ${startDay}–${endDay}`
      : `${startMonth} ${startDay} – ${endMonth} ${endDay}`;

  const headerLabel =
    startMonth === endMonth
      ? `${startMonth} ${startDay} – ${endDay}`
      : `${startMonth} ${startDay} – ${endMonth} ${endDay}`;

  const fullRange = `${headerLabel}, ${year}`;

  let relativeLabel = `Week ${weekNumber}`;
  if (weekNumber === 1) relativeLabel = 'This Week (Sun–Sat)';
  else if (weekNumber === 2) relativeLabel = 'Next Week';
  else if (weekNumber === 3) relativeLabel = 'In 2 Weeks';
  else if (weekNumber === 4) relativeLabel = 'In 3 Weeks';

  return {
    weekNumber,
    startDate: start,
    endDate: end,
    shortRange,
    fullRange,
    headerLabel,
    relativeLabel,
    isCurrent: weekNumber === 1,
  };
}
