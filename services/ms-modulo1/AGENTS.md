# AGENTS.md – ms-modulo1

**Módulo:** CLIENTES · **Dueño:** Jean · **Rol:** Dev Backend
**Puerto:** `3001` · **BD:** `db_modulo1` (Postgres en Docker, host `5433`) · **Gateway del front:** `/api/m1`
**Contrato:** [`contracts/modulo1.md`](../../contracts/modulo1.md)

## Qué es este servicio
Entidad central del kata (alta, modificación y baja). Los demás servicios le consultan por HTTP, por eso es el **más crítico**: debe estar en `main` al minuto 55.

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
npm run start:dev     # http://localhost:3001  ·  Swagger: /docs
npx prisma studio     # ver/editar datos
```

## Notas específicas
- Mantén `GET /registros/:id` (o su equivalente renombrado) estable: ms-modulo2..4 dependen de él.
- `GET /registros/stats` alimenta el Dashboard del front.

## Reglas para el asistente de IA
- Lee también el [`AGENTS.md` raíz](../../AGENTS.md) (arquitectura y reglas generales).
- **Solo edita archivos dentro de esta carpeta.** Nada de `apps/web`, otros servicios, `docker-compose.yml` ni `services/ms-template`.
- Respeta `contracts/modulo1.md`; si hay que cambiarlo, avisa al usuario.
- No instales dependencias nuevas sin confirmación. No hagas commit/push salvo que te lo pidan.
- Base de datos propia (`db_modulo1`); datos de otros módulos **solo por HTTP**.
- Validaciones con `class-validator` en los DTOs; errores con excepciones de Nest y mensajes en español.
- Baja lógica (`activo = false`), nunca borrado físico.
- Tras cambiar `prisma/schema.prisma`: `npm run db:setup` (y actualizar `prisma/seed.ts` con datos realistas).
- Verificar antes de terminar: `npm run build` sin errores y el endpoint probado en Swagger (`http://localhost:3001/docs`).

## Hitos del plan
| Minuto | Qué |
|---|---|
| 0:10–0:25 | Contratos `modulo1.md` y `modulo4.md` |
| 0:25–0:35 | Adaptar esqueleto: renombrar modelo, `db:setup` |
| 0:35–0:55 | CRUD completo + baja lógica + `/stats` → **PR 0:55** |
| 0:55–1:30 | Pasar a `ms-modulo5` (Préstamos) |

> **Kata de hoy:** Banca por Internet – STARTUP CHUNO (24/11/2026). Ver `AGENTS.md` raíz y `contracts/`.

## Mis tareas – Jean · CLIENTES (contrato: `contracts/modulo1.md`)
- [ ] `prisma/schema.prisma`: renombrar `Registro` → `Cliente` con campos del contrato (ci, nombres, apellidos, email, telefono, direccion, usuario, passwordHash, intentosFallidos, bloqueado, activo). `@unique` en ci, email, usuario.
- [ ] Renombrar módulo `src/registros` → `src/clientes` (controller `@Controller('clientes')`, service, DTOs). `CreateClienteDto` con `password` (`@MinLength(8)`), `@IsEmail()`.
- [ ] Hash de password con `crypto.scryptSync(password, salt, 64)` (guardar `salt:hash`); **nunca** devolver `passwordHash` (usar `select` u omitirlo).
- [ ] CRUD: GET (filtro `q` por ci/nombres/apellidos), GET :id, POST (409 si ci/email/usuario repetido), PATCH, PATCH :id/baja.
- [ ] Seguridad: `POST /clientes/login` (401 + intentosFallidos++, bloqueo a los 3 → 403) y `PATCH /clientes/:id/desbloquear`.
- [ ] `GET /clientes/stats` → `{ total, activos, inactivos, bloqueados }`.
- [ ] `prisma/seed.ts`: 8 clientes bolivianos realistas (password `Segura2026` hasheada), 1 inactivo, 1 bloqueado.
- [ ] **PR a las 0:55** (19:25). Luego pasar a `ms-modulo5` (**Préstamos**, ver `services/ms-modulo5/AGENTS.md`).
