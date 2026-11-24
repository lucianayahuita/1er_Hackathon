# Contrato API – ms-modulo4 · TRANSFERENCIAS (puerto 3004 · gateway `/api/m4`)

**Dueño back:** Jean (Laura apoya) · **Dueño front:** Axl · **Ponderación:** parte del 100% (junto con Pagos)
> Transferencias entre **cuentas propias**, a **terceros del banco** y a **otros bancos** (vía un "servicio intermediario" interbancario, **simulado** dentro de este microservicio y documentado como integración externa, tipo ACH).

## Entidades
### `Transferencia`
| Campo | Tipo | Notas |
|---|---|---|
| id | int | |
| tipo | `"PROPIA"` \| `"TERCERO"` \| `"INTERBANCARIA"` | |
| clienteId | int | quien transfiere (ms-modulo1) |
| cuentaOrigenId | int | ms-modulo2 |
| cuentaDestinoNumero | string | número de cuenta destino |
| bancoDestino | string | null en PROPIA/TERCERO; ej. `"BNB"`, `"BCP"`, `"Banco Unión"`, `"BISA"` |
| titularDestino | string | nombre del titular (obligatorio en INTERBANCARIA) |
| monto | decimal(14,2) | > 0 |
| glosa | string | descripción |
| estado | `"COMPLETADA"` \| `"RECHAZADA"` \| `"PENDIENTE"` | |
| codigoAch | string | solo INTERBANCARIA, ej. `"ACH-482913"` |
| fecha | datetime | default now |

### `Banco` (catálogo seed del intermediario)
`{ id, codigo, nombre }` → BNB, BCP, Banco Unión, Mercantil Santa Cruz, BISA.

## Endpoints
| Método | Ruta | Body | Respuesta |
|---|---|---|---|
| GET | /bancos | — | Banco[] |
| POST | /transferencias | ver ejemplo | Transferencia |
| GET | /transferencias?clienteId= | — | Transferencia[] (historial) |
| GET | /transferencias/:id | — | Transferencia (comprobante) |
| GET | /transferencias/stats | — | `{ total, montoTotal, porTipo: [{ tipo, cantidad }] }` |
| GET | /health | — | `{ status }` |

## Reglas de negocio / flujo de POST /transferencias
1. `monto > 0`; origen y destino distintos → **400** `"La cuenta origen y destino no pueden ser la misma"`.
2. La cuenta origen pertenece al cliente (`GET {MS_MODULO2_URL}/cuentas/:id`) → si no, **400** `"La cuenta origen no pertenece al cliente"`.
3. Según tipo:
   - `PROPIA` o `TERCERO`: la cuenta destino debe existir en ms-modulo2 (`GET /cuentas/numero/:numero`).
   - `INTERBANCARIA`: `bancoDestino` y `titularDestino` requeridos; `monto <= 50000` (límite del servicio intermediario) → si no, **400** `"El monto supera el límite interbancario de Bs 50.000"`; generar `codigoAch`.
4. Debitar origen: `POST /cuentas/:id/extraer` (si falla, guardar `RECHAZADA` y responder 400 con el mensaje de Cuentas).
5. PROPIA/TERCERO: acreditar destino con `POST /cuentas/:idDestino/depositar`. INTERBANCARIA: no se acredita localmente (lo procesa el intermediario).
6. Guardar `COMPLETADA`.
- Variable en `.env`: `MS_MODULO2_URL=http://localhost:3002` (usar `src/integracion/modulo2.client.ts`).

## Ejemplo JSON
```json
// POST /transferencias (tercero)
{ "tipo": "TERCERO", "clienteId": 1, "cuentaOrigenId": 1, "cuentaDestinoNumero": "1000000004", "monto": 250, "glosa": "Pago alquiler" }

// POST /transferencias (interbancaria)
{ "tipo": "INTERBANCARIA", "clienteId": 1, "cuentaOrigenId": 1, "cuentaDestinoNumero": "201-5544332", "bancoDestino": "BNB", "titularDestino": "Carlos Mendoza", "monto": 1200, "glosa": "Préstamo familiar" }
```
