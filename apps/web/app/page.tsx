"use client";

import { useEffect, useState } from "react";
import { Activity, CircleDollarSign, UserCheck, UserX } from "lucide-react";
import { Bar, BarChart, CartesianGrid, XAxis } from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { KpiCard } from "@/components/shared/kpi-card";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { api, formatMoney, type Registro, type Stats } from "@/lib/api";

const chartConfig = { cantidad: { label: "Cantidad", color: "var(--chart-1)" } } satisfies ChartConfig;

/** Mockup M1 – Dashboard. KPIs desde GET /registros/stats de ms-modulo1. */
export default function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [ultimos, setUltimos] = useState<Registro[]>([]);

  useEffect(() => {
    api.get<Stats>("m1", "/registros/stats").then(setStats).catch(() => {});
    api.get<Registro[]>("m1", "/registros").then((r) => setUltimos(r.slice(0, 5))).catch(() => {});
  }, []);

  return (
    <>
      <PageHeader title="Dashboard" description="Resumen general del sistema" />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Total registros" value={stats?.total ?? "—"} icon={Activity} hint="Módulo 1" />
        <KpiCard label="Activos" value={stats?.activos ?? "—"} icon={UserCheck} />
        <KpiCard label="Inactivos" value={stats?.inactivos ?? "—"} icon={UserX} />
        <KpiCard label="Monto total" value={stats ? formatMoney(stats.montoTotal) : "—"} icon={CircleDollarSign} />
      </div>
      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Registros por categoría</CardTitle>
            <CardDescription>Solo activos</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-64 w-full">
              <BarChart data={stats?.porCategoria ?? []}>
                <CartesianGrid vertical={false} />
                <XAxis dataKey="categoria" tickLine={false} axisLine={false} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="cantidad" fill="var(--color-cantidad)" radius={8} />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Últimos registros</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {ultimos.map((r) => (
              <div key={r.id} className="flex items-center justify-between text-sm">
                <div>
                  <p className="font-medium">{r.nombre}</p>
                  <p className="text-xs text-muted-foreground">{r.categoria}</p>
                </div>
                <StatusBadge status={r.activo ? "activo" : "inactivo"} />
              </div>
            ))}
            {ultimos.length === 0 && <p className="text-sm text-muted-foreground">Sin datos (¿ms-modulo1 está levantado?)</p>}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
