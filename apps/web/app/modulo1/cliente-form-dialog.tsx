"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { m1 } from "@/lib/session";
import type { Cliente } from "./types";

const base = z.object({
  ci: z.string().trim().min(1, "El CI es obligatorio"),
  nombres: z.string().trim().min(1, "Los nombres son obligatorios"),
  apellidos: z.string().trim().min(1, "Los apellidos son obligatorios"),
  email: z.string().trim().email("Formato de email inválido"),
  telefono: z.string().trim().optional(),
  direccion: z.string().trim().optional(),
  usuario: z.string().trim().min(1, "El usuario es obligatorio"),
  password: z.string().optional(),
});
type Form = z.infer<typeof base>;

/** Alta (POST /clientes, con contraseña) y edición (PATCH /clientes/:id, sin contraseña). */
export function ClienteFormDialog({
  open,
  onOpenChange,
  cliente,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  cliente: Cliente | null;
  onSaved: () => void;
}) {
  const editando = !!cliente;
  const schema = base.superRefine((v, ctx) => {
    if (!editando && (!v.password || v.password.length < 8))
      ctx.addIssue({ code: "custom", path: ["password"], message: "La contraseña debe tener al menos 8 caracteres" });
  });
  const form = useForm<Form>({ resolver: zodResolver(schema) });

  useEffect(() => {
    if (!open) return;
    form.reset({
      ci: cliente?.ci ?? "",
      nombres: cliente?.nombres ?? "",
      apellidos: cliente?.apellidos ?? "",
      email: cliente?.email ?? "",
      telefono: cliente?.telefono ?? "",
      direccion: cliente?.direccion ?? "",
      usuario: cliente?.usuario ?? "",
      password: "",
    });
  }, [open, cliente, form]);

  const guardar = form.handleSubmit(async (v) => {
    const datos = {
      ci: v.ci,
      nombres: v.nombres,
      apellidos: v.apellidos,
      email: v.email,
      usuario: v.usuario,
      ...(v.telefono ? { telefono: v.telefono } : {}),
      ...(v.direccion ? { direccion: v.direccion } : {}),
    };
    try {
      if (editando) {
        await m1(`/clientes/${cliente!.id}`, { method: "PATCH", body: JSON.stringify(datos) });
        toast.success("Datos del cliente actualizados");
      } else {
        await m1("/clientes", { method: "POST", body: JSON.stringify({ ...datos, password: v.password }) });
        toast.success(`Cliente ${v.nombres} ${v.apellidos} registrado`);
      }
      onSaved();
      onOpenChange(false);
    } catch {
      /* toast del back: "El CI ya está registrado", etc. */
    }
  });

  const e = form.formState.errors;
  const campo = (name: keyof Form, label: string, props: React.ComponentProps<typeof Input> = {}) => (
    <div className="grid gap-1.5">
      <Label htmlFor={name}>{label}</Label>
      <Input id={name} {...props} {...form.register(name)} />
      {e[name] && <p className="text-xs text-destructive">{String(e[name]?.message)}</p>}
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{editando ? "Editar cliente" : "Registrar cliente"}</DialogTitle>
          <DialogDescription>
            {editando ? "La contraseña no se modifica desde aquí." : "CI, email y usuario deben ser únicos."}
          </DialogDescription>
        </DialogHeader>
        <form className="grid gap-4" onSubmit={guardar}>
          <div className="grid grid-cols-2 gap-4">
            {campo("ci", "CI", { placeholder: "8456123" })}
            {campo("usuario", "Usuario", { placeholder: "mquispe", autoComplete: "off" })}
            {campo("nombres", "Nombres", { placeholder: "María" })}
            {campo("apellidos", "Apellidos", { placeholder: "Quispe Rojas" })}
            {campo("email", "Email", { type: "email", placeholder: "maria@mail.com" })}
            {campo("telefono", "Teléfono", { placeholder: "71234567" })}
          </div>
          {campo("direccion", "Dirección", { placeholder: "Av. Arce 2345, La Paz" })}
          {!editando && campo("password", "Contraseña", { type: "password", autoComplete: "new-password", placeholder: "Mínimo 8 caracteres" })}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? "Guardando..." : editando ? "Guardar cambios" : "Registrar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
