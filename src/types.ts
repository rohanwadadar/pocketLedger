export type ExpenseCategory =
  | 'food'
  | 'groceries'
  | 'transport'
  | 'bills'
  | 'shopping'
  | 'health'
  | 'entertainment'
  | 'other';

export type PaymentMethod = 'upi' | 'cash' | 'card' | 'transfer';

export type RegionCode = 'IN' | 'US' | 'GB' | 'EU' | 'AE' | 'CA' | 'AU' | 'JP' | 'SG';

export type CurrencyCode =
  | 'INR'
  | 'USD'
  | 'GBP'
  | 'EUR'
  | 'AED'
  | 'CAD'
  | 'AUD'
  | 'JPY'
  | 'SGD'
  | 'CHF'
  | 'CNY'
  | 'SAR'
  | 'MYR'
  | 'THB'
  | 'BRL';

export type UserOccupation =
  | 'Salaried Professional'
  | 'Student'
  | 'Freelancer'
  | 'Business Owner'
  | 'Homemaker'
  | 'Other';

export type FinancialGoal =
  | 'Control Daily Spend'
  | 'Build Monthly Savings'
  | 'Plan EMIs & Loans'
  | 'Track Business & Tax';

export interface UserProfile {
  name: string;
  age: string;
  occupation: UserOccupation;
  financialGoal: FinancialGoal;
  monthlyIncome: number;
  onboardingCompleted: boolean;
}

export interface Expense {
  id: string;
  amount: number;
  title: string;
  category: ExpenseCategory;
  paymentMethod: PaymentMethod;
  date: string; // YYYY-MM-DD (local device date)
  time: string; // HH:mm
  note?: string;
  createdAt: number;
}

export interface AppSettings {
  region: RegionCode;
  currency: CurrencyCode;
  dailyBudget: number;
}

export interface CalcHistoryItem {
  id: string;
  expression: string;
  result: string;
  timestamp: number;
}

export interface RegionConfig {
  code: RegionCode;
  name: string;
  currency: CurrencyCode;
  locale: string;
  defaultDailyBudget: number;
  defaultMonthlyIncome: number;
  taxLabel: string;
  defaultTaxRate: number;
  taxSlabs: number[];
  paymentLabels: Record<PaymentMethod, string>;
  quickAmounts: number[];
  usesIndianNumbering: boolean;
}

export interface CurrencyMeta {
  code: CurrencyCode;
  symbol: string;
  name: string;
  locale: string;
  ratePerUSD: number; // Offline reference rate (units per 1 USD)
}

export const CURRENCIES: Record<CurrencyCode, CurrencyMeta> = {
  INR: { code: 'INR', symbol: '₹', name: 'Indian Rupee', locale: 'en-IN', ratePerUSD: 84.4 },
  USD: { code: 'USD', symbol: '$', name: 'US Dollar', locale: 'en-US', ratePerUSD: 1.0 },
  EUR: { code: 'EUR', symbol: '€', name: 'Euro', locale: 'de-DE', ratePerUSD: 0.92 },
  GBP: { code: 'GBP', symbol: '£', name: 'British Pound', locale: 'en-GB', ratePerUSD: 0.79 },
  AED: { code: 'AED', symbol: 'د.إ', name: 'UAE Dirham', locale: 'en-AE', ratePerUSD: 3.6725 },
  CAD: { code: 'CAD', symbol: 'C$', name: 'Canadian Dollar', locale: 'en-CA', ratePerUSD: 1.39 },
  AUD: { code: 'AUD', symbol: 'A$', name: 'Australian Dollar', locale: 'en-AU', ratePerUSD: 1.53 },
  JPY: { code: 'JPY', symbol: '¥', name: 'Japanese Yen', locale: 'ja-JP', ratePerUSD: 154.0 },
  SGD: { code: 'SGD', symbol: 'S$', name: 'Singapore Dollar', locale: 'en-SG', ratePerUSD: 1.34 },
  CHF: { code: 'CHF', symbol: 'CHF', name: 'Swiss Franc', locale: 'de-CH', ratePerUSD: 0.88 },
  CNY: { code: 'CNY', symbol: '¥', name: 'Chinese Yuan', locale: 'zh-CN', ratePerUSD: 7.24 },
  SAR: { code: 'SAR', symbol: '﷼', name: 'Saudi Riyal', locale: 'en-SA', ratePerUSD: 3.75 },
  MYR: { code: 'MYR', symbol: 'RM', name: 'Malaysian Ringgit', locale: 'en-MY', ratePerUSD: 4.46 },
  THB: { code: 'THB', symbol: '฿', name: 'Thai Baht', locale: 'th-TH', ratePerUSD: 34.7 },
  BRL: { code: 'BRL', symbol: 'R$', name: 'Brazilian Real', locale: 'pt-BR', ratePerUSD: 5.78 },
};

