# Contrato API – ms-modulo2 · CUENTAS DE AHORRO (puerto 3002 · gateway `/api/m2`)

**Dueña back:** Laura · **Dueña front:** Luciana · **Ponderación:** parte del 75% (junto con Clientes)
> Crear, actualizar, obtener y dar de baja cuentas; **depositar** y **extraer**. Pagos y Transferencias mueven saldo **a través de estos endpoints**.

## Entidades
### `Cuenta`
| Campo | Tipo | Requerido | Notas |
|---|---|---|---|
| id | int | auto | |
| numero | string | auto | único, generado: `"1000" + id` con 10 dígitos (ej. `1000000001`) |
| clienteId | int | sí | id de ms-modulo1 (validado por HTTP) |
| moneda | `"BOB"` \| `"USD"` | sí | default BOB |
| saldo | decimal(14,2) | auto | default 0 |
| activo | boolean | auto | baja lógica |
| createdAt / updatedAt | datetime | auto | |

### `Movimiento`
| Campo | Tipo | Notas |
|---|---|---|
| id | int | |
| cuentaId | int | FK Cuenta |
| tipo | `"DEPOSITO"` \| `"RETIRO"` | |
| monto | decimal(14,2) | > 0 |
| saldoResultante | decimal(14,2) | |
| descripcion | string | ej. "Pago servicio luz", "Transferencia a 1000000003" |
| fecha | datetime | default now |

## Endpoints
| Método | Ruta | Body | Respuesta |
|---|---|---|---|
| GET | /cuentas?clienteId=&activo= | — | Cuenta[] |
| GET | /cuentas/:id | — | Cuenta |
| GET | /cuentas/numero/:numero | — | Cuenta (para transferencias) |
| POST | /cuentas | `{ clienteId, moneda }` | Cuenta |
| PATCH | /cuentas/:id | `{ moneda }` | Cuenta |
| PATCH | /cuentas/:id/baja | — | Cuenta |
| POST | /cuentas/:id/depositar | `{ monto, descripcion? }` | `{ cuenta, movimiento }` |
| POST | /cuentas/:id/extraer | `{ monto, descripcion? }` | `{ cuenta, movimiento }` |
| GET | /cuentas/:id/movimientos | — | Movimiento[] (más reciente primero) |
| GET | /cuentas/stats | — | `{ totalCuentas, activas, saldoTotal }` |
| GET | /health | — | `{ status }` |

## Reglas de negocio
- Crear cuenta: el `clienteId` debe existir y estar activo en ms-modulo1 (`GET /clientes/:id`) → si no, **400** `"El cliente no existe o está inactivo"`.
- `monto` > 0 → si no, **400** `"El monto debe ser mayor a 0"`.
- Extraer: `monto <= saldo` → si no, **400** `"Saldo insuficiente"`.
- Cuenta inactiva no admite depósitos ni retiros → **400** `"La cuenta está inactiva"`.
- Dar de baja solo con saldo 0 → **400** `"La cuenta debe tener saldo 0 para darse de baja"`.
- Cada depósito/retiro registra un `Movimiento` (en una transacción de Prisma).

## Ejemplo JSON
```json
// POST /cuentas
{ "clienteId": 1, "moneda": "BOB" }
// POST /cuentas/1/depositar
{ "monto": 1500, "descripcion": "Depósito en ventanilla" }
```
