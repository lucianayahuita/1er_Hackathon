# Plan de Implementación GENÉRICO – Hackathon Kata Arquitectónico (2 horas)

> Plan **independiente del dominio** para un kata con: **N módulos MVP con ponderación acumulativa** (ej. 60/70/80/100%), **BD relacional**, **microservicios**, **"capa de presentación con impacto"** e **informe** según `FormatoDocumento.docx`.
> El esqueleto ya está listo en el repo: https://github.com/lucianayahuita/1er_Hackathon. Mañana **no se crea nada desde cero**: se adapta.

**Equipo:** Jean (Back) · Laura (Back) · Elias (Documentación / Informe) · Luciana (Front) · Axl (Front / Integrador / Arquitecto)

---

## 1. Patrón de los katas

| Elemento del enunciado | Qué hacemos |
|---|---|
| Módulos con **ponderación acumulativa** | Se entrega en orden 1 → 2 → 3 → 4. Nunca se integra el 4 si el 1 no funciona. |
| Módulo 1 = **entidad central** (alta / modificación / baja) | `ms-modulo1` es el servicio maestro; los demás le consultan por HTTP. |
| Módulos 2–3 con **regla de negocio** | La regla va en el **backend** y se **muestra en la UI** (badge, alerta, botón deshabilitado). |
| Último módulo **genera y almacena** algo | `POST /generar` + histórico + vista imprimible. |
| "No pueden ser básicos / impacto" | Dashboard con KPIs y gráfico, tablas con búsqueda, diálogos, toasts (ya incluidos en el esqueleto). |
| BD relacional + microservicios | PostgreSQL, **una BD por servicio**, API Gateway (rewrites de Next.js), REST entre servicios. |
| "Documentado según desafíos anteriores" | Informe con la plantilla (Elias). |

---

## 2. Stack tecnológico (ya instalado en el repo)

| Capa | Tecnología |
|---|---|
| Frontend | Next.js 15 + React + TypeScript + Tailwind + shadcn/ui, `recharts`, `sonner`, `react-hook-form` + `zod` |
| API Gateway | `rewrites` de Next.js: `/api/m1..m4/*` → `:3001..3004` |
| Backend | NestJS, una app por módulo, Swagger en `/docs`, `/health` |
| ORM | Prisma (`npm run db:setup` = crear tablas + seed) |
| BD | PostgreSQL 16 en Docker (puerto **5433** del host), `db_modulo1..4` |
| Ver datos | `npx prisma studio` dentro de cada servicio |
| Repo | Monorepo GitHub, una carpeta por servicio |

**Puertos:** web `3000` · ms-modulo1..4 `3001–3004` · Postgres `5433`.

---

## 3. Roles

| Persona | Rol | Responsabilidad |
|---|---|---|
| **Jean** | Dev Backend | `ms-modulo1` (entidad central, crítico) → luego `ms-modulo3` |
| **Laura** | Dev Backend | `ms-modulo2` → luego `ms-modulo4` |
| **Elias** | Documentación | **Informe completo** según `FormatoDocumento.docx`: acta, visión, historias de usuario, sprints, arquitectura, evidencias, conclusiones |
| **Luciana** | Dev Frontend | Pantallas módulo 1, módulo 2 y Dashboard |
| **Axl** | Dev Frontend / Integrador / Arquitecto | Renombrar dominio, pantallas módulo 3 y 4, merges, Docker, demo |

> Con 2 backends para 4 servicios: cada uno toma **2 servicios en orden de prioridad**. Si el kata trae 3 módulos, Jean y Laura comparten el último; si trae 5, el quinto lo toma quien termine primero.

---

## 4. Estructura del repositorio

