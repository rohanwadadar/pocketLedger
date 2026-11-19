import { CURRENCIES, CurrencyCode, REGIONS, RegionCode } from '../types';

export function toLocalDateKey(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getCurrentTimeString(date: Date = new Date()): string {
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
}

export function parseLocalDateKey(dateKey: string): Date {
  const [year, month, day] = dateKey.split('-').map(Number);
  return new Date(year, (month || 1) - 1, day || 1);
}

export function shiftDateKey(dateKey: string, deltaDays: number): string {
  const d = parseLocalDateKey(dateKey);
  d.setDate(d.getDate() + deltaDays);
  return toLocalDateKey(d);
}

export function getWeekDatesAround(anchorDateKey: string): string[] {
  const anchor = parseLocalDateKey(anchorDateKey);
  const today = parseLocalDateKey(toLocalDateKey());
  const diffFromToday = Math.round((today.getTime() - anchor.getTime()) / (1000 * 60 * 60 * 24));
  let endDate: Date;

  if (diffFromToday >= 0 && diffFromToday <= 6) {
    endDate = today;
  } else {
    endDate = new Date(anchor);
    endDate.setDate(anchor.getDate() + 3);
  }

  const days: string[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(endDate);
    d.setDate(endDate.getDate() - i);
    days.push(toLocalDateKey(d));
  }
  return days;
}

export function formatCurrency(amount: number, currency: CurrencyCode, maximumFractionDigits?: number): string {
  const config = CURRENCIES[currency] || CURRENCIES.INR;
  const isWhole = currency === 'JPY';
  const maxDigits = maximumFractionDigits ?? (isWhole ? 0 : 2);
  const minDigits = isWhole ? 0 : (maximumFractionDigits === 0 ? 0 : 2);

  try {
    return new Intl.NumberFormat(config.locale, {
      style: 'currency',
      currency: config.code,
      minimumFractionDigits: minDigits,
      maximumFractionDigits: maxDigits,
    }).format(amount);
  } catch {
    return `${config.symbol}${amount.toFixed(maxDigits)}`;
  }
}

export function formatCompactAmount(amount: number, currency: CurrencyCode, region?: RegionCode): string {
  const config = CURRENCIES[currency] || CURRENCIES.INR;
  const useIndian = region ? REGIONS[region]?.usesIndianNumbering : currency === 'INR';

  if (useIndian) {
    if (amount >= 10000000) return `${config.symbol}${(amount / 10000000).toFixed(2)}Cr`;
    if (amount >= 100000) return `${config.symbol}${(amount / 100000).toFixed(2)}L`;
    if (amount >= 1000) return `${config.symbol}${(amount / 1000).toFixed(1)}k`;
    return `${config.symbol}${Math.round(amount)}`;
  }

  if (amount >= 1000000) return `${config.symbol}${(amount / 1000000).toFixed(2)}M`;
  if (amount >= 1000) return `${config.symbol}${(amount / 1000).toFixed(1)}k`;
  return `${config.symbol}${Math.round(amount)}`;
}

export function formatIndianWordsHint(amount: number, currency: CurrencyCode): string | null {
  if (currency !== 'INR') return null;
  if (amount >= 10000000) return `${(amount / 10000000).toFixed(2)} Crore`;
  if (amount >= 100000) return `${(amount / 100000).toFixed(2)} Lakh`;
  return null;
}

export function formatFriendlyDate(dateKey: string): string {
  const todayKey = toLocalDateKey();
  const yesterdayKey = shiftDateKey(todayKey, -1);
  const d = parseLocalDateKey(dateKey);

  const formatted = d.toLocaleDateString('en-IN', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });

  if (dateKey === todayKey) return `Today · ${formatted}`;
  if (dateKey === yesterdayKey) return `Yesterday · ${formatted}`;
  return formatted;
}

export function formatShortDay(dateKey: string): { weekday: string; dayNum: string } {
  const d = parseLocalDateKey(dateKey);
  return {
    weekday: d.toLocaleDateString('en-US', { weekday: 'short' }).slice(0, 3),
    dayNum: String(d.getDate()),
  };
}

export function formatDisplayTime(timeStr: string): string {
  if (!timeStr) return '';
  const [hStr, mStr] = timeStr.split(':');
  const hours = Number(hStr);
  const minutes = Number(mStr);
  if (Number.isNaN(hours) || Number.isNaN(minutes)) return timeStr;
  const suffix = hours >= 12 ? 'PM' : 'AM';
  const h12 = hours % 12 || 12;
  return `${h12}:${String(minutes).padStart(2, '0')} ${suffix}`;
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB`;
  return `${(kb / 1024).toFixed(2)} MB`;
}

export function getTimeGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}
