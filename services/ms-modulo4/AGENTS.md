# AGENTS.md – ms-modulo4

**Dueño:** Jean (dueño) · Laura (apoyo) · **Rol:** Dev Backend
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
- **Dos personas en este servicio:** Jean es dueño de `prisma/schema.prisma` y del controller; Laura solo agrega **archivos nuevos** (ej. `src/calculo/*.service.ts`). No editen el mismo archivo.

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
| 0:55–1:30 | Generar + almacenar + histórico → **PR 1:30** |
| 1:30–1:45 | Fixes de integración |

## Mis tareas (completar el día de la hackathon)
<!-- Jean: escribe aquí tus tareas concretas una vez leído el kata. El asistente debe trabajar sobre esta lista. -->
- [ ] Entidad:
- [ ] Campos:
- [ ] Endpoints:
- [ ] Regla de negocio:
- [ ]
