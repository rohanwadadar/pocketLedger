import React, { useState } from 'react';
import { motion } from 'motion/react';
import { ArrowLeft, ArrowRight, Check, Globe2, ShieldCheck, User } from 'lucide-react';
import {
  AppSettings,
  CURRENCIES,
  FINANCIAL_GOALS,
  FinancialGoal,
  OCCUPATIONS,
  REGION_LIST,
  REGIONS,
  RegionCode,
  UserOccupation,
  UserProfile,
} from '../types';
import { formatCurrency } from '../utils/format';

interface OnboardingFlowProps {
  initialProfile: UserProfile;
  initialSettings: AppSettings;
  onComplete: (profile: UserProfile, settings: AppSettings) => void;
}

const PRISM_IMAGE_PATH = '/src/assets/images/india_rupee_prism_1795065332423.jpg';

export const OnboardingFlow: React.FC<OnboardingFlowProps> = ({
  initialProfile,
  initialSettings,
  onComplete,
}) => {
  const [step, setStep] = useState<1 | 2>(1);
  const [imgFailed, setImgFailed] = useState(false);

  // Step 1: Personal profile
  const [name, setName] = useState(initialProfile.name || '');
  const [age, setAge] = useState(initialProfile.age || '');
  const [occupation, setOccupation] = useState<UserOccupation>(initialProfile.occupation);
  const [financialGoal, setFinancialGoal] = useState<FinancialGoal>(initialProfile.financialGoal);
  const [stepError, setStepError] = useState('');

  // Step 2: Region & budget (defaults to India / INR ₹)
  const [region, setRegion] = useState<RegionCode>(initialSettings.region || 'IN');
  const [monthlyIncome, setMonthlyIncome] = useState<string>(
    String(initialProfile.monthlyIncome || REGIONS[initialSettings.region || 'IN'].defaultMonthlyIncome)
  );
  const [dailyBudget, setDailyBudget] = useState<string>(
    String(initialSettings.dailyBudget || REGIONS[initialSettings.region || 'IN'].defaultDailyBudget)
  );

  const selectedRegionCfg = REGIONS[region];
  const currencyMeta = CURRENCIES[selectedRegionCfg.currency];

  const handleSelectRegion = (nextRegion: RegionCode) => {
    setRegion(nextRegion);
    const cfg = REGIONS[nextRegion];
    setDailyBudget(String(cfg.defaultDailyBudget));
    setMonthlyIncome(String(cfg.defaultMonthlyIncome));
  };

  const handleContinueStep1 = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setStepError('Please enter your name so PocketLedger can personalize your ledger.');
      return;
    }
    if (age.trim()) {
      const parsedAge = Number(age);
      if (Number.isNaN(parsedAge) || parsedAge < 10 || parsedAge > 110) {
        setStepError('Enter a valid age between 10 and 110, or leave it blank.');
        return;
      }
    }
    setStepError('');
    setStep(2);
  };

  const handleFinish = (e: React.FormEvent) => {
    e.preventDefault();
    const budgetNum = parseFloat(dailyBudget);
    const incomeNum = parseFloat(monthlyIncome);

    const nextSettings: AppSettings = {
      region,
      currency: selectedRegionCfg.currency,
      dailyBudget:
        !Number.isNaN(budgetNum) && budgetNum > 0
          ? Math.round(budgetNum)
          : selectedRegionCfg.defaultDailyBudget,
    };

    const nextProfile: UserProfile = {
      name: name.trim() || 'Guest',
      age: age.trim(),
      occupation,
      financialGoal,
      monthlyIncome: !Number.isNaN(incomeNum) && incomeNum >= 0 ? Math.round(incomeNum) : 0,
      onboardingCompleted: true,
    };

    onComplete(nextProfile, nextSettings);
  };

  return (
    <div className="min-h-screen bg-[#090B0E] text-[#F4F6F8] flex items-center justify-center p-4 sm:p-6 lg:p-10">
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-5xl rounded-3xl bg-[#11151B] border border-white/[0.08] overflow-hidden grid grid-cols-1 lg:grid-cols-12"
      >
        {/* Left Visual Column */}
        <div className="lg:col-span-5 relative min-h-[210px] lg:min-h-full bg-[#0D1015] flex flex-col justify-between p-6 sm:p-8 overflow-hidden">
          {!imgFailed ? (
            <img
              src={PRISM_IMAGE_PATH}
              alt="Brushed brass and anodized titanium discs beside a sapphire crystal prism"
              referrerPolicy="no-referrer"
              onError={() => setImgFailed(true)}
              className="absolute inset-0 w-full h-full object-cover opacity-55"
            />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-950/50 via-[#11151B] to-[#090B0E]" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-[#090B0E] via-[#090B0E]/65 to-[#090B0E]/35" />

          <div className="relative z-10 flex items-center justify-between">
            <span className="font-display text-base font-semibold tracking-tight text-white">
              PocketLedger
            </span>
            <span className="text-xs font-mono text-slate-300 tabular-nums">
              Step {step} / 2
            </span>
          </div>

          <div className="relative z-10 mt-10 lg:mt-0">
            <h1 className="font-display text-2xl sm:text-3xl font-semibold text-white tracking-tight leading-tight text-balance">
              {step === 1
                ? 'Personalize your private finance vault.'
                : 'Built for India (₹) and global regions.'}
            </h1>
            <p className="mt-3 text-sm text-slate-300 leading-relaxed">
              {step === 1
                ? 'Tell us a little about yourself so daily budgets, greetings, and financial calculators match your routine.'
                : 'Your entries, Rupee formats, GST/tax presets, and calculator history stay 100% offline in this device’s local cache.'}
            </p>

            <div className="mt-5 flex items-center gap-2 text-xs text-emerald-400">
              <ShieldCheck className="w-4 h-4 shrink-0" />
              <span>Zero cloud tracking · Saved only in device cache</span>
            </div>
          </div>
        </div>

        {/* Right Interactive Setup Column */}
        <div className="lg:col-span-7 p-6 sm:p-8 lg:p-10 flex flex-col justify-center">
          {step === 1 ? (
            <form onSubmit={handleContinueStep1} className="space-y-5">
              <div className="flex items-center gap-2 text-xs font-medium text-emerald-400">
                <User className="w-4 h-4" />
                <span>Your Profile</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-2">
                  <label htmlFor="onboard-name" className="block text-xs font-medium text-slate-300 mb-1.5">
                    Your Name
                  </label>
                  <input
                    id="onboard-name"
                    type="text"
                    maxLength={40}
                    placeholder="e.g., Rohan, Priya, Aarav"
                    value={name}
                    onChange={(e) => {
                      setName(e.target.value);
                      if (stepError) setStepError('');
                    }}
                    className="w-full h-12 px-4 rounded-xl bg-[#090B0E] border border-white/10 focus:border-emerald-500 focus:outline-none text-sm text-white placeholder:text-slate-500 transition-colors"
                  />
                </div>

                <div>
                  <label htmlFor="onboard-age" className="block text-xs font-medium text-slate-300 mb-1.5">
                    Age
                  </label>
                  <input
                    id="onboard-age"
                    type="number"
                    inputMode="numeric"
                    min={10}
                    max={110}
                    placeholder="e.g., 24"
                    value={age}
                    onChange={(e) => {
                      setAge(e.target.value);
                      if (stepError) setStepError('');
                    }}
                    className="w-full h-12 px-4 rounded-xl bg-[#090B0E] border border-white/10 focus:border-emerald-500 focus:outline-none font-mono text-sm text-white placeholder:text-slate-500 tabular-nums transition-colors"
                  />
                </div>
              </div>

              <div>
                <span className="block text-xs font-medium text-slate-300 mb-2">
                  What best describes you?
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {OCCUPATIONS.map((occ) => {
                    const active = occupation === occ;
                    return (
                      <button
                        key={occ}
                        type="button"
                        onClick={() => setOccupation(occ)}
                        className={`min-h-[44px] px-3 py-2 rounded-xl text-xs font-medium transition-colors border text-left cursor-pointer ${
                          active
                            ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/60'
                            : 'bg-[#090B0E] text-slate-300 border-white/[0.08] hover:border-white/20'
                        }`}
                      >
                        {occ}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <span className="block text-xs font-medium text-slate-300 mb-2">
                  Primary Financial Focus
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {FINANCIAL_GOALS.map((goal) => {
                    const active = financialGoal === goal;
                    return (
                      <button
                        key={goal}
                        type="button"
                        onClick={() => setFinancialGoal(goal)}
                        className={`min-h-[44px] px-3.5 py-2.5 rounded-xl text-xs font-medium transition-colors border flex items-center justify-between cursor-pointer ${
                          active
                            ? 'bg-white text-slate-950 border-white'
                            : 'bg-[#090B0E] text-slate-300 border-white/[0.08] hover:border-white/20'
                        }`}
                      >
                        <span>{goal}</span>
                        {active && <Check className="w-4 h-4 shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {stepError && (
                <p className="text-xs font-medium text-rose-400" role="alert">
                  {stepError}
                </p>
              )}

              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full h-12 px-5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-sm font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer"
                >
                  <span>Continue to Region &amp; Rupees Setup</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </form>
          ) : (
            <form onSubmit={handleFinish} className="space-y-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-medium text-emerald-400">
                  <Globe2 className="w-4 h-4" />
                  <span>Region, Currency &amp; Daily Target</span>
                </div>
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="text-xs text-slate-400 hover:text-white inline-flex items-center gap-1 cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  Back
                </button>
              </div>

              {/* Region Picker Grid (India highlighted first) */}
              <div>
                <span className="block text-xs font-medium text-slate-300 mb-2">
                  Select Your Region (Indian Rupees ₹ default — switch anytime)
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {REGION_LIST.map((r) => {
                    const active = region === r.code;
                    const sym = CURRENCIES[r.currency].symbol;
                    return (
                      <button
                        key={r.code}
                        type="button"
                        onClick={() => handleSelectRegion(r.code)}
                        className={`min-h-[48px] px-3 py-2 rounded-xl text-left transition-colors border cursor-pointer ${
                          active
                            ? 'bg-emerald-500/15 border-emerald-500/70 text-white'
                            : 'bg-[#090B0E] border-white/[0.08] text-slate-300 hover:border-white/20'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-1">
                          <span className="text-xs font-semibold truncate">{r.name}</span>
                          <span className="text-xs font-mono text-[#E5B869] shrink-0">
                            {sym}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 mt-0.5 truncate">
                          {r.currency} · {r.taxLabel}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Monthly Income & Daily Spend Limit */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="onboard-budget" className="block text-xs font-medium text-slate-300 mb-1.5">
                    Daily Spend Limit ({currencyMeta.symbol} {currencyMeta.code})
                  </label>
                  <input
                    id="onboard-budget"
                    type="number"
                    inputMode="decimal"
                    min={1}
                    value={dailyBudget}
                    onChange={(e) => setDailyBudget(e.target.value)}
                    className="w-full h-12 px-4 rounded-xl bg-[#090B0E] border border-white/10 focus:border-emerald-500 focus:outline-none font-mono text-base font-semibold text-white tabular-nums"
                  />
                  <p className="mt-1 text-[11px] text-slate-400">
                    Recommended: {formatCurrency(selectedRegionCfg.defaultDailyBudget, selectedRegionCfg.currency, 0)} / day
                  </p>
                </div>

                <div>
                  <label htmlFor="onboard-income" className="block text-xs font-medium text-slate-300 mb-1.5">
                    Monthly Income / Allowance (optional)
                  </label>
                  <input
                    id="onboard-income"
                    type="number"
                    inputMode="decimal"
                    min={0}
                    value={monthlyIncome}
                    onChange={(e) => setMonthlyIncome(e.target.value)}
                    className="w-full h-12 px-4 rounded-xl bg-[#090B0E] border border-white/10 focus:border-emerald-500 focus:outline-none font-mono text-base font-semibold text-white tabular-nums"
                  />
                  <p className="mt-1 text-[11px] text-slate-400">
                    Used locally to estimate monthly savings rate
                  </p>
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full h-12 px-5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-sm font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer"
                >
                  <span>Enter PocketLedger ({currencyMeta.symbol} {selectedRegionCfg.name})</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </form>
          )}
        </div>
      </motion.div>
    </div>
  );
};
