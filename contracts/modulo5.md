# Contrato API – ms-modulo5 · PRÉSTAMOS (BONUS +30%) (puerto 3005 · gateway `/api/m5`)

**Dueño back:** Jean (después de Clientes, desde ≈19:25) · **Front:** Luciana (tras el Dashboard) o Axl
> El servicio **ya existe** en `services/ms-modulo5` (puerto 3005, BD `db_modulo5`, gateway `/api/m5`, página `/modulo5`). `npm run db:setup` crea la BD si no existe.

## Entidad: `Prestamo`
| Campo | Tipo | Notas |
|---|---|---|
| id | int | |
| clienteId | int | ms-modulo1 |
| cuentaDesembolsoId | int | ms-modulo2 |
| monto | decimal(14,2) | Bs 1.000 – 200.000 |
| tasaAnual | decimal(5,2) | default 12.00 |
| plazoMeses | int | 6 – 60 |
| cuotaMensual | decimal(14,2) | calculada (sistema francés) |
| estado | `"SOLICITADO"` \| `"APROBADO"` \| `"RECHAZADO"` \| `"DESEMBOLSADO"` | |
| activo | boolean | baja lógica |
| fecha | datetime | |

## Endpoints
| Método | Ruta | Respuesta |
|---|---|---|
| GET | /prestamos?clienteId= | Prestamo[] |
| GET | /prestamos/:id | Prestamo |
| POST | /prestamos | Prestamo (SOLICITADO, cuota calculada) |
| PATCH | /prestamos/:id | Prestamo (solo si SOLICITADO) |
| PATCH | /prestamos/:id/baja | Prestamo |
| PATCH | /prestamos/:id/aprobar | Prestamo (APROBADO → deposita en cuenta → DESEMBOLSADO) |
| PATCH | /prestamos/:id/rechazar | Prestamo |

## Reglas
- Cuota = `M · i / (1 − (1+i)^−n)`, con `i = tasaAnual/12/100`, `n = plazoMeses`.
- Cliente activo (ms-modulo1) y cuenta del cliente (ms-modulo2), si no → **400**.
- Al aprobar: `POST {MS_MODULO2_URL}/cuentas/:id/depositar` con `{ monto, descripcion: "Desembolso préstamo #id" }`.
