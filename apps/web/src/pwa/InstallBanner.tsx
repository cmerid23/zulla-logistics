import { motion, AnimatePresence } from "framer-motion";
import { usePWA } from "../hooks/usePWA";

export function InstallBanner() {
  const { isInstallable, promptInstall, dismissBanner } = usePWA();

  return (
    <AnimatePresence>
      {isInstallable && (
        <motion.div
          initial={{ y: -80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -80, opacity: 0 }}
          transition={{ type: "spring", stiffness: 360, damping: 28 }}
          className="fixed inset-x-3 top-3 z-[60] mx-auto max-w-2xl"
        >
          <div className="card flex items-center gap-3 p-3 shadow-lg backdrop-blur">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-btn bg-accent text-black font-display font-bold">
              Z
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-display text-sm font-semibold">Install Zulla</div>
              <div className="font-body text-xs text-muted">
                Faster access on your phone. Works offline.
              </div>
            </div>
            <button
              type="button"
              onClick={() => void promptInstall()}
              className="btn-accent btn-sm"
            >
              Add to Home Screen
            </button>
            <button
              type="button"
              onClick={dismissBanner}
              aria-label="Dismiss install banner"
              className="grid h-8 w-8 place-items-center rounded-btn text-muted hover:bg-white/5"
            >
              ✕
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
