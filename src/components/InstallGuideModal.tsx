import React from 'react';
import { Download, Monitor, Share, Smartphone, X } from 'lucide-react';
import { DevicePlatform } from '../hooks/usePWAInstall';

interface InstallGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  platform: DevicePlatform;
  isInstallable: boolean;
  onTriggerInstall: () => Promise<boolean>;
}

export const InstallGuideModal: React.FC<InstallGuideModalProps> = ({
  isOpen,
  onClose,
  platform,
  isInstallable,
  onTriggerInstall,
}) => {
  if (!isOpen) return null;

  const handleNativeInstall = async () => {
    const accepted = await onTriggerInstall();
    if (accepted) {
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm p-0 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="install-guide-title"
      onClick={onClose}
    >
      <div
        className="w-full sm:max-w-lg rounded-t-3xl sm:rounded-2xl bg-[#11151B] border border-white/10 p-6 shadow-2xl text-[#F4F6F8]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-10 h-1.5 rounded-full bg-white/15 mx-auto mb-4 sm:hidden" />

        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 id="install-guide-title" className="font-display text-lg font-semibold text-white">
              Install PocketLedger App
            </h2>
            <p className="text-sm text-slate-400 mt-1">
              Install on Android, Windows, or iOS to launch full-screen with 100% offline local cache storage.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="min-h-[44px] min-w-[44px] -mt-2 -mr-2 flex items-center justify-center rounded-xl text-slate-400 hover:bg-white/[0.06] hover:text-white transition-colors cursor-pointer"
            aria-label="Close install instructions"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {isInstallable && (
          <div className="mt-5">
            <button
              type="button"
              onClick={handleNativeInstall}
              className="w-full h-12 px-5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-sm font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              <Download className="w-4 h-4" />
              Install Now on This Device
            </button>
          </div>
        )}

        <div className="mt-5 divide-y divide-white/[0.07] border-t border-white/[0.07]">
          {/* Android First */}
          <div className={`py-4 ${platform === 'android' ? 'bg-emerald-500/10 -mx-6 px-6' : ''}`}>
            <div className="flex items-center gap-2 text-sm font-semibold text-white">
              <Smartphone className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Android (Chrome / Edge / Brave)</span>
            </div>
            <ol className="mt-2 space-y-1 text-sm text-slate-300 list-decimal list-inside">
              <li>Tap the browser menu (<strong className="font-semibold text-white">⋮</strong>) in the top right corner.</li>
              <li>Tap <strong className="font-semibold text-white">Install app</strong> to get a full-screen Android app icon with quick shortcuts.</li>
            </ol>
          </div>

          {/* Windows */}
          <div className={`py-4 ${platform === 'windows' ? 'bg-emerald-500/10 -mx-6 px-6' : ''}`}>
            <div className="flex items-center gap-2 text-sm font-semibold text-white">
              <Monitor className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Windows (Edge / Chrome)</span>
            </div>
            <ol className="mt-2 space-y-1 text-sm text-slate-300 list-decimal list-inside">
              <li>Click the <strong className="font-semibold text-white">Install</strong> icon in the address bar.</li>
              <li>Pin PocketLedger to your Windows taskbar or Start menu.</li>
            </ol>
          </div>

          {/* iOS Safari */}
          <div className={`py-4 ${platform === 'ios' ? 'bg-emerald-500/10 -mx-6 px-6' : ''}`}>
            <div className="flex items-center gap-2 text-sm font-semibold text-white">
              <Share className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>iOS (iPhone &amp; iPad — Safari)</span>
            </div>
            <ol className="mt-2 space-y-1 text-sm text-slate-300 list-decimal list-inside">
              <li>Tap the <strong className="font-semibold text-white">Share</strong> button in Safari.</li>
              <li>Choose <strong className="font-semibold text-white">Add to Home Screen</strong>, then tap <strong className="font-semibold text-white">Add</strong>.</li>
            </ol>
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="mt-2 w-full h-11 rounded-xl bg-white/[0.08] hover:bg-white/[0.12] text-sm font-medium text-white transition-colors cursor-pointer"
        >
          Done
        </button>
      </div>
    </div>
  );
};
