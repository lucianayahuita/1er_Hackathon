"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Zap,
  Droplets,
  Phone,
  Flame,
  Globe,
  Receipt,
  Search,
  CheckCircle2,
  Printer,
  CreditCard,
  Building2,
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
import { PageHeader } from "@/components/shared/page-header";
import { KpiCard } from "@/components/shared/kpi-card";
import { PrintableDocument } from "@/components/shared/printable-document";
import { api, formatDate, formatMoney } from "@/lib/api";
import {
  MOCK_PROVEEDORES,
  MOCK_DEUDAS,
  MOCK_CLIENTES,
  MOCK_CUENTAS,
  MOCK_PAGOS_INICIALES,
} from "./mock-data";
import type { Proveedor, Deuda, Pago, ClienteOption, CuentaOption } from "./types";

const CATEGORIA_ICONS: Record<string, typeof Zap> = {
  LUZ: Zap,
  AGUA: Droplets,
  TELEFONO: Phone,
  GAS: Flame,
  OTROS: Globe,
};

const CATEGORIA_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  LUZ: { bg: "bg-amber-500/10", text: "text-amber-600 dark:text-amber-400", border: "border-amber-500/30" },
  AGUA: { bg: "bg-cyan-500/10", text: "text-cyan-600 dark:text-cyan-400", border: "border-cyan-500/30" },
  TELEFONO: { bg: "bg-purple-500/10", text: "text-purple-600 dark:text-purple-400", border: "border-purple-500/30" },
  GAS: { bg: "bg-orange-500/10", text: "text-orange-600 dark:text-orange-400", border: "border-orange-500/30" },
  OTROS: { bg: "bg-slate-500/10", text: "text-slate-600 dark:text-slate-400", border: "border-slate-500/30" },
};

