# AGENTS.md – ms-modulo1

**Dueño:** Jean · **Rol:** Dev Backend
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
| 0:55–1:30 | Pasar a `ms-modulo4` |

## Mis tareas (completar el día de la hackathon)
<!-- Jean: escribe aquí tus tareas concretas una vez leído el kata. El asistente debe trabajar sobre esta lista. -->
- [ ] Entidad:
- [ ] Campos:
- [ ] Endpoints:
- [ ] Regla de negocio:
- [ ]
