import { motion, AnimatePresence } from "framer-motion";
import { usePWA } from "../hooks/usePWA";

export function InstallPrompt() {
  const { canInstall, promptInstall, isInstalled } = usePWA();
  if (isInstalled || !canInstall) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: 80, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 80, opacity: 0 }}
        className="fixed bottom-20 left-1/2 z-40 -translate-x-1/2 card flex items-center gap-3 px-4 py-3"
      >
        <div className="text-sm">
          <div className="font-medium">Install Zulla</div>
          <div className="text-ink-600">Faster access + offline support.</div>
        </div>
        <button className="btn-primary" onClick={() => void promptInstall()}>
          Install
        </button>
      </motion.div>
    </AnimatePresence>
  );
}
