# AGENTS.md – ms-modulo4

**Módulo:** TRANSFERENCIAS · **Dueña:** Laura · **Rol:** Dev Backend
**Puerto:** `3004` · **BD:** `db_modulo4` (Postgres en Docker, host `5433`) · **Gateway del front:** `/api/m4`
**Contrato:** [`contracts/modulo4.md`](../../contracts/modulo4.md)

## Qué es este servicio
Módulo que **genera y almacena** algo (pagos, reportes, documentos…) usando datos de ms-modulo1 vía `src/integracion/modulo1.client.ts`.

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
npm run start:dev     # http://localhost:3004  ·  Swagger: /docs
npx prisma studio     # ver/editar datos
```

## Notas específicas
- Laura lo empieza después de Cuentas (≈19:35): ya conoce los endpoints `extraer`, `depositar` y `numero/:numero` que usa este servicio.

## Reglas para el asistente de IA
- Lee también el [`AGENTS.md` raíz](../../AGENTS.md) (arquitectura y reglas generales).
- **Solo edita archivos dentro de esta carpeta.** Nada de `apps/web`, otros servicios, `docker-compose.yml` ni `services/ms-template`.
- Respeta `contracts/modulo4.md`; si hay que cambiarlo, avisa al usuario.
- No instales dependencias nuevas sin confirmación. No hagas commit/push salvo que te lo pidan.
- Base de datos propia (`db_modulo4`); datos de otros módulos **solo por HTTP**.
- Validaciones con `class-validator` en los DTOs; errores con excepciones de Nest y mensajes en español.
- Baja lógica (`activo = false`), nunca borrado físico.
- Tras cambiar `prisma/schema.prisma`: `npm run db:setup` (y actualizar `prisma/seed.ts` con datos realistas).
- Verificar antes de terminar: `npm run build` sin errores y el endpoint probado en Swagger (`http://localhost:3004/docs`).

## Hitos del plan
| Minuto | Qué |
|---|---|
| 1:05–1:30 | Transferencias propias/terceros/interbancarias → **PR 1:30** |
| 1:30–1:45 | Fixes de integración |

> **Kata de hoy:** Banca por Internet – STARTUP CHUNO (24/11/2026). Ver `AGENTS.md` raíz y `contracts/`.

## Mis tareas – Laura · TRANSFERENCIAS (contrato: `contracts/modulo4.md`)
- [ ] `prisma/schema.prisma`: `Transferencia` (tipo PROPIA/TERCERO/INTERBANCARIA, clienteId, cuentaOrigenId, cuentaDestinoNumero, bancoDestino, titularDestino, monto, glosa, estado, codigoAch, fecha) y `Banco` (catálogo).
- [ ] Seed de bancos: BNB, BCP, Banco Unión, Mercantil Santa Cruz, BISA; 5 transferencias de ejemplo.
- [ ] `src/integracion/modulo2.client.ts`: `obtenerCuenta(id)`, `obtenerPorNumero(numero)`, `extraer(...)`, `depositar(...)`; agregar `MS_MODULO2_URL=http://localhost:3002` a `.env` y `.env.example`.
- [ ] `@Controller('transferencias')`: POST, GET ?clienteId=, GET :id, GET /transferencias/stats, GET /bancos.
- [ ] POST /transferencias: validaciones por tipo (propia = mismo cliente, tercero = otro cliente, interbancaria = banco válido + titular + límite Bs 50.000 + `codigoAch`) → extraer origen → depositar destino (no en interbancaria) → COMPLETADA; si falla RECHAZADA + 400.
- [ ] **PR a las 1:30** (20:00).
