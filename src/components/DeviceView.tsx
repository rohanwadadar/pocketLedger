import React, { useRef, useState } from 'react';
import {
  Check,
  Download,
  FileSpreadsheet,
  Globe2,
  HardDrive,
  Monitor,
  Play,
  Share,
  Smartphone,
  Trash2,
  Upload,
  User,
} from 'lucide-react';
import {
  AppSettings,
  CURRENCIES,
  Expense,
  FINANCIAL_GOALS,
  FinancialGoal,
  OCCUPATIONS,
  REGION_LIST,
  REGIONS,
  RegionCode,
  UserOccupation,
  UserProfile,
} from '../types';
import { DevicePlatform } from '../hooks/usePWAInstall';
import { formatBytes, formatCurrency } from '../utils/format';
import {
  exportBackupJSON,
  exportExpensesToCSV,
  getLocalCacheStats,
  parseImportedBackup,
} from '../utils/storage';

interface DeviceViewProps {
  expenses: Expense[];
  settings: AppSettings;
  profile: UserProfile;
  onUpdateSettings: (next: AppSettings) => void;
  onUpdateProfile: (next: UserProfile) => void;
  onImportData: (
    expenses: Expense[],
    importedSettings?: AppSettings,
    importedProfile?: UserProfile
  ) => void;
  onClearAll: () => void;
  onReplayLoader: () => void;
  platform: DevicePlatform;
  isInstallable: boolean;
  isInstalled: boolean;
  onTriggerInstall: () => Promise<boolean>;
  onOpenInstallGuide: () => void;
}

