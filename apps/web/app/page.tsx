"use client";

import { useCallback, useEffect, useState } from "react";
import { ArrowLeftRight, Landmark, Receipt, RefreshCw, ShieldAlert, Users, Wallet } from "lucide-react";
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, XAxis, YAxis } from "recharts";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { EmptyState } from "@/components/shared/empty-state";
import { KpiCard } from "@/components/shared/kpi-card";
import { PageHeader } from "@/components/shared/page-header";
import { formatMoney } from "@/lib/api";
import { m1 } from "@/lib/session";
import { cn } from "@/lib/utils";

// ---- Formas de respuesta de cada microservicio (contracts/moduloX.md) ----
interface ClientesStats { total: number; activos: number; inactivos: number; bloqueados: number }
interface CuentasStats { totalCuentas: number; activas: number; saldoTotal: number }
interface PagosStats { totalPagos: number; montoTotal: number; rechazados?: number; porCategoria: { categoria: string; cantidad: number }[] }
interface TransfStats { total: number; montoTotal: number; porTipo: { tipo: string; cantidad: number }[] }

const SERVICIOS = [
  { key: "m1", nombre: "Clientes", puerto: 3001 },
  { key: "m2", nombre: "Cuentas", puerto: 3002 },
  { key: "m3", nombre: "Pagos", puerto: 3003 },
  { key: "m4", nombre: "Transferencias", puerto: 3004 },
  { key: "m5", nombre: "Préstamos", puerto: 3005 },
] as const;

const CATEGORIAS: Record<string, string> = { LUZ: "Luz", AGUA: "Agua", TELEFONO: "Teléfono", GAS: "Gas", OTROS: "Otros" };
const TIPOS: Record<string, string> = { PROPIA: "Propias", TERCERO: "A terceros", INTERBANCARIA: "Interbancarias" };
const COLORES = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)", "var(--chart-5)"];

const pagosConfig = { cantidad: { label: "Pagos", color: "var(--chart-1)" } } satisfies ChartConfig;
const transfConfig = { cantidad: { label: "Transferencias" } } satisfies ChartConfig;

/** GET silencioso: si un microservicio está caído devuelve null (resiliencia, RNF-10). */
async function obtener<T>(mod: string, path: string): Promise<T | null> {
  try {
    const r = await fetch(`/api/${mod}${path}`, { cache: "no-store" });
    return r.ok ? ((await r.json()) as T) : null;
  } catch {
    return null;
  }
}

