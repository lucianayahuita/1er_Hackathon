# Contrato API – ms-modulo4: Transferencias
**Puerto:** `3004` · **Gateway:** `/api/m4` · **Dueño:** Jean (Laura apoya) (Backend) · Axl (Frontend)
**Dominio:** Startup Chuno – Banca por Internet · **Ponderación:** 100%
**Esquema BD:** `transferencias` (PostgreSQL)

> Contrato alineado a las Historias de Usuario (HU-TRA-01..05) y DDL de base de datos (`transferencias.transferencia`, `transferencias.beneficiario`, `transferencias.banco`, `transferencias.limite_transferencia`).

---

## 1. Entidad Principal: `Transferencia`
Gestiona el movimiento de fondos entre cuentas propias del cliente, a terceros del mismo banco Chuno e interbancarias hacia otros bancos del sistema financiero (red ACH).

| Campo | Tipo | Requerido | Notas / Validaciones |
|---|---|---|---|
| `id` | int / bigint | auto | Identificador interno de la transferencia |
| `idClienteRef` | int / bigint | sí | Referencia lógica al cliente ordenante en `ms-modulo1` |
| `idCuentaOrigenRef` | int / bigint | sí | Referencia lógica a la cuenta de débito en `ms-modulo2` |
| `tipo` | string | sí | Enum: `'PROPIA'`, `'TERCEROS_INTERNA'`, `'INTERBANCARIA'` |
| `idCuentaDestinoRef`| int / bigint | no | Ref lógica a cuenta destino (para transferencias internas) |
| `idBeneficiario` | int / bigint | no | Referencia al beneficiario si fue seleccionado de la agenda |
| `idBancoDestino` | int | no | Identificador del banco receptor (`CHUNO`, `BNB`, `BISA`, etc.) |
| `numeroCuentaDestino`| string | sí | Número de cuenta receptora |
| `nombreDestinatario` | string | sí | Nombre completo del titular destino |
| `monto` | number | sí | Importe a transferir (mayor a `0`) |
| `comision` | number | auto | Comisión por transferencia (default `0`) |
| `monedaCodigo` | string | auto | Código de moneda (default `'BOB'`) |
| `glosa` | string | no | Motivo o concepto de la transferencia |
| `estado` | string | auto | Enum: `'PENDIENTE'`, `'DEBITADA'`, `'ENVIADA_ACH'`, `'COMPLETADA'`, `'RECHAZADA'`, `'REVERSADA'` |
| `idOperacionInterbancaria`| string | no | Identificador devuelto por la cámara de compensación (ACH) |
| `motivoRechazo` | string | no | Detalle en caso de fondos insuficientes o rechazo ACH |
| `claveIdempotencia` | string | sí | Clave única para evitar duplicación de transferencias |
| `fechaSolicitud` | string (ISO) | auto | Timestamp en que se solicitó la operación |
| `fechaEjecucion` | string (ISO) | auto | Timestamp en que se confirmó o completó |

---

## 2. Endpoints

| Método | Ruta | Body | Respuesta | Descripción / HU |
|---|---|---|---|---|
| `GET` | `/health` | — | `{ status: "ok", service: "ms-modulo4", timestamp }` | Health check del servicio |
| `GET` | `/transferencias?idCliente=&estado=&tipo=` | — | `Transferencia[]` | HU-TRA-05: Historial y trazabilidad de transferencias |
| `GET` | `/transferencias/:id` | — | `Transferencia` | HU-TRA-05: Detalle y línea de tiempo de la transferencia |
| `POST` | `/transferencias` | `CreateTransferenciaDto` | `Transferencia` | HU-TRA-01..03: Ejecutar transferencia interna o interbancaria |
| `GET` | `/transferencias/bancos` | — | `Banco[]` | Catálogo de bancos nacionales (CHUNO, BNB, BMSC, BISA, etc.) |
| `GET` | `/transferencias/limites` | — | `LimiteTransferencia[]` | Consulta de límites máximos por operación y diarios |
| `GET` | `/transferencias/beneficiarios?idCliente=` | — | `Beneficiario[]` | HU-TRA-04: Lista de beneficiarios frecuentes guardados |
| `POST` | `/transferencias/beneficiarios` | `CreateBeneficiarioDto`| `Beneficiario` | HU-TRA-04: Registrar nuevo beneficiario |
| `PATCH`| `/transferencias/beneficiarios/:id/baja` | — | `Beneficiario` | HU-TRA-04: Baja lógica de beneficiario (`activo = false`) |
| `GET` | `/transferencias/stats` | — | `TransferenciasStats` | Métricas para Dashboard (total transferencias, montos) |

