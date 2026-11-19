import React, { useMemo, useState } from 'react';
import {
  Calculator,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Pencil,
  Plus,
  Search,
  Trash2,
  X,
} from 'lucide-react';
import {
  AppSettings,
  CATEGORIES,
  CATEGORY_MAP,
  Expense,
  ExpenseCategory,
  REGIONS,
  UserProfile,
} from '../types';
import {
  formatCompactAmount,
  formatCurrency,
  formatDisplayTime,
  formatFriendlyDate,
  formatShortDay,
  getTimeGreeting,
  getWeekDatesAround,
  shiftDateKey,
  toLocalDateKey,
} from '../utils/format';
import { CategoryIcon } from './CategoryIcon';
import { ExpenseForm, ExpenseFormValues } from './ExpenseForm';

interface DailyViewProps {
  expenses: Expense[];
  settings: AppSettings;
  profile: UserProfile;
  selectedDate: string;
  onSelectDate: (dateKey: string) => void;
  onSaveExpense: (values: ExpenseFormValues, editingId?: string) => void;
  onDeleteExpense: (id: string) => void;
  onEditExpenseMobile: (expense: Expense) => void;
  onOpenAddMobile: () => void;
  onOpenTools: () => void;
}

export const DailyView: React.FC<DailyViewProps> = ({
  expenses,
  settings,
  profile,
  selectedDate,
  onSelectDate,
  onSaveExpense,
  onDeleteExpense,
  onEditExpenseMobile,
  onOpenAddMobile,
  onOpenTools,
}) => {
  const [categoryFilter, setCategoryFilter] = useState<ExpenseCategory | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [desktopEditing, setDesktopEditing] = useState<Expense | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const regionCfg = REGIONS[settings.region] || REGIONS.IN;
  const todayKey = toLocalDateKey();
  const weekDates = useMemo(() => getWeekDatesAround(selectedDate), [selectedDate]);

  const totalsByDate = useMemo(() => {
    const map: Record<string, number> = {};
    for (const exp of expenses) {
      map[exp.date] = (map[exp.date] || 0) + exp.amount;
    }
    return map;
  }, [expenses]);

  const dayExpensesAll = useMemo(() => {
    return expenses
      .filter((e) => e.date === selectedDate)
      .sort((a, b) => b.time.localeCompare(a.time) || b.createdAt - a.createdAt);
  }, [expenses, selectedDate]);

  const filteredExpenses = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return dayExpensesAll.filter((e) => {
      if (categoryFilter !== 'all' && e.category !== categoryFilter) return false;
      if (q) {
        const hay = `${e.title} ${e.note || ''} ${CATEGORY_MAP[e.category]?.label || ''}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [dayExpensesAll, categoryFilter, searchQuery]);

  const dayTotal = useMemo(
    () => dayExpensesAll.reduce((sum, e) => sum + e.amount, 0),
    [dayExpensesAll]
  );

  const monthTotal = useMemo(() => {
    const prefix = selectedDate.slice(0, 7);
    return expenses
      .filter((e) => e.date.startsWith(prefix))
      .reduce((sum, e) => sum + e.amount, 0);
  }, [expenses, selectedDate]);

  const weekSummary = useMemo(() => {
    const bars = weekDates.map((d) => ({
      date: d,
      total: totalsByDate[d] || 0,
      ...formatShortDay(d),
    }));
    const weekTotal = bars.reduce((s, b) => s + b.total, 0);
    const maxVal = Math.max(...bars.map((b) => b.total), settings.dailyBudget, 1);
    return { bars, weekTotal, avgPerDay: weekTotal / 7, maxVal };
  }, [weekDates, totalsByDate, settings.dailyBudget]);

  const budgetRatio = settings.dailyBudget > 0 ? dayTotal / settings.dailyBudget : 0;
  const remaining = settings.dailyBudget - dayTotal;
  const budgetState: { label: string; barClass: string; textClass: string } =
    budgetRatio > 1
      ? { label: 'Over daily limit', barClass: 'bg-rose-500', textClass: 'text-rose-400' }
      : budgetRatio >= 0.8
        ? { label: 'Near daily limit', barClass: 'bg-[#E5B869]', textClass: 'text-[#E5B869]' }
        : { label: 'On track', barClass: 'bg-emerald-500', textClass: 'text-emerald-400' };

  const handleDesktopSave = (values: ExpenseFormValues, editingId?: string) => {
    onSaveExpense(values, editingId);
    setDesktopEditing(null);
  };

  return (
    <div className="space-y-6">
      {/* Personalized Welcome Strip */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <div>
          <p className="text-xs text-slate-400">
            {regionCfg.name} · {settings.currency} · {profile.occupation}
          </p>
          <h1 className="mt-1 font-display text-2xl sm:text-3xl font-semibold tracking-tight text-white">
            {getTimeGreeting()}
            {profile.name ? `, ${profile.name}` : ''}
          </h1>
        </div>
        <button
          type="button"
          onClick={onOpenTools}
          className="self-start sm:self-auto h-10 px-3.5 rounded-xl bg-[#11151B] hover:bg-[#171D26] border border-white/[0.08] text-xs font-medium text-slate-200 inline-flex items-center gap-2 transition-colors cursor-pointer"
        >
          <Calculator className="w-3.5 h-3.5 text-emerald-400" />
          <span>{regionCfg.taxLabel}, Currency &amp; EMI Tools</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">
        {/* Main Column */}
        <div className="lg:col-span-8 space-y-6">
          {/* Date Navigation & 7-Day Scroller */}
          <section className="bg-[#11151B] rounded-2xl border border-white/[0.08] p-4 sm:p-5">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
              <div className="flex items-center gap-2 min-w-0">
                <button
                  type="button"
                  onClick={() => onSelectDate(shiftDateKey(selectedDate, -7))}
                  className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-xl border border-white/[0.08] bg-[#090B0E] text-slate-300 hover:text-white hover:border-white/20 transition-colors cursor-pointer"
                  aria-label="Previous week"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <h2 className="font-display text-base sm:text-lg font-semibold text-white truncate px-1">
                  {formatFriendlyDate(selectedDate)}
                </h2>
                <button
                  type="button"
                  onClick={() => onSelectDate(shiftDateKey(selectedDate, 7))}
                  className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-xl border border-white/[0.08] bg-[#090B0E] text-slate-300 hover:text-white hover:border-white/20 transition-colors cursor-pointer"
                  aria-label="Next week"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              <div className="flex items-center gap-2">
                {selectedDate !== todayKey && (
                  <button
                    type="button"
                    onClick={() => onSelectDate(todayKey)}
                    className="h-10 px-3.5 rounded-xl border border-white/[0.08] bg-[#090B0E] hover:border-emerald-500/50 text-xs font-medium text-slate-200 transition-colors whitespace-nowrap cursor-pointer"
                  >
                    Today
                  </button>
                )}
                <label className="relative h-10 px-3 rounded-xl border border-white/[0.08] bg-[#090B0E] hover:border-white/20 text-xs font-medium text-slate-200 flex items-center gap-1.5 cursor-pointer">
                  <Calendar className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="hidden sm:inline whitespace-nowrap">Jump Date</span>
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => {
                      if (e.target.value) onSelectDate(e.target.value);
                    }}
                    aria-label="Jump to date"
                    className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                  />
                </label>
              </div>
            </div>

            {/* 7-Day Selector Strip */}
            <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
              {weekDates.map((dateKey) => {
                const { weekday, dayNum } = formatShortDay(dateKey);
                const isSelected = dateKey === selectedDate;
                const isToday = dateKey === todayKey;
                const totalForDay = totalsByDate[dateKey] || 0;

                return (
                  <button
                    key={dateKey}
                    type="button"
                    onClick={() => onSelectDate(dateKey)}
                    className={`min-h-[70px] py-2 px-1 rounded-xl flex flex-col items-center justify-center gap-0.5 transition-colors cursor-pointer border ${
                      isSelected
                        ? 'bg-emerald-500 text-slate-950 border-emerald-400'
                        : isToday
                          ? 'bg-emerald-500/10 text-white border-emerald-500/35 hover:bg-emerald-500/15'
                          : 'bg-[#090B0E] text-slate-300 border-white/[0.05] hover:border-white/15'
                    }`}
                  >
                    <span
                      className={`text-[11px] font-medium ${
                        isSelected ? 'text-slate-900' : 'text-slate-400'
                      }`}
                    >
                      {weekday}
                    </span>
                    <span className="text-sm sm:text-base font-semibold font-mono tabular-nums">
                      {dayNum}
                    </span>
                    <span
                      className={`text-[10px] font-mono tabular-nums truncate max-w-full px-0.5 ${
                        isSelected
                          ? 'text-slate-950/80 font-semibold'
                          : totalForDay > 0
                            ? 'text-[#E5B869]'
                            : 'text-slate-600'
                      }`}
                    >
                      {totalForDay > 0
                        ? formatCompactAmount(totalForDay, settings.currency, settings.region)
                        : '—'}
                    </span>
                  </button>
                );
              })}
            </div>
          </section>

          {/* Daily Summary & Budget Meter */}
          <section className="bg-[#11151B] rounded-2xl border border-white/[0.08] p-5 sm:p-6">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
              <div>
                <p className="text-xs font-medium text-slate-400">Spent on Selected Day</p>
                <p className="mt-1 text-3xl sm:text-4xl font-semibold tracking-tight text-white font-mono tabular-nums">
                  {formatCurrency(dayTotal, settings.currency)}
                </p>
                <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-400">
                  <span className="font-mono tabular-nums">
                    {dayExpensesAll.length} {dayExpensesAll.length === 1 ? 'entry' : 'entries'}
                  </span>
                  <span aria-hidden="true">·</span>
                  <span>
                    Month total{' '}
                    <strong className="font-mono font-medium text-slate-200 tabular-nums">
                      {formatCurrency(monthTotal, settings.currency, 0)}
                    </strong>
                  </span>
                </div>
              </div>

              <div className="sm:text-right">
                <p className={`text-xs font-semibold ${budgetState.textClass}`}>
                  {budgetState.label}
                </p>
                <p className="mt-0.5 text-sm font-mono font-medium text-slate-200 tabular-nums">
                  {remaining >= 0
                    ? `${formatCurrency(remaining, settings.currency)} left of ${formatCompactAmount(settings.dailyBudget, settings.currency, settings.region)}`
                    : `${formatCurrency(Math.abs(remaining), settings.currency)} over limit`}
                </p>
              </div>
            </div>

            <div className="mt-4">
              <div className="h-2 w-full rounded-full bg-white/[0.07] overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-300 ${budgetState.barClass}`}
                  style={{ width: `${Math.min(100, Math.round(budgetRatio * 100))}%` }}
                />
              </div>
            </div>
          </section>

          {/* Expense Feed */}
          <section className="bg-[#11151B] rounded-2xl border border-white/[0.08] overflow-hidden">
            <div className="p-4 sm:p-5 border-b border-white/[0.07] space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <h2 className="font-display text-base font-semibold text-white">Daily Ledger</h2>
                <div className="relative w-full sm:w-64">
                  <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Filter entries..."
                    aria-label="Filter daily expenses"
                    className="w-full h-10 pl-9 pr-8 rounded-xl border border-white/10 bg-[#090B0E] focus:border-emerald-500 focus:outline-none text-sm text-white placeholder:text-slate-500 transition-colors"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-white cursor-pointer"
                      aria-label="Clear filter"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Category Filter Buttons */}
              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-0.5">
                <button
                  type="button"
                  onClick={() => setCategoryFilter('all')}
                  className={`h-9 px-3.5 rounded-lg text-xs font-medium whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                    categoryFilter === 'all'
                      ? 'bg-white text-slate-950 font-semibold'
                      : 'bg-[#090B0E] text-slate-400 hover:text-white border border-white/[0.06]'
                  }`}
                >
                  All
                </button>
                {CATEGORIES.map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setCategoryFilter(cat.id)}
                    className={`h-9 px-3.5 rounded-lg text-xs font-medium whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                      categoryFilter === cat.id
                        ? 'bg-white text-slate-950 font-semibold'
                        : 'bg-[#090B0E] text-slate-400 hover:text-white border border-white/[0.06]'
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>
            </div>

            {filteredExpenses.length === 0 ? (
              <div className="px-6 py-12 text-center">
                <p className="text-sm font-medium text-slate-200">
                  {dayExpensesAll.length === 0
                    ? 'No expenses recorded for this day yet'
                    : 'No expenses match your filter'}
                </p>
                <p className="mt-1 text-xs text-slate-400">
                  {dayExpensesAll.length === 0
                    ? 'Log your first daily purchase to track spending in local cache.'
                    : 'Clear the search box or switch back to All categories.'}
                </p>
                {dayExpensesAll.length === 0 && (
                  <button
                    type="button"
                    onClick={onOpenAddMobile}
                    className="mt-4 lg:hidden inline-flex items-center gap-1.5 h-11 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-sm font-semibold transition-colors cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    Add First Expense
                  </button>
                )}
              </div>
            ) : (
              <ul className="divide-y divide-white/[0.06]">
                {filteredExpenses.map((expense) => {
                  const catMeta = CATEGORY_MAP[expense.category] || CATEGORY_MAP.other;
                  const isConfirmingDelete = confirmDeleteId === expense.id;

                  return (
                    <li
                      key={expense.id}
                      className="px-4 sm:px-5 py-3.5 hover:bg-white/[0.025] transition-colors"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3.5 min-w-0">
                          <CategoryIcon category={expense.category} />
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-white truncate">
                              {expense.title}
                            </p>
                            <div className="mt-0.5 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-xs text-slate-400">
                              <span>{catMeta.label}</span>
                              <span aria-hidden="true">·</span>
                              <span className="font-mono tabular-nums">
                                {formatDisplayTime(expense.time)}
                              </span>
                              <span aria-hidden="true">·</span>
                              <span>{regionCfg.paymentLabels[expense.paymentMethod]}</span>
                            </div>
                            {expense.note && (
                              <p className="mt-1 text-xs text-slate-500 truncate">{expense.note}</p>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-1 sm:gap-2 shrink-0">
                          <span className="text-sm sm:text-base font-semibold font-mono text-white tabular-nums mr-1">
                            {formatCurrency(expense.amount, settings.currency)}
                          </span>

                          {isConfirmingDelete ? (
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => {
                                  onDeleteExpense(expense.id);
                                  setConfirmDeleteId(null);
                                  if (desktopEditing?.id === expense.id) setDesktopEditing(null);
                                }}
                                className="h-9 px-2.5 rounded-lg bg-rose-500 hover:bg-rose-400 text-slate-950 text-xs font-semibold cursor-pointer"
                              >
                                Delete
                              </button>
                              <button
                                type="button"
                                onClick={() => setConfirmDeleteId(null)}
                                className="h-9 px-2.5 rounded-lg bg-white/10 hover:bg-white/15 text-slate-200 text-xs font-medium cursor-pointer"
                              >
                                Keep
                              </button>
                            </div>
                          ) : (
                            <>
                              <button
                                type="button"
                                onClick={() => {
                                  if (window.innerWidth >= 1024) {
                                    setDesktopEditing(expense);
                                  } else {
                                    onEditExpenseMobile(expense);
                                  }
                                }}
                                className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-lg text-slate-400 hover:text-white hover:bg-white/[0.06] transition-colors cursor-pointer"
                                aria-label={`Edit ${expense.title}`}
                              >
                                <Pencil className="w-4 h-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => setConfirmDeleteId(expense.id)}
                                className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
                                aria-label={`Delete ${expense.title}`}
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        </div>

        {/* Desktop Right Sidebar */}
        <aside className="hidden lg:block lg:col-span-4 space-y-6">
          <div className="bg-[#11151B] rounded-2xl border border-white/[0.08] p-5">
            <ExpenseForm
              settings={settings}
              defaultDate={selectedDate}
              editingExpense={desktopEditing}
              onSubmit={handleDesktopSave}
              onCancel={desktopEditing ? () => setDesktopEditing(null) : undefined}
              compact
            />
          </div>

          {/* 7-Day Window Snapshot */}
          <div className="bg-[#11151B] rounded-2xl border border-white/[0.08] p-5">
            <div className="flex items-baseline justify-between mb-4">
              <div>
                <h3 className="font-display text-sm font-semibold text-white">7-Day Velocity</h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Avg {formatCurrency(weekSummary.avgPerDay, settings.currency, 0)} / day
                </p>
              </div>
              <span className="text-base font-semibold font-mono text-[#E5B869] tabular-nums">
                {formatCurrency(weekSummary.weekTotal, settings.currency, 0)}
              </span>
            </div>

            <div className="grid grid-cols-7 gap-2 items-end h-28 pt-2">
              {weekSummary.bars.map((bar) => {
                const pct = Math.max(bar.total > 0 ? 12 : 4, Math.round((bar.total / weekSummary.maxVal) * 100));
                const isSelected = bar.date === selectedDate;
                const isOverBudget = bar.total > settings.dailyBudget;
                return (
                  <button
                    key={bar.date}
                    type="button"
                    onClick={() => onSelectDate(bar.date)}
                    className="flex flex-col items-center gap-1.5 h-full justify-end group cursor-pointer"
                    title={`${formatFriendlyDate(bar.date)}: ${formatCurrency(bar.total, settings.currency)}`}
                  >
                    <div className="w-full flex-1 flex items-end justify-center">
                      <div
                        className={`w-full max-w-[22px] rounded-t-md transition-all duration-200 ${
                          isSelected
                            ? 'bg-white'
                            : isOverBudget
                              ? 'bg-rose-500/80 group-hover:bg-rose-400'
                              : bar.total > 0
                                ? 'bg-emerald-500/80 group-hover:bg-emerald-400'
                                : 'bg-white/[0.07]'
                        }`}
                        style={{ height: `${pct}%` }}
                      />
                    </div>
                    <span
                      className={`text-[11px] font-mono ${
                        isSelected ? 'text-white font-semibold' : 'text-slate-500'
                      }`}
                    >
                      {bar.weekday.slice(0, 2)}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
};
