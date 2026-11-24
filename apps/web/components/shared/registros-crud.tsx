"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Pencil, Plus, Search, UserX } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PageHeader } from "./page-header";
import { StatusBadge } from "./status-badge";
import { EmptyState } from "./empty-state";
import { ConfirmDialog } from "./confirm-dialog";
import { RegistroFormDialog, type RegistroForm } from "./registro-form-dialog";
import { api, formatDate, formatMoney, type Registro } from "@/lib/api";
import { getModule, type ModuleKey } from "@/lib/modules";

/**
 * Pantalla genérica: mockup M2 (listado) + M3 (formulario) + baja lógica.
 * Sirve para cualquier módulo; solo cambia `mod`.
 */
export function RegistrosCrud({ mod }: { mod: ModuleKey }) {
  const meta = getModule(mod);
  const [data, setData] = useState<Registro[] | null>(null);
  const [q, setQ] = useState("");
  const [editing, setEditing] = useState<Registro | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [toDisable, setToDisable] = useState<Registro | null>(null);

  const load = useCallback(async () => {
    try {
      setData(await api.get<Registro[]>(mod, "/registros"));
    } catch {
      setData([]);
    }
  }, [mod]);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(
    () => (data ?? []).filter((r) => `${r.codigo} ${r.nombre} ${r.categoria}`.toLowerCase().includes(q.toLowerCase())),
    [data, q],
  );

  const save = async (v: RegistroForm) => {
    if (editing) await api.patch(mod, `/registros/${editing.id}`, v);
    else await api.post(mod, "/registros", v);
    toast.success(editing ? "Cambios guardados" : `${meta.entity} creado`);
    load();
  };

  const disable = async (r: Registro) => {
    await api.patch(mod, `/registros/${r.id}/baja`);
    toast.success(`${r.nombre} dado de baja`);
    load();
  };

  return (
    <>
      <PageHeader
        title={meta.title}
        description={meta.description}
        actions={
          <Button
            onClick={() => {
              setEditing(null);
              setFormOpen(true);
            }}
          >
            <Plus /> Nuevo {meta.entity.toLowerCase()}
          </Button>
        }
      />
      <Card>
        <CardContent className="space-y-4">
          <div className="relative max-w-sm">
            <Search className="absolute left-2.5 top-2 size-4 text-muted-foreground" />
            <Input
              className="pl-8"
              placeholder="Buscar por código, nombre o categoría..."
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>
          {data === null ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <EmptyState />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Código</TableHead>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Categoría</TableHead>
                  <TableHead className="text-right">Monto</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-mono text-xs">{r.codigo}</TableCell>
                    <TableCell className="font-medium">{r.nombre}</TableCell>
                    <TableCell>{r.categoria}</TableCell>
                    <TableCell className="text-right">{formatMoney(r.monto)}</TableCell>
                    <TableCell>{formatDate(r.fecha)}</TableCell>
                    <TableCell>
                      <StatusBadge status={r.activo ? "activo" : "inactivo"} />
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="icon-sm"
                        variant="ghost"
                        title="Editar"
                        onClick={() => {
                          setEditing(r);
                          setFormOpen(true);
                        }}
                      >
                        <Pencil />
                      </Button>
                      <Button size="icon-sm" variant="ghost" title="Dar de baja" disabled={!r.activo} onClick={() => setToDisable(r)}>
                        <UserX />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <RegistroFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        initial={editing}
        onSubmit={save}
        entity={meta.entity.toLowerCase()}
      />
      <ConfirmDialog
        open={!!toDisable}
        onOpenChange={(o) => !o && setToDisable(null)}
        title="Confirmar baja"
        description={`¿Dar de baja a ${toDisable?.nombre ?? ""}? El registro se conserva como inactivo.`}
        confirmLabel="Dar de baja"
        onConfirm={() => toDisable && disable(toDisable)}
      />
    </>
  );
}
