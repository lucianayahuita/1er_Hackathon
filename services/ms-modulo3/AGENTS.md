# AGENTS.md – ms-modulo3

**Dueño:** Elias · **Rol:** Dev Backend + Informe técnico
**Puerto:** `3003` · **BD:** `db_modulo3` (Postgres en Docker, host `5433`) · **Gateway del front:** `/api/m3`
**Contrato:** [`contracts/modulo3.md`](../../contracts/modulo3.md)

## Qué es este servicio
Módulo 3 (suele ser documento parametrizable o lógica que consulta a ms-modulo1 vía `src/integracion/modulo1.client.ts`).

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
npm run start:dev     # http://localhost:3003  ·  Swagger: /docs
npx prisma studio     # ver/editar datos
```

## Notas específicas
- Elias además redacta las secciones técnicas del informe: puedes ayudarle a generar la tabla de endpoints/reglas leyendo los controllers de `services/*` (solo lectura).

## Reglas para el asistente de IA
- Lee también el [`AGENTS.md` raíz](../../AGENTS.md) (arquitectura y reglas generales).
- **Solo edita archivos dentro de esta carpeta.** Nada de `apps/web`, otros servicios, `docker-compose.yml` ni `services/ms-template`.
- Respeta `contracts/modulo3.md`; si hay que cambiarlo, avisa al usuario.
- No instales dependencias nuevas sin confirmación. No hagas commit/push salvo que te lo pidan.
- Base de datos propia (`db_modulo3`); datos de otros módulos **solo por HTTP**.
- Validaciones con `class-validator` en los DTOs; errores con excepciones de Nest y mensajes en español.
- Baja lógica (`activo = false`), nunca borrado físico.
- Tras cambiar `prisma/schema.prisma`: `npm run db:setup` (y actualizar `prisma/seed.ts` con datos realistas).
- Verificar antes de terminar: `npm run build` sin errores y el endpoint probado en Swagger (`http://localhost:3003/docs`).

## Hitos del plan
| Minuto | Qué |
|---|---|
| 0:10–0:25 | Contrato `modulo3.md` |
| 0:25–0:35 | Adaptar esqueleto |
| 0:35–1:10 | Endpoints + lógica → **PR 1:10** |
| 1:15–2:00 | Fixes + informe técnico (arquitectura, endpoints, capturas Swagger) |

## Mis tareas (completar el día de la hackathon)
<!-- Elias: escribe aquí tus tareas concretas una vez leído el kata. El asistente debe trabajar sobre esta lista. -->
- [ ] Entidad:
- [ ] Campos:
- [ ] Endpoints:
- [ ] Regla de negocio:
- [ ]
