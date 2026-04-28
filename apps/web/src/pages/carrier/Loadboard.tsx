import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import type { Carrier, Load, PaginatedResult } from "@zulla/shared";
import { api } from "../../lib/api";
import { useLoadStore } from "../../stores/load.store";
import { FiltersSidebar } from "../../components/loadboard/FiltersSidebar";
import { LoadDetail } from "../../components/loadboard/LoadDetail";
import { BookingFlow } from "../../components/loadboard/BookingFlow";
import { MobileLoadCard } from "../../components/loadboard/MobileLoadCard";
import { formatDate, formatMoneyDecimal } from "../../lib/utils";

export function CarrierLoadboard() {
  const navigate = useNavigate();
  const { filters, resetFilters } = useLoadStore();
  const [pickupAfter, setPickupAfter] = useState("");
  const [pickupBefore, setPickupBefore] = useState("");
  const [minPerMile, setMinPerMile] = useState(0);
  const [tab, setTab] = useState<"available" | "mine">("available");
  const [search, setSearch] = useState("");
  const [detail, setDetail] = useState<Load | null>(null);
  const [booking, setBooking] = useState<Load | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  const carrier = useQuery({
    queryKey: ["carrier", "me"],
    queryFn: () => api.get<Carrier | null>("/carriers/me"),
  });

  useEffect(() => {
    if (carrier.data && !carrier.data.onboardingComplete) {
      navigate("/carrier/join", { replace: true });
    }
  }, [carrier.data, navigate]);

  const loadsQuery = useQuery({
    queryKey: ["loads", "board", { ...filters, pickupAfter, pickupBefore, search, tab, carrierId: carrier.data?.id }],
    queryFn: () =>
      api.get<PaginatedResult<Load>>("/loads", {
        query: {
          status: tab === "available" ? "posted" : undefined,
          equipmentType: filters.equipmentType,
          originState: filters.originState,
          destinationState: filters.destinationState,
          pickupAfter: pickupAfter ? new Date(pickupAfter).toISOString() : undefined,
          pickupBefore: pickupBefore ? new Date(pickupBefore).toISOString() : undefined,
          carrierId: tab === "mine" ? carrier.data?.id : undefined,
          search: search || filters.search,
        },
      }),
    enabled: tab === "available" || Boolean(carrier.data?.id),
  });

  const items = loadsQuery.data?.items ?? [];

  const sorted = useMemo(() => {
    const filtered = items.filter((l) => {
      if (dismissed.has(l.id)) return false;
      if (minPerMile > 0 && l.shipperRate && l.distanceMiles) {
        const ppm = Number(l.shipperRate) / l.distanceMiles;
        if (!Number.isFinite(ppm) || ppm < minPerMile) return false;
      }
      return true;
    });
    return [...filtered].sort((a, b) => {
      const aHot = isHot(a) ? 0 : 1;
      const bHot = isHot(b) ? 0 : 1;
      return aHot - bHot;
    });
  }, [items, dismissed, minPerMile]);

  function resetAll() {
    resetFilters();
    setPickupAfter("");
    setPickupBefore("");
    setMinPerMile(0);
  }

  return (
    <div className="flex min-h-[calc(100vh-3.5rem)] flex-col md:flex-row">
      <div className="hidden md:block">
        <FiltersSidebar
          pickupAfter={pickupAfter}
          pickupBefore={pickupBefore}
          minPerMile={minPerMile}
          setPickupAfter={setPickupAfter}
          setPickupBefore={setPickupBefore}
          setMinPerMile={setMinPerMile}
          resetAll={resetAll}
        />
      </div>

      <AnimatePresence>
        {filtersOpen && (
          <motion.div
            className="fixed inset-0 z-50 flex items-end bg-black/70 md:hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setFiltersOpen(false)}
          >
            <motion.div
              className="w-full rounded-t-modal bg-surface"
              initial={{ y: 200 }}
              animate={{ y: 0 }}
              exit={{ y: 200 }}
              onClick={(e) => e.stopPropagation()}
            >
              <FiltersSidebar
                pickupAfter={pickupAfter}
                pickupBefore={pickupBefore}
                minPerMile={minPerMile}
                setPickupAfter={setPickupAfter}
                setPickupBefore={setPickupBefore}
                setMinPerMile={setMinPerMile}
                resetAll={() => {
                  resetAll();
                  setFiltersOpen(false);
                }}
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex-1 px-4 py-5 md:px-6">
        <div className="flex flex-wrap items-center gap-3 border-b border-white/[0.07] pb-4">
          <div className="flex gap-1">
            <TabButton active={tab === "available"} onClick={() => setTab("available")}>Available Loads</TabButton>
            <TabButton active={tab === "mine"} onClick={() => setTab("mine")}>My Loads</TabButton>
          </div>
          <input
            className="input ml-auto max-w-xs"
            placeholder="Search ref / commodity"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <button
            onClick={() => setFiltersOpen(true)}
            className="btn-ghost md:hidden"
            aria-label="Open filters"
          >
            ⚙ Filters
          </button>
        </div>

        <div className="mt-4 hidden md:block">
          <DesktopTable
            loads={sorted}
            isLoading={loadsQuery.isLoading}
            onSelect={setDetail}
            onBook={setBooking}
          />
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3 md:hidden">
          {loadsQuery.isLoading && <div className="text-sm text-muted">Loading…</div>}
          <AnimatePresence>
            {sorted.map((l) => (
              <MobileLoadCard
                key={l.id}
                load={l}
                onBook={setBooking}
                onDismiss={(load) => setDismissed((d) => new Set(d).add(load.id))}
                onClick={setDetail}
              />
            ))}
          </AnimatePresence>
          {!loadsQuery.isLoading && sorted.length === 0 && (
            <div className="card p-6 text-center text-sm text-muted">No matching loads right now.</div>
          )}
        </div>
      </div>

      <LoadDetail load={detail} onClose={() => setDetail(null)} onBook={setBooking} />
      <BookingFlow
        load={booking}
        onClose={() => setBooking(null)}
        onBooked={() => {
          setBooking(null);
          setDetail(null);
          navigate("/carrier/my-loads");
        }}
      />
    </div>
  );
}

function isHot(l: Load): boolean {
  if (!l.pickupDate) return false;
  return new Date(l.pickupDate).getTime() - Date.now() < 24 * 60 * 60 * 1000;
}

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`mono rounded-btn px-3 py-2 text-[11px] uppercase tracking-wider transition ${
        active ? "bg-white/10 text-white" : "text-muted hover:text-white"
      }`}
    >
      {children}
    </button>
  );
}

