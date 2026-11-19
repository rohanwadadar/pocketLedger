import {
  AppSettings,
  CalcHistoryItem,
  CATEGORY_MAP,
  CURRENCIES,
  CurrencyCode,
  Expense,
  ExpenseCategory,
  PaymentMethod,
  REGIONS,
  RegionCode,
  UserProfile,
} from '../types';
import { shiftDateKey, toLocalDateKey } from './format';

const EXPENSES_KEY = 'pocketledger_expenses_v2';
const SETTINGS_KEY = 'pocketledger_settings_v2';
const PROFILE_KEY = 'pocketledger_profile_v2';
const CALC_HISTORY_KEY = 'pocketledger_calc_history_v2';
const FX_RATES_KEY = 'pocketledger_fx_rates_v2';
const INIT_FLAG_KEY = 'pocketledger_initialized_v2';

const CACHE_NAME = 'pocketledger-device-cache-v2';
const CACHE_DATA_URL = '/__pocketledger_local_backup_v2__.json';

export const DEFAULT_SETTINGS: AppSettings = {
  region: 'IN',
  currency: 'INR',
  dailyBudget: 1500,
};

export const DEFAULT_PROFILE: UserProfile = {
  name: '',
  age: '',
  occupation: 'Salaried Professional',
  financialGoal: 'Control Daily Spend',
  monthlyIncome: 65000,
  onboardingCompleted: false,
};

export function buildSampleExpensesForRegion(region: RegionCode): Expense[] {
  const today = toLocalDateKey();
  const yesterday = shiftDateKey(today, -1);
  const twoDaysAgo = shiftDateKey(today, -2);
  const now = Date.now();

  if (region === 'IN') {
    return [
      {
        id: 'exp-in-1',
        amount: 140,
        title: 'Masala Chai & Poha',
        category: 'food',
        paymentMethod: 'upi',
        date: today,
        time: '08:50',
        note: 'Paid via UPI scan',
        createdAt: now - 1000 * 60 * 180,
      },
      {
        id: 'exp-in-2',
        amount: 85,
        title: 'Metro & Auto Commute',
        category: 'transport',
        paymentMethod: 'upi',
        date: today,
        time: '09:35',
        createdAt: now - 1000 * 60 * 120,
      },
      {
        id: 'exp-in-3',
        amount: 620,
        title: 'Fresh Vegetables & Dairy',
        category: 'groceries',
        paymentMethod: 'cash',
        date: today,
        time: '18:10',
        note: 'Local sabzi mandi',
        createdAt: now - 1000 * 60 * 30,
      },
      {
        id: 'exp-in-4',
        amount: 340,
        title: 'South Indian Lunch Thali',
        category: 'food',
        paymentMethod: 'upi',
        date: yesterday,
        time: '13:15',
        createdAt: now - 1000 * 60 * 60 * 24,
      },
      {
        id: 'exp-in-5',
        amount: 799,
        title: 'Fiber Broadband & Mobile Recharge',
        category: 'bills',
        paymentMethod: 'card',
        date: twoDaysAgo,
        time: '10:05',
        createdAt: now - 1000 * 60 * 60 * 48,
      },
    ];
  }

  // Scaled baseline for non-India regions
  const cfg = REGIONS[region] || REGIONS.US;
  const unit = Math.max(1, Math.round(cfg.defaultDailyBudget / 15));

  return [
    {
      id: 'exp-gl-1',
      amount: unit * 2,
      title: 'Morning Coffee & Breakfast',
      category: 'food',
      paymentMethod: 'card',
      date: today,
      time: '08:45',
      createdAt: now - 1000 * 60 * 180,
    },
    {
      id: 'exp-gl-2',
      amount: unit,
      title: 'City Transit Pass',
      category: 'transport',
      paymentMethod: 'upi',
      date: today,
      time: '09:20',
      createdAt: now - 1000 * 60 * 120,
    },
    {
      id: 'exp-gl-3',
      amount: unit * 5,
      title: 'Fresh Groceries',
      category: 'groceries',
      paymentMethod: 'card',
      date: today,
      time: '17:40',
      createdAt: now - 1000 * 60 * 30,
    },
    {
      id: 'exp-gl-4',
      amount: unit * 3,
      title: 'Midday Lunch',
      category: 'food',
      paymentMethod: 'cash',
      date: yesterday,
      time: '13:10',
      createdAt: now - 1000 * 60 * 60 * 24,
    },
  ];
}

