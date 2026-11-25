"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { LockOpen, Pencil, Search, ShieldAlert, UserCheck, UserPlus, Users, UserX } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { EmptyState } from "@/components/shared/empty-state";
import { KpiCard } from "@/components/shared/kpi-card";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { ClienteFormDialog } from "./cliente-form-dialog";
import { getSesion, m1, type Sesion } from "@/lib/session";
import { estadoCliente, type Cliente, type ClientesStats } from "./types";

const ESTADOS = { activo: "Activo", inactivo: "Inactivo", bloqueado: "Bloqueado" } as const;
const BADGE = { activo: "activo", inactivo: "inactivo", bloqueado: "pendiente" } as const;

/** Módulo 1 · Clientes (ms-modulo1 vía /api/m1). Dueña front: Luciana. */
export default function ClientesPage() {
  const [sesion, setSesion] = useState<Sesion | null>(null);
  const [listo, setListo] = useState(false);
  const [clientes, setClientes] = useState<Cliente[] | null>(null);
  const [stats, setStats] = useState<ClientesStats | null>(null);
  const [q, setQ] = useState("");
  const [estado, setEstado] = useState("todos");
  const [form, setForm] = useState<{ open: boolean; cliente: Cliente | null }>({ open: false, cliente: null });
  const [aBaja, setABaja] = useState<Cliente | null>(null);

  useEffect(() => {
    setSesion(getSesion());
    setListo(true);
    const sync = () => setSesion(getSesion());
    window.addEventListener("chuno-sesion", sync);
    return () => window.removeEventListener("chuno-sesion", sync);
  }, []);

  const esAdmin = sesion?.rol === "ADMIN";

  const cargar = useCallback(async () => {
    if (!esAdmin) return;
    try {
      setClientes(await m1<Cliente[]>("/clientes"));
    } catch {
      setClientes([]);
    }
    m1<ClientesStats>("/clientes/stats", { silencioso: true }).then(setStats).catch(() => setStats(null));
  }, [esAdmin]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const filtrados = useMemo(() => {
    const t = q.toLowerCase();
    return (clientes ?? []).filter(
      (c) =>
        (estado === "todos" || estadoCliente(c) === estado) &&
        `${c.ci} ${c.nombres} ${c.apellidos} ${c.usuario} ${c.email}`.toLowerCase().includes(t),
    );
  }, [clientes, q, estado]);

  const accion = async (c: Cliente, ruta: "baja" | "desbloquear") => {
    try {
      await m1(`/clientes/${c.id}/${ruta}`, { method: "PATCH" });
      toast.success(ruta === "baja" ? `${c.nombres} ${c.apellidos} dado de baja` : `${c.nombres} ${c.apellidos} desbloqueado`);
      cargar();
    } catch {
      /* toast ya mostrado */
    }
  };

  const formDialog = (
    <ClienteFormDialog
      open={form.open}
      onOpenChange={(o) => setForm((f) => ({ ...f, open: o }))}
      cliente={form.cliente}
      onSaved={cargar}
    />
  );

  // El login y los permisos por rol los maneja AppShell (solo ADMIN llega aquí).
  if (!listo || !sesion || !esAdmin) return null;

  return (
    <>
      <PageHeader
        title="Clientes"
        description="Alta, modificación, baja y seguridad de los clientes del banco"
        actions={
          <>
            <Button onClick={() => setForm({ open: true, cliente: null })}>
              <UserPlus /> Nuevo cliente
            </Button>
          </>
        }
      />

      <div className="mb-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Total de clientes" value={stats?.total ?? "—"} icon={Users} />
        <KpiCard label="Activos" value={stats?.activos ?? "—"} icon={UserCheck} />
        <KpiCard label="Inactivos" value={stats?.inactivos ?? "—"} icon={UserX} />
        <KpiCard label="Bloqueados" value={stats?.bloqueados ?? "—"} icon={ShieldAlert} hint="Por 3 intentos fallidos" />
      </div>

      <Card>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-3">
            <div className="relative w-full max-w-sm">
              <Search className="absolute left-2.5 top-2 size-4 text-muted-foreground" />
              <Input className="pl-8" placeholder="Buscar por CI, nombre, usuario o email..." value={q} onChange={(e) => setQ(e.target.value)} />
            </div>
            <Select value={estado} onValueChange={setEstado}>
              <SelectTrigger className="w-44">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos los estados</SelectItem>
                <SelectItem value="activo">Activos</SelectItem>
                <SelectItem value="bloqueado">Bloqueados</SelectItem>
                <SelectItem value="inactivo">Inactivos</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {clientes === null ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : filtrados.length === 0 ? (
            <EmptyState title="Sin clientes" description="No hay clientes que coincidan con la búsqueda." />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>CI</TableHead>
                  <TableHead>Nombre completo</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Teléfono</TableHead>
                  <TableHead>Usuario</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtrados.map((c) => {
                  const est = estadoCliente(c);
                  return (
                    <TableRow key={c.id}>
                      <TableCell className="font-mono text-xs">{c.ci}</TableCell>
                      <TableCell className="font-medium">
                        {c.nombres} {c.apellidos}
                        {c.rol === "ADMIN" && (
                          <Badge variant="outline" className="ml-2">
                            Admin
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>{c.email}</TableCell>
                      <TableCell>{c.telefono || "—"}</TableCell>
                      <TableCell>{c.usuario}</TableCell>
                      <TableCell>
                        <StatusBadge status={BADGE[est]} label={ESTADOS[est]} />
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          {c.bloqueado && c.activo && (
                            <Button size="sm" variant="outline" onClick={() => accion(c, "desbloquear")}>
                              <LockOpen /> Desbloquear
                            </Button>
                          )}
                          <Button size="icon-sm" variant="ghost" title="Editar" disabled={!c.activo} onClick={() => setForm({ open: true, cliente: c })}>
                            <Pencil />
                          </Button>
                          <Button
                            size="icon-sm"
                            variant="ghost"
                            title="Dar de baja"
                            disabled={!c.activo || c.id === sesion.id}
                            onClick={() => setABaja(c)}
                          >
                            <UserX />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {formDialog}
      <ConfirmDialog
        open={!!aBaja}
        onOpenChange={(o) => !o && setABaja(null)}
        title="Dar de baja cliente"
        description={`¿Dar de baja a ${aBaja?.nombres ?? ""} ${aBaja?.apellidos ?? ""}? Se conserva su historial pero no podrá iniciar sesión ni abrir cuentas.`}
        confirmLabel="Dar de baja"
        onConfirm={() => aBaja && accion(aBaja, "baja")}
      />
    </>
  );
}
