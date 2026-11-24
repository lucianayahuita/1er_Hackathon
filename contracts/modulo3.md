# Contrato API – ms-modulo3: Pagos de Servicios
**Puerto:** `3003` · **Gateway:** `/api/m3` · **Dueño:** Elias (Backend) · Axl (Frontend)
**Dominio:** Startup Chuno – Banca por Internet · **Ponderación:** 100%
**Esquema BD:** `pagos` (PostgreSQL)

> Contrato alineado a las Historias de Usuario (HU-PAG-01..05) y DDL de base de datos (`pagos.proveedor_servicio`, `pagos.pago`, `pagos.afiliacion_servicio`).

---

## 1. Entidad Principal: `Pago`
Gestiona el pago de servicios básicos (luz, agua, teléfono, gas, internet). Se comunica con `ms-modulo2` para debitar el monto de la cuenta de ahorro y simula la integración con proveedores de servicios externos (ELFEC, SEMAPA, ENTEL, etc.).

| Campo | Tipo | Requerido | Notas / Validaciones |
|---|---|---|---|
| `id` | int / bigint | auto | Identificador interno del pago |
| `idClienteRef` | int / bigint | sí | Referencia lógica al cliente en `ms-modulo1` |
| `idCuentaRef` | int / bigint | sí | Referencia lógica a la cuenta de débito en `ms-modulo2` |
| `idProveedor` | int | sí | Identificador del proveedor (`ELFEC`, `SEMAPA`, `ENTEL`, etc.) |
| `codigoReferencia` | string | sí | Código de usuario del servicio (NIS, medidor, teléfono) |
| `periodoFacturado` | string | no | Período del servicio (ej. `'2026-10'`) |
| `monto` | number | sí | Importe a pagar (mayor a `0`) |
| `comision` | number | auto | Comisión fija del servicio (default `0`) |
| `monedaCodigo` | string | auto | Código de moneda (default `'BOB'`) |
| `estado` | string | auto | Enum: `'PENDIENTE'`, `'DEBITADO'`, `'CONFIRMADO'`, `'FALLIDO'`, `'REVERSADO'` |
| `nroComprobante` | string | auto | Número único de comprobante generado (ej. `'CMP-2026-000452'`) |
| `idTransaccionProv`| string | auto | Código de autorización retornado por el proveedor |
| `motivoFallo` | string | no | Explicación en caso de rechazo o reversa |
| `claveIdempotencia`| string | sí | Clave única para evitar pagos duplicados |
| `fechaSolicitud` | string (ISO) | auto | Timestamp en que se solicitó el pago |
| `fechaConfirmacion`| string (ISO) | auto | Timestamp en que se completó el pago |

---

## 2. Endpoints

| Método | Ruta | Body | Respuesta | Descripción / HU |
|---|---|---|---|---|
| `GET` | `/health` | — | `{ status: "ok", service: "ms-modulo3", timestamp }` | Health check del servicio |
| `GET` | `/pagos/proveedores` | — | `ProveedorServicio[]` | HU-PAG-01: Catálogo de proveedores agrupados por categoría |
| `GET` | `/pagos/deuda` | query params | `ConsultaDeudaResponse` | HU-PAG-02: Consulta importe pendiente de pago al proveedor |
| `GET` | `/pagos?idCliente=&estado=` | — | `Pago[]` | HU-PAG-05: Historial de pagos realizados |
| `GET` | `/pagos/:id` | — | `Pago` | HU-PAG-05: Detalle y comprobante para imprimir |
| `POST` | `/pagos` | `CreatePagoDto` | `Pago` | HU-PAG-03: Pagar servicio (debita en ms-modulo2 y confirma) |
| `GET` | `/pagos/afiliaciones?idCliente=`| — | `AfiliacionServicio[]`| HU-PAG-04: Servicios frecuentes afiliados del cliente |
| `POST` | `/pagos/afiliaciones` | `CreateAfiliacionDto`| `AfiliacionServicio` | HU-PAG-04: Afiliar un nuevo servicio frecuente |
| `PATCH`| `/pagos/afiliaciones/:id/baja` | — | `AfiliacionServicio` | HU-PAG-04: Baja lógica de afiliación (`activa = false`) |
| `GET` | `/pagos/stats` | — | `PagosStats` | Métricas para Dashboard (total recaudado, por categoría) |

