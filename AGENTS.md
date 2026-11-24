# AGENTS.md – Contexto general del repositorio

> Instrucciones para cualquier asistente de IA (Claude Code, Codex, Copilot, Cursor, Gemini…).
> Cada carpeta de trabajo tiene su propio `AGENTS.md` con el dueño y sus tareas: **léelo también**.

## Qué es este proyecto
Hackathon de 2 horas (Arquitectura de Software): un **kata arquitectónico** que se resuelve con **arquitectura de microservicios**.
El kata trae 4 módulos MVP con ponderación acumulativa (ej. 60/70/80/100%). El esqueleto es **genérico** (`modulo1..4`, modelo `Registro`)
y se adapta al dominio del kata el día de la hackathon. Plan completo: [PLAN_HACKATHON.md](PLAN_HACKATHON.md).

**Prioridad absoluta:** entregar en orden módulo 1 → 2 → 3 → 4. Algo simple que funciona > algo complejo a medias.

## Arquitectura
```
Navegador ─► apps/web (Next.js :3000) ── API Gateway: rewrites /api/m1..m5/* → :3001..3005
                │
  ┌─────────────┼──────────────┬──────────────┐
  ▼             ▼              ▼              ▼
ms-modulo1    ms-modulo2     ms-modulo3     ms-modulo4      (NestJS + Prisma)
 :3001         :3002          :3003          :3004
 entidad   ◄── REST (MS_MODULO1_URL, src/integracion/modulo1.client.ts)
 central
  │             │              │              │
db_modulo1    db_modulo2     db_modulo3     db_modulo4      (PostgreSQL 16 en Docker, host :5433)
```
- **Database per Service:** cada servicio tiene su propia BD. **Nunca** leer la BD de otro servicio: se consulta por HTTP.
- `ms-modulo1` es la entidad central; los demás le consultan datos.

## Stack
- **Front:** Next.js 15 (App Router) + React 19 + TypeScript + Tailwind v4 + shadcn/ui (estilo radix-nova), `sonner`, `recharts`, `react-hook-form` + `zod`.
- **Back:** NestJS 10 + Prisma 5 + class-validator + Swagger (`/docs`) + `/health`.
- **BD:** PostgreSQL 16 alpine vía `docker-compose.yml` (solo la BD; los servicios corren local).

## Estructura y dueños
| Carpeta | Dueño | Notas |
|---|---|---|
| `apps/web/` | Luciana (m1, m2, Dashboard) · Axl (m3, m4, layout) | ver `apps/web/AGENTS.md` |
| `services/ms-modulo1/` | Jean | entidad central |
| `services/ms-modulo2/` | Laura | |
| `services/ms-modulo3/` | Elias | |
| `services/ms-modulo4/` | Laura | |
| `services/ms-modulo5/` | Jean | bonus |
| `services/ms-template/` | — | **referencia, no modificar** |
| `contracts/moduloX.md` | dueño del servicio | contrato de API; congelado al minuto 25 |
| `docker-compose.yml`, `docker/`, `apps/web/lib/modules.ts`, `apps/web/next.config.ts`, layout | **solo Axl** | archivos compartidos |

## Comandos
```powershell
docker compose up -d                       # BD (raíz del repo)
# en services/ms-moduloX
Copy-Item .env.example .env; npm install; npm run db:setup; npm run start:dev
npx prisma studio                          # ver datos
# en apps/web
npm install; npm run dev                   # http://localhost:3000
npm run build                              # verificar que compila
```

## Reglas para el asistente de IA
1. **Trabaja solo en la carpeta del dueño** que te está usando. No edites archivos de otras carpetas ni los compartidos (tabla de arriba).
2. **No instales dependencias nuevas** (`npm install <paquete>`) sin que el usuario lo confirme: el `package-lock.json` causa conflictos.
3. **Respeta el contrato** de `contracts/moduloX.md`. Si hace falta cambiarlo, dilo para que el equipo lo acuerde.
4. **No hagas commits, push ni merges** salvo que el usuario lo pida. Solo Axl mergea a `main`; cada uno trabaja en su rama `feat/...`.
5. Reglas de negocio **en el backend** (servicio NestJS), nunca solo en el front.
6. Baja **lógica** (`activo = false`), nunca borrado físico.
7. Comunicación entre servicios **solo por HTTP**; nunca compartir BD ni importar código de otro servicio.
8. Antes de terminar: el servicio debe arrancar (`npm run start:dev`) y el front compilar (`npm run build`).
9. Código y textos de UI en **español**; seguir el estilo existente (shadcn, Tailwind, componentes de `components/shared`).
10. Cambios **pequeños y rápidos**: es una hackathon de 2 horas.

## Dominio del kata: BANCA POR INTERNET – STARTUP CHUNO (24/11/2026)
Startup boliviana que crea una banca por internet para multibancos. Requisitos clave: microservicios modulares, **gestión descentralizada de datos**,
despliegue independiente, servicios débilmente acoplados que se comunican por **APIs bien definidas**, BD relacional.
Entrega: 18:30–20:45 (los últimos 15 min son para subir al LMS el informe con HU, código, pantallas y evidencias; carátula con asistentes y fecha).

| # | Módulo | Servicio | Entidades | Regla de negocio principal | Back | Front | Logro |
|---|---|---|---|---|---|---|---|
| 1 | Clientes | ms-modulo1 :3001 | Cliente | CRUD + baja lógica + **seguridad**: password hasheada, login, bloqueo a los 3 intentos | Jean | Luciana | 75% (con 2) |
| 2 | Cuentas de ahorro | ms-modulo2 :3002 | Cuenta, Movimiento | Depositar/extraer; saldo insuficiente; cliente debe existir (HTTP a m1) | Laura | Luciana | 75% (con 1) |
| 3 | Pagos de servicios | ms-modulo3 :3003 | Proveedor, Deuda, Pago | Paga deuda de proveedor externo (simulado) debitando la cuenta (HTTP a m2) | Elias | Axl | 100% (con 4) |
| 4 | Transferencias | ms-modulo4 :3004 | Transferencia, Banco | Propia / tercero / interbancaria (intermediario simulado, límite Bs 50.000) debitando y acreditando (HTTP a m2) | Laura | Axl | 100% (con 3) |
| 5 | Préstamos (bonus) | ms-modulo5 :3005 | Prestamo | Cuota sistema francés; al aprobar deposita en la cuenta | Jean | Luciana / Axl | +30% |

**Dependencias entre servicios:** Cuentas → Clientes · Pagos → Cuentas · Transferencias → Cuentas · Préstamos → Clientes y Cuentas.
Contratos detallados en `contracts/modulo1..5.md` (fuente de verdad de rutas, campos y mensajes de error).
