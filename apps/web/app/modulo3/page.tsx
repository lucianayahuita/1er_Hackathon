"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
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
  Plus,
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

export default function Modulo3PagosPage() {
  const [pagos, setPagos] = useState<Pago[] | null>(null);
  const [proveedores, setProveedores] = useState<Proveedor[]>(MOCK_PROVEEDORES);
  const [deudas, setDeudas] = useState<Deuda[]>(MOCK_DEUDAS);
  const [clientes, setClientes] = useState<ClienteOption[]>(MOCK_CLIENTES);
  const [cuentas, setCuentas] = useState<CuentaOption[]>(MOCK_CUENTAS);

  // Filtros de tabla
  const [q, setQ] = useState("");
  const [filtroCategoria, setFiltroCategoria] = useState("todas");

  // Modal Nuevo Pago
  const [nuevoPagoOpen, setNuevoPagoOpen] = useState(false);
  const [categoriaSel, setCategoriaSel] = useState("TODAS");
  const [provSel, setProvSel] = useState<Proveedor>(MOCK_PROVEEDORES[0]);
  const [codigoClienteInput, setCodigoClienteInput] = useState("MED-10001");
  const [deudasEncontradas, setDeudasEncontradas] = useState<Deuda[]>([]);
  const [deudaSel, setDeudaSel] = useState<Deuda | null>(null);
  const [busquedaRealizada, setBusquedaRealizada] = useState(false);
  const [clienteIdSel, setClienteIdSel] = useState(String(MOCK_CLIENTES[0].id));
  const [cuentaIdSel, setCuentaIdSel] = useState(String(MOCK_CUENTAS[0].id));
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Modal Comprobante
  const [comprobanteModal, setComprobanteModal] = useState<Pago | null>(null);

  const cargar = useCallback(async () => {
    try {
      const data = await api.get<Pago[]>("m3", "/pagos");
      if (Array.isArray(data)) {
        const normalizados: Pago[] = data.map((p) => ({
          ...p,
          proveedorNombre: p.proveedorNombre || p.deuda?.proveedor?.nombre,
          proveedorCategoria: p.proveedorCategoria || p.deuda?.proveedor?.categoria,
          codigoCliente: p.codigoCliente || p.deuda?.codigoCliente,
          periodo: p.periodo || p.deuda?.periodo,
        }));
        setPagos(normalizados);
      }
    } catch {
      setPagos(MOCK_PAGOS_INICIALES);
    }
  }, []);

  useEffect(() => {
    cargar();

    api.get<Proveedor[]>("m3", "/proveedores")
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          setProveedores(data);
          setProvSel(data[0]);
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

  useEffect(() => {
    if (cuentasDelCliente.length > 0 && !cuentasDelCliente.some((c) => String(c.id) === cuentaIdSel)) {
      setCuentaIdSel(String(cuentasDelCliente[0].id));
    }
  }, [clienteIdSel, cuentasDelCliente, cuentaIdSel]);

  const provsFiltrados = useMemo(() => {
    if (categoriaSel === "TODAS") return proveedores;
    return proveedores.filter((p) => p.categoria === categoriaSel);
  }, [proveedores, categoriaSel]);

  // Buscar deudas
  const handleBuscarDeuda = async () => {
    if (!provSel || !codigoClienteInput.trim()) {
      toast.error("Ingrese el código de cliente / suministro");
      return;
    }
    setBusquedaRealizada(true);
    try {
      const res = await api.get<Deuda[]>(
        "m3",
        `/proveedores/${provSel.id}/deudas?codigoCliente=${encodeURIComponent(codigoClienteInput.trim())}`
      );
      if (Array.isArray(res)) {
        if (res.length > 0) {
          setDeudasEncontradas(res);
          setDeudaSel(res[0]);
          toast.success(`Se encontraron ${res.length} factura(s) pendiente(s)`);
        } else {
          setDeudasEncontradas([]);
          setDeudaSel(null);
          toast.info("No se encontraron deudas pendientes para el código ingresado");
        }
        return;
      }
    } catch {}

    const filtradas = deudas.filter(
      (d) =>
        d.proveedorId === provSel.id &&
        d.codigoCliente.toLowerCase() === codigoClienteInput.trim().toLowerCase() &&
        !d.pagada
    );
    setDeudasEncontradas(filtradas);
    if (filtradas.length > 0) {
      setDeudaSel(filtradas[0]);
      toast.success(`Se encontraron ${filtradas.length} factura(s) pendiente(s)`);
    } else {
      setDeudaSel(null);
      toast.info("No se encontraron deudas pendientes para el código ingresado");
    }
  };

  // Pagar
  const handlePagar = async () => {
    if (!deudaSel) {
      toast.error("Seleccione una deuda a pagar");
      return;
    }
    const cuenta = cuentas.find((c) => String(c.id) === cuentaIdSel);
    if (!cuenta) {
      toast.error("Seleccione una cuenta de débito");
      return;
    }
    if (Number(cuenta.saldo) < Number(deudaSel.monto)) {
      toast.error(`Saldo insuficiente en cuenta ${cuenta.numero} (Disponible: ${formatMoney(cuenta.saldo)})`);
      return;
    }

    setIsSubmitting(true);
    const cliente = clientes.find((c) => String(c.id) === clienteIdSel);
    const payload = {
      clienteId: Number(clienteIdSel),
      cuentaId: Number(cuentaIdSel),
      deudaId: deudaSel.id,
    };

    try {
      const res = await api.post<Pago>("m3", "/pagos", payload);
      const pagoCompletado: Pago = {
        ...res,
        proveedorNombre: provSel.nombre,
        proveedorCategoria: provSel.categoria,
        codigoCliente: deudaSel.codigoCliente,
        periodo: deudaSel.periodo,
        cuentaNumero: cuenta.numero,
        clienteNombre: cliente ? `${cliente.nombres} ${cliente.apellidos}` : "Cliente",
      };
      setNuevoPagoOpen(false);
      finalizarPago(pagoCompletado, cuenta);
    } catch {
      const pagoMock: Pago = {
        id: Date.now(),
        clienteId: Number(clienteIdSel),
        cuentaId: Number(cuentaIdSel),
        deudaId: deudaSel.id,
        monto: deudaSel.monto,
        comprobante: `PAG-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${Math.floor(1000 + Math.random() * 9000)}`,
        estado: "COMPLETADO",
        fecha: new Date().toISOString(),
        proveedorNombre: provSel.nombre,
        proveedorCategoria: provSel.categoria,
        codigoCliente: deudaSel.codigoCliente,
        periodo: deudaSel.periodo,
        cuentaNumero: cuenta.numero,
        clienteNombre: cliente ? `${cliente.nombres} ${cliente.apellidos}` : "Cliente",
      };
      setNuevoPagoOpen(false);
      finalizarPago(pagoMock, cuenta);
    } finally {
      setIsSubmitting(false);
    }
  };

  const finalizarPago = (pago: Pago, cuenta: CuentaOption) => {
    setCuentas((prev) =>
      prev.map((c) => (c.id === cuenta.id ? { ...c, saldo: Number(c.saldo) - Number(pago.monto) } : c))
    );
    setDeudas((prev) => prev.map((d) => (d.id === pago.deudaId ? { ...d, pagada: true } : d)));
    setPagos((prev) => [pago, ...(prev ?? [])]);
    toast.success(`Pago procesado con éxito. Comprobante: ${pago.comprobante}`);
    setComprobanteModal(pago);
  };

  // KPIs
  const totalPagado = useMemo(() => {
    return (pagos ?? []).filter((p) => p.estado === "COMPLETADO").reduce((acc, p) => acc + Number(p.monto), 0);
  }, [pagos]);

  // Filtrado de tabla
  const filtrados = useMemo(() => {
    const t = q.toLowerCase();
    return (pagos ?? []).filter((p) => {
      const matchCat = filtroCategoria === "todas" || p.proveedorCategoria?.toUpperCase() === filtroCategoria.toUpperCase();
      const matchText =
        `${p.comprobante} ${p.proveedorNombre ?? ""} ${p.codigoCliente ?? ""} ${p.periodo ?? ""}`.toLowerCase().includes(t);
      return matchCat && matchText;
    });
  }, [pagos, q, filtroCategoria]);

  return (
    <>
      <PageHeader
        title="Pagos de servicios"
        description="Pago de luz, agua, telefonía, gas y emisión de comprobantes oficiales"
        actions={
          <Button onClick={() => setNuevoPagoOpen(true)}>
            <Plus /> Pagar servicio
          </Button>
        }
      />

      <div className="mb-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Total de pagos" value={pagos?.length ?? "—"} icon={Receipt} />
        <KpiCard label="Monto total pagado" value={pagos ? formatMoney(totalPagado) : "—"} icon={CreditCard} />
        <KpiCard label="Proveedores afiliados" value={proveedores.length} icon={Building2} />
        <KpiCard label="Estado del servicio" value="Operativo" icon={CheckCircle2} />
      </div>

      <Card>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-3">
            <div className="relative w-full max-w-sm">
              <Search className="absolute left-2.5 top-2 size-4 text-muted-foreground" />
              <Input
                className="pl-8"
                placeholder="Buscar por comprobante, empresa o código..."
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
            </div>
            <Select value={filtroCategoria} onValueChange={setFiltroCategoria}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Todas las categorías" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todas">Todas las categorías</SelectItem>
                <SelectItem value="LUZ">Luz</SelectItem>
                <SelectItem value="AGUA">Agua</SelectItem>
                <SelectItem value="TELEFONO">Telefonía</SelectItem>
                <SelectItem value="GAS">Gas</SelectItem>
                <SelectItem value="OTROS">Otros</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {pagos === null ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : filtrados.length === 0 ? (
            <EmptyState title="Sin pagos registrados" description="No hay pagos que coincidan con la búsqueda." />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Comprobante</TableHead>
                  <TableHead>Proveedor</TableHead>
                  <TableHead>Código / Período</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead className="text-right">Monto</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Acción</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtrados.map((pago) => (
                  <TableRow key={pago.id}>
                    <TableCell className="font-mono text-xs font-semibold">{pago.comprobante}</TableCell>
                    <TableCell>
                      <p className="font-medium">{pago.proveedorNombre || "Servicio Básico"}</p>
                      <Badge variant="outline" className="text-[10px] uppercase">
                        {pago.proveedorCategoria || "SERVICIO"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <span className="font-mono text-xs">{pago.codigoCliente || "—"}</span>
                      {pago.periodo && <span className="block text-[11px] text-muted-foreground">{pago.periodo}</span>}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">{formatDate(pago.fecha)}</TableCell>
                    <TableCell className="text-right font-semibold">{formatMoney(pago.monto)}</TableCell>
                    <TableCell>
                      <StatusBadge
                        status={pago.estado === "COMPLETADO" ? "activo" : "inactivo"}
                        label={pago.estado}
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setComprobanteModal(pago)}
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

      {/* DIÁLOGO REGISTRAR / PAGAR SERVICIO */}
      <Dialog open={nuevoPagoOpen} onOpenChange={setNuevoPagoOpen}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Pagar servicio básico</DialogTitle>
            <DialogDescription>
              Selecciona el proveedor, consulta las facturas pendientes y confirma el débito de tu cuenta.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Categorías y Proveedor */}
            <div className="space-y-2">
              <Label>1. Empresa de servicio</Label>
              <div className="flex flex-wrap gap-1.5 pb-2">
                {["TODAS", "LUZ", "AGUA", "TELEFONO", "GAS"].map((cat) => (
                  <Button
                    key={cat}
                    type="button"
                    variant={categoriaSel === cat ? "default" : "outline"}
                    size="sm"
                    className="text-xs h-7"
                    onClick={() => setCategoriaSel(cat)}
                  >
                    {cat}
                  </Button>
                ))}
              </div>
              <Select
                value={String(provSel.id)}
                onValueChange={(val) => {
                  const p = proveedores.find((item) => String(item.id) === val);
                  if (p) {
                    setProvSel(p);
                    setDeudasEncontradas([]);
                    setDeudaSel(null);
                    setBusquedaRealizada(false);
                    if (p.categoria === "LUZ") setCodigoClienteInput("MED-10001");
                    else if (p.categoria === "AGUA") setCodigoClienteInput("AGU-99021");
                    else if (p.categoria === "TELEFONO") setCodigoClienteInput("71234567");
                    else if (p.categoria === "GAS") setCodigoClienteInput("GAS-88410");
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar proveedor..." />
                </SelectTrigger>
                <SelectContent>
                  {provsFiltrados.map((p) => (
                    <SelectItem key={p.id} value={String(p.id)}>
                      {p.nombre} ({p.categoria})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Código y Consulta */}
            <div className="space-y-2">
              <Label>2. Código de suministro o medidor</Label>
              <div className="flex gap-2">
                <Input
                  placeholder="Ej. MED-10001..."
                  value={codigoClienteInput}
                  onChange={(e) => setCodigoClienteInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleBuscarDeuda()}
                />
                <Button type="button" variant="outline" onClick={handleBuscarDeuda}>
                  <Search /> Consultar
                </Button>
              </div>

              {busquedaRealizada && (
                <div className="space-y-2 pt-2">
                  {deudasEncontradas.length > 0 ? (
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground">Facturas pendientes:</Label>
                      {deudasEncontradas.map((d) => (
                        <div
                          key={d.id}
                          onClick={() => setDeudaSel(d)}
                          className={`flex cursor-pointer items-center justify-between rounded-lg border p-2.5 text-xs transition-colors ${
                            deudaSel?.id === d.id ? "border-primary bg-primary/5 ring-1 ring-primary" : "hover:bg-muted/40"
                          }`}
                        >
                          <div>
                            <p className="font-semibold">Período: {d.periodo}</p>
                            <p className="text-muted-foreground">{d.titular || "Usuario registrado"}</p>
                          </div>
                          <p className="font-bold text-sm text-primary">{formatMoney(d.monto)}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground border border-dashed rounded-lg p-3 text-center">
                      No se encontraron facturas pendientes para este código.
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Cuenta de débito */}
            <div className="space-y-2 pt-2 border-t">
              <Label>3. Cuenta de débito</Label>
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
                  <span className="text-xs text-muted-foreground">Cuenta de ahorro</span>
                  <Select value={cuentaIdSel} onValueChange={setCuentaIdSel}>
                    <SelectTrigger>
                      <SelectValue placeholder="Cuenta..." />
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
              {cuentasDelCliente.length === 0 && (
                <p className="text-xs text-destructive">El cliente no tiene cuentas activas disponibles.</p>
              )}
            </div>

            {deudaSel && (
              <div className="rounded-lg bg-muted/60 p-3 text-xs space-y-1 border">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total a pagar:</span>
                  <span className="font-bold text-sm text-primary">{formatMoney(deudaSel.monto)}</span>
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="gap-2">
            <Button variant="ghost" onClick={() => setNuevoPagoOpen(false)}>
              Cancelar
            </Button>
            <Button
              disabled={!deudaSel || isSubmitting || cuentasDelCliente.length === 0}
              onClick={handlePagar}
            >
              {isSubmitting ? "Procesando..." : "Confirmar pago"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* DIÁLOGO COMPROBANTE IMPRIMIBLE */}
      <Dialog open={!!comprobanteModal} onOpenChange={(open) => !open && setComprobanteModal(null)}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Comprobante de pago</DialogTitle>
          </DialogHeader>

          {comprobanteModal && (
            <PrintableDocument
              title="COMPROBANTE DE PAGO DE SERVICIO"
              footer={
                <div className="border-t pt-3 text-center text-[10px] text-muted-foreground">
                  Banco Startup Chuno S.A. – Entidad Supervisada por ASFI
                </div>
              }
            >
              <div className="space-y-3 text-xs">
                <div className="rounded-lg bg-muted/40 p-2.5 border grid grid-cols-2 gap-2">
                  <div>
                    <span className="text-[10px] uppercase text-muted-foreground">N° Comprobante:</span>
                    <p className="font-mono font-bold">{comprobanteModal.comprobante}</p>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] uppercase text-muted-foreground">Fecha:</span>
                    <p className="font-mono">{new Date(comprobanteModal.fecha).toLocaleString("es-BO")}</p>
                  </div>
                </div>

                <div className="border rounded-lg divide-y">
                  <div className="p-2 flex justify-between">
                    <span className="text-muted-foreground">Empresa:</span>
                    <span className="font-medium">{comprobanteModal.proveedorNombre}</span>
                  </div>
                  <div className="p-2 flex justify-between">
                    <span className="text-muted-foreground">Código de Suministro:</span>
                    <span className="font-mono font-medium">{comprobanteModal.codigoCliente}</span>
                  </div>
                  <div className="p-2 flex justify-between">
                    <span className="text-muted-foreground">Período:</span>
                    <span className="font-medium">{comprobanteModal.periodo || "Corriente"}</span>
                  </div>
                  <div className="p-2 flex justify-between">
                    <span className="text-muted-foreground">Cuenta Débito:</span>
                    <span className="font-mono">{comprobanteModal.cuentaNumero}</span>
                  </div>
                  <div className="p-2 flex justify-between items-baseline font-bold bg-muted/30">
                    <span>Monto Pagado:</span>
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