/** Dashboard del administrador: KPIs de los 5 microservicios + estado de cada servicio. */
export default function DashboardPage() {
  const [clientes, setClientes] = useState<ClientesStats | null>(null);
  const [cuentas, setCuentas] = useState<CuentasStats | null>(null);
  const [pagos, setPagos] = useState<PagosStats | null>(null);
  const [transf, setTransf] = useState<TransfStats | null>(null);
  const [salud, setSalud] = useState<Record<string, boolean | null>>({});
  const [cargando, setCargando] = useState(true);
  const [actualizado, setActualizado] = useState<Date | null>(null);

  const cargar = useCallback(async () => {
    setCargando(true);
    const [c1, c2, c3, c4, ...health] = await Promise.all([
      m1<ClientesStats>("/clientes/stats", { silencioso: true }).catch(() => null),
      obtener<CuentasStats>("m2", "/cuentas/stats"),
      obtener<PagosStats>("m3", "/pagos/stats"),
      obtener<TransfStats>("m4", "/transferencias/stats"),
      ...SERVICIOS.map((s) => obtener<{ status: string }>(s.key, "/health")),
    ]);
    setClientes(c1);
    setCuentas(c2);
    setPagos(c3);
    setTransf(c4);
    setSalud(Object.fromEntries(SERVICIOS.map((s, i) => [s.key, health[i]?.status === "ok"])));
    setActualizado(new Date());
    setCargando(false);
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const pagosData = (pagos?.porCategoria ?? []).map((p) => ({ ...p, nombre: CATEGORIAS[p.categoria] ?? p.categoria }));
  const transfData = (transf?.porTipo ?? []).map((t) => ({ ...t, nombre: TIPOS[t.tipo] ?? t.tipo }));
  const enLinea = Object.values(salud).filter(Boolean).length;

  return (
    <>
      <PageHeader
        title="Dashboard"
        description={`Resumen de la banca por internet${actualizado ? ` · actualizado ${actualizado.toLocaleTimeString("es-BO")}` : ""}`}
        actions={
          <Button variant="outline" onClick={cargar} disabled={cargando}>
            <RefreshCw className={cn(cargando && "animate-spin")} /> Actualizar
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Clientes activos"
          value={clientes ? clientes.activos : "—"}
          icon={Users}
          hint={clientes ? `${clientes.total} registrados · ${clientes.bloqueados} bloqueados` : "Servicio no disponible"}
        />
        <KpiCard
          label="Saldo total en cuentas"
          value={cuentas ? formatMoney(cuentas.saldoTotal) : "—"}
          icon={Wallet}
          hint={cuentas ? `${cuentas.activas} cuentas activas de ${cuentas.totalCuentas}` : "Servicio no disponible"}
        />
        <KpiCard
          label="Pagos de servicios"
          value={pagos ? formatMoney(pagos.montoTotal) : "—"}
          icon={Receipt}
          hint={pagos ? `${pagos.totalPagos} pagos completados${pagos.rechazados ? ` · ${pagos.rechazados} rechazados` : ""}` : "Servicio no disponible"}
        />
        <KpiCard
          label="Transferencias"
          value={transf ? formatMoney(transf.montoTotal) : "—"}
          icon={ArrowLeftRight}
          hint={transf ? `${transf.total} transferencias completadas` : "Servicio no disponible"}
        />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Pagos por tipo de servicio</CardTitle>
            <CardDescription>Pagos completados por categoría (luz, agua, teléfono, gas…)</CardDescription>
          </CardHeader>
          <CardContent>
            {pagosData.length === 0 ? (
              <EmptyState title="Sin pagos" description={pagos ? "Aún no se registraron pagos." : "El microservicio de Pagos no responde."} />
            ) : (
              <ChartContainer config={pagosConfig} className="h-64 w-full">
                <BarChart data={pagosData}>
                  <CartesianGrid vertical={false} />
                  <XAxis dataKey="nombre" tickLine={false} axisLine={false} />
                  <YAxis allowDecimals={false} tickLine={false} axisLine={false} width={30} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="cantidad" fill="var(--color-cantidad)" radius={8} />
                </BarChart>
              </ChartContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Transferencias por tipo</CardTitle>
            <CardDescription>Propias, a terceros e interbancarias</CardDescription>
          </CardHeader>
          <CardContent>
            {transfData.length === 0 ? (
              <EmptyState title="Sin transferencias" description={transf ? "Aún no hay transferencias." : "El microservicio de Transferencias no responde."} />
            ) : (
              <>
                <ChartContainer config={transfConfig} className="mx-auto h-48 w-full">
                  <PieChart>
                    <ChartTooltip content={<ChartTooltipContent nameKey="nombre" />} />
                    <Pie data={transfData} dataKey="cantidad" nameKey="nombre" innerRadius={45} outerRadius={75} paddingAngle={3}>
                      {transfData.map((_, i) => (
                        <Cell key={i} fill={COLORES[i % COLORES.length]} />
                      ))}
                    </Pie>
                  </PieChart>
                </ChartContainer>
                <div className="mt-2 space-y-1.5">
                  {transfData.map((t, i) => (
                    <div key={t.tipo} className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-2">
                        <span className="size-2.5 rounded-full" style={{ background: COLORES[i % COLORES.length] }} />
                        {t.nombre}
                      </span>
                      <span className="font-medium">{t.cantidad}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Estado de los microservicios</CardTitle>
            <CardDescription>
              {enLinea} de {SERVICIOS.length} en línea · cada servicio tiene su propia base de datos y se consulta por API
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
            {SERVICIOS.map((s) => {
              const ok = salud[s.key];
              return (
                <div key={s.key} className="rounded-lg border p-3">
                  <div className="flex items-center gap-2">
                    <span className={cn("size-2.5 rounded-full", ok ? "bg-emerald-500" : ok === false ? "bg-rose-500" : "bg-muted")} />
                    <p className="text-sm font-medium">{s.nombre}</p>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    ms-modulo{s.key.slice(1)} · {ok ? "En línea" : ok === false ? "Sin respuesta" : "…"}
                  </p>
                </div>
              );
            })}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Seguridad de clientes</CardTitle>
            <CardDescription>Estado de acceso de los clientes</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {[
              { label: "Activos", valor: clientes?.activos, color: "bg-emerald-500", icon: Users },
              { label: "Bloqueados (3 intentos fallidos)", valor: clientes?.bloqueados, color: "bg-amber-500", icon: ShieldAlert },
              { label: "Dados de baja", valor: clientes?.inactivos, color: "bg-rose-500", icon: Landmark },
            ].map((f) => (
              <div key={f.label} className="space-y-1">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{f.label}</span>
                  <span className="font-medium">{f.valor ?? "—"}</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-muted">
                  <div
                    className={cn("h-full rounded-full", f.color)}
                    style={{ width: clientes && clientes.total ? `${((f.valor ?? 0) / clientes.total) * 100}%` : "0%" }}
                  />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
