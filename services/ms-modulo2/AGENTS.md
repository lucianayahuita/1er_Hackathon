# AGENTS.md – ms-modulo2

**Módulo:** CUENTAS · **Dueña:** Laura · **Rol:** Dev Backend
**Puerto:** `3002` · **BD:** `db_modulo2` (Postgres en Docker, host `5433`) · **Gateway del front:** `/api/m2`
**Contrato:** [`contracts/modulo2.md`](../../contracts/modulo2.md)

## Qué es este servicio
Módulo con **regla de negocio** (condición/validación). Consulta datos de la entidad central en ms-modulo1 vía `src/integracion/modulo1.client.ts`.

## Estructura
```
prisma/schema.prisma        ← modelo de datos (renombrar `Registro` a la entidad real)
prisma/seed.ts              ← datos de ejemplo realistas
src/main.ts                 ← bootstrap, Swagger (/docs), ValidationPipe, CORS
src/health.controller.ts    ← GET /health
src/registros/              ← módulo CRUD (controller, service, dto) – base a adaptar
src/integracion/            ← cliente HTTP a ms-modulo1 (si existe en este servicio)
.env.example                ← PORT, DATABASE_URL, MS_MODULO1_URL
```

## Comandos
```powershell
Copy-Item .env.example .env
npm install
npm run db:setup      # prisma db push + seed
npm run start:dev     # http://localhost:3002  ·  Swagger: /docs
npx prisma studio     # ver/editar datos
```

## Notas específicas
- La regla de negocio va en el service y responde con error claro (`BadRequestException` con mensaje en español) para que el front lo muestre.

## Reglas para el asistente de IA
- Lee también el [`AGENTS.md` raíz](../../AGENTS.md) (arquitectura y reglas generales).
- **Solo edita archivos dentro de esta carpeta.** Nada de `apps/web`, otros servicios, `docker-compose.yml` ni `services/ms-template`.
- Respeta `contracts/modulo2.md`; si hay que cambiarlo, avisa al usuario.
- No instales dependencias nuevas sin confirmación. No hagas commit/push salvo que te lo pidan.
- Base de datos propia (`db_modulo2`); datos de otros módulos **solo por HTTP**.
- Validaciones con `class-validator` en los DTOs; errores con excepciones de Nest y mensajes en español.
- Baja lógica (`activo = false`), nunca borrado físico.
- Tras cambiar `prisma/schema.prisma`: `npm run db:setup` (y actualizar `prisma/seed.ts` con datos realistas).
- Verificar antes de terminar: `npm run build` sin errores y el endpoint probado en Swagger (`http://localhost:3002/docs`).

## Hitos del plan
| Minuto | Qué |
|---|---|
| 0:10–0:25 | Contrato `modulo2.md` |
| 0:25–0:35 | Adaptar esqueleto |
| 0:35–1:05 | Endpoints + regla de negocio → **PR 1:05** |
| 1:05–1:30 | Apoyo a `ms-modulo4` (solo archivos nuevos) |

> **Kata de hoy:** Banca por Internet – STARTUP CHUNO (24/11/2026). Ver `AGENTS.md` raíz y `contracts/`.

## Mis tareas – Laura · CUENTAS DE AHORRO (contrato: `contracts/modulo2.md`)
- [ ] `prisma/schema.prisma`: `Cuenta` (numero único, clienteId, moneda BOB/USD, saldo Decimal(14,2), activo) y `Movimiento` (cuentaId, tipo DEPOSITO/RETIRO, monto, saldoResultante, descripcion, fecha).
- [ ] Renombrar `src/registros` → `src/cuentas` (`@Controller('cuentas')`).
- [ ] POST /cuentas: validar cliente activo con `Modulo1Client` (adaptar ruta a `/clientes/:id`); generar `numero` = `String(1000000000 + id)` tras crear (ej. `1000000001`).
- [ ] GET /cuentas?clienteId=, GET :id, GET /cuentas/numero/:numero, PATCH :id, PATCH :id/baja (solo saldo 0).
- [ ] POST :id/depositar y :id/extraer con `prisma.$transaction` (actualiza saldo + crea Movimiento); errores 400: monto ≤ 0, saldo insuficiente, cuenta inactiva.
- [ ] GET :id/movimientos (desc) y GET /cuentas/stats `{ totalCuentas, activas, saldoTotal }`.
- [ ] Seed: 10 cuentas para clientes 1..8 con saldos variados y algunos movimientos.
- [ ] **PR a las 1:05** (19:35). **Importante:** Pagos, Transferencias y Préstamos dependen de `extraer`/`depositar`/`numero/:numero`: avisa a Elias y Jean apenas funcionen.
- [ ] Luego (19:35): pasar a `ms-modulo4` **Transferencias** (ver `services/ms-modulo4/AGENTS.md`).
