"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowDownToLine, ArrowUpFromLine, Ban, CreditCard, History, Landmark, Plus, Search, Wallet } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { EmptyState } from "@/components/shared/empty-state";
import { KpiCard } from "@/components/shared/kpi-card";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { api } from "@/lib/api";
import { m1 } from "@/lib/session";
import { MovimientosSheet } from "./movimientos-sheet";
import { NuevaCuentaDialog } from "./nueva-cuenta-dialog";
import { OperacionDialog, type TipoOperacion } from "./operacion-dialog";
import { formatSaldo, nombreCliente, type ClienteResumen, type Cuenta, type CuentasStats } from "./types";

/** Módulo 2 · Cuentas de ahorro (ms-modulo2 vía gateway /api/m2). Dueña front: Luciana. */
export default function CuentasPage() {
  const [cuentas, setCuentas] = useState<Cuenta[] | null>(null);
  const [stats, setStats] = useState<CuentasStats | null>(null);
  const [clientes, setClientes] = useState<ClienteResumen[]>([]);
  const [q, setQ] = useState("");
  const [filtroCliente, setFiltroCliente] = useState("todos");
  const [nuevaOpen, setNuevaOpen] = useState(false);
  const [operacion, setOperacion] = useState<{ cuenta: Cuenta; tipo: TipoOperacion } | null>(null);
  const [verMovs, setVerMovs] = useState<Cuenta | null>(null);
  const [aCerrar, setACerrar] = useState<Cuenta | null>(null);

  const cargar = useCallback(async () => {
    const query = filtroCliente !== "todos" ? `?clienteId=${filtroCliente}` : "";
    try {
      setCuentas(await api.get<Cuenta[]>("m2", `/cuentas${query}`));
    } catch {
      setCuentas([]);
    }
    api.get<CuentasStats>("m2", "/cuentas/stats").then(setStats).catch(() => setStats(null));
  }, [filtroCliente]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  // Clientes desde ms-modulo1 con la sesión de admin (iniciar sesión en "Clientes").
  // Sin sesión o sin permiso se muestra "Cliente #id".
  useEffect(() => {
    m1<ClienteResumen[]>("/clientes", { silencioso: true })
      .then((data) => setClientes(Array.isArray(data) ? data : []))
      .catch(() => setClientes([]));
  }, []);

  const clientesPorId = useMemo(() => new Map(clientes.map((c) => [c.id, c])), [clientes]);

  const filtradas = useMemo(() => {
    const term = q.toLowerCase();
    return (cuentas ?? []).filter((c) =>
      `${c.numero} ${nombreCliente(clientesPorId.get(c.clienteId), c.clienteId)} ${clientesPorId.get(c.clienteId)?.ci ?? ""}`
        .toLowerCase()
        .includes(term),
    );
  }, [cuentas, q, clientesPorId]);

  const cerrar = async (c: Cuenta) => {
    try {
      await api.patch("m2", `/cuentas/${c.id}/baja`);
      toast.success(`Cuenta ${c.numero} dada de baja`);
      cargar();
    } catch {
      /* toast de error ya mostrado */
    }
  };

  const actualizarTrasOperacion = () => {
    cargar();
    // refresca el panel de movimientos si estaba abierto sobre la misma cuenta
    if (verMovs) setVerMovs({ ...verMovs });
  };

  return (
    <>
      <PageHeader
        title="Cuentas de ahorro"
        description="Apertura de cuentas, depósitos, retiros y movimientos"
        actions={
          <Button onClick={() => setNuevaOpen(true)}>
            <Plus /> Abrir cuenta
          </Button>
        }
      />

      <div className="mb-4 grid gap-4 sm:grid-cols-3">
        <KpiCard label="Total de cuentas" value={stats?.totalCuentas ?? "—"} icon={CreditCard} />
        <KpiCard label="Cuentas activas" value={stats?.activas ?? "—"} icon={Wallet} />
        <KpiCard label="Saldo total" value={stats ? formatSaldo(stats.saldoTotal) : "—"} icon={Landmark} hint="Suma de saldos de cuentas activas" />
      </div>

      <Card>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-3">
            <div className="relative w-full max-w-sm">
              <Search className="absolute left-2.5 top-2 size-4 text-muted-foreground" />
              <Input className="pl-8" placeholder="Buscar por número, cliente o CI..." value={q} onChange={(e) => setQ(e.target.value)} />
            </div>
            <Select value={filtroCliente} onValueChange={setFiltroCliente}>
              <SelectTrigger className="w-56">
                <SelectValue placeholder="Filtrar por cliente" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos los clientes</SelectItem>
                {clientes.map((c) => (
                  <SelectItem key={c.id} value={String(c.id)}>
                    {nombreCliente(c)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {cuentas === null ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : filtradas.length === 0 ? (
            <EmptyState title="Sin cuentas" description="Abre una cuenta para un cliente activo." />
          ) : (
            <TooltipProvider>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Número</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Moneda</TableHead>
                  <TableHead className="text-right">Saldo</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtradas.map((c) => {
                  const cli = clientesPorId.get(c.clienteId);
                  const saldoCero = Number(c.saldo) === 0;
                  return (
                    <TableRow key={c.id}>
                      <TableCell className="font-mono text-xs">{c.numero}</TableCell>
                      <TableCell>
                        <p className="font-medium">{nombreCliente(cli, c.clienteId)}</p>
                        {cli?.ci && <p className="text-xs text-muted-foreground">CI {cli.ci}</p>}
                      </TableCell>
                      <TableCell>{c.moneda}</TableCell>
                      <TableCell className="text-right font-semibold">{formatSaldo(c.saldo, c.moneda)}</TableCell>
                      <TableCell>
                        <StatusBadge status={c.activo ? "activo" : "inactivo"} label={c.activo ? "Activa" : "Cerrada"} />
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button size="sm" variant="outline" disabled={!c.activo} onClick={() => setOperacion({ cuenta: c, tipo: "depositar" })}>
                            <ArrowDownToLine /> Depositar
                          </Button>
                          <Button size="sm" variant="outline" disabled={!c.activo} onClick={() => setOperacion({ cuenta: c, tipo: "extraer" })}>
                            <ArrowUpFromLine /> Extraer
                          </Button>
                          <Button size="icon-sm" variant="ghost" title="Ver movimientos" onClick={() => setVerMovs(c)}>
                            <History />
                          </Button>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span>
                                <Button size="icon-sm" variant="ghost" disabled={!c.activo || !saldoCero} onClick={() => setACerrar(c)}>
                                  <Ban />
                                </Button>
                              </span>
                            </TooltipTrigger>
                            <TooltipContent>
                              {!c.activo ? "La cuenta ya está cerrada" : saldoCero ? "Dar de baja la cuenta" : "Solo se puede cerrar con saldo 0"}
                            </TooltipContent>
                          </Tooltip>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
            </TooltipProvider>
          )}
        </CardContent>
      </Card>

      <NuevaCuentaDialog open={nuevaOpen} onOpenChange={setNuevaOpen} clientes={clientes} onCreated={cargar} />
      <OperacionDialog
        cuenta={operacion?.cuenta ?? null}
        tipo={operacion?.tipo ?? "depositar"}
        onClose={() => setOperacion(null)}
        onDone={actualizarTrasOperacion}
      />
      <MovimientosSheet cuenta={verMovs} onClose={() => setVerMovs(null)} />
      <ConfirmDialog
        open={!!aCerrar}
        onOpenChange={(o) => !o && setACerrar(null)}
        title="Cerrar cuenta"
        description={`¿Dar de baja la cuenta ${aCerrar?.numero ?? ""}? No admitirá más depósitos ni retiros.`}
        confirmLabel="Cerrar cuenta"
        onConfirm={() => aCerrar && cerrar(aCerrar)}
      />
    </>
  );
}
