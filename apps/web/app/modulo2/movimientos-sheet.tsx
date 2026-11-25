"use client";

import { useEffect, useState } from "react";
import { ArrowDownToLine, ArrowUpFromLine } from "lucide-react";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/shared/empty-state";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import { formatFechaHora, formatSaldo, type Cuenta, type Movimiento } from "./types";

/** Historial de movimientos (GET /cuentas/:id/movimientos), del más reciente al más antiguo. */
export function MovimientosSheet({ cuenta, onClose }: { cuenta: Cuenta | null; onClose: () => void }) {
  const [movs, setMovs] = useState<Movimiento[] | null>(null);

  useEffect(() => {
    if (!cuenta) return;
    setMovs(null);
    api
      .get<Movimiento[]>("m2", `/cuentas/${cuenta.id}/movimientos`)
      .then(setMovs)
      .catch(() => setMovs([]));
  }, [cuenta]);

  return (
    <Sheet open={!!cuenta} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>Movimientos · {cuenta?.numero}</SheetTitle>
          <SheetDescription>
            Saldo actual: <span className="font-medium text-foreground">{cuenta ? formatSaldo(cuenta.saldo, cuenta.moneda) : ""}</span>
          </SheetDescription>
        </SheetHeader>
        <div className="space-y-2 px-4 pb-6">
          {movs === null ? (
            Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-14 w-full" />)
          ) : movs.length === 0 ? (
            <EmptyState title="Sin movimientos" description="Esta cuenta aún no tiene depósitos ni retiros." />
          ) : (
            movs.map((m) => {
              const dep = m.tipo === "DEPOSITO";
              return (
                <div key={m.id} className="flex items-center gap-3 rounded-lg border p-3">
                  <div
                    className={cn(
                      "flex size-9 shrink-0 items-center justify-center rounded-full",
                      dep ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700",
                    )}
                  >
                    {dep ? <ArrowDownToLine className="size-4" /> : <ArrowUpFromLine className="size-4" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{m.descripcion || (dep ? "Depósito" : "Retiro")}</p>
                    <p className="text-xs text-muted-foreground">{formatFechaHora(m.fecha)}</p>
                  </div>
                  <div className="text-right">
                    <p className={cn("text-sm font-semibold", dep ? "text-emerald-700" : "text-rose-700")}>
                      {dep ? "+" : "−"} {formatSaldo(m.monto, cuenta!.moneda)}
                    </p>
                    <p className="text-xs text-muted-foreground">Saldo: {formatSaldo(m.saldoResultante, cuenta!.moneda)}</p>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