export const REGIONS: Record<RegionCode, RegionConfig> = {
  IN: {
    code: 'IN',
    name: 'India',
    currency: 'INR',
    locale: 'en-IN',
    defaultDailyBudget: 1500,
    defaultMonthlyIncome: 65000,
    taxLabel: 'GST',
    defaultTaxRate: 18,
    taxSlabs: [5, 12, 18, 28],
    paymentLabels: {
      upi: 'UPI (GPay / PhonePe)',
      cash: 'Cash',
      card: 'Card (RuPay / Visa)',
      transfer: 'NetBanking / IMPS',
    },
    quickAmounts: [50, 150, 500, 1000],
    usesIndianNumbering: true,
  },
  US: {
    code: 'US',
    name: 'United States',
    currency: 'USD',
    locale: 'en-US',
    defaultDailyBudget: 75,
    defaultMonthlyIncome: 5000,
    taxLabel: 'Sales Tax',
    defaultTaxRate: 8.25,
    taxSlabs: [5, 7, 8.25, 10],
    paymentLabels: {
      upi: 'Apple Pay / Zelle',
      cash: 'Cash',
      card: 'Credit / Debit Card',
      transfer: 'ACH / Bank Transfer',
    },
    quickAmounts: [5, 15, 30, 60],
    usesIndianNumbering: false,
  },
  GB: {
    code: 'GB',
    name: 'United Kingdom',
    currency: 'GBP',
    locale: 'en-GB',
    defaultDailyBudget: 60,
    defaultMonthlyIncome: 3800,
    taxLabel: 'VAT',
    defaultTaxRate: 20,
    taxSlabs: [5, 10, 15, 20],
    paymentLabels: {
      upi: 'Contactless / Pay',
      cash: 'Cash',
      card: 'Debit / Credit Card',
      transfer: 'Faster Payments',
    },
    quickAmounts: [5, 10, 25, 50],
    usesIndianNumbering: false,
  },
  EU: {
    code: 'EU',
    name: 'Europe (Eurozone)',
    currency: 'EUR',
    locale: 'de-DE',
    defaultDailyBudget: 65,
    defaultMonthlyIncome: 4000,
    taxLabel: 'VAT',
    defaultTaxRate: 19,
    taxSlabs: [7, 10, 19, 21],
    paymentLabels: {
      upi: 'Mobile Pay',
      cash: 'Cash',
      card: 'Card',
      transfer: 'SEPA Transfer',
    },
    quickAmounts: [5, 15, 30, 50],
    usesIndianNumbering: false,
  },
  AE: {
    code: 'AE',
    name: 'UAE',
    currency: 'AED',
    locale: 'en-AE',
    defaultDailyBudget: 250,
    defaultMonthlyIncome: 15000,
    taxLabel: 'VAT',
    defaultTaxRate: 5,
    taxSlabs: [5, 10, 15, 20],
    paymentLabels: {
      upi: 'Apple / Samsung Pay',
      cash: 'Cash',
      card: 'Card',
      transfer: 'Bank Transfer',
    },
    quickAmounts: [20, 50, 100, 250],
    usesIndianNumbering: false,
  },
  CA: {
    code: 'CA',
    name: 'Canada',
    currency: 'CAD',
    locale: 'en-CA',
    defaultDailyBudget: 90,
    defaultMonthlyIncome: 5500,
    taxLabel: 'GST / HST',
    defaultTaxRate: 13,
    taxSlabs: [5, 12, 13, 15],
    paymentLabels: {
      upi: 'Interac e-Transfer',
      cash: 'Cash',
      card: 'Card',
      transfer: 'Bank Transfer',
    },
    quickAmounts: [10, 25, 50, 100],
    usesIndianNumbering: false,
  },
  AU: {
    code: 'AU',
    name: 'Australia',
    currency: 'AUD',
    locale: 'en-AU',
    defaultDailyBudget: 95,
    defaultMonthlyIncome: 6200,
    taxLabel: 'GST',
    defaultTaxRate: 10,
    taxSlabs: [5, 10, 15, 20],
    paymentLabels: {
      upi: 'PayID / Tap Pay',
      cash: 'Cash',
      card: 'Card',
      transfer: 'Bank Transfer',
    },
    quickAmounts: [10, 25, 50, 100],
    usesIndianNumbering: false,
  },
  SG: {
    code: 'SG',
    name: 'Singapore',
    currency: 'SGD',
    locale: 'en-SG',
    defaultDailyBudget: 85,
    defaultMonthlyIncome: 5500,
    taxLabel: 'GST',
    defaultTaxRate: 9,
    taxSlabs: [7, 8, 9, 10],
    paymentLabels: {
      upi: 'PayNow / PayLah',
      cash: 'Cash',
      card: 'Card',
      transfer: 'FAST Transfer',
    },
    quickAmounts: [10, 20, 50, 100],
    usesIndianNumbering: false,
  },
  JP: {
    code: 'JP',
    name: 'Japan',
    currency: 'JPY',
    locale: 'ja-JP',
    defaultDailyBudget: 8000,
    defaultMonthlyIncome: 380000,
    taxLabel: 'Consumption Tax',
    defaultTaxRate: 10,
    taxSlabs: [8, 10, 12, 15],
    paymentLabels: {
      upi: 'PayPay / Suica',
      cash: 'Cash',
      card: 'Card',
      transfer: 'Bank Transfer',
    },
    quickAmounts: [500, 1000, 3000, 5000],
    usesIndianNumbering: false,
  },
};

