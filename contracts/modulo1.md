# Contrato API – ms-modulo1: Clientes y Seguridad
**Puerto:** `3001` · **Gateway:** `/api/m1` · **Dueño:** Jean (Backend) · Luciana (Frontend)
**Dominio:** Startup Chuno – Banca por Internet · **Ponderación:** 75%
**Esquema BD:** `clientes` (PostgreSQL)

> Contrato alineado a las Historias de Usuario (HU-CLI-01..06) y DDL de base de datos (`clientes.cliente`, `clientes.credencial`).

---

## 1. Entidad Principal: `Cliente`
Representa al usuario de la banca por internet. Es la **entidad central** del sistema; los demás microservicios referencian su identificador (`id_cliente_ref`).

| Campo | Tipo | Requerido | Notas / Validaciones |
|---|---|---|---|
| `id` | int / bigint | auto | Identificador único del cliente |
| `tipoDocumento` | string | sí | Enum: `'CI'`, `'CE'`, `'PASAPORTE'`, `'NIT'` |
| `numeroDocumento` | string | sí | Único combinado con tipo y complemento |
| `complemento` | string | no | Ej. `'1K'`, opcional |
| `nombres` | string | sí | Nombres del cliente (máx 100 caracteres) |
| `apellidoPaterno` | string | sí | Primer apellido (máx 60 caracteres) |
| `apellidoMaterno` | string | no | Segundo apellido (máx 60 caracteres) |
| `fechaNacimiento` | string (date) | sí | Formato `YYYY-MM-DD`. Debe ser mayor de 18 años |
| `email` | string | sí | Correo electrónico único y válido |
| `telefono` | string | sí | Teléfono o celular de contacto |
| `direccion` | string | no | Dirección de domicilio |
| `ciudad` | string | no | Ej. `'La Paz'`, `'Cochabamba'`, `'Santa Cruz'` |
| `estado` | string | auto | `'ACTIVO'`, `'BLOQUEADO'`, `'INACTIVO'`. Default: `'ACTIVO'` |
| `activo` | boolean | auto | `true` si estado es `'ACTIVO'`. Baja lógica = `false` |
| `fechaRegistro` | string (ISO) | auto | Timestamp de creación |
| `fechaModificacion` | string (ISO) | auto | Timestamp de última edición |
| `fechaBaja` | string (ISO) | auto | Timestamp de baja lógica |

---

## 2. Endpoints

| Método | Ruta | Body | Respuesta | Descripción / HU |
|---|---|---|---|---|
| `GET` | `/health` | — | `{ status: "ok", service: "ms-modulo1", timestamp }` | Health check del servicio |
| `GET` | `/clientes?q=&estado=` | — | `Cliente[]` | HU-CLI-02: Búsqueda por documento o nombre y filtro por estado |
| `GET` | `/clientes/:id` | — | `Cliente` | HU-CLI-02: Detalle completo del cliente (sin hash de contraseña) |
| `POST` | `/clientes` | `CreateClienteDto` | `Cliente` | HU-CLI-01: Alta de cliente con credencial inicial |
| `PATCH` | `/clientes/:id` | `UpdateClienteDto` | `Cliente` | HU-CLI-03: Modificar teléfono, email, dirección, ciudad |
| `PATCH` | `/clientes/:id/baja` | — | `Cliente` | HU-CLI-04: Baja lógica (`estado = 'INACTIVO'`, `activo = false`) |
| `GET` | `/clientes/stats` | — | `ClientesStats` | Métricas para Dashboard (total, activos, inactivos, bloqueados) |
| `POST` | `/auth/login` | `LoginDto` | `{ token, cliente }` | HU-CLI-05: Autenticación segura y generación de JWT |
| `POST` | `/auth/cambiar-clave` | `CambiarClaveDto` | `{ mensaje }` | HU-CLI-06: Actualización de contraseña |

---

## 3. Reglas de Negocio
1. **Unicidad:** `tipoDocumento + numeroDocumento + complemento` debe ser único. El `email` debe ser único en el sistema. Duplicados retornan `409 Conflict`.
2. **Mayoría de edad:** El cliente debe tener al menos 18 años al momento del registro. Menores son rechazados con `400 Bad Request`.
3. **Inmutabilidad de identidad:** El `tipoDocumento` y `numeroDocumento` no se pueden modificar tras la creación.
4. **Baja lógica:** Nunca se borra físicamente un cliente. Se asigna `estado = 'INACTIVO'`, `activo = false` y `fechaBaja = now()`.
5. **Seguridad y contraseñas:** 
   - Contraseñas almacenadas con algoritmo de hash seguro (bcrypt / argon2).
   - Longitud mínima de 8 caracteres, al menos 1 mayúscula y 1 número.
   - Tras 5 intentos fallidos consecutivos de login, la credencial pasa a bloqueada temporalmente.

---

## 4. Ejemplos JSON

### Request: `POST /clientes` (Alta de cliente)
```json
{
  "tipoDocumento": "CI",
  "numeroDocumento": "4892135",
  "complemento": null,
  "nombres": "Carlos",
  "apellidoPaterno": "Mamani",
  "apellidoMaterno": "Quispe",
  "fechaNacimiento": "1994-06-15",
  "email": "carlos.mamani@chuno.bo",
  "telefono": "+591 71234567",
  "direccion": "Av. Heroínas 123",
  "ciudad": "Cochabamba",
  "usuario": "cmamani",
  "password": "Password123"
}
```

### Response: `POST /clientes`
```json
{
  "id": 1,
  "tipoDocumento": "CI",
  "numeroDocumento": "4892135",
  "complemento": null,
  "nombres": "Carlos",
  "apellidoPaterno": "Mamani",
  "apellidoMaterno": "Quispe",
  "fechaNacimiento": "1994-06-15",
  "email": "carlos.mamani@chuno.bo",
  "telefono": "+591 71234567",
  "direccion": "Av. Heroínas 123",
  "ciudad": "Cochabamba",
  "estado": "ACTIVO",
  "activo": true,
  "fechaRegistro": "2026-11-24T18:30:00.000Z"
}
```

### Request: `POST /auth/login`
```json
{
  "usuario": "cmamani",
  "password": "Password123"
}
```

### Response: `GET /clientes/stats`
```json
{
  "total": 120,
  "activos": 115,
  "inactivos": 3,
  "bloqueados": 2,
  "porCiudad": [
    { "ciudad": "Cochabamba", "cantidad": 50 },
    { "ciudad": "La Paz", "cantidad": 45 },
    { "ciudad": "Santa Cruz", "cantidad": 25 }
  ]
}
```
