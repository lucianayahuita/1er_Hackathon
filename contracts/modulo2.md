# Contrato API – ms-modulo2: Cuentas (Ahorro)
**Puerto:** `3002` · **Gateway:** `/api/m2` · **Dueño:** Laura (Backend) · Luciana (Frontend)
**Dominio:** Startup Chuno – Banca por Internet · **Ponderación:** 75%
**Esquema BD:** `cuentas` (PostgreSQL)

> Contrato alineado a las Historias de Usuario (HU-CUE-01..06) y DDL de base de datos (`cuentas.cuenta`, `cuentas.movimiento`, `cuentas.moneda`).

---

## 1. Entidad Principal: `Cuenta`
Gestiona las cuentas de ahorro de los clientes del banco. Se relaciona lógicamente con `ms-modulo1` a través del identificador `idClienteRef`.

| Campo | Tipo | Requerido | Notas / Validaciones |
|---|---|---|---|
| `id` | int / bigint | auto | Identificador interno de la cuenta |
| `numeroCuenta` | string | auto/sí | Número único de cuenta (ej. `'CTA-1000001'`) |
| `idClienteRef` | int / bigint | sí | Referencia lógica al cliente en `ms-modulo1` |
| `monedaCodigo` | string | sí | Enum: `'BOB'` (Bolivianos) o `'USD'` (Dólares) |
| `tipoCuenta` | string | auto | `'AHORRO'` (alcance MVP) |
| `alias` | string | no | Alias personalizado (ej. `'Mi Fondo de Emergencia'`) |
| `saldo` | number | auto | Saldo contable actual (inicia en `0`, nunca negativo) |
| `saldoBloqueado` | number | auto | Saldo temporalmente retenido (default `0`) |
| `tasaInteres` | number | no | Tasa anual de rendimiento en % (ej. `2.50`) |
| `estado` | string | auto | Enum: `'ACTIVA'`, `'BLOQUEADA'`, `'CERRADA'`. Default: `'ACTIVA'` |
| `activo` | boolean | auto | `true` si estado es `'ACTIVA'`. `false` si es `'CERRADA'` |
| `fechaApertura` | string (ISO) | auto | Timestamp de creación |
| `fechaCierre` | string (ISO) | auto | Timestamp de cierre de cuenta |

---

## 2. Endpoints

| Método | Ruta | Body | Respuesta | Descripción / HU |
|---|---|---|---|---|
| `GET` | `/health` | — | `{ status: "ok", service: "ms-modulo2", timestamp }` | Health check del servicio |
| `GET` | `/cuentas?idCliente=&estado=` | — | `Cuenta[]` | HU-CUE-02: Lista de cuentas con filtros |
| `GET` | `/cuentas/:id` | — | `Cuenta` | HU-CUE-02: Detalle y saldo disponible de cuenta |
| `POST` | `/cuentas` | `CreateCuentaDto` | `Cuenta` | HU-CUE-01: Apertura de cuenta (valida cliente en ms-modulo1) |
| `PATCH` | `/cuentas/:id` | `UpdateCuentaDto` | `Cuenta` | HU-CUE-06: Modificar alias o estado (bloquear/reactivar) |
| `PATCH` | `/cuentas/:id/baja` | — | `Cuenta` | HU-CUE-06: Cierre de cuenta (baja lógica, requiere saldo 0) |
| `POST` | `/cuentas/:id/depositar` | `DepositoDto` | `{ cuenta, movimiento }` | HU-CUE-03: Realizar depósito en cuenta |
| `POST` | `/cuentas/:id/retirar` | `RetiroDto` | `{ cuenta, movimiento }` | HU-CUE-04: Realizar retiro de dinero |
| `GET` | `/cuentas/:id/movimientos` | — | `Movimiento[]` | HU-CUE-05: Extracto de movimientos de la cuenta |
| `GET` | `/cuentas/stats` | — | `CuentasStats` | Métricas para Dashboard (total cuentas, saldos totales) |

---

## 3. Reglas de Negocio
1. **Validación de cliente (Integración REST):** Al abrir una cuenta (`POST /cuentas`), el servicio consulta por HTTP a `ms-modulo1` (`GET /clientes/:id`). Si el cliente no existe o su estado no es `ACTIVO`, se rechaza con `400 Bad Request`.
2. **Saldo no negativo:** El saldo contable nunca puede ser inferior a 0. Todo retiro que supere el saldo disponible (`saldo - saldoBloqueado`) es rechazado inmediatamente con error `400 Bad Request` ("Saldo insuficiente").
3. **Cierre de cuenta (Baja lógica):** Una cuenta solo puede pasar al estado `'CERRADA'` (`activo = false`) si su saldo es exactamente `0`. Si posee saldo, el cierre es rechazado.
4. **Restricción de operaciones:** Cuentas con estado `'BLOQUEADA'` o `'CERRADA'` no admiten depósitos ni retiros.
5. **Idempotencia:** Los depósitos y retiros admiten el campo `claveIdempotencia` para garantizar que un reintento de red no duplique la transacción.
6. **Auditoría de movimientos:** Cada afectación de saldo genera obligatoriamente un registro en `movimiento` almacenando `saldoAnterior`, `saldoPosterior` y tipo de operación.

---

## 4. Ejemplos JSON

### Request: `POST /cuentas` (Apertura de cuenta)
```json
{
  "idClienteRef": 1,
  "monedaCodigo": "BOB",
  "alias": "Mi Cuenta de Ahorro Principal"
}
```

### Response: `POST /cuentas`
```json
{
  "id": 101,
  "numeroCuenta": "CTA-1000001",
  "idClienteRef": 1,
  "monedaCodigo": "BOB",
  "tipoCuenta": "AHORRO",
  "alias": "Mi Cuenta de Ahorro Principal",
  "saldo": 0.00,
  "saldoBloqueado": 0.00,
  "estado": "ACTIVA",
  "activo": true,
  "fechaApertura": "2026-11-24T18:35:00.000Z"
}
```

### Request: `POST /cuentas/101/depositar`
```json
{
  "monto": 2500.00,
  "claveIdempotencia": "DEP-20261124-001",
  "descripcion": "Depósito en efectivo por ventanilla"
}
```

### Response: `POST /cuentas/101/depositar`
```json
{
  "cuenta": {
    "id": 101,
    "numeroCuenta": "CTA-1000001",
    "saldo": 2500.00,
    "estado": "ACTIVA"
  },
  "movimiento": {
    "id": 501,
    "tipoMovimiento": "DEPOSITO",
    "monto": 2500.00,
    "saldoAnterior": 0.00,
    "saldoPosterior": 2500.00,
    "descripcion": "Depósito en efectivo por ventanilla",
    "fechaMovimiento": "2026-11-24T18:40:00.000Z"
  }
}
```

### Response: `GET /cuentas/stats`
```json
{
  "total": 350,
  "activos": 330,
  "inactivos": 20,
  "saldoTotalBob": 1542000.50,
  "saldoTotalUsd": 85000.00,
  "porMoneda": [
    { "moneda": "BOB", "cantidad": 290 },
    { "moneda": "USD", "cantidad": 60 }
  ]
}
```