export const DeviceView: React.FC<DeviceViewProps> = ({
  expenses,
  settings,
  profile,
  onUpdateSettings,
  onUpdateProfile,
  onImportData,
  onClearAll,
  onReplayLoader,
  platform,
  isInstallable,
  isInstalled,
  onTriggerInstall,
  onOpenInstallGuide,
}) => {
  const [nameInput, setNameInput] = useState(profile.name);
  const [ageInput, setAgeInput] = useState(profile.age);
  const [occupationInput, setOccupationInput] = useState<UserOccupation>(profile.occupation);
  const [goalInput, setGoalInput] = useState<FinancialGoal>(profile.financialGoal);
  const [incomeInput, setIncomeInput] = useState(String(profile.monthlyIncome || ''));
  const [budgetInput, setBudgetInput] = useState(String(settings.dailyBudget));

  const [savedNotice, setSavedNotice] = useState('');
  const [importMessage, setImportMessage] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  const [confirmClear, setConfirmClear] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const cacheStats = getLocalCacheStats();
  const regionCfg = REGIONS[settings.region] || REGIONS.IN;
  const currencyMeta = CURRENCIES[settings.currency] || CURRENCIES.INR;

  const flashNotice = (msg: string) => {
    setSavedNotice(msg);
    window.setTimeout(() => setSavedNotice(''), 2200);
  };

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    const incomeVal = parseFloat(incomeInput);
    onUpdateProfile({
      ...profile,
      name: nameInput.trim() || 'Guest',
      age: ageInput.trim(),
      occupation: occupationInput,
      financialGoal: goalInput,
      monthlyIncome: !Number.isNaN(incomeVal) && incomeVal >= 0 ? Math.round(incomeVal) : 0,
      onboardingCompleted: true,
    });
    flashNotice('Profile updated in local device cache.');
  };

  const handleRegionSwitch = (nextRegion: RegionCode) => {
    const nextCfg = REGIONS[nextRegion];
    onUpdateSettings({
      region: nextRegion,
      currency: nextCfg.currency,
      dailyBudget: nextCfg.defaultDailyBudget,
    });
    setBudgetInput(String(nextCfg.defaultDailyBudget));
    flashNotice(`Switched to ${nextCfg.name} (${CURRENCIES[nextCfg.currency].symbol} ${nextCfg.currency}).`);
  };

  const handleBudgetSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseFloat(budgetInput);
    if (Number.isNaN(val) || val <= 0) return;
    onUpdateSettings({ ...settings, dailyBudget: Math.round(val) });
    flashNotice('Daily budget saved to device cache.');
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const result = parseImportedBackup(text);
      onImportData(result.expenses, result.settings, result.profile);
      if (result.settings) setBudgetInput(String(result.settings.dailyBudget));
      if (result.profile) {
        setNameInput(result.profile.name);
        setAgeInput(result.profile.age);
        setOccupationInput(result.profile.occupation);
        setGoalInput(result.profile.financialGoal);
        setIncomeInput(String(result.profile.monthlyIncome || ''));
      }
      setImportMessage({
        type: 'ok',
        text: `Restored ${result.expenses.length} expenses into this device's cache.`,
      });
    } catch (err) {
      setImportMessage({
        type: 'err',
        text: err instanceof Error ? err.message : 'Could not parse backup file.',
      });
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-semibold tracking-tight text-white">
            Profile, Region &amp; Device Cache
          </h1>
          <p className="text-sm text-slate-400 mt-0.5">
            Personal settings, India/Global regional version, Android install, and local offline storage.
          </p>
        </div>

        <button
          type="button"
          onClick={onReplayLoader}
          className="h-10 px-3.5 rounded-xl bg-[#11151B] hover:bg-[#171D26] border border-white/[0.08] text-xs font-medium text-slate-300 hover:text-white inline-flex items-center gap-1.5 transition-colors cursor-pointer"
        >
          <Play className="w-3.5 h-3.5 text-emerald-400" />
          Replay Opening Intro
        </button>
      </div>

      {savedNotice && (
        <div className="rounded-xl bg-emerald-500/12 border border-emerald-500/30 px-4 py-2.5 text-xs font-medium text-emerald-300 flex items-center gap-2">
          <Check className="w-4 h-4 shrink-0" />
          <span>{savedNotice}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Profile + Region + Local Cache */}
        <div className="lg:col-span-7 space-y-6">
          {/* User Profile Card */}
          <section className="bg-[#11151B] rounded-2xl border border-white/[0.08] p-5 sm:p-6">
            <div className="flex items-center gap-2.5 mb-5">
              <div className="w-9 h-9 rounded-xl bg-emerald-500/12 text-emerald-400 flex items-center justify-center">
                <User className="w-4 h-4" />
              </div>
              <div>
                <h2 className="font-display text-base font-semibold text-white">Personal Profile</h2>
                <p className="text-xs text-slate-400">Stored strictly on this device</p>
              </div>
            </div>

            <form onSubmit={handleSaveProfile} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label htmlFor="prof-name" className="block text-xs font-medium text-slate-300 mb-1.5">
                    Name
                  </label>
                  <input
                    id="prof-name"
                    type="text"
                    maxLength={40}
                    value={nameInput}
                    onChange={(e) => setNameInput(e.target.value)}
                    className="w-full h-11 px-3.5 rounded-xl bg-[#090B0E] border border-white/10 focus:border-emerald-500 focus:outline-none text-sm text-white"
                  />
                </div>
                <div>
                  <label htmlFor="prof-age" className="block text-xs font-medium text-slate-300 mb-1.5">
                    Age
                  </label>
                  <input
                    id="prof-age"
                    type="number"
                    min={10}
                    max={110}
                    value={ageInput}
                    onChange={(e) => setAgeInput(e.target.value)}
                    className="w-full h-11 px-3.5 rounded-xl bg-[#090B0E] border border-white/10 focus:border-emerald-500 focus:outline-none font-mono text-sm text-white tabular-nums"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label htmlFor="prof-occ" className="block text-xs font-medium text-slate-300 mb-1.5">
                    Occupation
                  </label>
                  <select
                    id="prof-occ"
                    value={occupationInput}
                    onChange={(e) => setOccupationInput(e.target.value as UserOccupation)}
                    className="w-full h-11 px-3 rounded-xl bg-[#090B0E] border border-white/10 focus:border-emerald-500 focus:outline-none text-sm text-white"
                  >
                    {OCCUPATIONS.map((occ) => (
                      <option key={occ} value={occ}>
                        {occ}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="prof-goal" className="block text-xs font-medium text-slate-300 mb-1.5">
                    Financial Focus
                  </label>
                  <select
                    id="prof-goal"
                    value={goalInput}
                    onChange={(e) => setGoalInput(e.target.value as FinancialGoal)}
                    className="w-full h-11 px-3 rounded-xl bg-[#090B0E] border border-white/10 focus:border-emerald-500 focus:outline-none text-sm text-white"
                  >
                    {FINANCIAL_GOALS.map((g) => (
                      <option key={g} value={g}>
                        {g}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-end gap-3">
                <div className="flex-1">
                  <label htmlFor="prof-income" className="block text-xs font-medium text-slate-300 mb-1.5">
                    Monthly Income ({currencyMeta.symbol} {currencyMeta.code})
                  </label>
                  <input
                    id="prof-income"
                    type="number"
                    min={0}
                    value={incomeInput}
                    onChange={(e) => setIncomeInput(e.target.value)}
                    className="w-full h-11 px-3.5 rounded-xl bg-[#090B0E] border border-white/10 focus:border-emerald-500 focus:outline-none font-mono text-sm text-white tabular-nums"
                  />
                </div>
                <button
                  type="submit"
                  className="h-11 px-5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-semibold whitespace-nowrap cursor-pointer"
                >
                  Save Profile
                </button>
              </div>
            </form>
          </section>

          {/* Region & Daily Limit */}
          <section className="bg-[#11151B] rounded-2xl border border-white/[0.08] p-5 sm:p-6 space-y-5">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-amber-500/12 text-[#E5B869] flex items-center justify-center">
                <Globe2 className="w-4 h-4" />
              </div>
              <div>
                <h2 className="font-display text-base font-semibold text-white">
                  Region Version &amp; Daily Limit
                </h2>
                <p className="text-xs text-slate-400">
                  Active: {regionCfg.name} ({currencyMeta.symbol} {currencyMeta.code} · {regionCfg.taxLabel})
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {REGION_LIST.map((r) => {
                const active = settings.region === r.code;
                const sym = CURRENCIES[r.currency].symbol;
                return (
                  <button
                    key={r.code}
                    type="button"
                    onClick={() => handleRegionSwitch(r.code)}
                    className={`min-h-[48px] px-3 py-2 rounded-xl text-left transition-colors border cursor-pointer ${
                      active
                        ? 'bg-emerald-500/15 border-emerald-500/60 text-white'
                        : 'bg-[#090B0E] border-white/[0.08] text-slate-300 hover:border-white/20'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-xs font-semibold truncate">{r.name}</span>
                      <span className="font-mono text-xs text-[#E5B869]">{sym}</span>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-0.5 truncate">
                      {r.currency} · {r.taxLabel}
                    </p>
                  </button>
                );
              })}
            </div>

            <form onSubmit={handleBudgetSubmit} className="pt-2 border-t border-white/[0.07] flex flex-col sm:flex-row sm:items-end gap-3">
              <div className="flex-1">
                <label htmlFor="pref-budget" className="block text-xs font-medium text-slate-300 mb-1.5">
                  Daily Spending Limit ({currencyMeta.symbol} {currencyMeta.code})
                </label>
                <input
                  id="pref-budget"
                  type="number"
                  inputMode="decimal"
                  min={1}
                  value={budgetInput}
                  onChange={(e) => setBudgetInput(e.target.value)}
                  className="w-full h-11 px-3.5 rounded-xl bg-[#090B0E] border border-white/10 focus:border-emerald-500 focus:outline-none font-mono text-sm text-white tabular-nums"
                />
              </div>
              <button
                type="submit"
                className="h-11 px-5 rounded-xl bg-white hover:bg-slate-200 text-slate-950 text-xs font-semibold whitespace-nowrap cursor-pointer"
              >
                Update Limit
              </button>
            </form>
          </section>

          {/* Local Cache Memory Inspector */}
          <section className="bg-[#11151B] rounded-2xl border border-white/[0.08] p-5 sm:p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="font-display text-base font-semibold text-white">Device Cache Memory</h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Mirrored in browser localStorage and Cache Storage API for offline durability
                </p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-white/[0.05] text-slate-300 flex items-center justify-center shrink-0">
                <HardDrive className="w-5 h-5" />
              </div>
            </div>

            <dl className="mt-5 grid grid-cols-2 sm:grid-cols-3 gap-4 border-t border-white/[0.07] pt-5">
              <div>
                <dt className="text-xs text-slate-400">Saved Entries</dt>
                <dd className="mt-1 text-lg font-semibold font-mono text-white tabular-nums">
                  {expenses.length}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-slate-400">Cache Footprint</dt>
                <dd className="mt-1 text-lg font-semibold font-mono text-[#E5B869] tabular-nums">
                  {formatBytes(cacheStats.bytesUsed)}
                </dd>
              </div>
              <div className="col-span-2 sm:col-span-1">
                <dt className="text-xs text-slate-400">Storage Engine</dt>
                <dd className="mt-1 text-sm font-semibold text-emerald-400">
                  {cacheStats.cacheApiSupported ? 'Local + Cache API' : 'Local Storage'}
                </dd>
              </div>
            </dl>

            <div className="mt-6 pt-5 border-t border-white/[0.07] space-y-3">
              <div className="flex flex-wrap gap-2.5">
                <button
                  type="button"
                  onClick={() => exportExpensesToCSV(expenses, settings)}
                  disabled={expenses.length === 0}
                  className="h-11 px-4 rounded-xl border border-white/10 bg-[#090B0E] hover:border-white/25 disabled:opacity-40 text-xs font-semibold text-white inline-flex items-center gap-2 transition-colors cursor-pointer"
                >
                  <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                  Export CSV
                </button>
                <button
                  type="button"
                  onClick={() => exportBackupJSON(expenses, settings, profile)}
                  className="h-11 px-4 rounded-xl border border-white/10 bg-[#090B0E] hover:border-white/25 text-xs font-semibold text-white inline-flex items-center gap-2 transition-colors cursor-pointer"
                >
                  <Download className="w-4 h-4 text-slate-300" />
                  Backup JSON
                </button>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="h-11 px-4 rounded-xl border border-white/10 bg-[#090B0E] hover:border-white/25 text-xs font-semibold text-white inline-flex items-center gap-2 transition-colors cursor-pointer"
                >
                  <Upload className="w-4 h-4 text-slate-300" />
                  Restore JSON
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="application/json,.json"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </div>

              {importMessage && (
                <p
                  className={`text-xs font-medium ${
                    importMessage.type === 'ok' ? 'text-emerald-400' : 'text-rose-400'
                  }`}
                >
                  {importMessage.text}
                </p>
              )}

              <div className="pt-3 border-t border-white/[0.07] flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-medium text-slate-200">Clear Expense Cache</p>
                  <p className="text-xs text-slate-400">
                    Removes all {expenses.length} entries ({formatCurrency(expenses.reduce((s, e) => s + e.amount, 0), settings.currency, 0)}) from this device.
                  </p>
                </div>

                {confirmClear ? (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        onClearAll();
                        setConfirmClear(false);
                      }}
                      className="h-10 px-4 rounded-xl bg-rose-500 hover:bg-rose-400 text-slate-950 text-xs font-semibold cursor-pointer"
                    >
                      Confirm Clear
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmClear(false)}
                      className="h-10 px-3.5 rounded-xl bg-white/10 hover:bg-white/15 text-slate-200 text-xs font-medium cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setConfirmClear(true)}
                    disabled={expenses.length === 0}
                    className="h-10 px-3.5 rounded-xl border border-rose-500/35 text-rose-400 hover:bg-rose-500/10 disabled:opacity-40 text-xs font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Clear Expenses
                  </button>
                )}
              </div>
            </div>
          </section>
        </div>

        {/* Right Column: Android, Windows & iOS Install */}
        <section className="lg:col-span-5 bg-[#11151B] rounded-2xl border border-white/[0.08] p-5 sm:p-6">
          <h2 className="font-display text-base font-semibold text-white">
            Install on Android, Windows &amp; iOS
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Installable full-screen app with Android long-press shortcuts (Quick Add, Calculators, Currency Converter) and full offline caching.
          </p>

          <div className="mt-4">
            {isInstalled ? (
              <div className="rounded-xl bg-emerald-500/12 border border-emerald-500/30 p-3.5 flex items-center gap-2.5 text-sm font-medium text-emerald-300">
                <Check className="w-4 h-4 shrink-0" />
                <span>Installed as a standalone app on this device</span>
              </div>
            ) : isInstallable ? (
              <button
                type="button"
                onClick={() => void onTriggerInstall()}
                className="w-full h-12 px-5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-sm font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                <Download className="w-4 h-4" />
                Install PocketLedger on This Device
              </button>
            ) : (
              <button
                type="button"
                onClick={onOpenInstallGuide}
                className="w-full h-11 px-4 rounded-xl bg-white hover:bg-slate-200 text-slate-950 text-sm font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                <Download className="w-4 h-4" />
                Open Android / Windows / iOS Guide
              </button>
            )}
          </div>

          <div className="mt-5 divide-y divide-white/[0.07] border-t border-white/[0.07]">
            <div className="py-3.5 flex items-start gap-3">
              <Smartphone className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-semibold text-white">
                  Android {platform === 'android' ? '· Current device' : ''}
                </p>
                <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">
                  In Chrome, tap Menu (⋮) → Install app. Runs edge-to-edge full-screen with home screen shortcuts and offline local storage.
                </p>
              </div>
            </div>

            <div className="py-3.5 flex items-start gap-3">
              <Monitor className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-semibold text-white">
                  Windows {platform === 'windows' ? '· Current device' : ''}
                </p>
                <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">
                  In Edge or Chrome, click the Install icon in the address bar to pin PocketLedger to your taskbar.
                </p>
              </div>
            </div>

            <div className="py-3.5 pb-0 flex items-start gap-3">
              <Share className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-semibold text-white">
                  iOS {platform === 'ios' ? '· Current device' : ''}
                </p>
                <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">
                  In Safari, tap Share → Add to Home Screen for standalone full-screen launch.
                </p>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};
