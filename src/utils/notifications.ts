// Web Audio API Chime generator
export function playChime(type: 'success' | 'alert' | 'trash' = 'success') {
  try {
    const AudioContextClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;

    const ctx = new AudioContextClass();
    if (ctx.state === 'suspended') {
      ctx.resume();
    }

    if (type === 'success') {
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();

      osc1.type = 'sine';
      osc2.type = 'sine';

      const now = ctx.currentTime;
      osc1.frequency.setValueAtTime(523.25, now); // C5
      osc1.frequency.exponentialRampToValueAtTime(659.25, now + 0.15); // E5

      osc2.frequency.setValueAtTime(783.99, now + 0.12); // G5
      osc2.frequency.exponentialRampToValueAtTime(1046.5, now + 0.35); // C6

      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.55);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(ctx.destination);

      osc1.start(now);
      osc1.stop(now + 0.25);
      osc2.start(now + 0.12);
      osc2.stop(now + 0.55);
    } else if (type === 'alert') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const now = ctx.currentTime;

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(440, now);
      osc.frequency.setValueAtTime(554.37, now + 0.12);

      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.35);
    } else if (type === 'trash') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const now = ctx.currentTime;

      osc.type = 'sine';
      osc.frequency.setValueAtTime(220, now);
      osc.frequency.exponentialRampToValueAtTime(880, now + 0.2);

      gain.gain.setValueAtTime(0.25, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.4);
    }
  } catch {
    // AudioContext blocked
  }
}

// Persistent alert confirmation key
const ALERTS_CONFIRMED_KEY = 'house_duty_alerts_confirmed_v2';

export function isAlertsConfirmed(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const val = localStorage.getItem(ALERTS_CONFIRMED_KEY);
    if (val === 'true') return true;
    if ('Notification' in window && Notification.permission === 'granted') {
      localStorage.setItem(ALERTS_CONFIRMED_KEY, 'true');
      return true;
    }
  } catch {
    // Ignored
  }
  return false;
}

export function setAlertsConfirmed(confirmed = true): void {
  if (typeof window === 'undefined') return;
  try {
    if (confirmed) {
      localStorage.setItem(ALERTS_CONFIRMED_KEY, 'true');
    } else {
      localStorage.removeItem(ALERTS_CONFIRMED_KEY);
    }
  } catch {
    // Ignored
  }
}

// Request browser notification permission with fallback
export async function requestNotificationPermission(): Promise<{
  permission: NotificationPermission | 'unsupported';
  message?: string;
}> {
  if (!('Notification' in window)) {
    setAlertsConfirmed(true);
    return {
      permission: 'unsupported',
      message: 'Browser notifications are not supported by this browser. In-app alerts are active & verified!',
    };
  }

  if (Notification.permission === 'granted') {
    setAlertsConfirmed(true);
    return { permission: 'granted', message: 'Notifications are verified and active on this phone!' };
  }

  if (Notification.permission === 'denied') {
    setAlertsConfirmed(true); // Still allow in-app audio & toast alerts
    return {
      permission: 'denied',
      message: 'Browser alerts were blocked. In-app audio chimes and visual reminders are active!',
    };
  }

  try {
    let result: NotificationPermission;
    try {
      result = await Notification.requestPermission();
    } catch {
      result = await new Promise<NotificationPermission>((resolve) => {
        Notification.requestPermission((p) => resolve(p));
      });
    }

    setAlertsConfirmed(true);

    if (result === 'granted') {
      try {
        new Notification('🔔 Notifications Enabled', {
          body: 'You will receive trash reminders and house chore updates.',
        });
      } catch {
        // notification constructor restricted in some iframes
      }
      return { permission: 'granted', message: 'Notifications successfully enabled!' };
    } else {
      return {
        permission: result,
        message: 'Alert reminders confirmed active on this device.',
      };
    }
  } catch {
    setAlertsConfirmed(true);
    return {
      permission: 'denied',
      message: 'In-app audio & reminder alerts are active on this device.',
    };
  }
}

export function getNotificationPermission(): NotificationPermission | 'unsupported' {
  if (!('Notification' in window)) return 'unsupported';
  return Notification.permission;
}

// Send standard phone/browser notification (quietly, no loop chime!)
export function sendPhoneNotification(title: string, body: string, withSound = false) {
  if (withSound) {
    playChime('alert');
  }

  if (!('Notification' in window)) return;

  if (Notification.permission === 'granted') {
    try {
      new Notification(title, {
        body,
        tag: 'house-duty-' + title.toLowerCase().replace(/[^a-z0-9]/g, '-'),
      });
    } catch {
      // Ignored
    }
  }
}

// Persistent device binding storage
const DEVICE_KEY = 'house_duty_device_token_v2';
const MEMBER_KEY = 'house_duty_member_id_v2';
const HOUSE_CODE_KEY = 'house_duty_house_code_v2';
const HOUSE_VERIFIED_KEY = 'house_duty_house_verified_v2';

export function isHouseVerified(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return localStorage.getItem(HOUSE_VERIFIED_KEY) === 'true';
  } catch {
    return false;
  }
}

export function getStoredHouseCode(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return localStorage.getItem(HOUSE_CODE_KEY);
  } catch {
    return null;
  }
}

export function setHouseVerified(code?: string): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(HOUSE_VERIFIED_KEY, 'true');
    if (code) {
      localStorage.setItem(HOUSE_CODE_KEY, code.trim().toUpperCase());
    }
  } catch {
    // Ignored
  }
}

export function clearHouseVerification(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(HOUSE_VERIFIED_KEY);
    localStorage.removeItem(HOUSE_CODE_KEY);
  } catch {
    // Ignored
  }
}

export function clearStoredDeviceData(): void {
  try {
    localStorage.removeItem(MEMBER_KEY);
    localStorage.removeItem(HOUSE_VERIFIED_KEY);
    localStorage.removeItem(HOUSE_CODE_KEY);
  } catch {
    // Ignored
  }
}

export function getStoredDeviceData(): { deviceToken: string; memberId: string | null; isVerified: boolean } {
  let token = localStorage.getItem(DEVICE_KEY);
  if (!token) {
    token = 'dev_' + Math.random().toString(36).substring(2, 12) + Date.now().toString(36);
    localStorage.setItem(DEVICE_KEY, token);
  }
  const memberId = localStorage.getItem(MEMBER_KEY);
  const isVerified = isHouseVerified() && Boolean(memberId);

  return { deviceToken: token, memberId, isVerified };
}

export function setStoredMemberData(memberId: string, houseCode?: string) {
  localStorage.setItem(MEMBER_KEY, memberId);
  setHouseVerified(houseCode);
}

export function isDeviceBound(): boolean {
  const { memberId, isVerified } = getStoredDeviceData();
  return Boolean(isVerified && memberId);
}
