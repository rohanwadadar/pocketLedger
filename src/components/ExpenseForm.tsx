import React, { useEffect, useState } from 'react';
import { Check, X } from 'lucide-react';
import {
  AppSettings,
  CATEGORIES,
  CURRENCIES,
  Expense,
  ExpenseCategory,
  PAYMENT_METHOD_ORDER,
  PaymentMethod,
  REGIONS,
} from '../types';
import { getCurrentTimeString } from '../utils/format';

export interface ExpenseFormValues {
  amount: number;
  title: string;
  category: ExpenseCategory;
  paymentMethod: PaymentMethod;
  date: string;
  time: string;
  note?: string;
}

interface ExpenseFormProps {
  settings: AppSettings;
  defaultDate: string;
  editingExpense?: Expense | null;
  prefillAmount?: number | null;
  prefillTitle?: string;
  onSubmit: (values: ExpenseFormValues, editingId?: string) => void;
  onCancel?: () => void;
  compact?: boolean;
}

export const ExpenseForm: React.FC<ExpenseFormProps> = ({
  settings,
  defaultDate,
  editingExpense,
  prefillAmount,
  prefillTitle,
  onSubmit,
  onCancel,
  compact = false,
}) => {
  const regionCfg = REGIONS[settings.region] || REGIONS.IN;
  const currencyConfig = CURRENCIES[settings.currency] || CURRENCIES.INR;

  const [amountInput, setAmountInput] = useState('');
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<ExpenseCategory>('food');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('upi');
  const [date, setDate] = useState(defaultDate);
  const [time, setTime] = useState(getCurrentTimeString());
  const [note, setNote] = useState('');
  const [error, setError] = useState('');
  const [justSaved, setJustSaved] = useState(false);

  useEffect(() => {
    if (editingExpense) {
      setAmountInput(String(editingExpense.amount));
      setTitle(editingExpense.title);
      setCategory(editingExpense.category);
      setPaymentMethod(editingExpense.paymentMethod);
      setDate(editingExpense.date);
      setTime(editingExpense.time);
      setNote(editingExpense.note || '');
      setError('');
    } else {
      setDate(defaultDate);
      if (typeof prefillAmount === 'number' && prefillAmount > 0) {
        setAmountInput(String(prefillAmount));
      }
      if (prefillTitle) {
        setTitle(prefillTitle);
      }
    }
  }, [editingExpense, defaultDate, prefillAmount, prefillTitle]);

  const handleQuickAmount = (val: number) => {
    setAmountInput(String(val));
    setError('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const numericAmount = parseFloat(amountInput);
    if (Number.isNaN(numericAmount) || numericAmount <= 0) {
      setError('Enter an amount greater than zero.');
      return;
    }

    const cleanTitle = title.trim() || CATEGORIES.find((c) => c.id === category)?.label || 'Expense';

    onSubmit(
      {
        amount: Math.round(numericAmount * 100) / 100,
        title: cleanTitle,
        category,
        paymentMethod,
        date,
        time: time || getCurrentTimeString(),
        note: note.trim() || undefined,
      },
      editingExpense?.id
    );

    if (!editingExpense) {
      setAmountInput('');
      setTitle('');
      setNote('');
      setTime(getCurrentTimeString());
      setError('');
      setJustSaved(true);
      window.setTimeout(() => setJustSaved(false), 1400);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-base font-semibold text-white">
            {editingExpense ? 'Edit Expense' : 'Record Expense'}
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            {regionCfg.name} · {currencyConfig.code} ({currencyConfig.symbol}) · Stored in device cache
          </p>
        </div>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="min-h-[44px] min-w-[44px] -mr-2 flex items-center justify-center rounded-xl text-slate-400 hover:text-white hover:bg-white/[0.06] transition-colors cursor-pointer"
            aria-label="Close expense form"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Amount Input */}
      <div>
        <label htmlFor="expense-amount" className="block text-xs font-medium text-slate-300 mb-1.5">
          Amount ({currencyConfig.symbol} {currencyConfig.code})
        </label>
        <div className="relative flex items-center">
          <span className="absolute left-3.5 text-lg font-mono font-semibold text-[#E5B869] select-none">
            {currencyConfig.symbol}
          </span>
          <input
            id="expense-amount"
            type="number"
            inputMode="decimal"
            step="0.01"
            min="0.01"
            placeholder="0.00"
            value={amountInput}
            onChange={(e) => {
              setAmountInput(e.target.value);
              if (error) setError('');
            }}
            className="w-full h-12 pl-10 pr-4 rounded-xl border border-white/10 bg-[#090B0E] focus:border-emerald-500 focus:outline-none font-mono text-xl font-semibold text-white tabular-nums transition-colors"
          />
        </div>
        <div className="mt-2 grid grid-cols-4 gap-1.5">
          {regionCfg.quickAmounts.map((amt) => (
            <button
              key={amt}
              type="button"
              onClick={() => handleQuickAmount(amt)}
              className="h-9 rounded-lg border border-white/[0.08] bg-[#090B0E] hover:border-emerald-500/50 hover:text-emerald-300 text-xs font-mono font-medium text-slate-300 tabular-nums transition-colors whitespace-nowrap cursor-pointer"
            >
              +{currencyConfig.symbol}{amt}
            </button>
          ))}
        </div>
        {error && (
          <p className="mt-1.5 text-xs font-medium text-rose-400" role="alert">
            {error}
          </p>
        )}
      </div>

      {/* Description */}
      <div>
        <label htmlFor="expense-title" className="block text-xs font-medium text-slate-300 mb-1.5">
          What was it for?
        </label>
        <input
          id="expense-title"
          type="text"
          maxLength={80}
          placeholder={settings.region === 'IN' ? 'e.g., Chai, Auto fare, Sabzi, Swiggy' : 'e.g., Coffee, Transit, Groceries'}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full h-11 px-3.5 rounded-xl border border-white/10 bg-[#090B0E] focus:border-emerald-500 focus:outline-none text-sm text-white placeholder:text-slate-500 transition-colors"
        />
      </div>

      {/* Category Selector */}
      <div>
        <span className="block text-xs font-medium text-slate-300 mb-1.5">Category</span>
        <div className={`grid ${compact ? 'grid-cols-2' : 'grid-cols-2 sm:grid-cols-4 lg:grid-cols-2'} gap-1.5`}>
          {CATEGORIES.map((cat) => {
            const active = category === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setCategory(cat.id)}
                className={`min-h-[40px] px-3 py-2 rounded-xl text-left text-xs font-medium transition-colors border truncate cursor-pointer ${
                  active
                    ? 'bg-white text-slate-950 border-white font-semibold'
                    : 'bg-[#090B0E] text-slate-300 border-white/[0.08] hover:border-white/20'
                }`}
              >
                {cat.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Region-Localized Payment Method */}
      <div>
        <span className="block text-xs font-medium text-slate-300 mb-1.5">Payment Method</span>
        <div className="grid grid-cols-2 gap-1.5">
          {PAYMENT_METHOD_ORDER.map((pm) => {
            const active = paymentMethod === pm;
            return (
              <button
                key={pm}
                type="button"
                onClick={() => setPaymentMethod(pm)}
                className={`min-h-[40px] px-3 py-2 rounded-xl text-xs font-medium transition-colors border truncate cursor-pointer ${
                  active
                    ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/60'
                    : 'bg-[#090B0E] text-slate-400 border-white/[0.08] hover:border-white/20 hover:text-slate-200'
                }`}
              >
                {regionCfg.paymentLabels[pm]}
              </button>
            );
          })}
        </div>
      </div>

      {/* Date & Time */}
      <div className="grid grid-cols-2 gap-2.5">
        <div>
          <label htmlFor="expense-date" className="block text-xs font-medium text-slate-300 mb-1.5">
            Date
          </label>
          <input
            id="expense-date"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full h-11 px-3 rounded-xl border border-white/10 bg-[#090B0E] focus:border-emerald-500 focus:outline-none text-xs font-mono text-slate-200"
          />
        </div>
        <div>
          <label htmlFor="expense-time" className="block text-xs font-medium text-slate-300 mb-1.5">
            Time
          </label>
          <input
            id="expense-time"
            type="time"
            value={time}
            onChange={(e) => setTime(e.target.value)}
            className="w-full h-11 px-3 rounded-xl border border-white/10 bg-[#090B0E] focus:border-emerald-500 focus:outline-none text-xs font-mono text-slate-200"
          />
        </div>
      </div>

      {/* Optional Note */}
      <div>
        <label htmlFor="expense-note" className="block text-xs font-medium text-slate-300 mb-1.5">
          Note (optional)
        </label>
        <input
          id="expense-note"
          type="text"
          maxLength={140}
          placeholder="Short memo or receipt note"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          className="w-full h-11 px-3.5 rounded-xl border border-white/10 bg-[#090B0E] focus:border-emerald-500 focus:outline-none text-sm text-white placeholder:text-slate-500"
        />
      </div>

      {/* Submit */}
      <div className="pt-1 flex items-center gap-2.5">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="h-12 px-5 rounded-xl border border-white/10 bg-[#090B0E] text-sm font-medium text-slate-300 hover:bg-white/[0.05] transition-colors whitespace-nowrap cursor-pointer"
          >
            Cancel
          </button>
        )}
        <button
          type="submit"
          className="flex-1 h-12 px-5 rounded-xl bg-emerald-500 hover:bg-emerald-400 active:scale-[0.99] text-slate-950 text-sm font-semibold flex items-center justify-center gap-2 transition-all whitespace-nowrap cursor-pointer"
        >
          {justSaved ? (
            <>
              <Check className="w-4 h-4" />
              Saved to Cache
            </>
          ) : editingExpense ? (
            'Update Expense'
          ) : (
            'Save Expense'
          )}
        </button>
      </div>
    </form>
  );
};
