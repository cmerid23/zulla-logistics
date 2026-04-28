import { useState } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Logo } from "./Logo";

const LINKS = [
  { href: "#platform", label: "Platform" },
  { href: "/lanes", label: "Lanes" },
  { href: "/quote", label: "Get a quote" },
  { href: "#agents", label: "Agents" },
  { href: "#pricing", label: "Pricing" },
];

export function MarketingNav() {
  const [open, setOpen] = useState(false);

  return (
    <header className="glass-nav sticky top-0 z-50 border-b border-white/[0.07]">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 md:px-8">
        <Logo />
        <nav className="hidden items-center gap-7 md:flex">
          {LINKS.map((l) => (
            <a key={l.href} href={l.href} className="font-body text-sm text-white/70 hover:text-white">
              {l.label}
            </a>
          ))}
        </nav>
        <div className="hidden items-center gap-2 md:flex">
          <Link to="/login" className="btn-ghost btn-sm">Sign In</Link>
          <Link to="/register" className="btn-accent btn-sm">Get Started Free</Link>
        </div>
        <button
          aria-label="Toggle menu"
          onClick={() => setOpen((o) => !o)}
          className="grid h-10 w-10 place-items-center rounded-btn border border-white/10 md:hidden"
        >
          <span className="text-lg">{open ? "✕" : "☰"}</span>
        </button>
      </div>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="md:hidden fixed inset-x-0 top-16 bottom-0 z-50 overflow-y-auto bg-black/95 backdrop-blur-xl"
          >
            <nav className="flex flex-col gap-2 px-6 py-8">
              {LINKS.map((l) => (
                <a
                  key={l.href}
                  href={l.href}
                  onClick={() => setOpen(false)}
                  className="rounded-btn px-3 py-3 font-display text-2xl font-semibold hover:bg-white/5"
                >
                  {l.label}
                </a>
              ))}
              <div className="mt-6 flex flex-col gap-2">
                <Link to="/login" onClick={() => setOpen(false)} className="btn-ghost btn-lg">
                  Sign In
                </Link>
                <Link to="/register" onClick={() => setOpen(false)} className="btn-accent btn-lg">
                  Get Started Free
                </Link>
              </div>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