function DesktopTable({
  loads,
  isLoading,
  onSelect,
  onBook,
}: {
  loads: Load[];
  isLoading: boolean;
  onSelect: (l: Load) => void;
  onBook: (l: Load) => void;
}) {
  if (isLoading) return <div className="text-sm text-muted">Loading…</div>;
  if (!loads.length) return <div className="card p-8 text-center text-sm text-muted">No matching loads right now.</div>;

  return (
    <div className="card overflow-hidden">
      <table className="min-w-full divide-y divide-white/[0.07] text-sm">
        <thead className="bg-white/[0.02] text-left">
          <tr>
            {["Route", "Equipment", "Weight", "Pickup", "Miles", "Rate", "$/Mi", "Status", ""].map((h) => (
              <th key={h} className="px-4 py-3 mono text-[10px] uppercase tracking-wider text-muted">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-white/[0.04]">
          {loads.map((l) => {
            const hot = isHot(l);
            const ppm =
              l.shipperRate && l.distanceMiles
                ? `$${(Number(l.shipperRate) / l.distanceMiles).toFixed(2)}`
                : "—";
            return (
              <tr
                key={l.id}
                onClick={() => onSelect(l)}
                className={`cursor-pointer transition hover:bg-white/[0.02] ${hot ? "border-l-4 border-l-orange" : ""}`}
              >
                <td className="px-4 py-3 font-body font-medium">
                  {l.originCity}, {l.originState} → {l.destinationCity}, {l.destinationState}
                </td>
                <td className="px-4 py-3 mono text-xs">{l.equipmentType}</td>
                <td className="px-4 py-3 mono text-xs">{l.weightLbs ? `${l.weightLbs.toLocaleString()} lb` : "—"}</td>
                <td className="px-4 py-3 mono text-xs">{formatDate(l.pickupDate)}</td>
                <td className="px-4 py-3 mono text-xs">{l.distanceMiles ?? "—"}</td>
                <td className="px-4 py-3"><span className="font-display text-base font-bold text-green">{formatMoneyDecimal(l.shipperRate)}</span></td>
                <td className="px-4 py-3 mono text-green">{ppm}</td>
                <td className="px-4 py-3"><span className={hot ? "chip-orange" : "chip-green"}>{hot ? "HOT" : l.status.toUpperCase()}</span></td>
                <td className="px-4 py-3 text-right">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onBook(l);
                    }}
                    className="btn-accent btn-sm"
                  >
                    Book Now
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
