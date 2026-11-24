# Contrato API – ms-modulo4 (puerto 3004 · gateway `/api/m4`)

> Se congela al minuto 15. Cambios posteriores: avisar en el chat y a Axl.

## Entidad: (nombre real)
| Campo | Tipo | Requerido | Notas |
|---|---|---|---|
| id | int | auto | |
| codigo | string | sí | único |
| nombre | string | sí | |
| activo | boolean | auto | baja lógica |

## Endpoints
| Método | Ruta | Body | Respuesta |
|---|---|---|---|
| GET | /registros?q=&activo= | — | Registro[] |
| GET | /registros/:id | — | Registro |
| POST | /registros | CreateDto | Registro |
| PATCH | /registros/:id | UpdateDto | Registro |
| PATCH | /registros/:id/baja | — | Registro |
| GET | /registros/stats | — | Stats |
| GET | /health | — | { status } |

## Regla de negocio

## Ejemplo JSON
```json
{ "codigo": "REG-001", "nombre": "Ejemplo", "categoria": "General", "monto": 5000, "fecha": "2025-01-15" }
```
