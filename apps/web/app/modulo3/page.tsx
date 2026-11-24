"use client";

import { useEffect, useMemo, useState } from "react";
import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { PageHeader } from "@/components/shared/page-header";
import { PrintableDocument, renderTemplate } from "@/components/shared/printable-document";
import { RegistrosCrud } from "@/components/shared/registros-crud";
import { api, formatDate, formatMoney, type Registro } from "@/lib/api";

const PLANTILLA_BASE = `Por medio del presente documento se deja constancia que {{nombre}}, con código {{codigo}}, perteneciente a la categoría {{categoria}}, registra a la fecha {{fecha}} un monto de {{monto}}.

El presente documento se emite a solicitud del interesado para los fines que estime convenientes.`;

/** Mockup M5 – Documento parametrizable e imprimible (datos desde ms-modulo1). */
export default function Modulo3Page() {
  const [registros, setRegistros] = useState<Registro[]>([]);
  const [selId, setSelId] = useState<string>("");
  const [plantilla, setPlantilla] = useState(PLANTILLA_BASE);

  useEffect(() => {
    api.get<Registro[]>("m1", "/registros?activo=true").then(setRegistros).catch(() => {});
  }, []);

  const sel = registros.find((r) => String(r.id) === selId);
  const texto = useMemo(
    () =>
      sel
        ? renderTemplate(plantilla, {
            nombre: sel.nombre,
            codigo: sel.codigo,
            categoria: sel.categoria,
            fecha: formatDate(sel.fecha),
            monto: formatMoney(sel.monto),
          })
        : "Seleccione un registro para generar el documento.",
    [sel, plantilla],
  );

  return (
    <Tabs defaultValue="documento">
      <TabsList className="mb-4 print:hidden">
        <TabsTrigger value="documento">Generar documento</TabsTrigger>
        <TabsTrigger value="registros">Registros</TabsTrigger>
      </TabsList>
      <TabsContent value="documento">
        <PageHeader
          title="Módulo 3"
          description="Documento parametrizable: variables {{nombre}} {{codigo}} {{categoria}} {{fecha}} {{monto}}"
          actions={
            <Button onClick={() => window.print()} disabled={!sel}>
              <Printer /> Imprimir / PDF
            </Button>
          }
        />
        <div className="grid gap-6 xl:grid-cols-[360px_1fr]">
          <Card className="h-fit print:hidden">
            <CardHeader>
              <CardTitle>Parámetros</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-1.5">
                <Label>Registro (ms-modulo1)</Label>
                <Select value={selId} onValueChange={setSelId}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Seleccionar..." />
                  </SelectTrigger>
                  <SelectContent>
                    {registros.map((r) => (
                      <SelectItem key={r.id} value={String(r.id)}>
                        {r.codigo} – {r.nombre}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-1.5">
                <Label>Plantilla</Label>
                <Textarea rows={10} value={plantilla} onChange={(e) => setPlantilla(e.target.value)} />
              </div>
            </CardContent>
          </Card>
          <PrintableDocument
            title="Documento"
            footer={
              <div className="flex justify-around text-center text-xs">
                <div className="w-48 border-t pt-2">Firma responsable</div>
                <div className="w-48 border-t pt-2">Firma interesado</div>
              </div>
            }
          >
            {texto}
          </PrintableDocument>
        </div>
      </TabsContent>
      <TabsContent value="registros">
        <RegistrosCrud mod="m3" />
      </TabsContent>
    </Tabs>
  );
}
