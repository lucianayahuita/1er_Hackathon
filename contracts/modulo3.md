# Contrato API – ms-modulo3 · PAGOS DE SERVICIOS (puerto 3003 · gateway `/api/m3`)

**Dueño back:** Elias · **Dueño front:** Axl · **Ponderación:** parte del 100% (junto con Transferencias)
> Pagar luz, agua, teléfono, gas y otros a **proveedores externos**. El "servicio externo" se **simula** dentro de este microservicio (catálogo de proveedores + deudas pendientes en su propia BD) y se documenta como integración externa.

## Entidades
### `Proveedor` (catálogo, seed)
| Campo | Tipo | Notas |
|---|---|---|
| id | int | |
| codigo | string | único: `DELAPAZ`, `EPSAS`, `ENTEL`, `YPFB`, `TIGO`, `ELFEC`, `SEMAPA` |
| nombre | string | ej. "DELAPAZ – Electricidad" |
| categoria | `"LUZ"` \| `"AGUA"` \| `"TELEFONO"` \| `"GAS"` \| `"OTROS"` | |

### `Deuda` (simula al sistema externo, seed)
| Campo | Tipo | Notas |
|---|---|---|
| id | int | |
| proveedorId | int | FK Proveedor |
| codigoCliente | string | código de medidor/línea (ej. `"MED-10001"`) |
| periodo | string | ej. `"2026-10"` |
| monto | decimal(12,2) | |
| pagada | boolean | default false |

### `Pago`
| Campo | Tipo | Notas |
|---|---|---|
| id | int | |
| clienteId | int | id de ms-modulo1 |
| cuentaId | int | id de ms-modulo2 |
| deudaId | int | FK Deuda |
| monto | decimal(12,2) | |
| comprobante | string | único, ej. `"PAG-20261124-0001"` |
| estado | `"COMPLETADO"` \| `"RECHAZADO"` | |
| fecha | datetime | default now |

## Endpoints
| Método | Ruta | Body | Respuesta |
|---|---|---|---|
| GET | /proveedores | — | Proveedor[] |
| GET | /proveedores/:id/deudas?codigoCliente= | — | Deuda[] pendientes (consulta al "sistema externo") |
| POST | /pagos | `{ clienteId, cuentaId, deudaId }` | Pago |
| GET | /pagos?clienteId= | — | Pago[] (historial, con proveedor y periodo) |
| GET | /pagos/:id | — | Pago (comprobante) |
| GET | /pagos/stats | — | `{ totalPagos, montoTotal, porCategoria: [{ categoria, cantidad }] }` |
| GET | /health | — | `{ status }` |

## Reglas de negocio / flujo de POST /pagos
1. La deuda existe y no está pagada → si no, **400** `"La deuda no existe o ya fue pagada"`.
2. La cuenta pertenece al cliente: `GET {MS_MODULO2_URL}/cuentas/:cuentaId` y comparar `clienteId` → si no, **400** `"La cuenta no pertenece al cliente"`.
3. Debitar: `POST {MS_MODULO2_URL}/cuentas/:cuentaId/extraer` con `{ monto, descripcion: "Pago <proveedor> <periodo>" }`.
   - Si Cuentas responde error (ej. saldo insuficiente) → guardar Pago `RECHAZADO` y responder **400** con el mensaje de Cuentas.
4. Marcar deuda `pagada=true`, guardar Pago `COMPLETADO` con comprobante.
- Variable en `.env`: `MS_MODULO2_URL=http://localhost:3002` (usar `src/integracion/modulo2.client.ts`).

## Ejemplo JSON
```json
// POST /pagos
{ "clienteId": 1, "cuentaId": 1, "deudaId": 3 }
```
