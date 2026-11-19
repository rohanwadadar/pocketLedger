import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { ArrowRight } from 'lucide-react';

interface OpeningLoaderProps {
  isReturningUser: boolean;
  userName?: string;
  onComplete: () => void;
}

const HERO_IMAGE_PATH = '/src/assets/images/opening_vault_hero_1795065331915.jpg';

export const OpeningLoader: React.FC<OpeningLoaderProps> = ({
  isReturningUser,
  userName,
  onComplete,
}) => {
  const [progress, setProgress] = useState(0);
  const [imgFailed, setImgFailed] = useState(false);

  useEffect(() => {
    const duration = isReturningUser ? 1200 : 1850;
    const start = performance.now();
    let rafId = 0;

    const tick = (now: number) => {
      const elapsed = now - start;
      const ratio = Math.min(1, elapsed / duration);
      // Smooth ease-out cubic progression
      const eased = 1 - Math.pow(1 - ratio, 3);
      setProgress(Math.round(eased * 100));

      if (ratio < 1) {
        rafId = requestAnimationFrame(tick);
      } else {
        window.setTimeout(onComplete, 240);
      }
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [isReturningUser, onComplete]);

  return (
    <motion.div
      initial={{ opacity: 1 }}
      exit={{ opacity: 0, transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] } }}
      className="fixed inset-0 z-50 bg-[#090B0E] text-[#F4F6F8] flex flex-col justify-between overflow-hidden"
    >
      {/* Full-bleed Studio Backdrop Image with Measured Contrast Scrim */}
      <div className="absolute inset-0">
        {!imgFailed ? (
          <img
            src={HERO_IMAGE_PATH}
            alt="Sculptural matte obsidian and brushed titanium ledger vault"
            referrerPolicy="no-referrer"
            onError={() => setImgFailed(true)}
            className="w-full h-full object-cover object-center opacity-60 scale-[1.03]"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-[#11151B] via-[#090B0E] to-[#0D1A18]" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-[#090B0E] via-[#090B0E]/65 to-[#090B0E]/45" />
      </div>

      {/* Top Row */}
      <div className="relative z-10 max-w-6xl w-full mx-auto px-6 pt-8 sm:pt-10 flex items-center justify-between">
        <span className="font-display text-base font-semibold tracking-tight text-[#F4F6F8]">
          PocketLedger
        </span>
        <button
          type="button"
          onClick={onComplete}
          className="h-9 px-3.5 rounded-lg border border-white/15 bg-black/35 backdrop-blur-md text-xs font-medium text-slate-200 hover:bg-white/10 transition-colors inline-flex items-center gap-1.5 cursor-pointer"
        >
          <span>Skip</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Center Editorial Reveal */}
      <div className="relative z-10 max-w-6xl w-full mx-auto px-6 my-auto">
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.65, ease: [0.16, 1, 0.3, 1] }}
          className="max-w-xl"
        >
          <p className="text-xs font-medium text-emerald-400 tracking-wide">
            {isReturningUser && userName
              ? `Welcome back, ${userName}`
              : 'India (₹) & Global · Private Device Ledger'}
          </p>
          <h1 className="mt-3 font-display text-4xl sm:text-5xl font-semibold tracking-tight text-[#F4F6F8] leading-[1.08] text-balance">
            Every rupee, accounted for on your device.
          </h1>
          <p className="mt-4 text-sm sm:text-base text-slate-300 max-w-md leading-relaxed">
            Daily expense tracking, UPI &amp; cash logs, currency conversion, GST, EMI, and SIP calculators stored offline in local cache memory.
          </p>
        </motion.div>
      </div>

      {/* Bottom Calibrated Progress Bar */}
      <div className="relative z-10 max-w-6xl w-full mx-auto px-6 pb-10 sm:pb-12">
        <div className="flex items-center justify-between text-xs text-slate-400 mb-2.5">
          <span>
            {progress < 45
              ? 'Loading local device vault'
              : progress < 85
                ? 'Preparing Rupee ledger & financial tools'
                : 'Ready'}
          </span>
          <span className="font-mono tabular-nums text-slate-200">{progress}%</span>
        </div>
        <div className="h-[3px] w-full rounded-full bg-white/10 overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-emerald-500 via-emerald-400 to-[#E5B869] transition-all duration-100"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    </motion.div>
  );
};
