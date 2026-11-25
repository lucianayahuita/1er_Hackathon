"use client";

import { useEffect, useState } from "react";
import { ArrowDownToLine, ArrowUpFromLine } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api } from "@/lib/api";
import { formatSaldo, type Cuenta } from "./types";

export type TipoOperacion = "depositar" | "extraer";

/** Diálogo para depositar o extraer (POST /cuentas/:id/depositar | /extraer). */
export function OperacionDialog({
  cuenta,
  tipo,
  onClose,
  onDone,
}: {
  cuenta: Cuenta | null;
  tipo: TipoOperacion;
  onClose: () => void;
  onDone: () => void;
}) {
  const [monto, setMonto] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    setMonto("");
    setDescripcion("");
  }, [cuenta, tipo]);

  const esDeposito = tipo === "depositar";
  const montoNum = Number(monto);
  const saldo = Number(cuenta?.saldo ?? 0);
  const excede = !esDeposito && montoNum > saldo;
  const invalido = !monto || montoNum <= 0;

  const enviar = async () => {
    if (!cuenta) return;
    setEnviando(true);
    try {
      await api.post("m2", `/cuentas/${cuenta.id}/${tipo}`, {
        monto: montoNum,
        descripcion: descripcion || (esDeposito ? "Depósito" : "Retiro"),
      });
      toast.success(
        `${esDeposito ? "Depósito" : "Retiro"} de ${formatSaldo(montoNum, cuenta.moneda)} realizado en la cuenta ${cuenta.numero}`,
      );
      onDone();
      onClose();
    } catch {
      /* lib/api ya muestra el error del back (ej. "Saldo insuficiente") */
    } finally {
      setEnviando(false);
    }
  };

  return (
    <Dialog open={!!cuenta} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {esDeposito ? <ArrowDownToLine className="size-5 text-emerald-600" /> : <ArrowUpFromLine className="size-5 text-rose-600" />}
            {esDeposito ? "Depositar" : "Extraer"}
          </DialogTitle>
          <DialogDescription>
            Cuenta {cuenta?.numero} · Saldo actual{" "}
            <span className="font-medium text-foreground">{cuenta ? formatSaldo(cuenta.saldo, cuenta.moneda) : ""}</span>
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4">
          <div className="grid gap-1.5">
            <Label htmlFor="monto">Monto ({cuenta?.moneda})</Label>
            <Input
              id="monto"
              type="number"
              min="0.01"
              step="0.01"
              placeholder="0.00"
              value={monto}
              onChange={(e) => setMonto(e.target.value)}
              autoFocus
            />
            {excede && <p className="text-xs text-destructive">Saldo insuficiente: el monto supera el saldo disponible.</p>}
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="descripcion">Descripción (opcional)</Label>
            <Input
              id="descripcion"
              maxLength={200}
              placeholder={esDeposito ? "Depósito en ventanilla" : "Retiro en cajero"}
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={enviar} disabled={invalido || enviando} variant={esDeposito ? "default" : "destructive"}>
            {enviando ? "Procesando..." : esDeposito ? "Depositar" : "Extraer"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
