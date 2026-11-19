import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeftRight,
  Calculator,
  Delete,
  Landmark,
  Percent,
  PiggyBank,
  PlusCircle,
  RefreshCw,
  Trash2,
  TrendingUp,
} from 'lucide-react';
import {
  AppSettings,
  CalcHistoryItem,
  CURRENCIES,
  CurrencyCode,
  REGIONS,
} from '../types';
import { formatCurrency, formatIndianWordsHint } from '../utils/format';
import {
  loadCachedFxRates,
  loadCalcHistory,
  saveCachedFxRates,
  saveCalcHistory,
} from '../utils/storage';

export type FinancialToolId =
  | 'calculator'
  | 'currency'
  | 'percentage'
  | 'interest'
  | 'emi'
  | 'sip';

interface FinancialToolsViewProps {
  settings: AppSettings;
  initialTool?: FinancialToolId;
  onLogAmountAsExpense: (amount: number, suggestedTitle: string) => void;
}

const TOOLS_HERO_IMAGE = '/src/assets/images/finance_tools_dial_1795065333446.jpg';

// Safe recursive-descent arithmetic evaluator (no eval / Function)
function evaluateExpression(expr: string): number | null {
  const cleaned = expr.replace(/×/g, '*').replace(/÷/g, '/').replace(/\s+/g, '');
  if (!cleaned || !/^[0-9+\-*/().%]+$/.test(cleaned)) return null;

  const tokens: string[] = [];
  let i = 0;
  while (i < cleaned.length) {
    const ch = cleaned[i];
    if (/[0-9.]/.test(ch)) {
      let num = '';
      while (i < cleaned.length && /[0-9.]/.test(cleaned[i])) {
        num += cleaned[i++];
      }
      if ((num.match(/\./g) || []).length > 1) return null;
      tokens.push(num);
    } else if ('+-*/()%'.includes(ch)) {
      tokens.push(ch);
      i++;
    } else {
      return null;
    }
  }

  let pos = 0;

  function parseExpr(): number {
    let left = parseTerm();
    while (pos < tokens.length && (tokens[pos] === '+' || tokens[pos] === '-')) {
      const op = tokens[pos++];
      const right = parseTerm();
      left = op === '+' ? left + right : left - right;
    }
    return left;
  }

  function parseTerm(): number {
    let left = parseFactor();
    while (pos < tokens.length && (tokens[pos] === '*' || tokens[pos] === '/')) {
      const op = tokens[pos++];
      const right = parseFactor();
      if (op === '/' && right === 0) throw new Error('Division by zero');
      left = op === '*' ? left * right : left / right;
    }
    return left;
  }

  function parseFactor(): number {
    if (tokens[pos] === '+') {
      pos++;
      return parseFactor();
    }
    if (tokens[pos] === '-') {
      pos++;
      return -parseFactor();
    }
    let val: number;
    if (tokens[pos] === '(') {
      pos++;
      val = parseExpr();
      if (tokens[pos] !== ')') throw new Error('Unclosed parenthesis');
      pos++;
    } else {
      const tok = tokens[pos++];
      if (tok === undefined) throw new Error('Unexpected end');
      val = Number(tok);
      if (Number.isNaN(val)) throw new Error('Invalid number');
    }
    while (pos < tokens.length && tokens[pos] === '%') {
      pos++;
      val = val / 100;
    }
    return val;
  }

  try {
    const result = parseExpr();
    if (pos !== tokens.length || !Number.isFinite(result)) return null;
    return Math.round(result * 100000000) / 100000000;
  } catch {
    return null;
  }
}

