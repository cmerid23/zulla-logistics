import { useQuery } from "@tanstack/react-query";
import type { Invoice } from "@zulla/shared";
import { api } from "../../lib/api";
import { Card, CardBody, CardHeader } from "../../components/ui/Card";
import { Badge } from "../../components/ui/Badge";
import { formatDate, formatMoneyDecimal } from "../../lib/utils";

const statusTone: Record<Invoice["status"], "success" | "info" | "warning" | "neutral"> = {
  paid: "success",
  approved: "info",
  pending: "warning",
  factoring_submitted: "info",
  void: "neutral",
};

export function ShipperInvoices() {
  const { data } = useQuery({
    queryKey: ["invoices", "me"],
    queryFn: () => api.get<Invoice[]>("/invoices/me"),
  });

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Invoices</h1>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
        {(data ?? []).map((inv) => (
          <Card key={inv.id}>
            <CardHeader className="flex items-center justify-between">
              <span className="font-medium">{inv.invoiceNumber}</span>
              <Badge tone={statusTone[inv.status]}>{inv.status}</Badge>
            </CardHeader>
            <CardBody className="text-sm">
              <div className="text-ink-600">Issued {formatDate(inv.issuedAt)}</div>
              <div className="text-ink-600">Due {formatDate(inv.dueAt)}</div>
              <div className="mt-2 text-lg font-semibold">
                {formatMoneyDecimal(inv.amount)}
              </div>
            </CardBody>
          </Card>
        ))}
        {!data?.length && <div className="text-sm text-ink-600">No invoices yet.</div>}
      </div>
    </div>
  );
}
