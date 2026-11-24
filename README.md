# Hackathon Kata – Arquitectura de Microservicios

Esqueleto genérico listo para adaptar a cualquier kata (ver [PLAN_HACKATHON.md](PLAN_HACKATHON.md)).

## Arquitectura

```
Navegador ──► apps/web (Next.js :3000) ── API Gateway (rewrites /api/mX/*)
                     │
     ┌───────────────┼────────────────┬────────────────┐
     ▼               ▼                ▼                ▼
ms-modulo1 :3001  ms-modulo2 :3002  ms-modulo3 :3003  ms-modulo4 :3004
 (entidad central) ◄── REST ── (consultan a ms-modulo1 vía MS_MODULO1_URL)
     │               │                │                │
 db_modulo1      db_modulo2       db_modulo3       db_modulo4     ← PostgreSQL (Database per Service)
```

| Carpeta | Dueño | Puerto |
|---|---|---|
| `apps/web` – layout, `lib/modules.ts`, `next.config.ts` | Axl | 3000 |
| `apps/web/app/page.tsx`, `modulo1`, `modulo2` | Luciana | — |
| `apps/web/app/modulo3`, `modulo4` | Axl / Luciana | — |
| `services/ms-modulo1` | Jean | 3001 |
| `services/ms-modulo2` | Laura | 3002 |
| `services/ms-modulo3` | Elias | 3003 |
| `services/ms-modulo4` | Laura (Jean apoya) | 3004 |
| `services/ms-template` | referencia (no tocar) | 3009 |
| `docker-compose.yml`, `docker/` | Axl | 5433 / 8080 |

## Arranque rápido

Requisitos: Node 20+, Docker Desktop abierto.

```powershell
docker compose up -d
```
Cada backend (en su carpeta `services/ms-moduloX`):
```powershell
npm install; npm run db:setup; npm run start:dev
```
Frontend (`apps/web`):
```powershell
npm install; npm run dev
```

- App: http://localhost:3000
- Swagger de cada servicio: http://localhost:300X/docs
- Adminer (ver BD): http://localhost:8080 → Sistema PostgreSQL, servidor `postgres`, usuario/clave `kata`
- Health: http://localhost:300X/health

Demo totalmente containerizada (opcional):
```powershell
docker compose --profile full up --build
```

## Mañana: adaptar al kata (minuto 0–15)
1. **Axl**: renombrar textos en `apps/web/lib/modules.ts` (nombre del sistema, títulos, entidades, iconos).
2. **Backends**: llenar `contracts/moduloX.md`, renombrar el modelo `Registro` en `prisma/schema.prisma` y su DTO/servicio; `npm run db:setup`.
3. **Front**: reemplazar `RegistrosCrud` por la pantalla del módulo (o ajustar columnas/campos).
4. Ejemplo de llamada entre servicios: `src/integracion/modulo1.client.ts` (ms-modulo2..4).

## Reglas de Git
- `main` protegida; solo Axl mergea.
- Ramas: `feat/ms-modulo1`, `feat/web-modulo1`, …
- `git pull --rebase origin main` antes de cada PR; PRs pequeños cada 15–30 min.
- No instalar dependencias nuevas sin avisar. Solo tocar tu carpeta.