export const FinancialToolsView: React.FC<FinancialToolsViewProps> = ({
  settings,
  initialTool = 'calculator',
  onLogAmountAsExpense,
}) => {
  const [activeTool, setActiveTool] = useState<FinancialToolId>(initialTool);
  const [heroFailed, setHeroFailed] = useState(false);

  const regionCfg = REGIONS[settings.region] || REGIONS.IN;
  const currencyMeta = CURRENCIES[settings.currency] || CURRENCIES.INR;

  useEffect(() => {
    setActiveTool(initialTool);
  }, [initialTool]);

  // 1. Standard Calculator State
  const [calcExpr, setCalcExpr] = useState('');
  const [calcDisplay, setCalcDisplay] = useState('0');
  const [calcMemory, setCalcMemory] = useState<number>(0);
  const [calcHistory, setCalcHistory] = useState<CalcHistoryItem[]>(() => loadCalcHistory());

  // 2. Currency Converter State
  const [fxData, setFxData] = useState(() => loadCachedFxRates());
  const [fxAmount, setFxAmount] = useState(settings.currency === 'INR' ? '1000' : '100');
  const [fxFrom, setFxFrom] = useState<CurrencyCode>(settings.currency);
  const [fxTo, setFxTo] = useState<CurrencyCode>(settings.currency === 'INR' ? 'USD' : 'INR');
  const [fxSyncing, setFxSyncing] = useState(false);
  const [fxStatus, setFxStatus] = useState<string>('');

  // 3. Percentage & GST / Tax State
  const [pctMode, setPctMode] = useState<'gst' | 'discount' | 'of' | 'change'>('gst');
  const [gstAmount, setGstAmount] = useState(settings.currency === 'INR' ? '10000' : '500');
  const [gstRate, setGstRate] = useState<string>(String(regionCfg.defaultTaxRate));
  const [gstType, setGstType] = useState<'exclusive' | 'inclusive'>('exclusive');
  const [discPrice, setDiscPrice] = useState(settings.currency === 'INR' ? '2499' : '120');
  const [discPct, setDiscPct] = useState('15');
  const [ofPct, setOfPct] = useState('18');
  const [ofBase, setOfBase] = useState(settings.currency === 'INR' ? '5000' : '250');
  const [chgFrom, setChgFrom] = useState(settings.currency === 'INR' ? '1200' : '100');
  const [chgTo, setChgTo] = useState(settings.currency === 'INR' ? '1450' : '125');

  // 4. Interest Calculator State
  const [intMode, setIntMode] = useState<'compound' | 'simple'>('compound');
  const [intPrincipal, setIntPrincipal] = useState(settings.currency === 'INR' ? '100000' : '10000');
  const [intRate, setIntRate] = useState('8.5');
  const [intYears, setIntYears] = useState('5');
  const [intFreq, setIntFreq] = useState<number>(4); // Quarterly default (standard for Indian FD)

  // 5. EMI & Loan Calculator State
  const [emiLoan, setEmiLoan] = useState(settings.currency === 'INR' ? '1500000' : '25000');
  const [emiRate, setEmiRate] = useState('9.0');
  const [emiYears, setEmiYears] = useState('10');

  // 6. SIP & FD Wealth Calculator State
  const [sipMode, setSipMode] = useState<'sip' | 'lumpsum'>('sip');
  const [sipAmount, setSipAmount] = useState(settings.currency === 'INR' ? '10000' : '500');
  const [sipReturn, setSipReturn] = useState('12');
  const [sipYears, setSipYears] = useState('10');

  const toolTabs: { id: FinancialToolId; label: string; icon: React.ReactNode }[] = [
    { id: 'calculator', label: 'Calculator', icon: <Calculator className="w-4 h-4" /> },
    { id: 'currency', label: 'Currency', icon: <ArrowLeftRight className="w-4 h-4" /> },
    { id: 'percentage', label: `${regionCfg.taxLabel} & %`, icon: <Percent className="w-4 h-4" /> },
    { id: 'interest', label: 'Interest', icon: <TrendingUp className="w-4 h-4" /> },
    { id: 'emi', label: 'EMI / Loan', icon: <Landmark className="w-4 h-4" /> },
    { id: 'sip', label: 'SIP & FD', icon: <PiggyBank className="w-4 h-4" /> },
  ];

  // --- Calculator Logic ---
  const liveCalcPreview = useMemo(() => {
    if (!calcExpr) return null;
    const val = evaluateExpression(calcExpr);
    return val !== null ? String(val) : null;
  }, [calcExpr]);

  const handleCalcKey = (key: string) => {
    if (key === 'AC') {
      setCalcExpr('');
      setCalcDisplay('0');
      return;
    }
    if (key === 'BS') {
      const next = calcExpr.slice(0, -1);
      setCalcExpr(next);
      setCalcDisplay(next || '0');
      return;
    }
    if (key === '=') {
      const val = evaluateExpression(calcExpr);
      if (val !== null) {
        const resStr = String(val);
        const item: CalcHistoryItem = {
          id: `ch-${Date.now()}`,
          expression: calcExpr,
          result: resStr,
          timestamp: Date.now(),
        };
        const nextHistory = [item, ...calcHistory].slice(0, 20);
        setCalcHistory(nextHistory);
        saveCalcHistory(nextHistory);
        setCalcExpr(resStr);
        setCalcDisplay(resStr);
      }
      return;
    }

    const operators = ['+', '-', '×', '÷'];
    if (operators.includes(key)) {
      if (!calcExpr && key !== '-') return;
      const last = calcExpr.slice(-1);
      const next = operators.includes(last) ? calcExpr.slice(0, -1) + key : calcExpr + key;
      setCalcExpr(next);
      setCalcDisplay(next);
      return;
    }

    const next = calcExpr === '0' && key !== '.' ? key : calcExpr + key;
    setCalcExpr(next);
    setCalcDisplay(next);
  };

  const handleCalcMemory = (op: 'M+' | 'MR' | 'MC') => {
    if (op === 'MC') {
      setCalcMemory(0);
    } else if (op === 'MR') {
      const str = String(calcMemory);
      setCalcExpr((prev) => (prev ? `${prev}${str}` : str));
      setCalcDisplay((prev) => (prev === '0' ? str : `${prev}${str}`));
    } else if (op === 'M+') {
      const current = evaluateExpression(calcExpr) ?? (Number(calcDisplay) || 0);
      setCalcMemory((m) => Math.round((m + current) * 10000) / 10000);
    }
  };

  // --- Currency Converter Logic ---
  const fxConverted = useMemo(() => {
    const amt = parseFloat(fxAmount);
    if (Number.isNaN(amt) || amt < 0) return 0;
    const fromRate = fxData.rates[fxFrom] || CURRENCIES[fxFrom].ratePerUSD;
    const toRate = fxData.rates[fxTo] || CURRENCIES[fxTo].ratePerUSD;
    return (amt / fromRate) * toRate;
  }, [fxAmount, fxFrom, fxTo, fxData]);

  const unitRate = useMemo(() => {
    const fromRate = fxData.rates[fxFrom] || CURRENCIES[fxFrom].ratePerUSD;
    const toRate = fxData.rates[fxTo] || CURRENCIES[fxTo].ratePerUSD;
    return toRate / fromRate;
  }, [fxFrom, fxTo, fxData]);

  const handleRefreshRates = async () => {
    setFxSyncing(true);
    setFxStatus('');
    try {
      const res = await fetch('https://open.er-api.com/v6/latest/USD');
      if (!res.ok) throw new Error('Network unavailable');
      const json = await res.json();
      if (json?.rates) {
        const updated: Record<CurrencyCode, number> = { ...fxData.rates };
        (Object.keys(CURRENCIES) as CurrencyCode[]).forEach((code) => {
          if (typeof json.rates[code] === 'number') {
            updated[code] = json.rates[code];
          }
        });
        const stamp = new Date().toLocaleString('en-IN', {
          day: 'numeric',
          month: 'short',
          hour: '2-digit',
          minute: '2-digit',
        });
        setFxData({ rates: updated, updatedAt: stamp });
        saveCachedFxRates(updated, stamp);
        setFxStatus(`Live rates cached (${stamp})`);
      }
    } catch {
      setFxStatus('Offline — using cached reference rates.');
    } finally {
      setFxSyncing(false);
    }
  };

  // --- GST & Percentage Calculations ---
  const gstCalc = useMemo(() => {
    const base = parseFloat(gstAmount) || 0;
    const rate = parseFloat(gstRate) || 0;
    if (gstType === 'exclusive') {
      const tax = (base * rate) / 100;
      return { net: base, tax, total: base + tax };
    }
    const net = base / (1 + rate / 100);
    const tax = base - net;
    return { net, tax, total: base };
  }, [gstAmount, gstRate, gstType]);

  const discountCalc = useMemo(() => {
    const price = parseFloat(discPrice) || 0;
    const pct = parseFloat(discPct) || 0;
    const saved = (price * pct) / 100;
    return { saved, final: Math.max(0, price - saved) };
  }, [discPrice, discPct]);

  const ofCalc = useMemo(() => {
    const p = parseFloat(ofPct) || 0;
    const b = parseFloat(ofBase) || 0;
    return (p / 100) * b;
  }, [ofPct, ofBase]);

  const changeCalc = useMemo(() => {
    const a = parseFloat(chgFrom) || 0;
    const b = parseFloat(chgTo) || 0;
    const diff = b - a;
    const pct = a !== 0 ? (diff / Math.abs(a)) * 100 : 0;
    return { diff, pct };
  }, [chgFrom, chgTo]);

  // --- Interest Calculation ---
  const interestCalc = useMemo(() => {
    const P = Math.max(0, parseFloat(intPrincipal) || 0);
    const r = Math.max(0, parseFloat(intRate) || 0) / 100;
    const t = Math.max(0, parseFloat(intYears) || 0);
    if (intMode === 'simple') {
      const interest = P * r * t;
      return { principal: P, interest, total: P + interest };
    }
    const n = intFreq;
    const total = P * Math.pow(1 + r / n, n * t);
    return { principal: P, interest: total - P, total };
  }, [intMode, intPrincipal, intRate, intYears, intFreq]);

  // --- EMI Calculation ---
  const emiCalc = useMemo(() => {
    const P = Math.max(0, parseFloat(emiLoan) || 0);
    const annualRate = Math.max(0, parseFloat(emiRate) || 0);
    const years = Math.max(0.5, parseFloat(emiYears) || 1);
    const months = Math.round(years * 12);
    const r = annualRate / 12 / 100;

    if (P === 0) {
      return { emi: 0, totalPayment: 0, totalInterest: 0, months, yearly: [] };
    }

    const emi =
      r === 0
        ? P / months
        : (P * r * Math.pow(1 + r, months)) / (Math.pow(1 + r, months) - 1);
    const totalPayment = emi * months;
    const totalInterest = Math.max(0, totalPayment - P);

    // Compact yearly amortization (first 5 years + final year if longer)
    let balance = P;
    const yearly: { year: number; principalPaid: number; interestPaid: number; balance: number }[] = [];
    const totalYears = Math.ceil(months / 12);
    for (let yr = 1; yr <= totalYears; yr++) {
      let yrPrincipal = 0;
      let yrInterest = 0;
      for (let m = 0; m < 12 && (yr - 1) * 12 + m < months; m++) {
        const mInt = balance * r;
        const mPrin = Math.min(balance, emi - mInt);
        balance = Math.max(0, balance - mPrin);
        yrInterest += mInt;
        yrPrincipal += mPrin;
      }
      yearly.push({
        year: yr,
        principalPaid: yrPrincipal,
        interestPaid: yrInterest,
        balance,
      });
    }

    return { emi, totalPayment, totalInterest, months, yearly };
  }, [emiLoan, emiRate, emiYears]);

  // --- SIP & FD Wealth Calculation ---
  const sipCalc = useMemo(() => {
    const amt = Math.max(0, parseFloat(sipAmount) || 0);
    const annualRate = Math.max(0, parseFloat(sipReturn) || 0);
    const years = Math.max(1, parseFloat(sipYears) || 1);

    if (sipMode === 'sip') {
      const months = years * 12;
      const i = annualRate / 12 / 100;
      const invested = amt * months;
      const futureVal =
        i === 0
          ? invested
          : amt * ((Math.pow(1 + i, months) - 1) / i) * (1 + i);
      return { invested, gains: Math.max(0, futureVal - invested), total: futureVal };
    } else {
      const invested = amt;
      const futureVal = amt * Math.pow(1 + annualRate / 100, years);
      return { invested, gains: Math.max(0, futureVal - invested), total: futureVal };
    }
  }, [sipMode, sipAmount, sipReturn, sipYears]);

  const numericCalcValue = evaluateExpression(calcExpr) ?? (Number(calcDisplay) || 0);

  return (
    <div className="space-y-6">
      {/* Studio Artwork Banner */}
      <section className="relative rounded-2xl border border-white/[0.08] bg-[#11151B] overflow-hidden">
        <div className="absolute inset-0">
          {!heroFailed ? (
            <img
              src={TOOLS_HERO_IMAGE}
              alt="Precision matte-black rotary dial and titanium micrometer financial instrument"
              referrerPolicy="no-referrer"
              onError={() => setHeroFailed(true)}
              className="w-full h-full object-cover object-center opacity-35"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-r from-[#11151B] via-[#131D22] to-[#090B0E]" />
          )}
          <div className="absolute inset-0 bg-gradient-to-r from-[#090B0E] via-[#090B0E]/85 to-[#090B0E]/45" />
        </div>

        <div className="relative z-10 p-5 sm:p-7 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div className="max-w-xl">
            <p className="text-xs font-medium text-emerald-400">
              {regionCfg.name} · {currencyMeta.symbol} {currencyMeta.code} · Works 100% Offline
            </p>
            <h1 className="mt-1.5 font-display text-2xl sm:text-3xl font-semibold tracking-tight text-white">
              Financial Calculators Suite
            </h1>
            <p className="mt-1.5 text-sm text-slate-300">
              Calculator, multi-currency FX converter, {regionCfg.taxLabel} &amp; percentage, compound interest, loan EMI, and SIP wealth planner.
            </p>
          </div>
        </div>
      </section>

      {/* Tool Selector Bar */}
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
        {toolTabs.map((tab) => {
          const active = activeTool === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTool(tab.id)}
              className={`min-h-[44px] px-4 rounded-xl text-xs font-semibold inline-flex items-center gap-2 whitespace-nowrap shrink-0 transition-colors border cursor-pointer ${
                active
                  ? 'bg-emerald-500 text-slate-950 border-emerald-400'
                  : 'bg-[#11151B] text-slate-300 border-white/[0.08] hover:border-white/20 hover:text-white'
              }`}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* TOOL 1: TACTILE CALCULATOR */}
      {activeTool === 'calculator' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <div className="lg:col-span-7 bg-[#11151B] rounded-2xl border border-white/[0.08] p-5 sm:p-6">
            {/* Screen */}
            <div className="rounded-2xl bg-[#090B0E] border border-white/[0.07] p-4 sm:p-5 text-right">
              <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
                <span className="font-mono">
                  {calcMemory !== 0 ? `M = ${calcMemory}` : 'Standard'}
                </span>
                <span className="font-mono truncate max-w-[70%] text-slate-400">
                  {calcExpr || '0'}
                </span>
              </div>
              <div className="font-mono text-3xl sm:text-4xl font-semibold text-white tabular-nums truncate">
                {liveCalcPreview !== null && calcExpr !== liveCalcPreview
                  ? liveCalcPreview
                  : calcDisplay}
              </div>
              {numericCalcValue > 0 && (
                <div className="mt-3 pt-3 border-t border-white/[0.06] flex items-center justify-between gap-2">
                  <span className="text-xs font-mono text-[#E5B869] tabular-nums">
                    {formatCurrency(numericCalcValue, settings.currency)}
                  </span>
                  <button
                    type="button"
                    onClick={() => onLogAmountAsExpense(numericCalcValue, 'Calculated Expense')}
                    className="h-9 px-3 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-300 text-xs font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <PlusCircle className="w-3.5 h-3.5" />
                    Log as Expense
                  </button>
                </div>
              )}
            </div>

            {/* Memory Row */}
            <div className="mt-3 grid grid-cols-4 gap-2">
              {(['MC', 'MR', 'M+'] as const).map((mem) => (
                <button
                  key={mem}
                  type="button"
                  onClick={() => handleCalcMemory(mem)}
                  className="h-10 rounded-xl bg-[#090B0E] border border-white/[0.07] hover:border-white/20 text-xs font-mono font-medium text-slate-300 cursor-pointer"
                >
                  {mem}
                </button>
              ))}
              <button
                type="button"
                onClick={() => handleCalcKey('BS')}
                aria-label="Backspace"
                className="h-10 rounded-xl bg-[#090B0E] border border-white/[0.07] hover:border-white/20 text-slate-300 flex items-center justify-center cursor-pointer"
              >
                <Delete className="w-4 h-4" />
              </button>
            </div>

            {/* Keypad */}
            <div className="mt-2.5 grid grid-cols-4 gap-2">
              {[
                ['AC', '(', ')', '÷'],
                ['7', '8', '9', '×'],
                ['4', '5', '6', '-'],
                ['1', '2', '3', '+'],
                ['0', '.', '%', '='],
              ]
                .flat()
                .map((key) => {
                  const isEq = key === '=';
                  const isOp = ['÷', '×', '-', '+'].includes(key);
                  const isUtil = ['AC', '(', ')', '%'].includes(key);
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => handleCalcKey(key)}
                      className={`h-14 rounded-xl font-mono text-lg font-semibold transition-all active:scale-[0.97] cursor-pointer ${
                        isEq
                          ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950'
                          : isOp
                            ? 'bg-emerald-500/12 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/25'
                            : isUtil
                              ? 'bg-[#171C24] hover:bg-[#1E2530] text-[#E5B869] border border-white/[0.06]'
                              : 'bg-[#161B23] hover:bg-[#1D2430] text-white border border-white/[0.06]'
                      }`}
                    >
                      {key}
                    </button>
                  );
                })}
            </div>
          </div>

          {/* Calculation History (Cached Locally) */}
          <div className="lg:col-span-5 bg-[#11151B] rounded-2xl border border-white/[0.08] p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-sm font-semibold text-white">Saved Tape History</h2>
                <p className="text-xs text-slate-400 mt-0.5">Tap any entry to reuse</p>
              </div>
              {calcHistory.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    setCalcHistory([]);
                    saveCalcHistory([]);
                  }}
                  className="h-9 px-2.5 rounded-lg text-xs text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 inline-flex items-center gap-1 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Clear
                </button>
              )}
            </div>

            {calcHistory.length === 0 ? (
              <p className="py-10 text-center text-xs text-slate-500">
                Completed calculations are cached here automatically.
              </p>
            ) : (
              <ul className="divide-y divide-white/[0.06] max-h-[360px] overflow-y-auto">
                {calcHistory.map((item) => (
                  <li key={item.id} className="py-2.5">
                    <button
                      type="button"
                      onClick={() => {
                        setCalcExpr(item.result);
                        setCalcDisplay(item.result);
                      }}
                      className="w-full text-right hover:bg-white/[0.03] rounded-lg px-2 py-1 transition-colors cursor-pointer"
                    >
                      <p className="text-xs font-mono text-slate-400">{item.expression}</p>
                      <p className="text-base font-mono font-semibold text-white tabular-nums">
                        = {item.result}
                      </p>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      {/* TOOL 2: GLOBAL CURRENCY CONVERTER */}
      {activeTool === 'currency' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <div className="lg:col-span-7 bg-[#11151B] rounded-2xl border border-white/[0.08] p-5 sm:p-6 space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-semibold text-white">Currency Converter</h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  {fxData.updatedAt
                    ? `Cached live rates · ${fxData.updatedAt}`
                    : 'Offline reference rates cached on device'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => void handleRefreshRates()}
                disabled={fxSyncing}
                className="h-10 px-3.5 rounded-xl bg-[#090B0E] border border-white/10 hover:border-emerald-500/50 text-xs font-medium text-slate-200 inline-flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 text-emerald-400 ${fxSyncing ? 'animate-spin' : ''}`} />
                {fxSyncing ? 'Updating...' : 'Sync Live Rates'}
              </button>
            </div>

            {fxStatus && <p className="text-xs text-emerald-400">{fxStatus}</p>}

            <div>
              <label htmlFor="fx-amount" className="block text-xs font-medium text-slate-300 mb-1.5">
                Amount ({CURRENCIES[fxFrom].symbol} {fxFrom})
              </label>
              <input
                id="fx-amount"
                type="number"
                inputMode="decimal"
                min="0"
                value={fxAmount}
                onChange={(e) => setFxAmount(e.target.value)}
                className="w-full h-12 px-4 rounded-xl bg-[#090B0E] border border-white/10 focus:border-emerald-500 focus:outline-none font-mono text-xl font-semibold text-white tabular-nums"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-11 gap-3 items-end">
              <div className="sm:col-span-5">
                <label htmlFor="fx-from" className="block text-xs font-medium text-slate-400 mb-1.5">
                  From
                </label>
                <select
                  id="fx-from"
                  value={fxFrom}
                  onChange={(e) => setFxFrom(e.target.value as CurrencyCode)}
                  className="w-full h-11 px-3 rounded-xl bg-[#090B0E] border border-white/10 focus:border-emerald-500 focus:outline-none text-sm text-white"
                >
                  {Object.values(CURRENCIES).map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.code} ({c.symbol}) — {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="sm:col-span-1 flex justify-center">
                <button
                  type="button"
                  onClick={() => {
                    setFxFrom(fxTo);
                    setFxTo(fxFrom);
                  }}
                  aria-label="Swap currencies"
                  className="h-11 w-11 rounded-xl bg-[#171C24] hover:bg-emerald-500/20 border border-white/10 text-emerald-400 flex items-center justify-center transition-colors cursor-pointer"
                >
                  <ArrowLeftRight className="w-4 h-4" />
                </button>
              </div>

              <div className="sm:col-span-5">
                <label htmlFor="fx-to" className="block text-xs font-medium text-slate-400 mb-1.5">
                  To
                </label>
                <select
                  id="fx-to"
                  value={fxTo}
                  onChange={(e) => setFxTo(e.target.value as CurrencyCode)}
                  className="w-full h-11 px-3 rounded-xl bg-[#090B0E] border border-white/10 focus:border-emerald-500 focus:outline-none text-sm text-white"
                >
                  {Object.values(CURRENCIES).map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.code} ({c.symbol}) — {c.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Converted Result */}
            <div className="rounded-2xl bg-[#090B0E] border border-white/[0.08] p-5">
              <p className="text-xs text-slate-400">Converted Value</p>
              <p className="mt-1 font-mono text-3xl sm:text-4xl font-semibold text-emerald-400 tabular-nums">
                {formatCurrency(fxConverted, fxTo)}
              </p>
              <p className="mt-2 text-xs font-mono text-slate-400 tabular-nums">
                1 {fxFrom} = {unitRate.toFixed(4)} {fxTo}
              </p>
            </div>
          </div>

          {/* Quick INR / Global Rate Table */}
          <div className="lg:col-span-5 bg-[#11151B] rounded-2xl border border-white/[0.08] p-5">
            <h3 className="text-sm font-semibold text-white">
              Quick Reference ({fxAmount || 0} {fxFrom})
            </h3>
            <p className="text-xs text-slate-400 mt-0.5 mb-4">
              Major currencies relative to your selected amount
            </p>
            <div className="divide-y divide-white/[0.06]">
              {(['INR', 'USD', 'EUR', 'GBP', 'AED', 'SGD', 'CAD', 'AUD', 'JPY'] as CurrencyCode[])
                .filter((code) => code !== fxFrom)
                .map((code) => {
                  const amt = parseFloat(fxAmount) || 0;
                  const val =
                    (amt / (fxData.rates[fxFrom] || CURRENCIES[fxFrom].ratePerUSD)) *
                    (fxData.rates[code] || CURRENCIES[code].ratePerUSD);
                  return (
                    <button
                      key={code}
                      type="button"
                      onClick={() => setFxTo(code)}
                      className="w-full py-2.5 flex items-center justify-between text-left hover:bg-white/[0.02] px-1.5 rounded-lg transition-colors cursor-pointer"
                    >
                      <div>
                        <span className="text-sm font-semibold text-white">{code}</span>
                        <span className="text-xs text-slate-400 ml-2">{CURRENCIES[code].name}</span>
                      </div>
                      <span className="font-mono text-sm font-medium text-[#E5B869] tabular-nums">
                        {formatCurrency(val, code)}
                      </span>
                    </button>
                  );
                })}
            </div>
          </div>
        </div>
      )}

      {/* TOOL 3: PERCENTAGE, GST / TAX & DISCOUNT */}
      {activeTool === 'percentage' && (
        <div className="bg-[#11151B] rounded-2xl border border-white/[0.08] p-5 sm:p-6 space-y-6">
          <div className="flex flex-wrap items-center gap-2">
            {[
              { id: 'gst' as const, label: `${regionCfg.taxLabel} Calculator` },
              { id: 'discount' as const, label: 'Discount Price' },
              { id: 'of' as const, label: 'X% of Y' },
              { id: 'change' as const, label: '% Change' },
            ].map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => setPctMode(m.id)}
                className={`h-10 px-4 rounded-xl text-xs font-semibold transition-colors border cursor-pointer ${
                  pctMode === m.id
                    ? 'bg-white text-slate-950 border-white'
                    : 'bg-[#090B0E] text-slate-300 border-white/[0.08] hover:border-white/20'
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>

          {pctMode === 'gst' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              <div className="lg:col-span-6 space-y-4">
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setGstType('exclusive')}
                    className={`h-10 rounded-xl text-xs font-semibold border cursor-pointer ${
                      gstType === 'exclusive'
                        ? 'bg-emerald-500/15 border-emerald-500/60 text-emerald-300'
                        : 'bg-[#090B0E] border-white/[0.08] text-slate-400'
                    }`}
                  >
                    Add {regionCfg.taxLabel} (Exclusive)
                  </button>
                  <button
                    type="button"
                    onClick={() => setGstType('inclusive')}
                    className={`h-10 rounded-xl text-xs font-semibold border cursor-pointer ${
                      gstType === 'inclusive'
                        ? 'bg-emerald-500/15 border-emerald-500/60 text-emerald-300'
                        : 'bg-[#090B0E] border-white/[0.08] text-slate-400'
                    }`}
                  >
                    Remove {regionCfg.taxLabel} (Inclusive)
                  </button>
                </div>

                <div>
                  <label htmlFor="gst-amt" className="block text-xs font-medium text-slate-300 mb-1.5">
                    Amount ({currencyMeta.symbol})
                  </label>
                  <input
                    id="gst-amt"
                    type="number"
                    inputMode="decimal"
                    value={gstAmount}
                    onChange={(e) => setGstAmount(e.target.value)}
                    className="w-full h-12 px-4 rounded-xl bg-[#090B0E] border border-white/10 focus:border-emerald-500 focus:outline-none font-mono text-lg text-white tabular-nums"
                  />
                </div>

                <div>
                  <label htmlFor="gst-rate" className="block text-xs font-medium text-slate-300 mb-1.5">
                    {regionCfg.taxLabel} Rate (%)
                  </label>
                  <div className="grid grid-cols-4 gap-2 mb-2">
                    {regionCfg.taxSlabs.map((slab) => (
                      <button
                        key={slab}
                        type="button"
                        onClick={() => setGstRate(String(slab))}
                        className={`h-10 rounded-xl font-mono text-xs font-semibold border cursor-pointer ${
                          Number(gstRate) === slab
                            ? 'bg-emerald-500 text-slate-950 border-emerald-400'
                            : 'bg-[#090B0E] text-slate-300 border-white/[0.08]'
                        }`}
                      >
                        {slab}%
                      </button>
                    ))}
                  </div>
                  <input
                    id="gst-rate"
                    type="number"
                    inputMode="decimal"
                    step="0.25"
                    value={gstRate}
                    onChange={(e) => setGstRate(e.target.value)}
                    className="w-full h-11 px-4 rounded-xl bg-[#090B0E] border border-white/10 focus:border-emerald-500 focus:outline-none font-mono text-sm text-white tabular-nums"
                  />
                </div>
              </div>

              <div className="lg:col-span-6 rounded-2xl bg-[#090B0E] border border-white/[0.08] p-5 flex flex-col justify-between space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-400">Net Base Price</span>
                    <span className="font-mono font-medium text-white tabular-nums">
                      {formatCurrency(gstCalc.net, settings.currency)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-400">
                      Total {regionCfg.taxLabel} ({gstRate || 0}%)
                    </span>
                    <span className="font-mono font-medium text-[#E5B869] tabular-nums">
                      {formatCurrency(gstCalc.tax, settings.currency)}
                    </span>
                  </div>
                  {settings.region === 'IN' && (
                    <div className="flex items-center justify-between text-xs text-slate-400 pt-1">
                      <span>CGST ({(Number(gstRate) / 2).toFixed(1)}%) + SGST ({(Number(gstRate) / 2).toFixed(1)}%)</span>
                      <span className="font-mono tabular-nums">
                        {formatCurrency(gstCalc.tax / 2, settings.currency)} + {formatCurrency(gstCalc.tax / 2, settings.currency)}
                      </span>
                    </div>
                  )}
                </div>

                <div className="pt-4 border-t border-white/[0.08] flex items-end justify-between gap-3">
                  <div>
                    <p className="text-xs text-slate-400">Final Payable</p>
                    <p className="mt-1 font-mono text-3xl font-semibold text-emerald-400 tabular-nums">
                      {formatCurrency(gstCalc.total, settings.currency)}
                    </p>
                  </div>
                  {gstCalc.total > 0 && (
                    <button
                      type="button"
                      onClick={() => onLogAmountAsExpense(Math.round(gstCalc.total * 100) / 100, `Bill (${regionCfg.taxLabel} ${gstRate}%)`)}
                      className="h-10 px-3.5 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-300 text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer"
                    >
                      <PlusCircle className="w-3.5 h-3.5" />
                      Log Expense
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {pctMode === 'discount' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <label htmlFor="disc-price" className="block text-xs font-medium text-slate-300 mb-1.5">
                    Original MRP / Price ({currencyMeta.symbol})
                  </label>
                  <input
                    id="disc-price"
                    type="number"
                    inputMode="decimal"
                    value={discPrice}
                    onChange={(e) => setDiscPrice(e.target.value)}
                    className="w-full h-12 px-4 rounded-xl bg-[#090B0E] border border-white/10 font-mono text-lg text-white tabular-nums"
                  />
                </div>
                <div>
                  <label htmlFor="disc-pct" className="block text-xs font-medium text-slate-300 mb-1.5">
                    Discount (%)
                  </label>
                  <input
                    id="disc-pct"
                    type="number"
                    inputMode="decimal"
                    value={discPct}
                    onChange={(e) => setDiscPct(e.target.value)}
                    className="w-full h-12 px-4 rounded-xl bg-[#090B0E] border border-white/10 font-mono text-lg text-white tabular-nums"
                  />
                </div>
              </div>

              <div className="rounded-2xl bg-[#090B0E] border border-white/[0.08] p-5 flex flex-col justify-between">
                <div>
                  <p className="text-xs text-slate-400">Final Price After {discPct || 0}% Off</p>
                  <p className="mt-1 font-mono text-3xl font-semibold text-emerald-400 tabular-nums">
                    {formatCurrency(discountCalc.final, settings.currency)}
                  </p>
                  <p className="mt-2 text-sm font-mono text-[#E5B869] tabular-nums">
                    You save {formatCurrency(discountCalc.saved, settings.currency)}
                  </p>
                </div>
                {discountCalc.final > 0 && (
                  <button
                    type="button"
                    onClick={() => onLogAmountAsExpense(Math.round(discountCalc.final * 100) / 100, 'Discounted Purchase')}
                    className="mt-4 h-10 px-4 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-300 text-xs font-semibold inline-flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <PlusCircle className="w-3.5 h-3.5" />
                    Log Final Price as Expense
                  </button>
                )}
              </div>
            </div>
          )}

          {pctMode === 'of' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="of-pct" className="block text-xs font-medium text-slate-300 mb-1.5">
                    Percentage (%)
                  </label>
                  <input
                    id="of-pct"
                    type="number"
                    inputMode="decimal"
                    value={ofPct}
                    onChange={(e) => setOfPct(e.target.value)}
                    className="w-full h-12 px-4 rounded-xl bg-[#090B0E] border border-white/10 font-mono text-lg text-white tabular-nums"
                  />
                </div>
                <div>
                  <label htmlFor="of-base" className="block text-xs font-medium text-slate-300 mb-1.5">
                    Of Number
                  </label>
                  <input
                    id="of-base"
                    type="number"
                    inputMode="decimal"
                    value={ofBase}
                    onChange={(e) => setOfBase(e.target.value)}
                    className="w-full h-12 px-4 rounded-xl bg-[#090B0E] border border-white/10 font-mono text-lg text-white tabular-nums"
                  />
                </div>
              </div>
              <div className="rounded-2xl bg-[#090B0E] border border-white/[0.08] p-5">
                <p className="text-xs text-slate-400">
                  {ofPct || 0}% of {ofBase || 0}
                </p>
                <p className="mt-1 font-mono text-3xl font-semibold text-emerald-400 tabular-nums">
                  {ofCalc.toLocaleString(regionCfg.locale, { maximumFractionDigits: 2 })}
                </p>
              </div>
            </div>
          )}

          {pctMode === 'change' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="chg-from" className="block text-xs font-medium text-slate-300 mb-1.5">
                    Initial Value
                  </label>
                  <input
                    id="chg-from"
                    type="number"
                    inputMode="decimal"
                    value={chgFrom}
                    onChange={(e) => setChgFrom(e.target.value)}
                    className="w-full h-12 px-4 rounded-xl bg-[#090B0E] border border-white/10 font-mono text-lg text-white tabular-nums"
                  />
                </div>
                <div>
                  <label htmlFor="chg-to" className="block text-xs font-medium text-slate-300 mb-1.5">
                    New Value
                  </label>
                  <input
                    id="chg-to"
                    type="number"
                    inputMode="decimal"
                    value={chgTo}
                    onChange={(e) => setChgTo(e.target.value)}
                    className="w-full h-12 px-4 rounded-xl bg-[#090B0E] border border-white/10 font-mono text-lg text-white tabular-nums"
                  />
                </div>
              </div>
              <div className="rounded-2xl bg-[#090B0E] border border-white/[0.08] p-5">
                <p className="text-xs text-slate-400">Percentage Change</p>
                <p
                  className={`mt-1 font-mono text-3xl font-semibold tabular-nums ${
                    changeCalc.pct >= 0 ? 'text-emerald-400' : 'text-rose-400'
                  }`}
                >
                  {changeCalc.pct >= 0 ? '+' : ''}
                  {changeCalc.pct.toFixed(2)}%
                </p>
                <p className="mt-1 text-xs font-mono text-slate-400 tabular-nums">
                  Difference: {changeCalc.diff >= 0 ? '+' : ''}
                  {changeCalc.diff.toLocaleString(regionCfg.locale, { maximumFractionDigits: 2 })}
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TOOL 4: SIMPLE & COMPOUND INTEREST */}
      {activeTool === 'interest' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <div className="lg:col-span-6 bg-[#11151B] rounded-2xl border border-white/[0.08] p-5 sm:p-6 space-y-4">
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setIntMode('compound')}
                className={`h-10 rounded-xl text-xs font-semibold border cursor-pointer ${
                  intMode === 'compound'
                    ? 'bg-emerald-500 text-slate-950 border-emerald-400'
                    : 'bg-[#090B0E] text-slate-300 border-white/[0.08]'
                }`}
              >
                Compound Interest
              </button>
              <button
                type="button"
                onClick={() => setIntMode('simple')}
                className={`h-10 rounded-xl text-xs font-semibold border cursor-pointer ${
                  intMode === 'simple'
                    ? 'bg-emerald-500 text-slate-950 border-emerald-400'
                    : 'bg-[#090B0E] text-slate-300 border-white/[0.08]'
                }`}
              >
                Simple Interest
              </button>
            </div>

            <div>
              <label htmlFor="int-p" className="block text-xs font-medium text-slate-300 mb-1.5">
                Principal Amount ({currencyMeta.symbol})
              </label>
              <input
                id="int-p"
                type="number"
                inputMode="decimal"
                value={intPrincipal}
                onChange={(e) => setIntPrincipal(e.target.value)}
                className="w-full h-12 px-4 rounded-xl bg-[#090B0E] border border-white/10 font-mono text-lg text-white tabular-nums"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="int-r" className="block text-xs font-medium text-slate-300 mb-1.5">
                  Annual Rate (% p.a.)
                </label>
                <input
                  id="int-r"
                  type="number"
                  inputMode="decimal"
                  step="0.1"
                  value={intRate}
                  onChange={(e) => setIntRate(e.target.value)}
                  className="w-full h-11 px-3.5 rounded-xl bg-[#090B0E] border border-white/10 font-mono text-base text-white tabular-nums"
                />
              </div>
              <div>
                <label htmlFor="int-t" className="block text-xs font-medium text-slate-300 mb-1.5">
                  Time Period (Years)
                </label>
                <input
                  id="int-t"
                  type="number"
                  inputMode="decimal"
                  step="0.5"
                  value={intYears}
                  onChange={(e) => setIntYears(e.target.value)}
                  className="w-full h-11 px-3.5 rounded-xl bg-[#090B0E] border border-white/10 font-mono text-base text-white tabular-nums"
                />
              </div>
            </div>

            {intMode === 'compound' && (
              <div>
                <span className="block text-xs font-medium text-slate-300 mb-1.5">
                  Compounding Frequency
                </span>
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { n: 1, label: 'Yearly' },
                    { n: 2, label: 'Half-Yr' },
                    { n: 4, label: 'Quarterly' },
                    { n: 12, label: 'Monthly' },
                  ].map((f) => (
                    <button
                      key={f.n}
                      type="button"
                      onClick={() => setIntFreq(f.n)}
                      className={`h-10 rounded-xl text-xs font-medium border cursor-pointer ${
                        intFreq === f.n
                          ? 'bg-white text-slate-950 border-white'
                          : 'bg-[#090B0E] text-slate-300 border-white/[0.08]'
                      }`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="lg:col-span-6 bg-[#11151B] rounded-2xl border border-white/[0.08] p-5 sm:p-6 space-y-5">
            <div>
              <p className="text-xs text-slate-400">Maturity Value</p>
              <p className="mt-1 font-mono text-3xl sm:text-4xl font-semibold text-emerald-400 tabular-nums">
                {formatCurrency(interestCalc.total, settings.currency)}
              </p>
              {formatIndianWordsHint(interestCalc.total, settings.currency) && (
                <p className="mt-1 text-xs font-mono text-[#E5B869]">
                  ≈ {formatIndianWordsHint(interestCalc.total, settings.currency)}
                </p>
              )}
            </div>

            {/* Ratio Bar */}
            <div>
              <div className="h-2.5 w-full rounded-full bg-white/10 overflow-hidden flex">
                <div
                  className="h-full bg-slate-300"
                  style={{
                    width: `${interestCalc.total > 0 ? Math.round((interestCalc.principal / interestCalc.total) * 100) : 100}%`,
                  }}
                />
                <div
                  className="h-full bg-emerald-500"
                  style={{
                    width: `${interestCalc.total > 0 ? Math.round((interestCalc.interest / interestCalc.total) * 100) : 0}%`,
                  }}
                />
              </div>
              <div className="mt-4 grid grid-cols-2 gap-4">
                <div className="rounded-xl bg-[#090B0E] border border-white/[0.07] p-3.5">
                  <p className="text-xs text-slate-400">Principal Amount</p>
                  <p className="mt-1 font-mono text-base font-semibold text-white tabular-nums">
                    {formatCurrency(interestCalc.principal, settings.currency)}
                  </p>
                </div>
                <div className="rounded-xl bg-[#090B0E] border border-white/[0.07] p-3.5">
                  <p className="text-xs text-slate-400">Interest Earned</p>
                  <p className="mt-1 font-mono text-base font-semibold text-emerald-400 tabular-nums">
                    {formatCurrency(interestCalc.interest, settings.currency)}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TOOL 5: EMI & LOAN CALCULATOR */}
      {activeTool === 'emi' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <div className="lg:col-span-5 bg-[#11151B] rounded-2xl border border-white/[0.08] p-5 sm:p-6 space-y-4">
            <div className="flex items-center gap-2 flex-wrap">
              {[
                { label: 'Home Loan', amt: settings.currency === 'INR' ? '3500000' : '250000', rate: '8.5', yrs: '20' },
                { label: 'Car Loan', amt: settings.currency === 'INR' ? '800000' : '30000', rate: '9.2', yrs: '5' },
                { label: 'Personal', amt: settings.currency === 'INR' ? '300000' : '12000', rate: '11.5', yrs: '3' },
              ].map((preset) => (
                <button
                  key={preset.label}
                  type="button"
                  onClick={() => {
                    setEmiLoan(preset.amt);
                    setEmiRate(preset.rate);
                    setEmiYears(preset.yrs);
                  }}
                  className="h-9 px-3 rounded-lg bg-[#090B0E] border border-white/[0.08] hover:border-emerald-500/50 text-xs font-medium text-slate-300 cursor-pointer"
                >
                  {preset.label}
                </button>
              ))}
            </div>

            <div>
              <label htmlFor="emi-loan" className="block text-xs font-medium text-slate-300 mb-1.5">
                Loan Amount ({currencyMeta.symbol})
              </label>
              <input
                id="emi-loan"
                type="number"
                inputMode="decimal"
                value={emiLoan}
                onChange={(e) => setEmiLoan(e.target.value)}
                className="w-full h-12 px-4 rounded-xl bg-[#090B0E] border border-white/10 font-mono text-lg text-white tabular-nums"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="emi-rate" className="block text-xs font-medium text-slate-300 mb-1.5">
                  Interest (% p.a.)
                </label>
                <input
                  id="emi-rate"
                  type="number"
                  inputMode="decimal"
                  step="0.1"
                  value={emiRate}
                  onChange={(e) => setEmiRate(e.target.value)}
                  className="w-full h-11 px-3.5 rounded-xl bg-[#090B0E] border border-white/10 font-mono text-base text-white tabular-nums"
                />
              </div>
              <div>
                <label htmlFor="emi-years" className="block text-xs font-medium text-slate-300 mb-1.5">
                  Tenure (Years)
                </label>
                <input
                  id="emi-years"
                  type="number"
                  inputMode="decimal"
                  min="1"
                  max="40"
                  value={emiYears}
                  onChange={(e) => setEmiYears(e.target.value)}
                  className="w-full h-11 px-3.5 rounded-xl bg-[#090B0E] border border-white/10 font-mono text-base text-white tabular-nums"
                />
              </div>
            </div>
          </div>

          <div className="lg:col-span-7 bg-[#11151B] rounded-2xl border border-white/[0.08] p-5 sm:p-6 space-y-5">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="text-xs text-slate-400">Monthly EMI ({emiCalc.months} months)</p>
                <p className="mt-1 font-mono text-3xl sm:text-4xl font-semibold text-emerald-400 tabular-nums">
                  {formatCurrency(emiCalc.emi, settings.currency, 0)}
                </p>
              </div>
              {emiCalc.emi > 0 && (
                <button
                  type="button"
                  onClick={() => onLogAmountAsExpense(Math.round(emiCalc.emi), 'Monthly Loan EMI')}
                  className="h-10 px-3.5 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-300 text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <PlusCircle className="w-3.5 h-3.5" />
                  Log EMI Expense
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="rounded-xl bg-[#090B0E] border border-white/[0.07] p-3.5">
                <p className="text-xs text-slate-400">Total Interest Payable</p>
                <p className="mt-1 font-mono text-base font-semibold text-[#E5B869] tabular-nums">
                  {formatCurrency(emiCalc.totalInterest, settings.currency, 0)}
                </p>
              </div>
              <div className="rounded-xl bg-[#090B0E] border border-white/[0.07] p-3.5">
                <p className="text-xs text-slate-400">Total Repayment (Principal + Interest)</p>
                <p className="mt-1 font-mono text-base font-semibold text-white tabular-nums">
                  {formatCurrency(emiCalc.totalPayment, settings.currency, 0)}
                </p>
              </div>
            </div>

            {emiCalc.yearly.length > 0 && (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-white/[0.08] text-slate-400">
                      <th className="py-2 font-medium">Year</th>
                      <th className="py-2 font-medium text-right">Principal</th>
                      <th className="py-2 font-medium text-right">Interest</th>
                      <th className="py-2 font-medium text-right">Balance</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.05] font-mono tabular-nums">
                    {emiCalc.yearly.slice(0, 6).map((row) => (
                      <tr key={row.year}>
                        <td className="py-2 text-slate-300">Yr {row.year}</td>
                        <td className="py-2 text-right text-white">
                          {formatCurrency(row.principalPaid, settings.currency, 0)}
                        </td>
                        <td className="py-2 text-right text-[#E5B869]">
                          {formatCurrency(row.interestPaid, settings.currency, 0)}
                        </td>
                        <td className="py-2 text-right text-slate-400">
                          {formatCurrency(row.balance, settings.currency, 0)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TOOL 6: SIP & FD WEALTH CALCULATOR */}
      {activeTool === 'sip' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <div className="lg:col-span-6 bg-[#11151B] rounded-2xl border border-white/[0.08] p-5 sm:p-6 space-y-4">
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setSipMode('sip')}
                className={`h-10 rounded-xl text-xs font-semibold border cursor-pointer ${
                  sipMode === 'sip'
                    ? 'bg-emerald-500 text-slate-950 border-emerald-400'
                    : 'bg-[#090B0E] text-slate-300 border-white/[0.08]'
                }`}
              >
                Monthly SIP
              </button>
              <button
                type="button"
                onClick={() => setSipMode('lumpsum')}
                className={`h-10 rounded-xl text-xs font-semibold border cursor-pointer ${
                  sipMode === 'lumpsum'
                    ? 'bg-emerald-500 text-slate-950 border-emerald-400'
                    : 'bg-[#090B0E] text-slate-300 border-white/[0.08]'
                }`}
              >
                Lumpsum / FD
              </button>
            </div>

            <div>
              <label htmlFor="sip-amt" className="block text-xs font-medium text-slate-300 mb-1.5">
                {sipMode === 'sip' ? 'Monthly Investment' : 'One-Time Deposit'} ({currencyMeta.symbol})
              </label>
              <input
                id="sip-amt"
                type="number"
                inputMode="decimal"
                value={sipAmount}
                onChange={(e) => setSipAmount(e.target.value)}
                className="w-full h-12 px-4 rounded-xl bg-[#090B0E] border border-white/10 font-mono text-lg text-white tabular-nums"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="sip-ret" className="block text-xs font-medium text-slate-300 mb-1.5">
                  Expected Return (% p.a.)
                </label>
                <input
                  id="sip-ret"
                  type="number"
                  inputMode="decimal"
                  step="0.5"
                  value={sipReturn}
                  onChange={(e) => setSipReturn(e.target.value)}
                  className="w-full h-11 px-3.5 rounded-xl bg-[#090B0E] border border-white/10 font-mono text-base text-white tabular-nums"
                />
              </div>
              <div>
                <label htmlFor="sip-yrs" className="block text-xs font-medium text-slate-300 mb-1.5">
                  Duration (Years)
                </label>
                <input
                  id="sip-yrs"
                  type="number"
                  inputMode="numeric"
                  min="1"
                  max="50"
                  value={sipYears}
                  onChange={(e) => setSipYears(e.target.value)}
                  className="w-full h-11 px-3.5 rounded-xl bg-[#090B0E] border border-white/10 font-mono text-base text-white tabular-nums"
                />
              </div>
            </div>
          </div>

          <div className="lg:col-span-6 bg-[#11151B] rounded-2xl border border-white/[0.08] p-5 sm:p-6 space-y-5">
            <div>
              <p className="text-xs text-slate-400">Estimated Total Value</p>
              <p className="mt-1 font-mono text-3xl sm:text-4xl font-semibold text-emerald-400 tabular-nums">
                {formatCurrency(sipCalc.total, settings.currency, 0)}
              </p>
              {formatIndianWordsHint(sipCalc.total, settings.currency) && (
                <p className="mt-1 text-xs font-mono text-[#E5B869]">
                  ≈ {formatIndianWordsHint(sipCalc.total, settings.currency)}
                </p>
              )}
            </div>

            <div className="h-2.5 w-full rounded-full bg-white/10 overflow-hidden flex">
              <div
                className="h-full bg-slate-300"
                style={{
                  width: `${sipCalc.total > 0 ? Math.round((sipCalc.invested / sipCalc.total) * 100) : 100}%`,
                }}
              />
              <div
                className="h-full bg-emerald-500"
                style={{
                  width: `${sipCalc.total > 0 ? Math.round((sipCalc.gains / sipCalc.total) * 100) : 0}%`,
                }}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-xl bg-[#090B0E] border border-white/[0.07] p-3.5">
                <p className="text-xs text-slate-400">Total Invested</p>
                <p className="mt-1 font-mono text-base font-semibold text-white tabular-nums">
                  {formatCurrency(sipCalc.invested, settings.currency, 0)}
                </p>
              </div>
              <div className="rounded-xl bg-[#090B0E] border border-white/[0.07] p-3.5">
                <p className="text-xs text-slate-400">Estimated Wealth Gain</p>
                <p className="mt-1 font-mono text-base font-semibold text-emerald-400 tabular-nums">
                  {formatCurrency(sipCalc.gains, settings.currency, 0)}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
