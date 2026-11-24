# AGENTS.md – ms-modulo3

**Módulo:** PAGOS DE SERVICIOS · **Dueño:** Elias · **Rol:** Dev Backend + Informe técnico
**Puerto:** `3003` · **BD:** `db_modulo3` (Postgres en Docker, host `5433`) · **Gateway del front:** `/api/m3`
**Contrato:** [`contracts/modulo3.md`](../../contracts/modulo3.md)

## Qué es este servicio
Pagos de servicios básicos (luz, agua, teléfono, gas, otros) contra proveedores externos simulados; valida y debita la cuenta en `ms-modulo2` vía HTTP.

## Estructura
```
prisma/schema.prisma        ← modelo de datos (renombrar `Registro` a la entidad real)
prisma/seed.ts              ← datos de ejemplo realistas
src/main.ts                 ← bootstrap, Swagger (/docs), ValidationPipe, CORS
src/health.controller.ts    ← GET /health
src/registros/              ← módulo CRUD (controller, service, dto) – base a adaptar
src/integracion/            ← cliente HTTP a ms-modulo1 (si existe en este servicio)
.env.example                ← PORT, DATABASE_URL, MS_MODULO1_URL, MS_MODULO2_URL
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

> **Kata de hoy:** Banca por Internet – STARTUP CHUNO (24/11/2026). Ver `AGENTS.md` raíz y `contracts/`.

## Mis tareas – Elias · PAGOS DE SERVICIOS (contrato: `contracts/modulo3.md`)
- [ ] `prisma/schema.prisma`: `Proveedor`, `Deuda` (simula el sistema externo), `Pago` (clienteId, cuentaId, deudaId, monto, comprobante único, estado, fecha).
- [ ] Seed: proveedores DELAPAZ (LUZ), EPSAS (AGUA), ENTEL (TELEFONO), YPFB (GAS), TIGO (OTROS) y ~15 deudas pendientes con códigos `MED-10001`… y periodos `2026-09/10/11`.
- [ ] `src/integracion/modulo2.client.ts` (copiar `modulo1.client.ts`, usar `MS_MODULO2_URL`) con `obtenerCuenta(id)` y `extraer(id, monto, descripcion)`; agregar `MS_MODULO2_URL=http://localhost:3002` a `.env` y `.env.example`.
- [ ] Endpoints: GET /proveedores, GET /proveedores/:id/deudas?codigoCliente=, POST /pagos, GET /pagos?clienteId=, GET /pagos/:id, GET /pagos/stats.
- [ ] POST /pagos: deuda pendiente → cuenta del cliente → `extraer` en Cuentas → si falla guarda RECHAZADO y 400 con el mensaje → si ok marca deuda pagada y guarda COMPLETADO con comprobante `PAG-AAAAMMDD-0001`.
- [ ] Mientras Cuentas no esté listo: probar con un mock (devolver saldo suficiente) y cambiar al real a las 1:05.
- [ ] **PR a las 1:10** (19:40).
- [ ] **Informe (1:15 en adelante):** sección de Arquitectura (microservicios, BD por servicio, API Gateway, integración con servicios externos simulados) + tabla de endpoints y reglas de los 4 servicios + capturas de Swagger.