---

## 3. Reglas de Negocio
1. **Débito en Cuentas (Integración HTTP con `ms-modulo2`):**
   Al procesar un pago (`POST /pagos`), el microservicio llama a `ms-modulo2` (`POST /cuentas/:id/retirar`) enviando el monto y la `claveIdempotencia`.
2. **Resiliencia y Compensación (Saga):**
   Si el débito en la cuenta fue exitoso pero el proveedor externo rechaza la operación o agota el tiempo de espera, se ejecuta una compensación (`POST /cuentas/:id/depositar`) y el estado del pago pasa a `'REVERSADO'` con el detalle en `motivoFallo`.
3. **Idempotencia:**
   Toda petición de pago debe contener una `claveIdempotencia` única. Si el gateway o cliente reintenta un pago con la misma clave, se retorna el pago ya existente sin debitar nuevamente.
4. **Comprobante de Pago:**
   Todo pago con estado `'CONFIRMADO'` genera un `nroComprobante` único con formato `CMP-YYYY-XXXXXX` que sirve de respaldo y documento imprimible en el frontend.
5. **Baja lógica de afiliaciones:**
   La desafiliación de servicios frecuentes no borra el registro de la base de datos; actualiza el campo `activa = false`.

---

## 4. Ejemplos JSON

### Query: `GET /pagos/deuda?proveedorId=1&codigoReferencia=849201`
```json
{
  "proveedor": {
    "id": 1,
    "codigo": "ELFEC",
    "nombre": "ELFEC - Energía eléctrica",
    "categoria": "LUZ"
  },
  "codigoReferencia": "849201",
  "titular": "Carlos Mamani Quispe",
  "periodoFacturado": "2026-10",
  "monto": 145.50,
  "comision": 0.00,
  "moneda": "BOB"
}
```

### Request: `POST /pagos` (Ejecutar pago de servicio)
```json
{
  "idClienteRef": 1,
  "idCuentaRef": 101,
  "idProveedor": 1,
  "codigoReferencia": "849201",
  "periodoFacturado": "2026-10",
  "monto": 145.50,
  "claveIdempotencia": "PAG-ELFEC-849201-202610"
}
```

### Response: `POST /pagos`
```json
{
  "id": 801,
  "idClienteRef": 1,
  "idCuentaRef": 101,
  "idProveedor": 1,
  "codigoReferencia": "849201",
  "periodoFacturado": "2026-10",
  "monto": 145.50,
  "comision": 0.00,
  "monedaCodigo": "BOB",
  "estado": "CONFIRMADO",
  "nroComprobante": "CMP-2026-000452",
  "idTransaccionProv": "AUT-ELFEC-993812",
  "claveIdempotencia": "PAG-ELFEC-849201-202610",
  "fechaSolicitud": "2026-11-24T18:45:00.000Z",
  "fechaConfirmacion": "2026-11-24T18:45:01.200Z"
}
```

### Response: `GET /pagos/stats`
```json
{
  "total": 450,
  "montoTotal": 68400.00,
  "confirmados": 435,
  "fallidos": 10,
  "reversados": 5,
  "porCategoria": [
    { "categoria": "LUZ", "cantidad": 180, "monto": 27000.00 },
    { "categoria": "AGUA", "cantidad": 120, "monto": 14400.00 },
    { "categoria": "TELEFONO", "cantidad": 100, "monto": 18000.00 },
    { "categoria": "GAS", "cantidad": 50, "monto": 9000.00 }
  ]
}
```
