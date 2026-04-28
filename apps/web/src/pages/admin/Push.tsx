import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { api } from "../../lib/api";
import { Card, CardBody, CardHeader } from "../../components/ui/Card";

type Audience = "all_carriers" | "all_shippers" | "user_email";

interface BroadcastResult {
  audience: Audience;
  recipients: number;
  sent: number;
}

export function AdminPush() {
  const [audience, setAudience] = useState<Audience>("all_carriers");
  const [email, setEmail] = useState("");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [url, setUrl] = useState("");

  const broadcast = useMutation({
    mutationFn: () =>
      api.post<BroadcastResult>("/push/broadcast", {
        audience,
        email: audience === "user_email" ? email : undefined,
        title,
        body,
        url: url || undefined,
      }),
  });

  const valid =
    title.trim().length > 0 &&
    body.trim().length > 0 &&
    (audience !== "user_email" || /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email));

  return (
    <div className="space-y-5 px-4 py-5 md:px-6">
      <h1 className="font-display text-3xl font-extrabold tracking-tight">Push notifications</h1>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader className="border-white/[0.07]">
            <span className="font-display text-base font-bold">Compose broadcast</span>
          </CardHeader>
          <CardBody className="space-y-4">
            <Field label="Audience">
              <select className="input" value={audience} onChange={(e) => setAudience(e.target.value as Audience)}>
                <option value="all_carriers">All carriers</option>
                <option value="all_shippers">All shippers</option>
                <option value="user_email">Specific user (email)</option>
              </select>
            </Field>

            {audience === "user_email" && (
              <Field label="User email">
                <input
                  type="email"
                  className="input"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="user@example.com"
                />
              </Field>
            )}

            <Field label="Title">
              <input
                className="input"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={100}
                placeholder="New HOT load on your lane"
              />
            </Field>

            <Field label="Body">
              <textarea
                className="input"
                rows={3}
                value={body}
                onChange={(e) => setBody(e.target.value)}
                maxLength={500}
                placeholder="Houston → Dallas · $1,150 · Pickup tomorrow"
              />
            </Field>

            <Field label="URL (optional)">
              <input
                className="input"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://app.zullalogistics.com/loadboard"
              />
            </Field>

            <button
              onClick={() => broadcast.mutate()}
              disabled={!valid || broadcast.isPending}
              className="btn-accent btn-lg w-full"
            >
              {broadcast.isPending ? "Sending…" : "Send broadcast"}
            </button>

            {broadcast.data && (
              <div className="rounded-btn border border-green/40 bg-green/[0.06] p-3 mono text-xs text-green">
                Sent to {broadcast.data.sent} of {broadcast.data.recipients} recipients.
              </div>
            )}
            {broadcast.error && (
              <div className="text-xs text-red-400">{(broadcast.error as Error).message}</div>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader className="border-white/[0.07]">
            <span className="font-display text-base font-bold">Preview</span>
          </CardHeader>
          <CardBody>
            <div className="rounded-card border border-white/[0.07] bg-deep p-4">
              <div className="flex items-start gap-3">
                <div className="grid h-10 w-10 shrink-0 place-items-center rounded-btn bg-accent text-black font-display font-bold">Z</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="font-display text-sm font-bold">Zulla Logistics</span>
                    <span className="mono text-[10px] uppercase tracking-wider text-muted">just now</span>
                  </div>
                  <div className="mt-0.5 font-body text-sm font-semibold">{title || "Title"}</div>
                  <div className="mt-1 font-body text-xs text-white/80">{body || "Body text…"}</div>
                  {url && <div className="mt-1 mono text-[10px] text-accent">{url}</div>}
                </div>
              </div>
            </div>
            <div className="mt-3 mono text-[11px] uppercase tracking-wider text-muted">
              Audience: {audience.replace("_", " ")}{audience === "user_email" && email ? ` · ${email}` : ""}
            </div>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block mono text-[11px] uppercase tracking-wider text-muted">{label}</span>
      {children}
    </label>
  );
}
