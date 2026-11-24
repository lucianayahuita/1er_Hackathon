"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeftRight,
  UserCheck,
  Building,
  CheckCircle2,
  AlertCircle,
  Printer,
  Search,
  ShieldCheck,
  CreditCard,
  Wallet,
  ArrowRight,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { PageHeader } from "@/components/shared/page-header";
import { KpiCard } from "@/components/shared/kpi-card";
import { PrintableDocument } from "@/components/shared/printable-document";
import { api, formatDate, formatMoney } from "@/lib/api";
import {
  MOCK_BANCOS,
  MOCK_CLIENTES,
  MOCK_CUENTAS,
  MOCK_TRANSFERENCIAS_INICIALES,
} from "./mock-data";
import type { Banco, Transferencia, TipoTransferencia, ClienteOption, CuentaOption } from "./types";

const LIMITE_ACH_MAX = 50000;

export default function Modulo4TransferenciasPage() {
  // Datos
  const [bancos, setBancos] = useState<Banco[]>(MOCK_BANCOS);
  const [clientes, setClientes] = useState<ClienteOption[]>(MOCK_CLIENTES);
  const [cuentas, setCuentas] = useState<CuentaOption[]>(MOCK_CUENTAS);
  const [transferencias, setTransferencias] = useState<Transferencia[]>(MOCK_TRANSFERENCIAS_INICIALES);

  // Formulario de transferencia
  const [tipoTransferencia, setTipoTransferencia] = useState<TipoTransferencia>("PROPIA");
  const [clienteIdSel, setClienteIdSel] = useState<string>(String(MOCK_CLIENTES[0].id));
  const [cuentaOrigenIdSel, setCuentaOrigenIdSel] = useState<string>(String(MOCK_CUENTAS[0].id));
  const [cuentaDestinoIdPropia, setCuentaDestinoIdPropia] = useState<string>(String(MOCK_CUENTAS[1].id));
  const [cuentaDestinoNumero, setCuentaDestinoNumero] = useState<string>("1000000003");
  const [bancoDestinoSel, setBancoDestinoSel] = useState<string>("BNB");
  const [titularDestino, setTitularDestino] = useState<string>("");
  const [montoInput, setMontoInput] = useState<string>("250.00");
  const [glosaInput, setGlosaInput] = useState<string>("Pago por servicios");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Modal comprobante
  const [comprobanteModal, setComprobanteModal] = useState<Transferencia | null>(null);
  const [filtroTipoHistorial, setFiltroTipoHistorial] = useState<string>("TODAS");
  const [busquedaHistorial, setBusquedaHistorial] = useState<string>("");

  // Carga inicial intentando backend con fallback seguro
  useEffect(() => {
    // Bancos
    api.get<Banco[]>("m4", "/bancos")
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) setBancos(data);
      })
      .catch(() => {});

    // Historial transferencias
    api.get<Transferencia[]>("m4", "/transferencias")
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) setTransferencias(data);
      })
      .catch(() => {});

    // Clientes de ms-modulo1
    api.get<ClienteOption[]>("m1", "/clientes?activo=true")
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) setClientes(data);
      })
      .catch(() => {});

    // Cuentas de ms-modulo2
    api.get<CuentaOption[]>("m2", "/cuentas?activo=true")
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) setCuentas(data);
      })
      .catch(() => {});
  }, []);

  // Cuentas del cliente actual
  const cuentasDelCliente = useMemo(() => {
    return cuentas.filter((c) => String(c.clienteId) === clienteIdSel);
  }, [cuentas, clienteIdSel]);

  // Cuenta origen seleccionada
  const cuentaOrigen = useMemo(() => {
    return cuentas.find((c) => String(c.id) === cuentaOrigenIdSel);
  }, [cuentas, cuentaOrigenIdSel]);

  // Cuentas propias para destino (excluyendo la cuenta origen)
  const cuentasPropiasDestino = useMemo(() => {
    return cuentasDelCliente.filter((c) => String(c.id) !== cuentaOrigenIdSel);
  }, [cuentasDelCliente, cuentaOrigenIdSel]);

  // Sincronizar selección de cuenta destino propia si cambia origen
  useEffect(() => {
    if (tipoTransferencia === "PROPIA") {
      if (cuentasPropiasDestino.length > 0) {
        if (!cuentasPropiasDestino.some((c) => String(c.id) === cuentaDestinoIdPropia)) {
          setCuentaDestinoIdPropia(String(cuentasPropiasDestino[0].id));
        }
      } else {
        setCuentaDestinoIdPropia("");
      }
    }
  }, [cuentaOrigenIdSel, cuentasPropiasDestino, tipoTransferencia, cuentaDestinoIdPropia]);

  // Sincronizar titular cuando cambia a TERCERO con cuenta conocida
  useEffect(() => {
    if (tipoTransferencia === "TERCERO") {
      const cuentaEncontrada = cuentas.find((c) => c.numero === cuentaDestinoNumero.trim());
      if (cuentaEncontrada) {
        const dueno = clientes.find((cl) => cl.id === cuentaEncontrada.clienteId);
        if (dueno) {
          setTitularDestino(`${dueno.nombres} ${dueno.apellidos}`);
        }
      }
    }
  }, [cuentaDestinoNumero, tipoTransferencia, cuentas, clientes]);

  // Ejecutar transferencia
  const handleTransferir = async () => {
    const monto = parseFloat(montoInput);
    if (isNaN(monto) || monto <= 0) {
      toast.error("El monto a transferir debe ser mayor a 0");
      return;
    }

    if (!cuentaOrigen) {
      toast.error("Seleccione una cuenta de origen");
      return;
    }

    if (monto > cuentaOrigen.saldo) {
      toast.error(`Saldo insuficiente (Disponible: ${formatMoney(cuentaOrigen.saldo)})`);
      return;
    }

    // Validaciones por tipo
    let nroCuentaDestinoFinal = "";
    let bancoDestinoFinal: string | null = null;
    let titularDestinoFinal = titularDestino.trim();

    if (tipoTransferencia === "PROPIA") {
      const ctaDest = cuentas.find((c) => String(c.id) === cuentaDestinoIdPropia);
      if (!ctaDest) {
        toast.error("Seleccione una cuenta propia de destino");
        return;
      }
      if (ctaDest.id === cuentaOrigen.id) {
        toast.error("La cuenta de origen y destino no pueden ser la misma");
        return;
      }
      nroCuentaDestinoFinal = ctaDest.numero;
      const cliente = clientes.find((c) => String(c.id) === clienteIdSel);
      titularDestinoFinal = cliente ? `${cliente.nombres} ${cliente.apellidos}` : "Mismo Titular";
      bancoDestinoFinal = "Banco Chuno S.A.";
    } else if (tipoTransferencia === "TERCERO") {
      if (!cuentaDestinoNumero.trim()) {
        toast.error("Ingrese el número de cuenta de destino");
        return;
      }
      if (cuentaDestinoNumero.trim() === cuentaOrigen.numero) {
        toast.error("La cuenta de destino no puede ser la misma de origen");
        return;
      }
      nroCuentaDestinoFinal = cuentaDestinoNumero.trim();
      bancoDestinoFinal = "Banco Chuno S.A.";
      if (!titularDestinoFinal) {
        titularDestinoFinal = "Titular Banco Chuno";
      }
    } else if (tipoTransferencia === "INTERBANCARIA") {
      if (!bancoDestinoSel) {
        toast.error("Seleccione el banco de destino");
        return;
      }
      if (!cuentaDestinoNumero.trim()) {
        toast.error("Ingrese el número de cuenta interbancaria");
        return;
      }
      if (!titularDestinoFinal) {
        toast.error("El nombre del titular destinatario es obligatorio en transferencias interbancarias");
        return;
      }
      if (monto > LIMITE_ACH_MAX) {
        toast.error(`El monto supera el límite máximo interbancario de ${formatMoney(LIMITE_ACH_MAX)}`);
        return;
      }
      nroCuentaDestinoFinal = cuentaDestinoNumero.trim();
      bancoDestinoFinal = bancoDestinoSel;
    }

    setIsSubmitting(true);
    const cliente = clientes.find((c) => String(c.id) === clienteIdSel);

    const payload = {
      tipo: tipoTransferencia,
      clienteId: Number(clienteIdSel),
      cuentaOrigenId: cuentaOrigen.id,
      cuentaDestinoNumero: nroCuentaDestinoFinal,
      bancoDestino: tipoTransferencia === "INTERBANCARIA" ? bancoDestinoFinal : null,
      titularDestino: tipoTransferencia === "INTERBANCARIA" ? titularDestinoFinal : null,
      monto,
      glosa: glosaInput.trim() || "Transferencia electrónica",
    };

    try {
      // Intentar API backend
      const res = await api.post<Transferencia>("m4", "/transferencias", payload);
      finalizarTransferenciaExitosa({
        ...res,
        cuentaOrigenNumero: cuentaOrigen.numero,
        clienteNombre: cliente ? `${cliente.nombres} ${cliente.apellidos}` : "Cliente",
        titularDestino: titularDestinoFinal,
        bancoDestino: bancoDestinoFinal,
      });
    } catch {
      // Fallback Mock Transaction
      const codigoAchGenerado =
        tipoTransferencia === "INTERBANCARIA"
          ? `ACH-${Math.floor(100000 + Math.random() * 900000)}`
          : null;

      const mockTrf: Transferencia = {
        id: Date.now(),
        tipo: tipoTransferencia,
        clienteId: Number(clienteIdSel),
        cuentaOrigenId: cuentaOrigen.id,
        cuentaDestinoNumero: nroCuentaDestinoFinal,
        bancoDestino: bancoDestinoFinal,
        titularDestino: titularDestinoFinal,
        monto,
        glosa: glosaInput.trim() || "Transferencia electrónica",
        estado: "COMPLETADA",
        codigoAch: codigoAchGenerado,
        fecha: new Date().toISOString(),
        cuentaOrigenNumero: cuentaOrigen.numero,
        clienteNombre: cliente ? `${cliente.nombres} ${cliente.apellidos}` : "Cliente",
      };

      finalizarTransferenciaExitosa(mockTrf);
    } finally {
      setIsSubmitting(false);
    }
  };

  const finalizarTransferenciaExitosa = (trf: Transferencia) => {
    // 1. Debitar saldo de cuenta origen localmente
    setCuentas((prev) =>
      prev.map((c) => (c.id === trf.cuentaOrigenId ? { ...c, saldo: c.saldo - trf.monto } : c))
    );

    // 2. Si fue PROPIA o TERCERO existente en mock, acreditar saldo
    if (trf.tipo === "PROPIA" || trf.tipo === "TERCERO") {
      setCuentas((prev) =>
        prev.map((c) => (c.numero === trf.cuentaDestinoNumero ? { ...c, saldo: c.saldo + trf.monto } : c))
      );
    }

    // 3. Agregar a historial
    setTransferencias((prev) => [trf, ...prev]);

    // 4. Notificar y abrir comprobante
    toast.success(`Transferencia ${trf.tipo} completada con éxito`);
    setComprobanteModal(trf);
  };

  // KPIs
  const totalTransferido = useMemo(() => {
    return transferencias
      .filter((t) => t.estado === "COMPLETADA")
      .reduce((acc, t) => acc + Number(t.monto), 0);
  }, [transferencias]);

  // Historial filtrado
  const transferenciasFiltradas = useMemo(() => {
    return transferencias.filter((t) => {
      const matchTipo = filtroTipoHistorial === "TODAS" || t.tipo === filtroTipoHistorial;
      const term = busquedaHistorial.toLowerCase();
      const matchSearch =
        !term ||
        t.cuentaDestinoNumero.toLowerCase().includes(term) ||
        (t.cuentaOrigenNumero && t.cuentaOrigenNumero.toLowerCase().includes(term)) ||
        (t.titularDestino && t.titularDestino.toLowerCase().includes(term)) ||
        (t.glosa && t.glosa.toLowerCase().includes(term)) ||
        (t.codigoAch && t.codigoAch.toLowerCase().includes(term));
      return matchTipo && matchSearch;
    });
  }, [transferencias, filtroTipoHistorial, busquedaHistorial]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Transferencias"
        description="Mueve fondos en tiempo real entre tus cuentas de ahorro, a terceros del banco o interbancarias nacionales."
      />

      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Transferencias Procesadas" value={transferencias.length} icon={ArrowLeftRight} />
        <KpiCard label="Total Transferido" value={formatMoney(totalTransferido)} icon={CreditCard} />
        <KpiCard label="Límite Interbancario (ACH)" value="Bs 50.000,00" icon={ShieldCheck} />
        <KpiCard label="Comisión por Operación" value="Bs 0.00 (Gratis)" icon={CheckCircle2} />
      </div>

      {/* Tabs Principales */}
      <Tabs defaultValue="nueva" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2 max-w-md">
          <TabsTrigger value="nueva">Nueva Transferencia</TabsTrigger>
          <TabsTrigger value="historial">Historial ({transferencias.length})</TabsTrigger>
        </TabsList>

        {/* TAB 1: FORMULARIO DE TRANSFERENCIA */}
        <TabsContent value="nueva" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-12">
            {/* Formulario Principal */}
            <div className="space-y-6 lg:col-span-7">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base font-semibold">1. Tipo de Transferencia</CardTitle>
                  <CardDescription>Elige el destino y modalidad de transferencia de fondos.</CardDescription>
                  <div className="grid grid-cols-3 gap-2 pt-2">
                    <Button
                      type="button"
                      variant={tipoTransferencia === "PROPIA" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setTipoTransferencia("PROPIA")}
                      className="text-xs gap-1.5"
                    >
                      <Wallet className="h-3.5 w-3.5" /> Entre Mis Cuentas
                    </Button>
                    <Button
                      type="button"
                      variant={tipoTransferencia === "TERCERO" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setTipoTransferencia("TERCERO")}
                      className="text-xs gap-1.5"
                    >
                      <UserCheck className="h-3.5 w-3.5" /> A Terceros Chuno
                    </Button>
                    <Button
                      type="button"
                      variant={tipoTransferencia === "INTERBANCARIA" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setTipoTransferencia("INTERBANCARIA")}
                      className="text-xs gap-1.5"
                    >
                      <Building className="h-3.5 w-3.5" /> Interbancaria (ACH)
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Selector de Cliente Ordenante */}
                  <div className="space-y-1.5">
                    <Label>Cliente Ordenante</Label>
                    <Select value={clienteIdSel} onValueChange={setClienteIdSel}>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar cliente..." />
                      </SelectTrigger>
                      <SelectContent>
                        {clientes.map((c) => (
                          <SelectItem key={c.id} value={String(c.id)}>
                            {c.nombres} {c.apellidos} – CI: {c.ci}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Selector de Cuenta Origen */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center">
                      <Label>Cuenta Origen de Fondos</Label>
                      {cuentaOrigen && (
                        <span className="text-xs text-muted-foreground">
                          Disponible: <strong className="text-emerald-600">{formatMoney(cuentaOrigen.saldo)}</strong>
                        </span>
                      )}
                    </div>
                    <Select value={cuentaOrigenIdSel} onValueChange={setCuentaOrigenIdSel}>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar cuenta de origen..." />
                      </SelectTrigger>
                      <SelectContent>
                        {cuentasDelCliente.map((c) => (
                          <SelectItem key={c.id} value={String(c.id)}>
                            N° {c.numero} {c.alias ? `(${c.alias})` : ""} – Saldo: {formatMoney(c.saldo)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Sección Adaptativa de Destino */}
                  {tipoTransferencia === "PROPIA" && (
                    <div className="space-y-1.5 rounded-lg border p-3 bg-muted/20">
                      <Label>Cuenta Propia de Destino</Label>
                      {cuentasPropiasDestino.length > 0 ? (
                        <Select value={cuentaDestinoIdPropia} onValueChange={setCuentaDestinoIdPropia}>
                          <SelectTrigger>
                            <SelectValue placeholder="Seleccionar cuenta destino..." />
                          </SelectTrigger>
                          <SelectContent>
                            {cuentasPropiasDestino.map((c) => (
                              <SelectItem key={c.id} value={String(c.id)}>
                                N° {c.numero} {c.alias ? `(${c.alias})` : ""} – Saldo: {formatMoney(c.saldo)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <p className="text-xs text-amber-600">
                          Este cliente solo tiene una cuenta. No es posible transferir entre cuentas propias.
                        </p>
                      )}
                    </div>
                  )}

                  {tipoTransferencia === "TERCERO" && (
                    <div className="space-y-3 rounded-lg border p-3 bg-muted/20">
                      <div className="space-y-1.5">
                        <Label>Número de Cuenta Destino (Banco Chuno)</Label>
                        <Input
                          placeholder="Ej. 1000000003, 1000000004..."
                          value={cuentaDestinoNumero}
                          onChange={(e) => setCuentaDestinoNumero(e.target.value)}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label>Nombre del Destinatario</Label>
                        <Input
                          placeholder="Nombre confirmado del titular..."
                          value={titularDestino}
                          onChange={(e) => setTitularDestino(e.target.value)}
                        />
                      </div>
                    </div>
                  )}

                  {tipoTransferencia === "INTERBANCARIA" && (
                    <div className="space-y-3 rounded-lg border border-primary/20 p-3 bg-primary/5">
                      <Alert className="py-2 bg-background border-primary/30">
                        <AlertCircle className="h-4 w-4 text-primary" />
                        <AlertTitle className="text-xs font-semibold">Red Interbancaria ACH</AlertTitle>
                        <AlertDescription className="text-xs">
                          Límite máximo por operación: <strong>Bs 50.000,00</strong>. Horario continuo 24/7.
                        </AlertDescription>
                      </Alert>

                      <div className="space-y-1.5">
                        <Label>Banco de Destino</Label>
                        <Select value={bancoDestinoSel} onValueChange={setBancoDestinoSel}>
                          <SelectTrigger>
                            <SelectValue placeholder="Seleccionar entidad financiera..." />
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

                      <div className="space-y-1.5">
                        <Label>Número de Cuenta en el Otro Banco</Label>
                        <Input
                          placeholder="Ej. 201-5544332, 100029312..."
                          value={cuentaDestinoNumero}
                          onChange={(e) => setCuentaDestinoNumero(e.target.value)}
                        />
                      </div>

                      <div className="space-y-1.5">
                        <Label>Nombre Completo del Titular Destinatario</Label>
                        <Input
                          placeholder="Ej. Roberto Gómez Bolaños"
                          value={titularDestino}
                          onChange={(e) => setTitularDestino(e.target.value)}
                        />
                      </div>
                    </div>
                  )}

                  {/* Monto y Glosa */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label>Monto a Transferir (BOB)</Label>
                      <Input
                        type="number"
                        min="1"
                        step="0.5"
                        placeholder="0.00"
                        value={montoInput}
                        onChange={(e) => setMontoInput(e.target.value)}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Glosa / Concepto</Label>
                      <Input
                        placeholder="Ej. Pago alquiler, víveres..."
                        value={glosaInput}
                        onChange={(e) => setGlosaInput(e.target.value)}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Resumen y Botón de Ejecución */}
            <div className="space-y-6 lg:col-span-5">
              <Card className="sticky top-6">
                <CardHeader>
                  <CardTitle className="text-base font-semibold">2. Resumen y Autorización</CardTitle>
                  <CardDescription>Verifica los datos de la operación antes de emitir los fondos.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="rounded-lg bg-muted/50 p-4 space-y-2.5 text-xs">
                    <p className="font-semibold uppercase tracking-wider text-muted-foreground text-[10px]">
                      Datos de la Transferencia
                    </p>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Tipo:</span>
                      <Badge variant="outline" className="text-[10px] uppercase font-bold">
                        {tipoTransferencia}
                      </Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Cuenta Origen:</span>
                      <span className="font-mono font-medium">{cuentaOrigen?.numero || "—"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Destinatario:</span>
                      <span className="font-medium text-right">{titularDestino || "—"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Banco Receptor:</span>
                      <span className="font-medium">
                        {tipoTransferencia === "INTERBANCARIA" ? bancoDestinoSel : "Banco Chuno"}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Cuenta Destino:</span>
                      <span className="font-mono font-medium">
                        {tipoTransferencia === "PROPIA"
                          ? cuentas.find((c) => String(c.id) === cuentaDestinoIdPropia)?.numero || "—"
                          : cuentaDestinoNumero || "—"}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Comisión por envío:</span>
                      <span className="text-emerald-600 font-semibold">Bs 0.00</span>
                    </div>
                    <div className="border-t pt-2 flex justify-between items-baseline">
                      <span className="text-sm font-bold">Importe a Débito:</span>
                      <span className="text-lg font-extrabold text-primary">
                        {formatMoney(parseFloat(montoInput) || 0)}
                      </span>
                    </div>
                  </div>

                  <Button
                    size="lg"
                    className="w-full gap-2 font-semibold"
                    disabled={isSubmitting || !cuentaOrigen || (tipoTransferencia === "PROPIA" && !cuentaDestinoIdPropia)}
                    onClick={handleTransferir}
                  >
                    {isSubmitting ? (
                      "Emitiendo transferencia..."
                    ) : (
                      <>
                        Confirmar y Transferir <ArrowRight className="h-4 w-4" />
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* TAB 2: HISTORIAL DE TRANSFERENCIAS */}
        <TabsContent value="historial" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4">
              <div>
                <CardTitle className="text-base font-semibold">Historial de Transferencias</CardTitle>
                <CardDescription>Registro cronológico de transferencias propias, a terceros e interbancarias.</CardDescription>
              </div>
              <div className="flex flex-wrap gap-2 w-full sm:w-auto">
                <Select value={filtroTipoHistorial} onValueChange={setFiltroTipoHistorial}>
                  <SelectTrigger className="w-36 text-xs">
                    <SelectValue placeholder="Tipo..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="TODAS">Todos los tipos</SelectItem>
                    <SelectItem value="PROPIA">Propias</SelectItem>
                    <SelectItem value="TERCERO">Terceros Chuno</SelectItem>
                    <SelectItem value="INTERBANCARIA">Interbancaria ACH</SelectItem>
                  </SelectContent>
                </Select>

                <div className="relative flex-1 sm:w-60">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar cuenta o glosa..."
                    value={busquedaHistorial}
                    onChange={(e) => setBusquedaHistorial(e.target.value)}
                    className="pl-8 text-xs"
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-muted/50 border-b font-medium text-muted-foreground">
                    <tr>
                      <th className="p-3">Fecha</th>
                      <th className="p-3">Tipo</th>
                      <th className="p-3">Cuenta Origen</th>
                      <th className="p-3">Destino / Entidad</th>
                      <th className="p-3">Glosa</th>
                      <th className="p-3">Monto</th>
                      <th className="p-3">Estado</th>
                      <th className="p-3 text-right">Comprobante</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {transferenciasFiltradas.map((trf) => (
                      <tr key={trf.id} className="hover:bg-muted/30 transition-colors">
                        <td className="p-3 text-muted-foreground whitespace-nowrap">{formatDate(trf.fecha)}</td>
                        <td className="p-3">
                          <Badge
                            variant="outline"
                            className={
                              trf.tipo === "INTERBANCARIA"
                                ? "border-purple-500/40 text-purple-700 dark:text-purple-300 bg-purple-500/10"
                                : trf.tipo === "TERCERO"
                                ? "border-blue-500/40 text-blue-700 dark:text-blue-300 bg-blue-500/10"
                                : "border-slate-500/40 text-slate-700 dark:text-slate-300 bg-slate-500/10"
                            }
                          >
                            {trf.tipo}
                          </Badge>
                          {trf.codigoAch && (
                            <span className="block font-mono text-[10px] text-muted-foreground pt-0.5">
                              {trf.codigoAch}
                            </span>
                          )}
                        </td>
                        <td className="p-3 font-mono">{trf.cuentaOrigenNumero || "1000000001"}</td>
                        <td className="p-3">
                          <p className="font-semibold">{trf.titularDestino || "Destinatario"}</p>
                          <span className="font-mono text-[10px] text-muted-foreground">
                            {trf.cuentaDestinoNumero} {trf.bancoDestino ? `• ${trf.bancoDestino}` : ""}
                          </span>
                        </td>
                        <td className="p-3 text-muted-foreground max-w-[180px] truncate">{trf.glosa}</td>
                        <td className="p-3 font-bold text-primary whitespace-nowrap">{formatMoney(trf.monto)}</td>
                        <td className="p-3">
                          <Badge
                            className={
                              trf.estado === "COMPLETADA"
                                ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30"
                                : "bg-rose-500/15 text-rose-700 border-rose-500/30"
                            }
                          >
                            {trf.estado}
                          </Badge>
                        </td>
                        <td className="p-3 text-right">
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 gap-1 text-xs"
                            onClick={() => setComprobanteModal(trf)}
                          >
                            <Printer className="h-3.5 w-3.5" /> Ver
                          </Button>
                        </td>
                      </tr>
                    ))}
                    {transferenciasFiltradas.length === 0 && (
                      <tr>
                        <td colSpan={8} className="p-8 text-center text-muted-foreground">
                          No se encontraron transferencias con los filtros aplicados.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* MODAL DE COMPROBANTE DE TRANSFERENCIA */}
      <Dialog open={!!comprobanteModal} onOpenChange={(open) => !open && setComprobanteModal(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-emerald-600" /> Comprobante Oficial de Transferencia
            </DialogTitle>
          </DialogHeader>

          {comprobanteModal && (
            <div className="space-y-4">
              <PrintableDocument
                title="COMPROBANTE DE TRANSFERENCIA BANCARIA"
                footer={
                  <div className="border-t pt-4 text-center text-[10px] text-muted-foreground space-y-1">
                    <p>Banco Startup Chuno S.A. – Entidad Supervisada por ASFI</p>
                    <p>Operación electrónica con cargo en cuenta y abono directo / ACH.</p>
                  </div>
                }
              >
                <div className="space-y-4 text-xs">
                  <div className="rounded-lg bg-slate-50 p-3 border grid grid-cols-2 gap-2 text-slate-800">
                    <div>
                      <span className="text-[10px] uppercase text-slate-500">Tipo de Transferencia:</span>
                      <p className="font-bold text-sm text-primary">{comprobanteModal.tipo}</p>
                      {comprobanteModal.codigoAch && (
                        <p className="font-mono text-[10px] text-muted-foreground">
                          Código ACH: {comprobanteModal.codigoAch}
                        </p>
                      )}
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] uppercase text-slate-500">Fecha y Hora:</span>
                      <p className="font-mono">{new Date(comprobanteModal.fecha).toLocaleString("es-BO")}</p>
                    </div>
                  </div>

                  <div className="border rounded-lg divide-y">
                    <div className="p-2.5 flex justify-between">
                      <span className="text-slate-500">Ordenante:</span>
                      <span className="font-semibold">{comprobanteModal.clienteNombre}</span>
                    </div>
                    <div className="p-2.5 flex justify-between">
                      <span className="text-slate-500">Cuenta de Origen:</span>
                      <span className="font-mono font-medium">{comprobanteModal.cuentaOrigenNumero}</span>
                    </div>
                    <div className="p-2.5 flex justify-between">
                      <span className="text-slate-500">Destinatario / Titular:</span>
                      <span className="font-semibold">{comprobanteModal.titularDestino || "Mismo Titular"}</span>
                    </div>
                    <div className="p-2.5 flex justify-between">
                      <span className="text-slate-500">Entidad Financiera Destino:</span>
                      <span className="font-medium">{comprobanteModal.bancoDestino || "Banco Chuno S.A."}</span>
                    </div>
                    <div className="p-2.5 flex justify-between">
                      <span className="text-slate-500">Cuenta de Destino:</span>
                      <span className="font-mono font-semibold">{comprobanteModal.cuentaDestinoNumero}</span>
                    </div>
                    <div className="p-2.5 flex justify-between">
                      <span className="text-slate-500">Glosa / Concepto:</span>
                      <span className="italic">{comprobanteModal.glosa || "Transferencia"}</span>
                    </div>
                    <div className="p-2.5 flex justify-between items-baseline bg-slate-50 font-bold text-sm">
                      <span>Monto Transferido:</span>
                      <span className="text-primary text-base">{formatMoney(comprobanteModal.monto)}</span>
                    </div>
                  </div>
                </div>
              </PrintableDocument>
            </div>
          )}

          <DialogFooter className="flex justify-between sm:justify-between items-center gap-2">
            <Button variant="ghost" onClick={() => setComprobanteModal(null)}>
              Cerrar
            </Button>
            <Button onClick={() => window.print()} className="gap-2">
              <Printer className="h-4 w-4" /> Imprimir / PDF
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
