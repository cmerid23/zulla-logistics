import { useState } from "react";
import { US_STATES } from "@zulla/shared";

const EQUIPMENT = [
  "53' Dry Van",
  "Flatbed",
  "Refrigerated (Reefer)",
  "Step Deck",
  "Power Only",
  "Tanker",
  "Lowboy",
  "Hotshot",
] as const;

export interface Step2Data {
  equipmentTypes: string[];
  preferOriginStates: string[];
  preferDestStates: string[];
  nationwide: boolean;
}

interface Props {
  onNext: (data: Step2Data) => void;
  onBack: () => void;
  initial?: Step2Data;
}

export function Step2Equipment({ onNext, onBack, initial }: Props) {
  const [equip, setEquip] = useState<string[]>(initial?.equipmentTypes ?? []);
  const [origins, setOrigins] = useState<string[]>(initial?.preferOriginStates ?? []);
  const [dests, setDests] = useState<string[]>(initial?.preferDestStates ?? []);
  const [nationwide, setNationwide] = useState<boolean>(initial?.nationwide ?? false);
  const [error, setError] = useState<string | null>(null);

  function toggle(arr: string[], val: string, set: (next: string[]) => void) {
    set(arr.includes(val) ? arr.filter((v) => v !== val) : [...arr, val]);
  }

  function submit() {
    if (equip.length === 0) {
      setError("Pick at least one equipment type.");
      return;
    }
    onNext({
      equipmentTypes: equip,
      preferOriginStates: nationwide ? [] : origins,
      preferDestStates: nationwide ? [] : dests,
      nationwide,
    });
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-extrabold tracking-tight">What do you haul, and where?</h1>
        <p className="mt-1 font-body text-sm text-muted">
          Multi-select. We&apos;ll surface loads that match.
        </p>
      </div>

      <Section title="Equipment">
        <div className="flex flex-wrap gap-2">
          {EQUIPMENT.map((e) => {
            const active = equip.includes(e);
            return (
              <button
                key={e}
                type="button"
                onClick={() => toggle(equip, e, setEquip)}
                className={`rounded-full border px-4 py-2 mono text-xs uppercase tracking-wider transition ${
                  active
                    ? "border-accent bg-accent text-black"
                    : "border-white/[0.07] bg-white/[0.04] text-white/80 hover:border-white/[0.14]"
                }`}
              >
                {e}
              </button>
            );
          })}
        </div>
        {error && <div className="mt-2 text-xs text-red-400">{error}</div>}
      </Section>

      <Section title="Lane preferences">
        <label className="mb-3 flex items-center gap-2 font-body text-sm">
          <input
            type="checkbox"
            className="h-4 w-4"
            checked={nationwide}
            onChange={(e) => {
              setNationwide(e.target.checked);
              if (e.target.checked) {
                setOrigins([]);
                setDests([]);
              }
            }}
          />
          Prefer nationwide
        </label>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <StatePicker label="Origin states" value={origins} onChange={setOrigins} disabled={nationwide} />
          <StatePicker label="Destination states" value={dests} onChange={setDests} disabled={nationwide} />
        </div>
      </Section>

      <div className="flex justify-between pt-4">
        <button type="button" onClick={onBack} className="btn-ghost btn-lg">← Back</button>
        <button type="button" onClick={submit} className="btn-accent btn-lg">Continue →</button>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="mono mb-3 text-[11px] uppercase tracking-wider text-muted">{title}</div>
      {children}
    </div>
  );
}

function StatePicker({
  label,
  value,
  onChange,
  disabled,
}: {
  label: string;
  value: string[];
  onChange: (next: string[]) => void;
  disabled?: boolean;
}) {
  return (
    <div>
      <div className="mb-2 font-body text-sm">{label}</div>
      <select
        multiple
        disabled={disabled}
        className="input h-44 disabled:opacity-40"
        value={value}
        onChange={(e) => onChange(Array.from(e.target.selectedOptions, (o) => o.value))}
      >
        {US_STATES.map((s) => <option key={s} value={s}>{s}</option>)}
      </select>
      <div className="mt-1 mono text-[10px] uppercase tracking-wider text-muted">
        Cmd / Ctrl-click to select multiple
      </div>
    </div>
  );
}
