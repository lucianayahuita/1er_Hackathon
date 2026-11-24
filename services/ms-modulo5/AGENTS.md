# AGENTS.md – ms-modulo5

**Módulo:** PRÉSTAMOS (bonus +30%) · **Dueño:** Jean · **Rol:** Dev Backend
**Puerto:** `3005` · **BD:** `db_modulo5` (Postgres en Docker, host `5433`) · **Gateway del front:** `/api/m5`
**Contrato:** [`contracts/modulo5.md`](../../contracts/modulo5.md)

> **Kata de hoy:** Banca por Internet – STARTUP CHUNO (24/11/2026). Ver `AGENTS.md` raíz y `contracts/`.

## Qué es este servicio
Gestión de préstamos: crear, actualizar, obtener y dar de baja; calcular la cuota (sistema francés) y, al aprobar, **desembolsar** en la cuenta del cliente llamando a ms-modulo2 (Cuentas). Valida el cliente con ms-modulo1.

## Estructura
```
prisma/schema.prisma        ← modelo de datos (renombrar `Registro` → `Prestamo`)
prisma/seed.ts              ← datos de ejemplo realistas
src/main.ts                 ← bootstrap, Swagger (/docs), ValidationPipe, CORS
src/health.controller.ts    ← GET /health
src/registros/              ← módulo CRUD base a adaptar → src/prestamos
src/integracion/            ← cliente HTTP a ms-modulo1 (agregar modulo2.client.ts)
.env.example                ← PORT=3005, DATABASE_URL, MS_MODULO1_URL (agregar MS_MODULO2_URL)
```

## Comandos
```powershell
Copy-Item .env.example .env
npm install
npm run db:setup      # crea db_modulo5 si no existe + tablas + seed
npm run start:dev     # http://localhost:3005  ·  Swagger: /docs
npx prisma studio
```

## Reglas para el asistente de IA
- Lee también el [`AGENTS.md` raíz](../../AGENTS.md).
- **Solo edita archivos dentro de esta carpeta.**
- Respeta `contracts/modulo5.md`. No instales dependencias nuevas. No hagas commit/push salvo que te lo pidan.
- BD propia (`db_modulo5`); clientes y cuentas **solo por HTTP**.
- Validaciones con `class-validator`; errores con excepciones de Nest y mensajes en español. Baja lógica.
- Verificar: `npm run build` sin errores y endpoints probados en Swagger.

## Hitos del plan
| Hora | Qué |
|---|---|
| 19:25 | Empezar (después del PR de Clientes) |
| 20:00 | **PR ms-modulo5** |

## Mis tareas – Jean · PRÉSTAMOS (contrato: `contracts/modulo5.md`)
- [ ] `prisma/schema.prisma`: `Prestamo` (clienteId, cuentaDesembolsoId, monto Decimal(14,2), tasaAnual Decimal(5,2) default 12, plazoMeses, cuotaMensual, estado SOLICITADO/APROBADO/RECHAZADO/DESEMBOLSADO, activo, fecha).
- [ ] Renombrar `src/registros` → `src/prestamos` (`@Controller('prestamos')`); DTO con `@Min(1000) @Max(200000)` en monto y `@Min(6) @Max(60)` en plazo.
- [ ] Cálculo de cuota (sistema francés): `M·i / (1 − (1+i)^−n)`, `i = tasaAnual/12/100`; guardarla al crear y al editar.
- [ ] Validar cliente activo con `Modulo1Client` (ruta `/clientes/:id`) y que la cuenta sea del cliente con `modulo2.client.ts` (copiar de `modulo1.client.ts`, `MS_MODULO2_URL=http://localhost:3002` en `.env` y `.env.example`).
- [ ] Endpoints: GET ?clienteId=, GET :id, POST, PATCH :id (solo SOLICITADO), PATCH :id/baja, PATCH :id/aprobar (deposita en la cuenta → DESEMBOLSADO), PATCH :id/rechazar, GET /prestamos/stats `{ total, montoDesembolsado, porEstado }`.
- [ ] Seed: 6 préstamos de clientes 1..6 con estados variados.
- [ ] **PR a las 20:00**.
