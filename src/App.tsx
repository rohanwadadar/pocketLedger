import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  BarChart3,
  Calculator,
  CalendarDays,
  Download,
  Plus,
  User,
  WifiOff,
} from 'lucide-react';
import { AppSettings, Expense, UserProfile } from './types';
import { toLocalDateKey } from './utils/format';
import {
  buildSampleExpensesForRegion,
  clearAllExpensesFromCache,
  loadExpenses,
  loadProfile,
  loadSettings,
  persistAllState,
  recoverFromCacheIfEmpty,
} from './utils/storage';
import { usePWAInstall } from './hooks/usePWAInstall';
import { useOnlineStatus } from './hooks/useOnlineStatus';
import { OpeningLoader } from './components/OpeningLoader';
import { OnboardingFlow } from './components/OnboardingFlow';
import { DailyView } from './components/DailyView';
import { FinancialToolId, FinancialToolsView } from './components/FinancialToolsView';
import { InsightsView } from './components/InsightsView';
import { DeviceView } from './components/DeviceView';
import { ExpenseForm, ExpenseFormValues } from './components/ExpenseForm';
import { InstallGuideModal } from './components/InstallGuideModal';

type ActiveTab = 'daily' | 'tools' | 'insights' | 'device';

export default function App() {
  const [profile, setProfile] = useState<UserProfile>(() => loadProfile());
  const [settings, setSettings] = useState<AppSettings>(() => loadSettings());
  const [expenses, setExpenses] = useState<Expense[]>(() => loadExpenses());

  // First-open precision loader
  const [showLoader, setShowLoader] = useState(true);

  const [activeTab, setActiveTab] = useState<ActiveTab>('daily');
  const [activeTool, setActiveTool] = useState<FinancialToolId>('calculator');
  const [selectedDate, setSelectedDate] = useState<string>(() => toLocalDateKey());

  // Add / Edit modal or Android bottom sheet
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [prefillAmount, setPrefillAmount] = useState<number | null>(null);
  const [prefillTitle, setPrefillTitle] = useState<string>('');
  const [installGuideOpen, setInstallGuideOpen] = useState(false);

  const { isInstallable, isInstalled, isIOS, platform, install } = usePWAInstall();
  const isOnline = useOnlineStatus();

  // Read Android PWA manifest shortcut params (?action=add, ?tab=tools&tool=currency)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tabParam = params.get('tab');
    const toolParam = params.get('tool');
    const actionParam = params.get('action');

    if (tabParam === 'tools' || tabParam === 'insights' || tabParam === 'device' || tabParam === 'daily') {
      setActiveTab(tabParam);
    }
    if (
      toolParam === 'calculator' ||
      toolParam === 'currency' ||
      toolParam === 'percentage' ||
      toolParam === 'interest' ||
      toolParam === 'emi' ||
      toolParam === 'sip'
    ) {
      setActiveTool(toolParam);
    }
    if (actionParam === 'add' && profile.onboardingCompleted) {
      setSheetOpen(true);
    }
  }, [profile.onboardingCompleted]);

  // Attempt recovery from Cache Storage API if localStorage was wiped
  useEffect(() => {
    void recoverFromCacheIfEmpty().then((recovered) => {
      if (recovered) {
        setExpenses(recovered.expenses);
        setSettings(recovered.settings);
        setProfile(recovered.profile);
      }
    });
  }, []);

  // Lock body scroll while sheet/modal is open
  useEffect(() => {
    if (sheetOpen || installGuideOpen || showLoader) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = prev;
      };
    }
  }, [sheetOpen, installGuideOpen, showLoader]);

  const handleCompleteOnboarding = (nextProfile: UserProfile, nextSettings: AppSettings) => {
    const regionChanged = nextSettings.region !== settings.region;
    const onlySamples =
      expenses.length > 0 &&
      expenses.every((e) => e.id.startsWith('exp-in-') || e.id.startsWith('exp-gl-'));
    const nextExpenses =
      regionChanged && onlySamples
        ? buildSampleExpensesForRegion(nextSettings.region)
        : expenses;

    setProfile(nextProfile);
    setSettings(nextSettings);
    setExpenses(nextExpenses);
    persistAllState(nextExpenses, nextSettings, nextProfile);
  };

  const handleSaveExpense = (values: ExpenseFormValues, editingId?: string) => {
    setExpenses((prev) => {
      let next: Expense[];
      if (editingId) {
        next = prev.map((item) =>
          item.id === editingId
            ? {
                ...item,
                ...values,
              }
            : item
        );
      } else {
        const created: Expense = {
          id: `exp-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          ...values,
          createdAt: Date.now(),
        };
        next = [created, ...prev];
      }
      persistAllState(next, settings, profile);
      return next;
    });

    setSelectedDate(values.date);
    setSheetOpen(false);
    setEditingExpense(null);
    setPrefillAmount(null);
    setPrefillTitle('');
  };

  const handleDeleteExpense = (id: string) => {
    setExpenses((prev) => {
      const next = prev.filter((item) => item.id !== id);
      persistAllState(next, settings, profile);
      return next;
    });
  };

  const handleUpdateSettings = (nextSettings: AppSettings) => {
    setSettings(nextSettings);
    persistAllState(expenses, nextSettings, profile);
  };

  const handleUpdateProfile = (nextProfile: UserProfile) => {
    setProfile(nextProfile);
    persistAllState(expenses, settings, nextProfile);
  };

  const handleImportData = (
    importedExpenses: Expense[],
    importedSettings?: AppSettings,
    importedProfile?: UserProfile
  ) => {
    const nextSettings = importedSettings || settings;
    const nextProfile = importedProfile || profile;
    setExpenses(importedExpenses);
    setSettings(nextSettings);
    setProfile(nextProfile);
    persistAllState(importedExpenses, nextSettings, nextProfile);
  };

  const handleClearAll = () => {
    setExpenses([]);
    void clearAllExpensesFromCache(settings, profile);
  };

  const handleJumpToDate = (dateKey: string) => {
    setSelectedDate(dateKey);
    setActiveTab('daily');
  };

  const openNewExpenseSheet = (amount?: number, title?: string) => {
    setEditingExpense(null);
    setPrefillAmount(typeof amount === 'number' && amount > 0 ? amount : null);
    setPrefillTitle(title || '');
    setSheetOpen(true);
  };

  const openEditExpenseSheet = (expense: Expense) => {
    setEditingExpense(expense);
    setPrefillAmount(null);
    setPrefillTitle('');
    setSheetOpen(true);
  };

  const handleHeaderInstallClick = async () => {
    if (isInstallable) {
      await install();
    } else {
      setInstallGuideOpen(true);
    }
  };

  // Show Onboarding right after opening loader if user hasn't set up their profile yet
  if (!showLoader && !profile.onboardingCompleted) {
    return (
      <OnboardingFlow
        initialProfile={profile}
        initialSettings={settings}
        onComplete={handleCompleteOnboarding}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#090B0E] text-[#F4F6F8] flex flex-col">
      {/* Cinematic Opening Loader */}
      <AnimatePresence>
        {showLoader && (
          <OpeningLoader
            isReturningUser={profile.onboardingCompleted}
            userName={profile.name}
            onComplete={() => setShowLoader(false)}
          />
        )}
      </AnimatePresence>

      {/* Top Bar: Clean 3-zone contract on desktop, compact non-sticky header on mobile */}
      <header className="bg-[#090B0E]/90 backdrop-blur-md border-b border-white/[0.08] md:sticky md:top-0 md:z-30">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 md:h-16 flex items-center justify-between gap-8">
          {/* Zone 1: Single-line wordmark */}
          <button
            type="button"
            onClick={() => setActiveTab('daily')}
            className="font-display text-lg font-semibold tracking-tight text-white whitespace-nowrap shrink-0 cursor-pointer"
          >
            PocketLedger
          </button>

          {/* Zone 2: 4 clean single-line text nav links (Desktop) */}
          <nav
            aria-label="Primary navigation"
            className="hidden md:flex items-center gap-7 text-sm font-medium"
          >
            <button
              type="button"
              onClick={() => setActiveTab('daily')}
              className={`py-1 transition-colors whitespace-nowrap shrink-0 cursor-pointer border-b-2 ${
                activeTab === 'daily'
                  ? 'text-white border-emerald-500'
                  : 'text-slate-400 border-transparent hover:text-white'
              }`}
            >
              Daily Log
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('tools')}
              className={`py-1 transition-colors whitespace-nowrap shrink-0 cursor-pointer border-b-2 ${
                activeTab === 'tools'
                  ? 'text-white border-emerald-500'
                  : 'text-slate-400 border-transparent hover:text-white'
              }`}
            >
              Calculators
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('insights')}
              className={`py-1 transition-colors whitespace-nowrap shrink-0 cursor-pointer border-b-2 ${
                activeTab === 'insights'
                  ? 'text-white border-emerald-500'
                  : 'text-slate-400 border-transparent hover:text-white'
              }`}
            >
              Insights
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('device')}
              className={`py-1 transition-colors whitespace-nowrap shrink-0 cursor-pointer border-b-2 ${
                activeTab === 'device'
                  ? 'text-white border-emerald-500'
                  : 'text-slate-400 border-transparent hover:text-white'
              }`}
            >
              Profile &amp; Device
            </button>
          </nav>

          {/* Zone 3: Single primary action */}
          <div className="flex items-center shrink-0">
            <button
              type="button"
              onClick={() => openNewExpenseSheet()}
              className="hidden md:inline-flex items-center gap-1.5 h-10 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-sm font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Add Expense
            </button>

            {!isInstalled && (
              <button
                type="button"
                onClick={handleHeaderInstallClick}
                className="md:hidden inline-flex items-center gap-1.5 h-9 px-3 rounded-lg border border-white/12 bg-[#11151B] hover:bg-white/[0.08] text-xs font-semibold text-white whitespace-nowrap shrink-0 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5 text-emerald-400" />
                {isIOS ? 'Install iOS' : 'Install App'}
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 w-full max-w-6xl mx-auto px-4 sm:px-6 pt-5 pb-24 md:py-8">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
        >
          {activeTab === 'daily' && (
            <DailyView
              expenses={expenses}
              settings={settings}
              profile={profile}
              selectedDate={selectedDate}
              onSelectDate={setSelectedDate}
              onSaveExpense={handleSaveExpense}
              onDeleteExpense={handleDeleteExpense}
              onEditExpenseMobile={openEditExpenseSheet}
              onOpenAddMobile={() => openNewExpenseSheet()}
              onOpenTools={() => setActiveTab('tools')}
            />
          )}

          {activeTab === 'tools' && (
            <FinancialToolsView
              settings={settings}
              initialTool={activeTool}
              onLogAmountAsExpense={(amt, suggestedTitle) =>
                openNewExpenseSheet(amt, suggestedTitle)
              }
            />
          )}

          {activeTab === 'insights' && (
            <InsightsView
              expenses={expenses}
              settings={settings}
              profile={profile}
              onJumpToDate={handleJumpToDate}
            />
          )}

          {activeTab === 'device' && (
            <DeviceView
              expenses={expenses}
              settings={settings}
              profile={profile}
              onUpdateSettings={handleUpdateSettings}
              onUpdateProfile={handleUpdateProfile}
              onImportData={handleImportData}
              onClearAll={handleClearAll}
              onReplayLoader={() => setShowLoader(true)}
              platform={platform}
              isInstallable={isInstallable}
              isInstalled={isInstalled}
              onTriggerInstall={install}
              onOpenInstallGuide={() => setInstallGuideOpen(true)}
            />
          )}
        </motion.div>
      </main>

      {/* Subtle Desktop Footer */}
      <footer className="hidden md:block border-t border-white/[0.06] bg-[#090B0E]">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between text-xs text-slate-500">
          <span>
            PocketLedger · Private device-local cache · India (₹) &amp; Global Regions
          </span>
          {!isInstalled && (
            <button
              type="button"
              onClick={handleHeaderInstallClick}
              className="font-medium text-emerald-400 hover:text-emerald-300 inline-flex items-center gap-1.5 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              Install on Android, Windows &amp; iOS
            </button>
          )}
        </div>
      </footer>

      {/* Android-Optimized Fixed Bottom Navigation Dock (only fixed bar on mobile, ~8% viewport height) */}
      <nav
        aria-label="Mobile navigation"
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#0D1015]/95 backdrop-blur-md border-t border-white/[0.08] pb-safe"
      >
        <div className="grid grid-cols-5 items-center h-16 px-1.5">
          <button
            type="button"
            onClick={() => setActiveTab('daily')}
            className={`min-h-[48px] flex flex-col items-center justify-center gap-0.5 rounded-xl transition-colors ${
              activeTab === 'daily' ? 'text-emerald-400' : 'text-slate-400'
            }`}
          >
            <CalendarDays className="w-5 h-5" />
            <span className="text-[10px] font-medium">Daily</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('tools')}
            className={`min-h-[48px] flex flex-col items-center justify-center gap-0.5 rounded-xl transition-colors ${
              activeTab === 'tools' ? 'text-emerald-400' : 'text-slate-400'
            }`}
          >
            <Calculator className="w-5 h-5" />
            <span className="text-[10px] font-medium">Tools</span>
          </button>

          <button
            type="button"
            onClick={() => openNewExpenseSheet()}
            aria-label="Add daily expense"
            className="min-h-[46px] mx-1 rounded-2xl bg-emerald-500 active:scale-[0.95] text-slate-950 flex flex-col items-center justify-center transition-transform"
          >
            <Plus className="w-5 h-5 stroke-[2.5]" />
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('insights')}
            className={`min-h-[48px] flex flex-col items-center justify-center gap-0.5 rounded-xl transition-colors ${
              activeTab === 'insights' ? 'text-emerald-400' : 'text-slate-400'
            }`}
          >
            <BarChart3 className="w-5 h-5" />
            <span className="text-[10px] font-medium">Insights</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('device')}
            className={`min-h-[48px] flex flex-col items-center justify-center gap-0.5 rounded-xl transition-colors ${
              activeTab === 'device' ? 'text-emerald-400' : 'text-slate-400'
            }`}
          >
            <User className="w-5 h-5" />
            <span className="text-[10px] font-medium">Profile</span>
          </button>
        </div>
      </nav>

      {/* Add / Edit Expense Modal (Desktop) & Bottom Sheet (Android/Mobile) */}
      {sheetOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm p-0 sm:p-4"
          role="dialog"
          aria-modal="true"
          aria-label={editingExpense ? 'Edit expense' : 'Add expense'}
          onClick={() => {
            setSheetOpen(false);
            setEditingExpense(null);
            setPrefillAmount(null);
            setPrefillTitle('');
          }}
        >
          <div
            className="w-full sm:max-w-md max-h-[90vh] overflow-y-auto rounded-t-3xl sm:rounded-2xl bg-[#11151B] border border-white/10 p-5 sm:p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-10 h-1.5 rounded-full bg-white/15 mx-auto mb-4 sm:hidden" />
            <ExpenseForm
              settings={settings}
              defaultDate={selectedDate}
              editingExpense={editingExpense}
              prefillAmount={prefillAmount}
              prefillTitle={prefillTitle}
              onSubmit={handleSaveExpense}
              onCancel={() => {
                setSheetOpen(false);
                setEditingExpense(null);
                setPrefillAmount(null);
                setPrefillTitle('');
              }}
            />
          </div>
        </div>
      )}

      {/* Install Guide Modal */}
      <InstallGuideModal
        isOpen={installGuideOpen}
        onClose={() => setInstallGuideOpen(false)}
        platform={platform}
        isInstallable={isInstallable}
        onTriggerInstall={install}
      />

      {/* Offline Notification (only appears when actually offline) */}
      {!isOnline && (
        <div
          role="status"
          className="fixed bottom-20 md:bottom-5 left-4 z-50 flex items-center gap-2 rounded-xl bg-[#161B23] border border-white/12 px-3.5 py-2 text-xs font-medium text-white shadow-xl"
        >
          <WifiOff className="w-3.5 h-3.5 text-[#E5B869] shrink-0" />
          <span>Offline — changes saved in device cache</span>
        </div>
      )}
    </div>
  );
}
