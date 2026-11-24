# Contrato API – ms-modulo4 · TRANSFERENCIAS (puerto 3004 · gateway `/api/m4`)

**Dueña back:** Laura · **Dueño front:** Axl · **Ponderación:** parte del 100% (junto con Pagos)
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
| bancoDestino | string | null en PROPIA/TERCERO; ej. `"BNB"`, `"BCP"`, `"Banco Unión"` |
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
   - **PROPIA:** destino (`GET /cuentas/numero/:numero`) debe ser del **mismo** cliente → si no, **400**.
   - **TERCERO:** destino existe en el banco y es de **otro** cliente → si no existe, **404** `"La cuenta destino no existe"`.
   - **INTERBANCARIA:** `bancoDestino` válido del catálogo y `titularDestino` obligatorio; límite **Bs 50.000** por transferencia → **400** `"Monto supera el límite interbancario"`; se genera `codigoAch`.
4. Debitar origen: `POST /cuentas/:id/extraer` (si falla, guardar `RECHAZADA` y responder 400 con el mensaje de Cuentas).
5. PROPIA/TERCERO: acreditar destino con `POST /cuentas/:idDestino/depositar`. INTERBANCARIA: no se acredita localmente (lo procesa el intermediario).
6. Guardar `COMPLETADA`.
- Variable nueva en `.env`: `MS_MODULO2_URL=http://localhost:3002` (crear `src/integracion/modulo2.client.ts` copiando `modulo1.client.ts`).

## Ejemplo JSON
```json
// POST /transferencias (tercero)
{ "tipo": "TERCERO", "clienteId": 1, "cuentaOrigenId": 1, "cuentaDestinoNumero": "1000000004", "monto": 250, "glosa": "Pago alquiler" }
// POST /transferencias (interbancaria)
{ "tipo": "INTERBANCARIA", "clienteId": 1, "cuentaOrigenId": 1, "cuentaDestinoNumero": "201-5544332", "bancoDestino": "BNB", "titularDestino": "Carlos Mendoza", "monto": 1200, "glosa": "Préstamo familiar" }
```