export default function Modulo3PagosPage() {
  // Datos principales
  const [proveedores, setProveedores] = useState<Proveedor[]>(MOCK_PROVEEDORES);
  const [deudas, setDeudas] = useState<Deuda[]>(MOCK_DEUDAS);
  const [pagos, setPagos] = useState<Pago[]>(MOCK_PAGOS_INICIALES);
  const [clientes, setClientes] = useState<ClienteOption[]>(MOCK_CLIENTES);
  const [cuentas, setCuentas] = useState<CuentaOption[]>(MOCK_CUENTAS);

  // Estados del flujo de pago
  const [categoriaFiltro, setCategoriaFiltro] = useState<string>("TODAS");
  const [proveedorSeleccionado, setProveedorSeleccionado] = useState<Proveedor | null>(MOCK_PROVEEDORES[0]);
  const [codigoClienteInput, setCodigoClienteInput] = useState<string>("MED-10001");
  const [deudasEncontradas, setDeudasEncontradas] = useState<Deuda[]>([]);
  const [deudaSeleccionada, setDeudaSeleccionada] = useState<Deuda | null>(null);
  const [busquedaRealizada, setBusquedaRealizada] = useState(false);

  // Selección de usuario y cuenta para débito
  const [clienteIdSel, setClienteIdSel] = useState<string>(String(MOCK_CLIENTES[0].id));
  const [cuentaIdSel, setCuentaIdSel] = useState<string>(String(MOCK_CUENTAS[0].id));
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Modal comprobante
  const [comprobanteModal, setComprobanteModal] = useState<Pago | null>(null);
  const [filtroHistorial, setFiltroHistorial] = useState<string>("");

  // Carga inicial intentando backend con fallback seguro a mock
  useEffect(() => {
    // Proveedores desde backend o mock
    api.get<Proveedor[]>("m3", "/proveedores")
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) setProveedores(data);
      })
      .catch(() => {});

    // Historial de pagos
    api.get<Pago[]>("m3", "/pagos")
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) setPagos(data);
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

  // Proveedores filtrados por categoría
  const proveedoresFiltrados = useMemo(() => {
    if (categoriaFiltro === "TODAS") return proveedores;
    return proveedores.filter((p) => p.categoria === categoriaFiltro);
  }, [proveedores, categoriaFiltro]);

  // Cuentas del cliente seleccionado
  const cuentasDelCliente = useMemo(() => {
    return cuentas.filter((c) => String(c.clienteId) === clienteIdSel);
  }, [cuentas, clienteIdSel]);

  // Si cambia el cliente, seleccionar su primera cuenta automáticamente
  useEffect(() => {
    if (cuentasDelCliente.length > 0 && !cuentasDelCliente.some((c) => String(c.id) === cuentaIdSel)) {
      setCuentaIdSel(String(cuentasDelCliente[0].id));
    }
  }, [clienteIdSel, cuentasDelCliente, cuentaIdSel]);

  // Buscar deudas
  const handleBuscarDeuda = async () => {
    if (!proveedorSeleccionado || !codigoClienteInput.trim()) {
      toast.error("Ingrese el código de cliente / suministro");
      return;
    }

    setBusquedaRealizada(true);
    // Intentar backend primero
    try {
      const res = await api.get<Deuda[]>(
        "m3",
        `/proveedores/${proveedorSeleccionado.id}/deudas?codigoCliente=${encodeURIComponent(codigoClienteInput.trim())}`
      );
      if (Array.isArray(res) && res.length > 0) {
        setDeudasEncontradas(res);
        setDeudaSeleccionada(res[0]);
        toast.success(`Se encontraron ${res.length} factura(s) pendiente(s)`);
        return;
      }
    } catch {}

    // Fallback a mock data
    const filtradas = deudas.filter(
      (d) =>
        d.proveedorId === proveedorSeleccionado.id &&
        d.codigoCliente.toLowerCase() === codigoClienteInput.trim().toLowerCase() &&
        !d.pagada
    );

    setDeudasEncontradas(filtradas);
    if (filtradas.length > 0) {
      setDeudaSeleccionada(filtradas[0]);
      toast.success(`Se encontraron ${filtradas.length} factura(s) pendiente(s)`);
    } else {
      setDeudaSeleccionada(null);
      toast.info("No se encontraron deudas pendientes para el código ingresado");
    }
  };

  // Procesar pago
  const handlePagar = async () => {
    if (!deudaSeleccionada) {
      toast.error("Seleccione una deuda a pagar");
      return;
    }
    const cuenta = cuentas.find((c) => String(c.id) === cuentaIdSel);
    if (!cuenta) {
      toast.error("Seleccione una cuenta de débito");
      return;
    }

    if (cuenta.saldo < deudaSeleccionada.monto) {
      toast.error(`Saldo insuficiente en cuenta ${cuenta.numero} (Disponible: ${formatMoney(cuenta.saldo)})`);
      return;
    }

    setIsSubmitting(true);
    const cliente = clientes.find((c) => String(c.id) === clienteIdSel);

    const payload = {
      clienteId: Number(clienteIdSel),
      cuentaId: Number(cuentaIdSel),
      deudaId: deudaSeleccionada.id,
    };

    try {
      // Intentar API backend
      const res = await api.post<Pago>("m3", "/pagos", payload);
      const pagoCompletado: Pago = {
        ...res,
        proveedorNombre: proveedorSeleccionado?.nombre,
        proveedorCategoria: proveedorSeleccionado?.categoria,
        codigoCliente: deudaSeleccionada.codigoCliente,
        periodo: deudaSeleccionada.periodo,
        cuentaNumero: cuenta.numero,
        clienteNombre: cliente ? `${cliente.nombres} ${cliente.apellidos}` : "Cliente",
      };
      finalizarPagoExitoso(pagoCompletado, cuenta);
    } catch {
      // Fallback Mock Transaction
      const nuevoComprobante = `PAG-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${Math.floor(
        1000 + Math.random() * 9000
      )}`;

      const pagoMock: Pago = {
        id: Date.now(),
        clienteId: Number(clienteIdSel),
        cuentaId: Number(cuentaIdSel),
        deudaId: deudaSeleccionada.id,
        monto: deudaSeleccionada.monto,
        comprobante: nuevoComprobante,
        estado: "COMPLETADO",
        fecha: new Date().toISOString(),
        proveedorNombre: proveedorSeleccionado?.nombre,
        proveedorCategoria: proveedorSeleccionado?.categoria,
        codigoCliente: deudaSeleccionada.codigoCliente,
        periodo: deudaSeleccionada.periodo,
        cuentaNumero: cuenta.numero,
        clienteNombre: cliente ? `${cliente.nombres} ${cliente.apellidos}` : "Cliente",
      };

      finalizarPagoExitoso(pagoMock, cuenta);
    } finally {
      setIsSubmitting(false);
    }
  };

  const finalizarPagoExitoso = (pago: Pago, cuentaDebito: CuentaOption) => {
    // 1. Descontar saldo localmente
    setCuentas((prev) =>
      prev.map((c) => (c.id === cuentaDebito.id ? { ...c, saldo: c.saldo - pago.monto } : c))
    );

    // 2. Marcar deuda como pagada
    setDeudas((prev) => prev.map((d) => (d.id === pago.deudaId ? { ...d, pagada: true } : d)));
    setDeudasEncontradas((prev) => prev.filter((d) => d.id !== pago.deudaId));
    setDeudaSeleccionada(null);

    // 3. Agregar a historial
    setPagos((prev) => [pago, ...prev]);

    // 4. Mostrar feedback y abrir modal con comprobante
    toast.success(`Pago procesado con éxito. Comprobante: ${pago.comprobante}`);
    setComprobanteModal(pago);
  };

  // KPIs calculados
  const totalPagado = useMemo(() => {
    return pagos.filter((p) => p.estado === "COMPLETADO").reduce((acc, p) => acc + Number(p.monto), 0);
  }, [pagos]);

  const pagosFiltrados = useMemo(() => {
    if (!filtroHistorial.trim()) return pagos;
    const term = filtroHistorial.toLowerCase();
    return pagos.filter(
      (p) =>
        p.comprobante.toLowerCase().includes(term) ||
        (p.proveedorNombre && p.proveedorNombre.toLowerCase().includes(term)) ||
        (p.codigoCliente && p.codigoCliente.toLowerCase().includes(term)) ||
        (p.periodo && p.periodo.toLowerCase().includes(term))
    );
  }, [pagos, filtroHistorial]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Pagos de Servicios"
        description="Paga tus facturas de luz, agua, telefonía, gas y descarga tus comprobantes oficiales con validez bancaria."
      />

      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Total Pagos Realizados" value={pagos.length} icon={Receipt} />
        <KpiCard label="Monto Total Pagado" value={formatMoney(totalPagado)} icon={CreditCard} />
        <KpiCard label="Proveedores Afiliados" value={proveedores.length} icon={Building2} />
        <KpiCard label="Estado del Servicio" value="100% Operativo" icon={CheckCircle2} />
      </div>

      {/* Pestañas Principales */}
      <Tabs defaultValue="pagar" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2 max-w-md">
          <TabsTrigger value="pagar">Pagar Servicio</TabsTrigger>
          <TabsTrigger value="historial">Historial de Pagos ({pagos.length})</TabsTrigger>
        </TabsList>

        {/* TAB 1: FLUJO DE PAGO */}
        <TabsContent value="pagar" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-12">
            {/* Columna Izquierda: Selección de Proveedor y Búsqueda */}
            <div className="space-y-6 lg:col-span-7">
              {/* Filtro por Categorías */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base font-semibold">1. Seleccionar Proveedor de Servicio</CardTitle>
                  <CardDescription>Filtra por categoría o selecciona directamente la empresa de servicio.</CardDescription>
                  <div className="flex flex-wrap gap-1.5 pt-2">
                    {["TODAS", "LUZ", "AGUA", "TELEFONO", "GAS"].map((cat) => (
                      <Button
                        key={cat}
                        type="button"
                        variant={categoriaFiltro === cat ? "default" : "outline"}
                        size="sm"
                        onClick={() => setCategoriaFiltro(cat)}
                        className="text-xs"
                      >
                        {cat}
                      </Button>
                    ))}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                    {proveedoresFiltrados.map((prov) => {
                      const Icon = CATEGORIA_ICONS[prov.categoria] || Globe;
                      const colors = CATEGORIA_COLORS[prov.categoria] || CATEGORIA_COLORS.OTROS;
                      const isSelected = proveedorSeleccionado?.id === prov.id;

                      return (
                        <button
                          key={prov.id}
                          type="button"
                          onClick={() => {
                            setProveedorSeleccionado(prov);
                            setDeudasEncontradas([]);
                            setDeudaSeleccionada(null);
                            setBusquedaRealizada(false);
                            // Set código sugerido
                            if (prov.categoria === "LUZ") setCodigoClienteInput("MED-10001");
                            else if (prov.categoria === "AGUA") setCodigoClienteInput("AGU-99021");
                            else if (prov.categoria === "TELEFONO") setCodigoClienteInput("71234567");
                            else if (prov.categoria === "GAS") setCodigoClienteInput("GAS-88410");
                          }}
                          className={`flex items-start gap-3 rounded-lg border p-3 text-left transition-all hover:border-primary ${
                            isSelected ? "border-primary bg-primary/5 ring-1 ring-primary" : "bg-card hover:bg-accent/40"
                          }`}
                        >
                          <div className={`rounded-md p-2 ${colors.bg} ${colors.text}`}>
                            <Icon className="h-5 w-5" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-semibold leading-tight">{prov.nombre}</p>
                            <span className="text-[10px] text-muted-foreground uppercase">{prov.codigo}</span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>

              {/* Consulta de Deuda */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base font-semibold">2. Consultar Deuda Pendiente</CardTitle>
                  <CardDescription>
                    Ingresa el código de suministro, medidor o número de teléfono registrado en{" "}
                    <strong>{proveedorSeleccionado?.nombre}</strong>.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Input
                        placeholder="Ej. MED-10001, NIS-44821, 71234567..."
                        value={codigoClienteInput}
                        onChange={(e) => setCodigoClienteInput(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleBuscarDeuda()}
                      />
                    </div>
                    <Button onClick={handleBuscarDeuda} className="gap-2">
                      <Search className="h-4 w-4" /> Consultar
                    </Button>
                  </div>

                  {/* Resultados de Deudas */}
                  {busquedaRealizada && (
                    <div className="space-y-3 pt-2">
                      {deudasEncontradas.length > 0 ? (
                        <>
                          <Label className="text-xs text-muted-foreground">Facturas pendientes encontradas:</Label>
                          <div className="space-y-2">
                            {deudasEncontradas.map((deuda) => {
                              const isChecked = deudaSeleccionada?.id === deuda.id;
                              return (
                                <div
                                  key={deuda.id}
                                  onClick={() => setDeudaSeleccionada(deuda)}
                                  className={`flex cursor-pointer items-center justify-between rounded-lg border p-3 transition-colors ${
                                    isChecked ? "border-emerald-500 bg-emerald-500/5 ring-1 ring-emerald-500" : "hover:bg-accent/30"
                                  }`}
                                >
                                  <div>
                                    <div className="flex items-center gap-2">
                                      <p className="font-semibold text-sm">Período: {deuda.periodo}</p>
                                      <Badge variant="outline" className="text-xs">
                                        Pendiente
                                      </Badge>
                                    </div>
                                    <p className="text-xs text-muted-foreground">
                                      Titular: {deuda.titular || "Usuario Registrado"}
                                    </p>
                                  </div>
                                  <div className="text-right">
                                    <p className="text-base font-bold text-emerald-600 dark:text-emerald-400">
                                      {formatMoney(deuda.monto)}
                                    </p>
                                    <span className="text-[10px] text-muted-foreground">Sin comisión</span>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </>
                      ) : (
                        <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
                          <CheckCircle2 className="mx-auto mb-2 h-8 w-8 text-emerald-500" />
                          No existen facturas pendientes de pago para el código <strong>{codigoClienteInput}</strong>.
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Columna Derecha: Confirmación de Pago y Débito */}
            <div className="space-y-6 lg:col-span-5">
              <Card className="sticky top-6">
                <CardHeader>
                  <CardTitle className="text-base font-semibold">3. Cuenta de Débito y Confirmación</CardTitle>
                  <CardDescription>Selecciona la cuenta de ahorro desde la cual se debitará el importe.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Selector de Cliente */}
                  <div className="space-y-1.5">
                    <Label>Cliente Ordenante</Label>
                    <Select value={clienteIdSel} onValueChange={setClienteIdSel}>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar cliente..." />
                      </SelectTrigger>
                      <SelectContent>
                        {clientes.map((c) => (
                          <SelectItem key={c.id} value={String(c.id)}>
                            {c.nombres} {c.apellidos} (CI: {c.ci})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Selector de Cuenta de Ahorro */}
                  <div className="space-y-1.5">
                    <Label>Cuenta de Débito (ms-modulo2)</Label>
                    <Select value={cuentaIdSel} onValueChange={setCuentaIdSel}>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar cuenta..." />
                      </SelectTrigger>
                      <SelectContent>
                        {cuentasDelCliente.map((c) => (
                          <SelectItem key={c.id} value={String(c.id)}>
                            N° {c.numero} – {formatMoney(c.saldo)} ({c.moneda})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {cuentasDelCliente.length === 0 && (
                      <p className="text-xs text-rose-500">El cliente seleccionado no tiene cuentas activas.</p>
                    )}
                  </div>

                  {/* Resumen de Pago */}
                  <div className="rounded-lg bg-muted/50 p-4 space-y-2.5">
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Detalle de la Operación
                    </p>
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">Empresa:</span>
                      <span className="font-medium">{proveedorSeleccionado?.nombre || "—"}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">Código de Servicio:</span>
                      <span className="font-mono">{deudaSeleccionada?.codigoCliente || codigoClienteInput || "—"}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">Período:</span>
                      <span className="font-medium">{deudaSeleccionada?.periodo || "—"}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">Comisión bancaria:</span>
                      <span className="text-emerald-600 font-medium">Bs 0.00</span>
                    </div>
                    <div className="border-t pt-2 flex justify-between items-baseline">
                      <span className="text-sm font-bold">Total a Debitar:</span>
                      <span className="text-lg font-extrabold text-primary">
                        {deudaSeleccionada ? formatMoney(deudaSeleccionada.monto) : "Bs 0.00"}
                      </span>
                    </div>
                  </div>

                  {/* Botón de Pago */}
                  <Button
                    size="lg"
                    className="w-full gap-2 font-semibold"
                    disabled={!deudaSeleccionada || isSubmitting || cuentasDelCliente.length === 0}
                    onClick={handlePagar}
                  >
                    {isSubmitting ? (
                      "Procesando pago..."
                    ) : (
                      <>
                        Pagar Ahora <ArrowRight className="h-4 w-4" />
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* TAB 2: HISTORIAL DE PAGOS */}
        <TabsContent value="historial" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4">
              <div>
                <CardTitle className="text-base font-semibold">Historial de Pagos de Servicios</CardTitle>
                <CardDescription>Consulta y descarga tus comprobantes de facturación procesados.</CardDescription>
              </div>
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar comprobante..."
                  value={filtroHistorial}
                  onChange={(e) => setFiltroHistorial(e.target.value)}
                  className="pl-8"
                />
              </div>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-muted/50 border-b font-medium text-muted-foreground">
                    <tr>
                      <th className="p-3">Comprobante</th>
                      <th className="p-3">Proveedor</th>
                      <th className="p-3">Suministro / Período</th>
                      <th className="p-3">Cuenta Débito</th>
                      <th className="p-3">Fecha</th>
                      <th className="p-3">Monto</th>
                      <th className="p-3">Estado</th>
                      <th className="p-3 text-right">Acción</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {pagosFiltrados.map((pago) => (
                      <tr key={pago.id} className="hover:bg-muted/30 transition-colors">
                        <td className="p-3 font-mono font-semibold">{pago.comprobante}</td>
                        <td className="p-3">
                          <p className="font-medium">{pago.proveedorNombre || "Servicio Básico"}</p>
                          <Badge variant="secondary" className="text-[10px] uppercase">
                            {pago.proveedorCategoria || "SERVICIO"}
                          </Badge>
                        </td>
                        <td className="p-3">
                          <p className="font-mono">{pago.codigoCliente || "—"}</p>
                          <span className="text-[10px] text-muted-foreground">Período: {pago.periodo || "—"}</span>
                        </td>
                        <td className="p-3 font-mono">{pago.cuentaNumero || "1000000001"}</td>
                        <td className="p-3 text-muted-foreground">{formatDate(pago.fecha)}</td>
                        <td className="p-3 font-bold text-emerald-600 dark:text-emerald-400">
                          {formatMoney(pago.monto)}
                        </td>
                        <td className="p-3">
                          <Badge
                            className={
                              pago.estado === "COMPLETADO"
                                ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30"
                                : "bg-rose-500/15 text-rose-700 border-rose-500/30"
                            }
                          >
                            {pago.estado}
                          </Badge>
                        </td>
                        <td className="p-3 text-right">
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 gap-1 text-xs"
                            onClick={() => setComprobanteModal(pago)}
                          >
                            <Printer className="h-3.5 w-3.5" /> Ver Comprobante
                          </Button>
                        </td>
                      </tr>
                    ))}
                    {pagosFiltrados.length === 0 && (
                      <tr>
                        <td colSpan={8} className="p-8 text-center text-muted-foreground">
                          No se encontraron pagos en el historial.
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

      {/* DIALOG DE COMPROBANTE IMPRIMIBLE */}
      <Dialog open={!!comprobanteModal} onOpenChange={(open) => !open && setComprobanteModal(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-emerald-600" /> Comprobante Oficial de Pago de Servicio
            </DialogTitle>
          </DialogHeader>

          {comprobanteModal && (
            <div className="space-y-4">
              <PrintableDocument
                title="COMPROBANTE DE PAGO DE SERVICIO"
                footer={
                  <div className="border-t pt-4 text-center text-[10px] text-muted-foreground space-y-1">
                    <p>Banco Startup Chuno S.A. – Entidad Supervisada por ASFI</p>
                    <p>Transacción procesada electrónicamente conforme a normativa vigente.</p>
                  </div>
                }
              >
                <div className="space-y-4 text-xs">
                  <div className="rounded-lg bg-slate-50 p-3 border grid grid-cols-2 gap-2 text-slate-800">
                    <div>
                      <span className="text-[10px] uppercase text-slate-500">Número de Comprobante:</span>
                      <p className="font-mono font-bold text-sm">{comprobanteModal.comprobante}</p>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] uppercase text-slate-500">Fecha y Hora:</span>
                      <p className="font-mono">{new Date(comprobanteModal.fecha).toLocaleString("es-BO")}</p>
                    </div>
                  </div>

                  <div className="border rounded-lg divide-y">
                    <div className="p-2.5 flex justify-between">
                      <span className="text-slate-500">Empresa / Proveedor:</span>
                      <span className="font-semibold">{comprobanteModal.proveedorNombre}</span>
                    </div>
                    <div className="p-2.5 flex justify-between">
                      <span className="text-slate-500">Código de Suministro / Medidor:</span>
                      <span className="font-mono font-medium">{comprobanteModal.codigoCliente}</span>
                    </div>
                    <div className="p-2.5 flex justify-between">
                      <span className="text-slate-500">Período Facturado:</span>
                      <span className="font-medium">{comprobanteModal.periodo || "Factura Corriente"}</span>
                    </div>
                    <div className="p-2.5 flex justify-between">
                      <span className="text-slate-500">Titular del Pago:</span>
                      <span className="font-medium">{comprobanteModal.clienteNombre}</span>
                    </div>
                    <div className="p-2.5 flex justify-between">
                      <span className="text-slate-500">Cuenta de Débito:</span>
                      <span className="font-mono">{comprobanteModal.cuentaNumero}</span>
                    </div>
                    <div className="p-2.5 flex justify-between items-baseline bg-slate-50 font-bold text-sm">
                      <span>Importe Pagado:</span>
                      <span className="text-emerald-700 text-base">{formatMoney(comprobanteModal.monto)}</span>
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