```
1er_Hackathon/
├── apps/web/
│   ├── lib/modules.ts          ← ÚNICO lugar para renombrar el dominio (Axl)
│   ├── app/page.tsx            ← Dashboard (Luciana)
│   ├── app/modulo1, modulo2    ← Luciana
│   ├── app/modulo3, modulo4    ← Axl
│   └── components/shared/*     ← RegistrosCrud, FormDialog, KpiCard, PrintableDocument…
├── services/
│   ├── ms-template/            ← referencia, no tocar
│   ├── ms-modulo1/ ms-modulo3/ ← Jean
│   └── ms-modulo2/ ms-modulo4/ ← Laura
├── contracts/modulo1..4.md     ← contratos de API (se congelan al minuto 25)
├── docker-compose.yml, docker/ ← Axl
└── README.md                   ← cómo levantar todo
```

---

## 5. Git sin conflictos

1. `main` protegida, requiere PR. **Solo Axl mergea.**
2. Ramas por persona y carpeta: `feat/ms-modulo1`, `feat/web-modulo1`, …
3. PRs **pequeños** cada 15–30 min.
4. Antes del PR: `git pull --rebase origin main` y verificar que levanta.
5. **Nadie instala dependencias nuevas** sin avisar (`package-lock.json` estable).
6. Archivos compartidos (`lib/modules.ts`, layout, `next.config.ts`, Docker) → solo Axl.
7. El informe vive en **Google Docs**, no en el repo → cero conflictos de documentación.

### Orden de merge
| # | Rama | Minuto | Motivo |
|---|---|---|---|
| 1 | Renombrado de dominio (Axl) + `contracts/` | 0:35 | Base común antes de crear ramas de trabajo |
| 2 | `feat/ms-modulo1` | 0:55 | Los demás dependen de él |
| 3 | `feat/web-modulo1` | 1:00 | **Primer hito** |
| 4 | Módulo 2 (back + front) | 1:10 | Segundo hito |
| 5 | Módulo 3 (back + front) | 1:25 | Tercer hito |
| 6 | Módulo 4 (back + front) | 1:35 | 100% |
| 7 | Dashboard + pulido | 1:45 | Impacto |
| — | **CODE FREEZE** | **1:45** | Solo fixes críticos |

---

## 6. Plan minuto a minuto

### ⏱ 0:00 – 0:15 · Lectura y alcance del MVP
| Quién | Tarea | Entregable |
|---|---|---|
| Todos | Leer el kata juntos. Identificar módulos, ponderación, entidad central y reglas de negocio | Alcance del MVP |
| Todos | Mapear cada módulo a un servicio (`ms-modulo1..4`) y a su dueño | Tabla de mapeo (abajo) |
| Axl | `docker compose up -d` en su máquina | BD arriba |
| Elias | Copiar el enunciado y el alcance al informe (Acta y Visión) | Sección 1 del informe |

Tabla de mapeo (en la pizarra / chat del equipo):

| # | Módulo (nombre real) | Servicio | Entidad | Regla de negocio | Back | Front |
|---|---|---|---|---|---|---|
| 1 | | ms-modulo1 | | | Jean | Luciana |
| 2 | | ms-modulo2 | | | Laura | Luciana |
| 3 | | ms-modulo3 | | | Jean | Axl |
| 4 | | ms-modulo4 | | | Laura | Axl |

### ⏱ 0:10 – 0:25 · Historias de usuario y contratos
| Quién | Tarea | Entregable |
|---|---|---|
| Jean | `contracts/modulo1.md` y `contracts/modulo3.md`: entidad, campos, endpoints, JSON de ejemplo | Contratos m1, m3 |
| Laura | `contracts/modulo2.md` y `contracts/modulo4.md` | Contratos m2, m4 |
| Luciana + Axl | Revisar contratos: ¿alcanzan para cada pantalla? Definir columnas y campos de formularios | Contratos validados |
| Elias | Redactar **historias de usuario** (Como… quiero… para…) con criterios de aceptación, una por funcionalidad | Product Backlog en el informe |

> Al minuto 25 los contratos **se congelan**. Cambios posteriores: avisar en el chat.

