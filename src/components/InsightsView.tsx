import React, { useMemo, useState } from 'react';
import { ArrowUpRight } from 'lucide-react';
import {
  AppSettings,
  CATEGORIES,
  CATEGORY_MAP,
  Expense,
  PAYMENT_METHOD_ORDER,
  PaymentMethod,
  REGIONS,
  UserProfile,
} from '../types';
import {
  formatCompactAmount,
  formatCurrency,
  formatFriendlyDate,
  formatShortDay,
  shiftDateKey,
  toLocalDateKey,
} from '../utils/format';
import { CategoryIcon } from './CategoryIcon';

type Timeframe = '7d' | '30d' | 'month' | 'all';

interface InsightsViewProps {
  expenses: Expense[];
  settings: AppSettings;
  profile: UserProfile;
  onJumpToDate: (dateKey: string) => void;
}

export const InsightsView: React.FC<InsightsViewProps> = ({
  expenses,
  settings,
  profile,
  onJumpToDate,
}) => {
  const [timeframe, setTimeframe] = useState<Timeframe>('7d');
  const todayKey = toLocalDateKey();
  const regionCfg = REGIONS[settings.region] || REGIONS.IN;

  const { filtered, daySeries, dayCount } = useMemo(() => {
    const startOf7d = shiftDateKey(todayKey, -6);
    const startOf30d = shiftDateKey(todayKey, -29);
    const monthPrefix = todayKey.slice(0, 7);

    const matching = expenses.filter((e) => {
      if (timeframe === '7d') return e.date >= startOf7d && e.date <= todayKey;
      if (timeframe === '30d') return e.date >= startOf30d && e.date <= todayKey;
      if (timeframe === 'month') return e.date.startsWith(monthPrefix);
      return true;
    });

    const totalsByDay: Record<string, number> = {};
    for (const e of matching) {
      totalsByDay[e.date] = (totalsByDay[e.date] || 0) + e.amount;
    }

    let seriesDates: string[] = [];
    if (timeframe === '7d') {
      for (let i = 6; i >= 0; i--) seriesDates.push(shiftDateKey(todayKey, -i));
    } else if (timeframe === '30d') {
      for (let i = 13; i >= 0; i--) seriesDates.push(shiftDateKey(todayKey, -i));
    } else if (timeframe === 'month') {
      const dayOfMonth = Number(todayKey.slice(8, 10));
      const span = Math.min(dayOfMonth, 14);
      for (let i = span - 1; i >= 0; i--) seriesDates.push(shiftDateKey(todayKey, -i));
    } else {
      const uniqueDates = Object.keys(totalsByDay).sort();
      seriesDates = uniqueDates.slice(-14);
    }

    const series = seriesDates.map((d) => ({
      date: d,
      total: totalsByDay[d] || 0,
      ...formatShortDay(d),
    }));

    const activeDayCount =
      timeframe === '7d'
        ? 7
        : timeframe === '30d'
          ? 30
          : timeframe === 'month'
            ? Number(todayKey.slice(8, 10))
            : Math.max(Object.keys(totalsByDay).length, 1);

    return { filtered: matching, daySeries: series, dayCount: activeDayCount };
  }, [expenses, timeframe, todayKey]);

  const totalSpent = useMemo(
    () => filtered.reduce((sum, e) => sum + e.amount, 0),
    [filtered]
  );

  const avgPerDay = totalSpent / Math.max(dayCount, 1);

  const highestDay = useMemo(() => {
    const byDate: Record<string, number> = {};
    for (const e of filtered) {
      byDate[e.date] = (byDate[e.date] || 0) + e.amount;
    }
    let bestDate = '';
    let bestVal = 0;
    for (const [d, v] of Object.entries(byDate)) {
      if (v > bestVal) {
        bestVal = v;
        bestDate = d;
      }
    }
    return bestDate ? { date: bestDate, amount: bestVal } : null;
  }, [filtered]);

  const categoryBreakdown = useMemo(() => {
    const map: Record<string, { amount: number; count: number }> = {};
    for (const e of filtered) {
      if (!map[e.category]) map[e.category] = { amount: 0, count: 0 };
      map[e.category].amount += e.amount;
      map[e.category].count += 1;
    }
    return CATEGORIES.map((cat) => ({
      ...cat,
      amount: map[cat.id]?.amount || 0,
      count: map[cat.id]?.count || 0,
      share: totalSpent > 0 ? ((map[cat.id]?.amount || 0) / totalSpent) * 100 : 0,
    }))
      .filter((c) => c.amount > 0)
      .sort((a, b) => b.amount - a.amount);
  }, [filtered, totalSpent]);

  const paymentBreakdown = useMemo(() => {
    const map: Record<PaymentMethod, { amount: number; count: number }> = {
      upi: { amount: 0, count: 0 },
      cash: { amount: 0, count: 0 },
      card: { amount: 0, count: 0 },
      transfer: { amount: 0, count: 0 },
    };
    for (const e of filtered) {
      map[e.paymentMethod].amount += e.amount;
      map[e.paymentMethod].count += 1;
    }
    return PAYMENT_METHOD_ORDER.map((id) => ({
      id,
      label: regionCfg.paymentLabels[id],
      amount: map[id].amount,
      count: map[id].count,
      share: totalSpent > 0 ? (map[id].amount / totalSpent) * 100 : 0,
    }))
      .filter((m) => m.amount > 0)
      .sort((a, b) => b.amount - a.amount);
  }, [filtered, totalSpent, regionCfg]);

  const chartMax = Math.max(...daySeries.map((d) => d.total), settings.dailyBudget, 1);
  const budgetLinePct = Math.min(95, Math.round((settings.dailyBudget / chartMax) * 100));

  const projectedMonthly = avgPerDay * 30;
  const savingsProjection =
    profile.monthlyIncome > 0 ? profile.monthlyIncome - projectedMonthly : null;

  const timeframeOptions: { id: Timeframe; label: string }[] = [
    { id: '7d', label: '7 Days' },
    { id: '30d', label: '30 Days' },
    { id: 'month', label: 'This Month' },
    { id: 'all', label: 'All Time' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-semibold tracking-tight text-white">
            Spending Insights
          </h1>
          <p className="text-sm text-slate-400 mt-0.5">
            {regionCfg.name} ({settings.currency}) · Computed locally from cached entries
          </p>
        </div>

        <div className="inline-flex items-center gap-1 p-1 bg-[#11151B] border border-white/[0.08] rounded-xl self-start sm:self-auto">
          {timeframeOptions.map((opt) => (
            <button
              key={opt.id}
              type="button"
              onClick={() => setTimeframe(opt.id)}
              className={`h-9 px-3.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors cursor-pointer ${
                timeframe === opt.id
                  ? 'bg-emerald-500 text-slate-950 font-semibold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* KPI Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-[#11151B] rounded-2xl border border-white/[0.08] p-5">
          <p className="text-xs font-medium text-slate-400">Total Spent</p>
          <p className="mt-1.5 text-2xl sm:text-3xl font-semibold font-mono text-white tabular-nums">
            {formatCurrency(totalSpent, settings.currency)}
          </p>
          <p className="mt-1.5 text-xs text-slate-400 font-mono tabular-nums">
            {filtered.length} {filtered.length === 1 ? 'transaction' : 'transactions'}
          </p>
        </div>

        <div className="bg-[#11151B] rounded-2xl border border-white/[0.08] p-5">
          <p className="text-xs font-medium text-slate-400">Daily Average</p>
          <p className="mt-1.5 text-2xl sm:text-3xl font-semibold font-mono text-[#E5B869] tabular-nums">
            {formatCurrency(avgPerDay, settings.currency, 0)}
          </p>
          <p className="mt-1.5 text-xs text-slate-400">
            {savingsProjection !== null
              ? `Est. monthly savings: ${formatCurrency(Math.max(0, savingsProjection), settings.currency, 0)}`
              : `Target limit ${formatCurrency(settings.dailyBudget, settings.currency, 0)} / day`}
          </p>
        </div>

        <div className="bg-[#11151B] rounded-2xl border border-white/[0.08] p-5">
          <p className="text-xs font-medium text-slate-400">Highest Spend Day</p>
          {highestDay ? (
            <>
              <p className="mt-1.5 text-2xl sm:text-3xl font-semibold font-mono text-white tabular-nums">
                {formatCurrency(highestDay.amount, settings.currency, 0)}
              </p>
              <button
                type="button"
                onClick={() => onJumpToDate(highestDay.date)}
                className="mt-1.5 inline-flex items-center gap-1 text-xs font-medium text-emerald-400 hover:text-emerald-300 cursor-pointer"
              >
                <span>{formatFriendlyDate(highestDay.date)}</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            </>
          ) : (
            <>
              <p className="mt-1.5 text-2xl font-semibold font-mono text-slate-600 tabular-nums">—</p>
              <p className="mt-1.5 text-xs text-slate-500">No entries in this period</p>
            </>
          )}
        </div>
      </div>

      {/* Daily Trend Bar Chart */}
      <section className="bg-[#11151B] rounded-2xl border border-white/[0.08] p-5 sm:p-6">
        <div className="mb-6">
          <h2 className="font-display text-base font-semibold text-white">Daily Spend Trend</h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Tap any day bar to open its entries · Dashed line marks your{' '}
            {formatCurrency(settings.dailyBudget, settings.currency, 0)} daily limit
          </p>
        </div>

        {daySeries.length === 0 ? (
          <p className="py-10 text-center text-sm text-slate-500">
            Add expenses to visualize your spending trend.
          </p>
        ) : (
          <div className="relative h-52 pt-4">
            <div
              className="absolute left-0 right-0 border-t border-dashed border-white/20 pointer-events-none z-10 flex justify-end"
              style={{ bottom: `calc(${budgetLinePct}% + 28px)` }}
            >
              <span className="text-[10px] font-mono text-slate-400 bg-[#11151B] pl-1.5 -mt-2">
                Limit {formatCompactAmount(settings.dailyBudget, settings.currency, settings.region)}
              </span>
            </div>

            <div className="h-full flex items-end gap-1.5 sm:gap-3">
              {daySeries.map((item) => {
                const heightPct =
                  item.total > 0 ? Math.max(6, Math.round((item.total / chartMax) * 100)) : 2;
                const overLimit = item.total > settings.dailyBudget;
                return (
                  <button
                    key={item.date}
                    type="button"
                    onClick={() => onJumpToDate(item.date)}
                    className="flex-1 flex flex-col items-center h-full justify-end group cursor-pointer min-w-0"
                    title={`${formatFriendlyDate(item.date)}: ${formatCurrency(item.total, settings.currency)}`}
                  >
                    <span className="text-[10px] font-mono text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity mb-1 truncate max-w-full">
                      {item.total > 0
                        ? formatCompactAmount(item.total, settings.currency, settings.region)
                        : ''}
                    </span>
                    <div className="w-full flex-1 flex items-end justify-center">
                      <div
                        className={`w-full max-w-[34px] rounded-t-lg transition-all duration-200 ${
                          overLimit
                            ? 'bg-rose-500/85 group-hover:bg-rose-400'
                            : item.total > 0
                              ? 'bg-emerald-500/85 group-hover:bg-emerald-400'
                              : 'bg-white/[0.06]'
                        }`}
                        style={{ height: `${heightPct}%` }}
                      />
                    </div>
                    <span className="mt-2 text-[11px] font-mono text-slate-400 tabular-nums">
                      {daySeries.length <= 7 ? item.weekday : item.dayNum}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </section>

      {/* Bottom 2-Column Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <section className="lg:col-span-7 bg-[#11151B] rounded-2xl border border-white/[0.08] p-5 sm:p-6">
          <h2 className="font-display text-base font-semibold text-white">By Category</h2>
          <p className="text-xs text-slate-400 mt-0.5 mb-5">
            Distribution of spend across categories
          </p>

          {categoryBreakdown.length === 0 ? (
            <p className="py-8 text-center text-sm text-slate-500">No spending recorded yet.</p>
          ) : (
            <div className="space-y-4">
              {categoryBreakdown.map((cat) => {
                const meta = CATEGORY_MAP[cat.id];
                return (
                  <div key={cat.id} className="space-y-1.5">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <CategoryIcon category={cat.id} size="sm" />
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-white truncate">{cat.label}</p>
                          <p className="text-xs text-slate-400 font-mono tabular-nums">
                            {cat.count} {cat.count === 1 ? 'entry' : 'entries'} · {cat.share.toFixed(0)}%
                          </p>
                        </div>
                      </div>
                      <span className="text-sm font-semibold font-mono text-white tabular-nums shrink-0">
                        {formatCurrency(cat.amount, settings.currency)}
                      </span>
                    </div>
                    <div className="h-1.5 w-full rounded-full bg-white/[0.07] overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-300"
                        style={{
                          width: `${Math.max(2, Math.round(cat.share))}%`,
                          backgroundColor: meta.barColor,
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <section className="lg:col-span-5 bg-[#11151B] rounded-2xl border border-white/[0.08] p-5 sm:p-6">
          <h2 className="font-display text-base font-semibold text-white">By Payment Method</h2>
          <p className="text-xs text-slate-400 mt-0.5 mb-5">
            {regionCfg.name} payment mix for this timeframe
          </p>

          {paymentBreakdown.length === 0 ? (
            <p className="py-8 text-center text-sm text-slate-500">No spending recorded yet.</p>
          ) : (
            <div className="divide-y divide-white/[0.06]">
              {paymentBreakdown.map((pm) => (
                <div key={pm.id} className="py-3.5 first:pt-0 last:pb-0 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-white">{pm.label}</p>
                    <p className="text-xs text-slate-400 font-mono tabular-nums mt-0.5">
                      {pm.count} {pm.count === 1 ? 'entry' : 'entries'} · {pm.share.toFixed(0)}%
                    </p>
                  </div>
                  <span className="text-sm font-semibold font-mono text-[#E5B869] tabular-nums">
                    {formatCurrency(pm.amount, settings.currency)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
};
