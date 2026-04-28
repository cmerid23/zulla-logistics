import { EQUIPMENT_TYPES, EQUIPMENT_LABEL, US_STATES } from "@zulla/shared";
import { useLoadStore } from "../../stores/load.store";

export function LoadFilters() {
  const { filters, setFilters, resetFilters } = useLoadStore();

  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
      <select
        className="input"
        value={filters.equipmentType ?? ""}
        onChange={(e) => setFilters({ equipmentType: e.target.value || undefined })}
      >
        <option value="">All equipment</option>
        {EQUIPMENT_TYPES.map((t) => (
          <option key={t} value={t}>{EQUIPMENT_LABEL[t]}</option>
        ))}
      </select>
      <select
        className="input"
        value={filters.originState ?? ""}
        onChange={(e) => setFilters({ originState: e.target.value || undefined })}
      >
        <option value="">Origin state</option>
        {US_STATES.map((s) => <option key={s} value={s}>{s}</option>)}
      </select>
      <select
        className="input"
        value={filters.destinationState ?? ""}
        onChange={(e) => setFilters({ destinationState: e.target.value || undefined })}
      >
        <option value="">Dest state</option>
        {US_STATES.map((s) => <option key={s} value={s}>{s}</option>)}
      </select>
      <input
        className="input"
        placeholder="Search ref / commodity"
        value={filters.search ?? ""}
        onChange={(e) => setFilters({ search: e.target.value || undefined })}
      />
      <button className="btn-ghost" onClick={resetFilters}>Reset</button>
    </div>
  );
}