export function loadProfile(): UserProfile {
  try {
    const raw = window.localStorage.getItem(PROFILE_KEY);
    if (!raw) return DEFAULT_PROFILE;
    const parsed = JSON.parse(raw) as Partial<UserProfile>;
    return {
      name: typeof parsed.name === 'string' ? parsed.name : '',
      age: typeof parsed.age === 'string' ? parsed.age : '',
      occupation: parsed.occupation || DEFAULT_PROFILE.occupation,
      financialGoal: parsed.financialGoal || DEFAULT_PROFILE.financialGoal,
      monthlyIncome:
        typeof parsed.monthlyIncome === 'number' && parsed.monthlyIncome >= 0
          ? parsed.monthlyIncome
          : DEFAULT_PROFILE.monthlyIncome,
      onboardingCompleted: Boolean(parsed.onboardingCompleted),
    };
  } catch {
    return DEFAULT_PROFILE;
  }
}

export function loadSettings(): AppSettings {
  try {
    const raw = window.localStorage.getItem(SETTINGS_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    const parsed = JSON.parse(raw) as Partial<AppSettings>;
    const region: RegionCode =
      parsed.region && parsed.region in REGIONS ? parsed.region : DEFAULT_SETTINGS.region;
    const currency: CurrencyCode =
      parsed.currency && parsed.currency in CURRENCIES
        ? parsed.currency
        : REGIONS[region].currency;
    return {
      region,
      currency,
      dailyBudget:
        typeof parsed.dailyBudget === 'number' && parsed.dailyBudget > 0
          ? parsed.dailyBudget
          : REGIONS[region].defaultDailyBudget,
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function loadExpenses(): Expense[] {
  try {
    const initialized = window.localStorage.getItem(INIT_FLAG_KEY);
    const raw = window.localStorage.getItem(EXPENSES_KEY);

    if (!initialized && !raw) {
      const settings = loadSettings();
      const seeded = buildSampleExpensesForRegion(settings.region);
      window.localStorage.setItem(EXPENSES_KEY, JSON.stringify(seeded));
      window.localStorage.setItem(INIT_FLAG_KEY, 'true');
      return seeded;
    }

    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function loadCalcHistory(): CalcHistoryItem[] {
  try {
    const raw = window.localStorage.getItem(CALC_HISTORY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveCalcHistory(history: CalcHistoryItem[]): void {
  try {
    window.localStorage.setItem(CALC_HISTORY_KEY, JSON.stringify(history.slice(0, 25)));
  } catch {
    // ignore quota issues
  }
}

export function loadCachedFxRates(): { rates: Record<CurrencyCode, number>; updatedAt: string | null } {
  const defaults = Object.values(CURRENCIES).reduce((acc, c) => {
    acc[c.code] = c.ratePerUSD;
    return acc;
  }, {} as Record<CurrencyCode, number>);

  try {
    const raw = window.localStorage.getItem(FX_RATES_KEY);
    if (!raw) return { rates: defaults, updatedAt: null };
    const parsed = JSON.parse(raw) as { rates?: Partial<Record<CurrencyCode, number>>; updatedAt?: string };
    return {
      rates: { ...defaults, ...(parsed.rates || {}) },
      updatedAt: parsed.updatedAt || null,
    };
  } catch {
    return { rates: defaults, updatedAt: null };
  }
}

export function saveCachedFxRates(rates: Record<CurrencyCode, number>, updatedAt: string): void {
  try {
    window.localStorage.setItem(FX_RATES_KEY, JSON.stringify({ rates, updatedAt }));
  } catch {
    // ignore
  }
}

export function persistAllState(
  expenses: Expense[],
  settings: AppSettings,
  profile: UserProfile
): void {
  try {
    window.localStorage.setItem(EXPENSES_KEY, JSON.stringify(expenses));
    window.localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    window.localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
    window.localStorage.setItem(INIT_FLAG_KEY, 'true');
    void mirrorToCacheStorage(expenses, settings, profile);
  } catch (err) {
    console.error('Failed to persist data to device cache:', err);
  }
}

async function mirrorToCacheStorage(
  expenses: Expense[],
  settings: AppSettings,
  profile: UserProfile
): Promise<void> {
  if (typeof window === 'undefined' || !('caches' in window)) return;
  try {
    const cache = await window.caches.open(CACHE_NAME);
    const payload = JSON.stringify({
      version: 2,
      updatedAt: new Date().toISOString(),
      profile,
      settings,
      expenses,
    });
    const response = new Response(payload, {
      headers: {
        'Content-Type': 'application/json',
        'X-Saved-At': new Date().toISOString(),
      },
    });
    await cache.put(CACHE_DATA_URL, response);
  } catch {
    // localStorage remains primary
  }
}

export async function recoverFromCacheIfEmpty(): Promise<{
  expenses: Expense[];
  settings: AppSettings;
  profile: UserProfile;
} | null> {
  if (typeof window === 'undefined' || !('caches' in window)) return null;
  try {
    const hasLocal = window.localStorage.getItem(EXPENSES_KEY);
    const hasProfile = window.localStorage.getItem(PROFILE_KEY);
    if (hasLocal && hasProfile) return null;

    const cache = await window.caches.open(CACHE_NAME);
    const match = await cache.match(CACHE_DATA_URL);
    if (!match) return null;
    const data = await match.json();
    if (Array.isArray(data?.expenses)) {
      const recoveredSettings = data.settings || DEFAULT_SETTINGS;
      const recoveredProfile = data.profile || DEFAULT_PROFILE;
      window.localStorage.setItem(EXPENSES_KEY, JSON.stringify(data.expenses));
      window.localStorage.setItem(SETTINGS_KEY, JSON.stringify(recoveredSettings));
      window.localStorage.setItem(PROFILE_KEY, JSON.stringify(recoveredProfile));
      window.localStorage.setItem(INIT_FLAG_KEY, 'true');
      return {
        expenses: data.expenses,
        settings: recoveredSettings,
        profile: recoveredProfile,
      };
    }
  } catch {
    return null;
  }
  return null;
}

export function getLocalCacheStats(): {
  bytesUsed: number;
  cacheApiSupported: boolean;
  localStorageSupported: boolean;
} {
  let bytesUsed = 0;
  let localStorageSupported = false;

  try {
    localStorageSupported = typeof window !== 'undefined' && 'localStorage' in window;
    if (localStorageSupported) {
      const pieces = [
        window.localStorage.getItem(EXPENSES_KEY) || '',
        window.localStorage.getItem(SETTINGS_KEY) || '',
        window.localStorage.getItem(PROFILE_KEY) || '',
        window.localStorage.getItem(CALC_HISTORY_KEY) || '',
        window.localStorage.getItem(FX_RATES_KEY) || '',
      ];
      bytesUsed = new Blob(pieces).size;
    }
  } catch {
    localStorageSupported = false;
  }

  return {
    bytesUsed,
    cacheApiSupported: typeof window !== 'undefined' && 'caches' in window,
    localStorageSupported,
  };
}

export async function clearAllExpensesFromCache(settings: AppSettings, profile: UserProfile): Promise<void> {
  try {
    window.localStorage.setItem(EXPENSES_KEY, JSON.stringify([]));
    window.localStorage.setItem(INIT_FLAG_KEY, 'true');
    await mirrorToCacheStorage([], settings, profile);
  } catch {
    // ignore
  }
}

export function exportExpensesToCSV(expenses: Expense[], settings: AppSettings): void {
  const regionCfg = REGIONS[settings.region] || REGIONS.IN;
  const headers = ['Date', 'Time', 'Title', 'Category', 'Payment Method', `Amount (${settings.currency})`, 'Note'];
  const escapeCell = (value: string | number | undefined) => {
    const str = String(value ?? '');
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const rows = [...expenses]
    .sort((a, b) => (a.date === b.date ? b.time.localeCompare(a.time) : b.date.localeCompare(a.date)))
    .map((exp) => [
      exp.date,
      exp.time,
      exp.title,
      CATEGORY_MAP[exp.category]?.label || exp.category,
      regionCfg.paymentLabels[exp.paymentMethod] || exp.paymentMethod,
      exp.amount.toFixed(2),
      exp.note || '',
    ]);

  const csvContent = [headers, ...rows].map((row) => row.map(escapeCell).join(',')).join('\n');
  triggerDownload(csvContent, `pocketledger-${settings.region.toLowerCase()}-${toLocalDateKey()}.csv`, 'text/csv;charset=utf-8;');
}

export function exportBackupJSON(
  expenses: Expense[],
  settings: AppSettings,
  profile: UserProfile
): void {
  const payload = JSON.stringify(
    {
      app: 'PocketLedger',
      version: 2,
      exportedAt: new Date().toISOString(),
      profile,
      settings,
      expenses,
    },
    null,
    2
  );
  triggerDownload(payload, `pocketledger-backup-${toLocalDateKey()}.json`, 'application/json');
}

export function parseImportedBackup(rawText: string): {
  expenses: Expense[];
  settings?: AppSettings;
  profile?: UserProfile;
} {
  const parsed = JSON.parse(rawText);
  const list = Array.isArray(parsed) ? parsed : parsed?.expenses;
  if (!Array.isArray(list)) {
    throw new Error('Backup file does not contain a valid expenses list.');
  }

  const validCategories = new Set<ExpenseCategory>([
    'food',
    'groceries',
    'transport',
    'bills',
    'shopping',
    'health',
    'entertainment',
    'other',
  ]);
  const validMethods = new Set<PaymentMethod>(['upi', 'cash', 'card', 'transfer']);

  const sanitized: Expense[] = list
    .filter((item) => item && typeof item.amount === 'number' && !Number.isNaN(item.amount) && item.amount > 0)
    .map((item, idx) => ({
      id: typeof item.id === 'string' && item.id.trim() ? item.id : `imp-${Date.now()}-${idx}`,
      amount: Math.round(item.amount * 100) / 100,
      title: typeof item.title === 'string' && item.title.trim() ? item.title.trim().slice(0, 80) : 'Imported Expense',
      category: validCategories.has(item.category) ? item.category : 'other',
      paymentMethod: validMethods.has(item.paymentMethod) ? item.paymentMethod : 'upi',
      date: typeof item.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(item.date) ? item.date : toLocalDateKey(),
      time: typeof item.time === 'string' && /^\d{2}:\d{2}$/.test(item.time) ? item.time : '12:00',
      note: typeof item.note === 'string' ? item.note.trim().slice(0, 140) : undefined,
      createdAt: typeof item.createdAt === 'number' ? item.createdAt : Date.now() - idx,
    }));

  let importedSettings: AppSettings | undefined;
  if (parsed?.settings && typeof parsed.settings === 'object') {
    const region: RegionCode =
      parsed.settings.region && parsed.settings.region in REGIONS ? parsed.settings.region : 'IN';
    const currency: CurrencyCode =
      parsed.settings.currency && parsed.settings.currency in CURRENCIES
        ? parsed.settings.currency
        : REGIONS[region].currency;
    importedSettings = {
      region,
      currency,
      dailyBudget:
        typeof parsed.settings.dailyBudget === 'number' && parsed.settings.dailyBudget > 0
          ? parsed.settings.dailyBudget
          : REGIONS[region].defaultDailyBudget,
    };
  }

  let importedProfile: UserProfile | undefined;
  if (parsed?.profile && typeof parsed.profile === 'object') {
    importedProfile = {
      ...DEFAULT_PROFILE,
      ...parsed.profile,
      onboardingCompleted: true,
    };
  }

  return { expenses: sanitized, settings: importedSettings, profile: importedProfile };
}

function triggerDownload(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
