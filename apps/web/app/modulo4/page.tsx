"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowLeftRight,
  Building,
  CheckCircle2,
  CreditCard,
  Plus,
  Printer,
  Search,
  ShieldCheck,
  UserCheck,
  Wallet,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PageHeader } from "@/components/shared/page-header";
import { KpiCard } from "@/components/shared/kpi-card";
import { StatusBadge } from "@/components/shared/status-badge";
import { EmptyState } from "@/components/shared/empty-state";
import { PrintableDocument } from "@/components/shared/printable-document";
import { api, formatDate, formatMoney } from "@/lib/api";
import { m1 } from "@/lib/session";
import {
  MOCK_BANCOS,
  MOCK_CLIENTES,
  MOCK_CUENTAS,
  MOCK_TRANSFERENCIAS_INICIALES,
} from "./mock-data";
import type { Banco, Transferencia, TipoTransferencia, ClienteOption, CuentaOption } from "./types";

const LIMITE_ACH_MAX = 50000;

export default function Modulo4TransferenciasPage() {
  const [transferencias, setTransferencias] = useState<Transferencia[] | null>(null);
  const [bancos, setBancos] = useState<Banco[]>(MOCK_BANCOS);
  const [clientes, setClientes] = useState<ClienteOption[]>(MOCK_CLIENTES);
  const [cuentas, setCuentas] = useState<CuentaOption[]>(MOCK_CUENTAS);

  // Filtros de tabla
  const [q, setQ] = useState("");
  const [filtroTipo, setFiltroTipo] = useState("TODAS");

  // Modal Nueva Transferencia
  const [nuevaOpen, setNuevaOpen] = useState(false);
  const [tipoTrf, setTipoTrf] = useState<TipoTransferencia>("PROPIA");
  const [clienteIdSel, setClienteIdSel] = useState(String(MOCK_CLIENTES[0].id));
  const [cuentaOrigenIdSel, setCuentaOrigenIdSel] = useState(String(MOCK_CUENTAS[0].id));
  const [cuentaDestinoIdPropia, setCuentaDestinoIdPropia] = useState(String(MOCK_CUENTAS[1].id));
  const [cuentaDestinoNumero, setCuentaDestinoNumero] = useState("1000000003");
  const [bancoDestinoSel, setBancoDestinoSel] = useState("BNB");
  const [titularDestino, setTitularDestino] = useState("");
  const [montoInput, setMontoInput] = useState("250.00");
  const [glosaInput, setGlosaInput] = useState("Pago por servicios");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Modal Comprobante
  const [comprobanteModal, setComprobanteModal] = useState<Transferencia | null>(null);

  const cargar = useCallback(async () => {
    try {
      const data = await api.get<Transferencia[]>("m4", "/transferencias");
      if (Array.isArray(data)) {
        setTransferencias(data);
      }
    } catch {
      setTransferencias(MOCK_TRANSFERENCIAS_INICIALES);
    }
  }, []);

  useEffect(() => {
    cargar();

    api.get<Banco[]>("m4", "/bancos")
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          setBancos(data);
          const primerExt = data.find((b) => b.codigo !== "CHUNO") || data[0];
          if (primerExt) setBancoDestinoSel(primerExt.codigo);
        }
      })
      .catch(() => {});

    m1<ClienteOption[]>("/clientes", { silencioso: true })
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          setClientes(data);
          setClienteIdSel(String(data[0].id));
        }
      })
      .catch(() => {});

    api.get<CuentaOption[]>("m2", "/cuentas?activo=true")
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          setCuentas(data);
        }
      })
      .catch(() => {});
  }, [cargar]);

  // Cuentas del cliente seleccionado
  const cuentasDelCliente = useMemo(() => {
    return cuentas.filter((c) => String(c.clienteId) === clienteIdSel);
  }, [cuentas, clienteIdSel]);

  const cuentaOrigen = useMemo(() => {
    return cuentas.find((c) => String(c.id) === cuentaOrigenIdSel);
  }, [cuentas, cuentaOrigenIdSel]);

  const cuentasPropiasDestino = useMemo(() => {
    return cuentasDelCliente.filter((c) => String(c.id) !== cuentaOrigenIdSel);
  }, [cuentasDelCliente, cuentaOrigenIdSel]);

  useEffect(() => {
    if (tipoTrf === "PROPIA") {
      if (cuentasPropiasDestino.length > 0) {
        if (!cuentasPropiasDestino.some((c) => String(c.id) === cuentaDestinoIdPropia)) {
          setCuentaDestinoIdPropia(String(cuentasPropiasDestino[0].id));
        }
      } else {
        setCuentaDestinoIdPropia("");
      }
    }
  }, [cuentaOrigenIdSel, cuentasPropiasDestino, tipoTrf, cuentaDestinoIdPropia]);

  useEffect(() => {
    if (tipoTrf === "TERCERO") {
      const ctaEncontrada = cuentas.find((c) => c.numero === cuentaDestinoNumero.trim());
      if (ctaEncontrada) {
        const dueno = clientes.find((cl) => cl.id === ctaEncontrada.clienteId);
        if (dueno) setTitularDestino(`${dueno.nombres} ${dueno.apellidos}`);
      }
    }
  }, [cuentaDestinoNumero, tipoTrf, cuentas, clientes]);

  const handleTransferir = async () => {
    const monto = parseFloat(montoInput);
    if (isNaN(monto) || monto <= 0) {
      toast.error("El monto debe ser mayor a 0");
      return;
    }
    if (!cuentaOrigen) {
      toast.error("Seleccione una cuenta de origen");
      return;
    }
    if (monto > Number(cuentaOrigen.saldo)) {
      toast.error(`Saldo insuficiente (Disponible: ${formatMoney(cuentaOrigen.saldo)})`);
      return;
    }

    let nroDestino = "";
    let bancoDestinoFinal: string | null = null;
    let titularFinal = titularDestino.trim();

    if (tipoTrf === "PROPIA") {
      const ctaDest = cuentas.find((c) => String(c.id) === cuentaDestinoIdPropia);
      if (!ctaDest || ctaDest.id === cuentaOrigen.id) {
        toast.error("Seleccione una cuenta de destino propia válida");
        return;
      }
      nroDestino = ctaDest.numero;
      const cliente = clientes.find((c) => String(c.id) === clienteIdSel);
      titularFinal = cliente ? `${cliente.nombres} ${cliente.apellidos}` : "Mismo Titular";
      bancoDestinoFinal = "Banco Chuno S.A.";
    } else if (tipoTrf === "TERCERO") {
      if (!cuentaDestinoNumero.trim() || cuentaDestinoNumero.trim() === cuentaOrigen.numero) {
        toast.error("Número de cuenta de destino inválido");
        return;
      }
      nroDestino = cuentaDestinoNumero.trim();
      bancoDestinoFinal = "Banco Chuno S.A.";
      if (!titularFinal) titularFinal = "Titular Banco Chuno";
    } else {
      if (!bancoDestinoSel || !cuentaDestinoNumero.trim() || !titularFinal) {
        toast.error("Complete los datos requeridos para la transferencia interbancaria");
        return;
      }
      if (monto > LIMITE_ACH_MAX) {
        toast.error(`El monto supera el límite interbancario de ${formatMoney(LIMITE_ACH_MAX)}`);
        return;
      }
      nroDestino = cuentaDestinoNumero.trim();
      bancoDestinoFinal = bancoDestinoSel;
    }

    setIsSubmitting(true);
    const cliente = clientes.find((c) => String(c.id) === clienteIdSel);
    const payload = {
      tipo: tipoTrf,
      clienteId: Number(clienteIdSel),
      cuentaOrigenId: cuentaOrigen.id,
      cuentaDestinoNumero: nroDestino,
      bancoDestino: tipoTrf === "INTERBANCARIA" ? bancoDestinoFinal : null,
      titularDestino: tipoTrf === "INTERBANCARIA" ? titularFinal : null,
      monto,
      glosa: glosaInput.trim() || "Transferencia electrónica",
    };

    try {
      const res = await api.post<Transferencia>("m4", "/transferencias", payload);
      setNuevaOpen(false);
      finalizarTrf({
        ...res,
        cuentaOrigenNumero: cuentaOrigen.numero,
        clienteNombre: cliente ? `${cliente.nombres} ${cliente.apellidos}` : "Cliente",
        titularDestino: titularFinal,
        bancoDestino: bancoDestinoFinal,
      });

      api.get<CuentaOption[]>("m2", "/cuentas?activo=true")
        .then((ctas) => {
          if (Array.isArray(ctas) && ctas.length > 0) setCuentas(ctas);
        })
        .catch(() => {});
    } catch {
      const mockTrf: Transferencia = {
        id: Date.now(),
        tipo: tipoTrf,
        clienteId: Number(clienteIdSel),
        cuentaOrigenId: cuentaOrigen.id,
        cuentaDestinoNumero: nroDestino,
        bancoDestino: bancoDestinoFinal,
        titularDestino: titularFinal,
        monto,
        glosa: glosaInput.trim() || "Transferencia electrónica",
        estado: "COMPLETADA",
        codigoAch: tipoTrf === "INTERBANCARIA" ? `ACH-${Math.floor(100000 + Math.random() * 900000)}` : null,
        fecha: new Date().toISOString(),
        cuentaOrigenNumero: cuentaOrigen.numero,
        clienteNombre: cliente ? `${cliente.nombres} ${cliente.apellidos}` : "Cliente",
      };
      setNuevaOpen(false);
      finalizarTrf(mockTrf);
    } finally {
      setIsSubmitting(false);
    }
  };

  const finalizarTrf = (trf: Transferencia) => {
    setCuentas((prev) =>
      prev.map((c) => (c.id === trf.cuentaOrigenId ? { ...c, saldo: Number(c.saldo) - Number(trf.monto) } : c))
    );
    if (trf.tipo === "PROPIA" || trf.tipo === "TERCERO") {
      setCuentas((prev) =>
        prev.map((c) => (c.numero === trf.cuentaDestinoNumero ? { ...c, saldo: Number(c.saldo) + Number(trf.monto) } : c))
      );
    }
    setTransferencias((prev) => [trf, ...(prev ?? [])]);
    toast.success(`Transferencia ${trf.tipo} completada con éxito`);
    setComprobanteModal(trf);
  };

  const totalTransferido = useMemo(() => {
    return (transferencias ?? [])
      .filter((t) => t.estado === "COMPLETADA")
      .reduce((acc, t) => acc + Number(t.monto), 0);
  }, [transferencias]);

  const filtradas = useMemo(() => {
    const t = q.toLowerCase();
    return (transferencias ?? []).filter((trf) => {
      const matchTipo = filtroTipo === "TODAS" || trf.tipo === filtroTipo;
      const matchText =
        `${trf.cuentaDestinoNumero} ${trf.cuentaOrigenNumero ?? ""} ${trf.titularDestino ?? ""} ${trf.glosa ?? ""} ${trf.codigoAch ?? ""}`
          .toLowerCase()
          .includes(t);
      return matchTipo && matchText;
    });
  }, [transferencias, q, filtroTipo]);

  return (
    <>
      <PageHeader
        title="Transferencias"
        description="Transferencias entre cuentas propias, terceros del banco y red interbancaria ACH"
        actions={
          <Button onClick={() => setNuevaOpen(true)}>
            <Plus /> Nueva transferencia
          </Button>
        }
      />

      <div className="mb-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Transferencias realizadas" value={transferencias?.length ?? "—"} icon={ArrowLeftRight} />
        <KpiCard label="Total transferido" value={transferencias ? formatMoney(totalTransferido) : "—"} icon={CreditCard} />
        <KpiCard label="Límite ACH interbancario" value="Bs 50.000,00" icon={ShieldCheck} />
        <KpiCard label="Costo por transferencia" value="Bs 0.00" icon={CheckCircle2} hint="Sin comisiones" />
      </div>

      <Card>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-3">
            <div className="relative w-full max-w-sm">
              <Search className="absolute left-2.5 top-2 size-4 text-muted-foreground" />
              <Input
                className="pl-8"
                placeholder="Buscar por cuenta, titular, ACH o glosa..."
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
            </div>
            <Select value={filtroTipo} onValueChange={setFiltroTipo}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Todos los tipos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="TODAS">Todos los tipos</SelectItem>
                <SelectItem value="PROPIA">Cuentas propias</SelectItem>
                <SelectItem value="TERCERO">Terceros Chuno</SelectItem>
                <SelectItem value="INTERBANCARIA">Interbancaria ACH</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {transferencias === null ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : filtradas.length === 0 ? (
            <EmptyState title="Sin transferencias" description="No hay transferencias que coincidan con la búsqueda." />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Cuenta Origen</TableHead>
                  <TableHead>Destinatario / Entidad</TableHead>
                  <TableHead>Glosa</TableHead>
                  <TableHead className="text-right">Monto</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Acción</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtradas.map((trf) => (
                  <TableRow key={trf.id}>
                    <TableCell className="text-xs text-muted-foreground whitespace-nowrap">{formatDate(trf.fecha)}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-[10px] uppercase font-bold">
                        {trf.tipo}
                      </Badge>
                      {trf.codigoAch && (
                        <span className="block font-mono text-[10px] text-muted-foreground pt-0.5">
                          {trf.codigoAch}
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="font-mono text-xs">{trf.cuentaOrigenNumero || "1000000001"}</TableCell>
                    <TableCell>
                      <p className="font-medium">{trf.titularDestino || "Destinatario"}</p>
                      <span className="font-mono text-[11px] text-muted-foreground">
                        {trf.cuentaDestinoNumero} {trf.bancoDestino ? `• ${trf.bancoDestino}` : ""}
                      </span>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground max-w-[180px] truncate">{trf.glosa}</TableCell>
                    <TableCell className="text-right font-semibold">{formatMoney(trf.monto)}</TableCell>
                    <TableCell>
                      <StatusBadge
                        status={trf.estado === "COMPLETADA" ? "activo" : "inactivo"}
                        label={trf.estado}
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setComprobanteModal(trf)}
                      >
                        <Printer /> Comprobante
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* DIÁLOGO NUEVA TRANSFERENCIA */}
      <Dialog open={nuevaOpen} onOpenChange={setNuevaOpen}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Nueva transferencia</DialogTitle>
            <DialogDescription>
              Transfiere fondos de manera inmediata a cuentas propias, a terceros o a otros bancos vía ACH.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Modalidad */}
            <div className="space-y-1.5">
              <Label>1. Modalidad de transferencia</Label>
              <div className="grid grid-cols-3 gap-2">
                <Button
                  type="button"
                  variant={tipoTrf === "PROPIA" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setTipoTrf("PROPIA")}
                  className="text-xs gap-1.5 h-8"
                >
                  <Wallet className="size-3.5" /> Entre Mis Cuentas
                </Button>
                <Button
                  type="button"
                  variant={tipoTrf === "TERCERO" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setTipoTrf("TERCERO")}
                  className="text-xs gap-1.5 h-8"
                >
                  <UserCheck className="size-3.5" /> A Terceros Chuno
                </Button>
                <Button
                  type="button"
                  variant={tipoTrf === "INTERBANCARIA" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setTipoTrf("INTERBANCARIA")}
                  className="text-xs gap-1.5 h-8"
                >
                  <Building className="size-3.5" /> Interbancaria ACH
                </Button>
              </div>
            </div>

            {/* Cuenta Origen */}
            <div className="space-y-2 pt-2 border-t">
              <Label>2. Cuenta origen</Label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <span className="text-xs text-muted-foreground">Cliente</span>
                  <Select value={clienteIdSel} onValueChange={setClienteIdSel}>
                    <SelectTrigger>
                      <SelectValue placeholder="Cliente..." />
                    </SelectTrigger>
                    <SelectContent>
                      {clientes.map((c) => (
                        <SelectItem key={c.id} value={String(c.id)}>
                          {c.nombres} {c.apellidos}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <span className="text-xs text-muted-foreground">Cuenta</span>
                  <Select value={cuentaOrigenIdSel} onValueChange={setCuentaOrigenIdSel}>
                    <SelectTrigger>
                      <SelectValue placeholder="Cuenta origen..." />
                    </SelectTrigger>
                    <SelectContent>
                      {cuentasDelCliente.map((c) => (
                        <SelectItem key={c.id} value={String(c.id)}>
                          N° {c.numero} – {formatMoney(c.saldo)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Destino Adaptativo */}
            <div className="space-y-2 pt-2 border-t">
              <Label>3. Datos de destino</Label>

              {tipoTrf === "PROPIA" && (
                <div className="space-y-1">
                  <span className="text-xs text-muted-foreground">Cuenta propia receptora</span>
                  {cuentasPropiasDestino.length > 0 ? (
                    <Select value={cuentaDestinoIdPropia} onValueChange={setCuentaDestinoIdPropia}>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar cuenta..." />
                      </SelectTrigger>
                      <SelectContent>
                        {cuentasPropiasDestino.map((c) => (
                          <SelectItem key={c.id} value={String(c.id)}>
                            N° {c.numero} – Saldo: {formatMoney(c.saldo)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <p className="text-xs text-amber-600 border border-dashed rounded-lg p-2.5">
                      El cliente seleccionado solo posee una cuenta activa.
                    </p>
                  )}
                </div>
              )}

              {tipoTrf === "TERCERO" && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <span className="text-xs text-muted-foreground">N° de cuenta destino (Chuno)</span>
                    <Input
                      placeholder="Ej. 1000000003..."
                      value={cuentaDestinoNumero}
                      onChange={(e) => setCuentaDestinoNumero(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <span className="text-xs text-muted-foreground">Nombre del destinatario</span>
                    <Input
                      placeholder="Nombre del titular..."
                      value={titularDestino}
                      onChange={(e) => setTitularDestino(e.target.value)}
                    />
                  </div>
                </div>
              )}

              {tipoTrf === "INTERBANCARIA" && (
                <div className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <span className="text-xs text-muted-foreground">Banco de destino</span>
                      <Select value={bancoDestinoSel} onValueChange={setBancoDestinoSel}>
                        <SelectTrigger>
                          <SelectValue placeholder="Entidad..." />
                        </SelectTrigger>
                        <SelectContent>
                          {bancos
                            .filter((b) => b.codigo !== "CHUNO")
                            .map((b) => (
                              <SelectItem key={b.id} value={b.codigo}>
                                {b.nombre}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <span className="text-xs text-muted-foreground">N° Cuenta interbancaria</span>
                      <Input
                        placeholder="Ej. 201-5544332..."
                        value={cuentaDestinoNumero}
                        onChange={(e) => setCuentaDestinoNumero(e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <span className="text-xs text-muted-foreground">Titular destinatario</span>
                    <Input
                      placeholder="Nombre completo obligatorio..."
                      value={titularDestino}
                      onChange={(e) => setTitularDestino(e.target.value)}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Monto y Glosa */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t">
              <div className="space-y-1">
                <Label>Monto (BOB)</Label>
                <Input
                  type="number"
                  min="1"
                  step="0.5"
                  placeholder="0.00"
                  value={montoInput}
                  onChange={(e) => setMontoInput(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label>Glosa</Label>
                <Input
                  placeholder="Concepto..."
                  value={glosaInput}
                  onChange={(e) => setGlosaInput(e.target.value)}
                />
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="ghost" onClick={() => setNuevaOpen(false)}>
              Cancelar
            </Button>
            <Button
              disabled={isSubmitting || !cuentaOrigen || (tipoTrf === "PROPIA" && !cuentaDestinoIdPropia)}
              onClick={handleTransferir}
            >
              {isSubmitting ? "Procesando..." : "Confirmar transferencia"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* DIÁLOGO COMPROBANTE IMPRIMIBLE */}
      <Dialog open={!!comprobanteModal} onOpenChange={(open) => !open && setComprobanteModal(null)}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Comprobante de transferencia</DialogTitle>
          </DialogHeader>

          {comprobanteModal && (
            <PrintableDocument
              title="COMPROBANTE DE TRANSFERENCIA BANCARIA"
              footer={
                <div className="border-t pt-3 text-center text-[10px] text-muted-foreground">
                  Banco Startup Chuno S.A. – Entidad Supervisada por ASFI
                </div>
              }
            >
              <div className="space-y-3 text-xs">
                <div className="rounded-lg bg-muted/40 p-2.5 border grid grid-cols-2 gap-2">
                  <div>
                    <span className="text-[10px] uppercase text-muted-foreground">Tipo:</span>
                    <p className="font-bold text-primary">{comprobanteModal.tipo}</p>
                    {comprobanteModal.codigoAch && (
                      <p className="font-mono text-[10px] text-muted-foreground">ACH: {comprobanteModal.codigoAch}</p>
                    )}
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] uppercase text-muted-foreground">Fecha:</span>
                    <p className="font-mono">{new Date(comprobanteModal.fecha).toLocaleString("es-BO")}</p>
                  </div>
                </div>

                <div className="border rounded-lg divide-y">
                  <div className="p-2 flex justify-between">
                    <span className="text-muted-foreground">Ordenante:</span>
                    <span className="font-semibold">{comprobanteModal.clienteNombre}</span>
                  </div>
                  <div className="p-2 flex justify-between">
                    <span className="text-muted-foreground">Cuenta Origen:</span>
                    <span className="font-mono font-medium">{comprobanteModal.cuentaOrigenNumero}</span>
                  </div>
                  <div className="p-2 flex justify-between">
                    <span className="text-muted-foreground">Destinatario:</span>
                    <span className="font-semibold">{comprobanteModal.titularDestino || "Mismo Titular"}</span>
                  </div>
                  <div className="p-2 flex justify-between">
                    <span className="text-muted-foreground">Entidad Destino:</span>
                    <span className="font-medium">{comprobanteModal.bancoDestino || "Banco Chuno S.A."}</span>
                  </div>
                  <div className="p-2 flex justify-between">
                    <span className="text-muted-foreground">Cuenta Destino:</span>
                    <span className="font-mono">{comprobanteModal.cuentaDestinoNumero}</span>
                  </div>
                  <div className="p-2 flex justify-between">
                    <span className="text-muted-foreground">Glosa:</span>
                    <span className="italic">{comprobanteModal.glosa || "Transferencia"}</span>
                  </div>
                  <div className="p-2 flex justify-between items-baseline font-bold bg-muted/30">
                    <span>Monto Transferido:</span>
                    <span className="text-primary text-sm">{formatMoney(comprobanteModal.monto)}</span>
                  </div>
                </div>
              </div>
            </PrintableDocument>
          )}

          <DialogFooter className="flex justify-between sm:justify-between items-center gap-2">
            <Button variant="ghost" onClick={() => setComprobanteModal(null)}>
              Cerrar
            </Button>
            <Button onClick={() => window.print()}>
              <Printer /> Imprimir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}