### ⏱ 0:25 – 0:35 · Adoptar el esqueleto preparado
| Quién | Tarea | Entregable |
|---|---|---|
| Axl | Renombrar dominio en `apps/web/lib/modules.ts` (nombre del sistema, títulos, entidades, iconos); mergear contratos; PR directo a `main` | `main` adaptada |
| Jean, Laura | `git pull`; crear rama; renombrar el modelo `Registro` en `prisma/schema.prisma` según contrato; `Copy-Item .env.example .env`; `npm install`; `npm run db:setup` | Servicios con tablas reales |
| Luciana | `git pull`; rama `feat/web-modulo1`; `npm install`; `npm run dev`; ajustar tipos en `lib/api.ts` según contrato | Front corriendo |
| Elias | Redactar sección de Arquitectura (microservicios, BD por servicio, API Gateway, stack) | Sección Arquitectura |

### ⏱ 0:35 – 0:45 · Módulos en paralelo (front contra datos simulados)
| Quién | Tarea | Entregable |
|---|---|---|
| Jean | CRUD de `ms-modulo1` según contrato (DTOs, servicio, controller) | Endpoints m1 |
| Laura | Modelo + endpoints base de `ms-modulo2` | Endpoints m2 |
| Luciana | Pantalla módulo 1: columnas y formulario según contrato **con datos simulados** (JSON del contrato) | UI m1 con mocks |
| Axl | Pantalla módulo 3 con datos simulados | UI m3 con mocks |
| Elias | Planificación de sprints en el informe (Sprint 1 = módulos 1–2, Sprint 2 = módulos 3–4), normas del equipo, riesgos | Fase de Planificación |

### ⏱ 0:45 – 1:15 · Conexión del front con los endpoints
| Quién | Tarea | Entregable |
|---|---|---|
| Jean | Terminar m1 (baja lógica, validaciones, `/stats`) → **PR ms-modulo1 (0:55)**; luego empezar `ms-modulo3` | m1 en main |
| Laura | Regla de negocio de m2 (consulta a ms-modulo1 vía `modulo1.client.ts`) → **PR ms-modulo2 (1:05)** | m2 en main |
| Luciana | Módulo 1: cambiar mocks → API real (`api.get("m1", …)`) → **PR web-modulo1 (1:00)**; luego módulo 2 conectado, mostrando la regla en la UI → **PR (1:10)** | m1 y m2 funcionando |
| Axl | Mergear en orden; **probar m1 de punta a punta a las 1:00**; seguir con módulo 3 | Hitos 1 y 2 |
| Elias | Capturas de Swagger y de pantallas funcionando conforme se mergean | Evidencias |

### ⏱ 1:15 – 1:35 · Módulos 3 y 4
| Quién | Tarea | Entregable |
|---|---|---|
| Jean | `ms-modulo3` (lógica principal, consulta a ms-modulo1) → **PR (1:25)** | m3 |
| Laura | `ms-modulo4` (generar y almacenar + histórico) → **PR (1:35)** | m4 |
| Axl | Front módulo 3 conectado (documento imprimible si aplica); merge | Hito 3 |
| Luciana | Front módulo 4 (o apoyo a Axl); Dashboard con KPIs de `/stats` | m4 + Dashboard |
| Elias | Fase de Ejecución en el informe (qué se hizo en cada sprint) | Sección Ejecución |

### ⏱ 1:35 – 1:45 · Integración final y pulido
| Quién | Tarea | Entregable |
|---|---|---|
| Axl | Merge m4 + Dashboard; probar todo en su máquina; **CODE FREEZE 1:45** | 100% en main |
| Jean, Laura | Fixes de integración; datos seed realistas | Demo con datos creíbles |
| Luciana | Pulido visual: textos, estados vacíos, toasts | UI final |
| Elias | Capturas finales de cada módulo | Evidencias completas |

### ⏱ 1:45 – 2:00 · Cierre
| Quién | Tarea | Entregable |
|---|---|---|
| Axl | Ensayo de demo (3 min); `git tag v1.0` | Demo |
| Jean, Laura | Pasar a Elias endpoints y reglas implementadas | Insumos informe |
| Luciana | Apoyar a Elias revisando el informe | Revisión |
| Elias | Conclusiones, bibliografía (link GitHub), exportar a PDF y **entregar** | **Informe PDF** |

