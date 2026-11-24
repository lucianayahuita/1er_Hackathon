# Contrato API – ms-modulo1 · CLIENTES (puerto 3001 · gateway `/api/m1`)

**Dueño back:** Jean · **Dueño front:** Luciana · **Ponderación:** parte del 75% (junto con Cuentas)
> Gestión de alta / modificación / baja **y seguridad** del cliente. Es la entidad central: Cuentas, Pagos y Transferencias le consultan.

## Entidad: `Cliente`
| Campo | Tipo | Requerido | Notas |
|---|---|---|---|
| id | int | auto | |
| ci | string | sí | único (carnet de identidad) |
| nombres | string | sí | |
| apellidos | string | sí | |
| email | string | sí | único, formato email |
| telefono | string | no | |
| direccion | string | no | |
| usuario | string | sí | único, para login |
| passwordHash | string | auto | **nunca** se devuelve en las respuestas |
| intentosFallidos | int | auto | default 0 |
| bloqueado | boolean | auto | default false; se bloquea con 3 intentos fallidos |
| activo | boolean | auto | baja lógica |
| createdAt / updatedAt | datetime | auto | |

## Endpoints
| Método | Ruta | Body | Respuesta |
|---|---|---|---|
| GET | /clientes?q=&activo= | — | Cliente[] (busca por ci, nombres, apellidos) |
| GET | /clientes/:id | — | Cliente |
| POST | /clientes | CreateClienteDto (incluye `password`) | Cliente |
| PATCH | /clientes/:id | UpdateClienteDto (sin password) | Cliente |
| PATCH | /clientes/:id/baja | — | Cliente (`activo=false`) |
| POST | /clientes/login | `{ usuario, password }` | `{ id, nombres, apellidos, usuario }` |
| PATCH | /clientes/:id/desbloquear | — | Cliente (`bloqueado=false`, `intentosFallidos=0`) |
| GET | /clientes/stats | — | `{ total, activos, inactivos, bloqueados }` |
| GET | /health | — | `{ status }` |

## Reglas de negocio (seguridad)
- `ci`, `email` y `usuario` únicos → **409** `"El CI ya está registrado"` / `"El email ya está registrado"` / `"El usuario ya existe"`.
- Password: mínimo 8 caracteres; se guarda **hasheada** con `crypto.scryptSync` de Node (sin dependencias nuevas).
- Login: usuario o password incorrectos → **401** `"Credenciales inválidas"` y `intentosFallidos++`; al llegar a 3 → `bloqueado=true`.
- Cliente bloqueado o dado de baja → login **403** `"Cliente bloqueado"` / `"Cliente inactivo"`.
- Respuestas **nunca** incluyen `passwordHash`.

## Ejemplo JSON (POST /clientes)
```json
{
  "ci": "8456123",
  "nombres": "María",
  "apellidos": "Quispe Rojas",
  "email": "maria.quispe@mail.com",
  "telefono": "71234567",
  "direccion": "Av. Arce 2345, La Paz",
  "usuario": "mquispe",
  "password": "Segura2026"
}
```