---

## 3. Reglas de Negocio
1. **Control de Límites por Operación y Diarios:**
   - Cada tipo de transferencia (`PROPIA`, `TERCEROS_INTERNA`, `INTERBANCARIA`) tiene un límite por operación y un límite acumulado por día.
   - Cualquier solicitud que supere dichos montos se rechaza con `400 Bad Request` ("Límite diario u operativo excedido").
2. **Transferencias Internas (Saga Origen ➔ Destino):**
   - Se debita la cuenta origen en `ms-modulo2` (`POST /cuentas/:id/retirar`).
   - Se acredita la cuenta destino en `ms-modulo2` (`POST /cuentas/:id/depositar`).
   - Si la acreditación falla, se ejecuta la compensación sobre la cuenta origen y el estado pasa a `'REVERSADA'`.
3. **Transferencias Interbancarias (ACH):**
   - Tras debitar la cuenta origen, la orden se envía al intermediario y pasa al estado `'ENVIADA_ACH'`. Al recibir confirmación, pasa a `'COMPLETADA'`.
4. **Idempotencia:**
   - Se exige `claveIdempotencia` única. Reintentos no generan cobros duplicados.
5. **Baja lógica de Beneficiarios:**
   - La eliminación de un beneficiario frecuente actualiza `activo = false`.

---

## 4. Ejemplos JSON

### Request: `POST /transferencias` (Transferencia interna o interbancaria)
```json
{
  "idClienteRef": 1,
  "idCuentaOrigenRef": 101,
  "tipo": "TERCEROS_INTERNA",
  "idBancoDestino": 1,
  "numeroCuentaDestino": "CTA-1000002",
  "nombreDestinatario": "María López Fernández",
  "monto": 850.00,
  "glosa": "Pago de alquiler noviembre",
  "claveIdempotencia": "TRF-20261124-998231"
}
```

### Response: `POST /transferencias`
```json
{
  "id": 901,
  "idClienteRef": 1,
  "idCuentaOrigenRef": 101,
  "tipo": "TERCEROS_INTERNA",
  "idBancoDestino": 1,
  "numeroCuentaDestino": "CTA-1000002",
  "nombreDestinatario": "María López Fernández",
  "monto": 850.00,
  "comision": 0.00,
  "monedaCodigo": "BOB",
  "glosa": "Pago de alquiler noviembre",
  "estado": "COMPLETADA",
  "claveIdempotencia": "TRF-20261124-998231",
  "fechaSolicitud": "2026-11-24T18:50:00.000Z",
  "fechaEjecucion": "2026-11-24T18:50:01.100Z"
}
```

### Response: `GET /transferencias/stats`
```json
{
  "total": 310,
  "montoTotal": 245000.00,
  "completadas": 298,
  "rechazadas": 8,
  "reversadas": 4,
  "porTipo": [
    { "tipo": "PROPIA", "cantidad": 120, "monto": 95000.00 },
    { "tipo": "TERCEROS_INTERNA", "cantidad": 130, "monto": 80000.00 },
    { "tipo": "INTERBANCARIA", "cantidad": 60, "monto": 70000.00 }
  ]
}
```
