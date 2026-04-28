import { US_STATES } from "@zulla/shared";
import { useLoadStore } from "../../stores/load.store";

const EQUIPMENT = [
  { v: "Van", label: "Dry Van" },
  { v: "Reefer", label: "Reefer" },
  { v: "Flatbed", label: "Flatbed" },
  { v: "Step Deck", label: "Step Deck" },
  { v: "Power Only", label: "Power Only" },
];

interface Props {
  pickupAfter: string;
  pickupBefore: string;
  minPerMile: number;
  setPickupAfter: (v: string) => void;
  setPickupBefore: (v: string) => void;
  setMinPerMile: (v: number) => void;
  resetAll: () => void;
}

export function FiltersSidebar(props: Props) {
  const { filters, setFilters } = useLoadStore();

  return (
    <aside className="w-[260px] shrink-0 border-r border-white/[0.07] p-5">
      <div className="mono mb-4 text-[11px] uppercase tracking-wider text-muted">Filters</div>

      <Block title="Equipment">
        <div className="flex flex-col gap-2">
          {EQUIPMENT.map((e) => (
            <label key={e.v} className="flex items-center gap-2 font-body text-sm">
              <input
                type="checkbox"
                className="h-4 w-4"
                checked={filters.equipmentType === e.v}
                onChange={(ev) =>
                  setFilters({ equipmentType: ev.target.checked ? e.v : undefined })
                }
              />
              {e.label}
            </label>
          ))}
        </div>
      </Block>

      <Block title="Origin state">
        <select
          className="input"
          value={filters.originState ?? ""}
          onChange={(e) => setFilters({ originState: e.target.value || undefined })}
        >
          <option value="">Any</option>
          {US_STATES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </Block>

      <Block title="Destination state">
        <select
          className="input"
          value={filters.destinationState ?? ""}
          onChange={(e) => setFilters({ destinationState: e.target.value || undefined })}
        >
          <option value="">Any</option>
          {US_STATES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </Block>

      <Block title="Pickup window">
        <input
          type="date"
          className="input"
          value={props.pickupAfter}
          onChange={(e) => props.setPickupAfter(e.target.value)}
        />
        <input
          type="date"
          className="input mt-2"
          value={props.pickupBefore}
          onChange={(e) => props.setPickupBefore(e.target.value)}
        />
      </Block>

      <Block title={`Min $/mile · $${props.minPerMile.toFixed(2)}`}>
        <input
          type="range"
          min={0}
          max={10}
          step={0.25}
          value={props.minPerMile}
          onChange={(e) => props.setMinPerMile(Number(e.target.value))}
          className="w-full accent-[#E8FF47]"
        />
      </Block>

      <button onClick={props.resetAll} className="mt-2 mono text-[11px] uppercase tracking-wider text-accent">
        Reset filters
      </button>
    </aside>
  );
}

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-6">
      <div className="mb-2 font-body text-xs font-medium text-white/80">{title}</div>
      {children}
    </div>
  );
}
