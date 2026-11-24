"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { Registro } from "@/lib/api";

/** Esquema de validación: ajustar campos según el contrato del módulo. */
const schema = z.object({
  codigo: z.string().min(1, "Requerido"),
  nombre: z.string().min(3, "Mínimo 3 caracteres"),
  categoria: z.string().min(1, "Requerido"),
  monto: z.coerce.number().min(0, "Debe ser positivo"),
  fecha: z.string().min(1, "Requerido"),
  descripcion: z.string().optional(),
});
type FormInput = z.input<typeof schema>;
export type RegistroForm = z.output<typeof schema>;

export function RegistroFormDialog({
  open,
  onOpenChange,
  initial,
  onSubmit,
  entity,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  initial?: Registro | null;
  onSubmit: (v: RegistroForm) => Promise<void>;
  entity: string;
}) {
  const form = useForm<FormInput, unknown, RegistroForm>({ resolver: zodResolver(schema) });

  useEffect(() => {
    if (!open) return;
    form.reset({
      codigo: initial?.codigo ?? "",
      nombre: initial?.nombre ?? "",
      categoria: initial?.categoria ?? "General",
      monto: initial ? Number(initial.monto) : 0,
      fecha: (initial?.fecha ?? new Date().toISOString()).slice(0, 10),
      descripcion: initial?.descripcion ?? "",
    });
  }, [open, initial, form]);

  const errors = form.formState.errors;
  const field = (name: keyof FormInput, label: string, type = "text") => (
    <div className="grid gap-1.5">
      <Label htmlFor={name}>{label}</Label>
      <Input id={name} type={type} step={type === "number" ? "0.01" : undefined} {...form.register(name)} />
      {errors[name] && <p className="text-xs text-destructive">{String(errors[name]?.message)}</p>}
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{initial ? `Editar ${entity}` : `Nuevo ${entity}`}</DialogTitle>
        </DialogHeader>
        <form
          className="grid gap-4"
          onSubmit={form.handleSubmit(async (v) => {
            try {
              await onSubmit(v);
              onOpenChange(false);
            } catch {
              /* el toast de error ya se mostró en lib/api */
            }
          })}
        >
          <div className="grid grid-cols-2 gap-4">
            {field("codigo", "Código")}
            {field("nombre", "Nombre")}
            {field("categoria", "Categoría")}
            {field("monto", "Monto", "number")}
            {field("fecha", "Fecha", "date")}
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="descripcion">Descripción</Label>
            <Textarea id="descripcion" {...form.register("descripcion")} />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={form.formState.isSubmitting}>
              Guardar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