export const REGION_LIST: RegionConfig[] = Object.values(REGIONS);

export interface CategoryMeta {
  id: ExpenseCategory;
  label: string;
  tintBg: string;
  tintText: string;
  barColor: string;
}

export const CATEGORIES: CategoryMeta[] = [
  { id: 'food', label: 'Food & Chai', tintBg: 'bg-emerald-500/12', tintText: 'text-emerald-400', barColor: '#10B981' },
  { id: 'groceries', label: 'Groceries', tintBg: 'bg-teal-500/12', tintText: 'text-teal-400', barColor: '#14B8A6' },
  { id: 'transport', label: 'Travel & Fuel', tintBg: 'bg-sky-500/12', tintText: 'text-sky-400', barColor: '#38BDF8' },
  { id: 'bills', label: 'Bills & Recharge', tintBg: 'bg-amber-500/12', tintText: 'text-amber-300', barColor: '#E5B869' },
  { id: 'shopping', label: 'Shopping', tintBg: 'bg-orange-500/12', tintText: 'text-orange-400', barColor: '#FB923C' },
  { id: 'health', label: 'Health & Meds', tintBg: 'bg-rose-500/12', tintText: 'text-rose-400', barColor: '#F43F5E' },
  { id: 'entertainment', label: 'Leisure', tintBg: 'bg-indigo-500/12', tintText: 'text-indigo-300', barColor: '#818CF8' },
  { id: 'other', label: 'Other', tintBg: 'bg-slate-400/12', tintText: 'text-slate-300', barColor: '#94A3B8' },
];

export const CATEGORY_MAP: Record<ExpenseCategory, CategoryMeta> = CATEGORIES.reduce(
  (acc, item) => {
    acc[item.id] = item;
    return acc;
  },
  {} as Record<ExpenseCategory, CategoryMeta>
);

export const PAYMENT_METHOD_ORDER: PaymentMethod[] = ['upi', 'cash', 'card', 'transfer'];

export const OCCUPATIONS: UserOccupation[] = [
  'Salaried Professional',
  'Student',
  'Freelancer',
  'Business Owner',
  'Homemaker',
  'Other',
];

export const FINANCIAL_GOALS: FinancialGoal[] = [
  'Control Daily Spend',
  'Build Monthly Savings',
  'Plan EMIs & Loans',
  'Track Business & Tax',
];