### Vista en paralelo
```
         0:00      0:10      0:25      0:35      0:45            1:15        1:35     1:45   2:00
Jean     lectura  │contrat. │esqueleto│m1 CRUD  │m1 PR → m3       │m3 PR      │fixes   │insumos
Laura    lectura  │contrat. │esqueleto│m2 base  │m2 regla + PR    │m4 PR      │fixes   │insumos
Luciana  lectura  │revisión │front run│m1 mocks │m1 API → m2 API  │m4 + Dash  │pulido  │revisión
Axl      lectura  │revisión │renombrar│m3 mocks │MERGES m1, m2    │m3 + merge │FREEZE  │demo
Elias    alcance  │HU       │arquitec.│sprints  │evidencias       │ejecución  │capturas│PDF
```

> **Plan B:** si a 1:25 el módulo 3 no está, se evalúa: si se recupera en 10 min se termina; si no, se pule lo que hay. Mejor 3 módulos impecables que 4 rotos.

---

## 7. Docker

**Dueño: Axl.** Docker levanta **solo la base de datos**; los servicios y el front corren localmente con hot reload.

```powershell
docker compose up -d
```
- Un solo Postgres 16 (alpine) con `db_modulo1..4` (Database per Service), en el puerto **5433** del host.
- Cada servicio: `DATABASE_URL=postgresql://kata:kata@localhost:5433/db_moduloX` (en `.env`, copiado de `.env.example`).
- Abrir Docker Desktop **antes** de empezar (tarda ~1 min en Windows).
- Demo opcional todo containerizado: `docker compose --profile full up --build`.
- **Nunca** `docker compose down -v` durante la hackathon (borra los datos).

---

## 8. Qué preparar HOY

### Todos
- [ ] Instalar Docker Desktop, Node 20+, Git.
- [ ] Clonar `https://github.com/lucianayahuita/1er_Hackathon.git`, `docker compose up -d`.
- [ ] Levantar su servicio / el front siguiendo el README y verificar que funciona.
- [ ] Hacer un PR de prueba y que Axl lo mergee (practicar el flujo).

### Axl
- [ ] Invitar colaboradores y proteger `main`.
- [ ] Practicar el renombrado en `lib/modules.ts`.

### Jean, Laura
- [ ] Practicar: renombrar el modelo `Registro` a otra entidad, `npm run db:setup`, probar en Swagger.
- [ ] Revisar `src/integracion/modulo1.client.ts` (llamada entre servicios).

### Luciana
- [ ] Practicar: cambiar columnas/campos de `RegistrosCrud` y `RegistroFormDialog`.
- [ ] Practicar conectar una pantalla con `api.get/post/patch`.

### Elias
- [ ] Informe en Google Docs desde `FormatoDocumento.docx`, prellenado con todo lo que no depende del dominio: integrantes y roles, normas del equipo, riesgos, estructura de sprints, definición de hecho, sección de arquitectura genérica, link de GitHub.
- [ ] Plantilla de historias de usuario (Como / Quiero / Para / Criterios de aceptación).

### Ensayo (recomendado, 45 min)
- [ ] Simular con el kata anterior los primeros 45 min con cronómetro.

---

## 9. Definición de Hecho por módulo
- Endpoints en Swagger y regla de negocio en el backend.
- Pantalla conectada a la API real, con validación, toasts y estado vacío.
- Mergeado en `main` y probado por Axl de punta a punta.
- Captura agregada al informe.

## 10. Riesgos y mitigación
| Riesgo | Mitigación |
|---|---|
| Kata con más/menos módulos | Regla de la sección 3 |
| Docker no levanta | Abrir Docker Desktop antes; fallback: BD de Axl por IP |
| Un servicio se atrasa | El front sigue con datos simulados del contrato |
| Conflictos en `package-lock` | Dependencias ya instaladas; nadie instala nada nuevo |
| Integración falla al final | Code freeze 1:45; demo probada en la máquina de Axl |
| Informe incompleto | Elias dedicado al 100% y prellenado desde hoy |
