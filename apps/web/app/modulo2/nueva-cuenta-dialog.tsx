"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { api } from "@/lib/api";
import { nombreCliente, type ClienteResumen, type Cuenta, type Moneda } from "./types";

/** Apertura de cuenta (POST /cuentas). El back valida que el cliente exista y esté activo en ms-modulo1. */
export function NuevaCuentaDialog({
  open,
  onOpenChange,
  clientes,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  clientes: ClienteResumen[];
  onCreated: () => void;
}) {
  const [clienteId, setClienteId] = useState("");
  const [moneda, setMoneda] = useState<Moneda>("BOB");
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    if (open) {
      setClienteId("");
      setMoneda("BOB");
    }
  }, [open]);

  const activos = clientes.filter((c) => c.activo !== false);

  const crear = async () => {
    setEnviando(true);
    try {
      const cuenta = await api.post<Cuenta>("m2", "/cuentas", { clienteId: Number(clienteId), moneda });
      toast.success(`Cuenta ${cuenta.numero} creada en ${moneda}`);
      onCreated();
      onOpenChange(false);
    } catch {
      /* el toast de error ya se mostró en lib/api */
    } finally {
      setEnviando(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Abrir cuenta de ahorro</DialogTitle>
          <DialogDescription>El número de cuenta se genera automáticamente con saldo inicial 0.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4">
          <div className="grid gap-1.5">
            <Label>Cliente</Label>
            {activos.length > 0 ? (
              <Select value={clienteId} onValueChange={setClienteId}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Seleccionar cliente activo..." />
                </SelectTrigger>
                <SelectContent>
                  {activos.map((c) => (
                    <SelectItem key={c.id} value={String(c.id)}>
                      {nombreCliente(c)} {c.ci ? `· CI ${c.ci}` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <>
                <Input type="number" min="1" placeholder="ID del cliente" value={clienteId} onChange={(e) => setClienteId(e.target.value)} />
                <p className="text-xs text-muted-foreground">
                  No se pudo cargar la lista de clientes (ms-modulo1). Ingresa el ID del cliente.
                </p>
              </>
            )}
          </div>
          <div className="grid gap-1.5">
            <Label>Moneda</Label>
            <Select value={moneda} onValueChange={(v) => setMoneda(v as Moneda)}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="BOB">Bolivianos (BOB)</SelectItem>
                <SelectItem value="USD">Dólares (USD)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={crear} disabled={!clienteId || enviando}>
            {enviando ? "Creando..." : "Abrir cuenta"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
