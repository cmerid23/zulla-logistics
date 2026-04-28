import { Logo } from "./Logo";

const PLATFORM = [
  { label: "Loadboard", href: "#loadboard" },
  { label: "Carrier Onboarding", href: "/carrier/join" },
  { label: "Shipper Portal", href: "/register" },
  { label: "Agent Program", href: "/agents/apply" },
  { label: "API & EDI", href: "/api-docs" },
];
const COMPANY = [
  { label: "About", href: "/about" },
  { label: "Careers", href: "/careers" },
  { label: "Contact", href: "mailto:hello@zullalogistics.com" },
  { label: "Status", href: "/status" },
];
const LEGAL = [
  { label: "Terms of Service", href: "/legal/terms" },
  { label: "Privacy Policy", href: "/legal/privacy" },
  { label: "Carrier Agreement", href: "/legal/carrier-agreement" },
  { label: "Compliance", href: "/legal/compliance" },
];

export function Footer() {
  return (
    <footer className="border-t border-white/[0.07] bg-black py-16">
      <div className="mx-auto max-w-7xl px-4 md:px-8">
        <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
          <div className="col-span-2">
            <Logo />
            <p className="mt-4 max-w-xs font-body text-sm text-muted">
              Modern freight brokerage built for shippers, carriers, and agents who&apos;d rather
              grow than babysit a spreadsheet.
            </p>
            <p className="mt-4 mono text-[11px] uppercase tracking-wider text-muted">
              MC# 1234567 · DOT# 7654321
            </p>
          </div>
          <FooterColumn title="Platform" items={PLATFORM} />
          <FooterColumn title="Company" items={COMPANY} />
        </div>

        <div className="mt-12 grid grid-cols-1 gap-4 md:grid-cols-4">
          <div className="md:col-start-3 md:col-span-2">
            <FooterColumn title="Legal & Compliance" items={LEGAL} />
          </div>
        </div>

        <div className="mt-14 flex flex-col items-start justify-between gap-4 border-t border-white/[0.07] pt-6 md:flex-row md:items-center">
          <div className="mono text-[11px] uppercase tracking-wider text-muted">
            © {new Date().getFullYear()} Zulla Logistics, Inc.
          </div>
          <div className="flex flex-wrap gap-4 mono text-[11px] uppercase tracking-wider text-muted">
            <a href="/legal/terms" className="hover:text-white">Terms</a>
            <a href="/legal/privacy" className="hover:text-white">Privacy</a>
            <a href="/legal/cookies" className="hover:text-white">Cookies</a>
          </div>
        </div>
      </div>
    </footer>
  );
}

function FooterColumn({ title, items }: { title: string; items: { label: string; href: string }[] }) {
  return (
    <div>
      <div className="mono mb-4 text-[11px] uppercase tracking-wider text-muted">{title}</div>
      <ul className="space-y-2">
        {items.map((it) => (
          <li key={it.label}>
            <a href={it.href} className="font-body text-sm text-white/80 hover:text-white">
              {it.label}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
