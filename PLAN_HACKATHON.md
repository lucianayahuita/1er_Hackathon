# Plan de Implementación GENÉRICO – Hackathon Kata Arquitectónico (2 horas)

> Plan **independiente del dominio** para un kata con: **N módulos MVP con ponderación acumulativa** (ej. 60/70/80/100%), **BD relacional**, **microservicios**, **"capa de presentación con impacto"** e **informe** según `FormatoDocumento.docx`.
> El esqueleto ya está listo en el repo: https://github.com/lucianayahuita/1er_Hackathon. Mañana **no se crea nada desde cero**: se adapta.

**Equipo:** Jean (Back) · Laura (Back) · Elias (Back + Informe) · Luciana (Front + Informe) · Axl (Front / Integrador / Arquitecto)

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
| "Documentado según desafíos anteriores" | Informe con la plantilla (Luciana + Elias). |

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
| **Jean** | Dev Backend | `ms-modulo1` (entidad central, crítico) → luego `ms-modulo4` |
| **Laura** | Dev Backend | `ms-modulo2` → luego apoyo a `ms-modulo4` |
| **Elias** | Dev Backend + Informe | `ms-modulo3` + secciones **técnicas** del informe (arquitectura, endpoints y reglas de negocio, capturas de Swagger) |
| **Luciana** | Dev Frontend + Informe | Pantallas módulo 1, módulo 2 y Dashboard + secciones de **gestión** del informe (acta, visión, historias de usuario, sprints, conclusiones) y **armado final del PDF** |
| **Axl** | Dev Frontend / Integrador / Arquitecto | Renombrar dominio, pantallas módulo 3 y 4, merges, Docker, demo |

### Reparto del informe (Google Docs, cada uno en sus secciones → sin choques)
| Sección de la plantilla | Responsable |
|---|---|
| 1. Fase de Inicio (acta, visión, objetivos, equipo, riesgos) | Luciana |
| 2. Fase de Planificación (historias de usuario, sprints, normas del equipo) | Luciana |
| Arquitectura (microservicios, BD por servicio, API Gateway, stack) | Elias |
| 3. Fase de Ejecución – backend (qué hace cada servicio, endpoints, reglas, capturas Swagger) | Elias |
| 3. Fase de Ejecución – frontend (capturas de cada pantalla) | Luciana |
| 4. Cierre (conclusiones) y 5. Bibliografía (link GitHub) | Luciana |
| Revisión final y exportar PDF | Luciana |

> Si el kata trae 3 módulos, Jean y Laura comparten el último; si trae 5, el quinto lo toma quien termine primero.

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
│   ├── ms-modulo1/             ← Jean
│   ├── ms-modulo2/             ← Laura
│   ├── ms-modulo3/             ← Elias
│   └── ms-modulo4/             ← Jean (Laura apoya)
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
7. En `ms-modulo4` trabajan Jean y Laura: Jean es dueño del `schema.prisma` y del controller; Laura solo agrega archivos nuevos (ej. un servicio de cálculo) para no pisarse.
8. El informe vive en **Google Docs**, no en el repo; Luciana y Elias escriben en secciones distintas.

### Orden de merge
| # | Rama | Minuto | Motivo |
|---|---|---|---|
| 1 | Contratos + renombrado de dominio (Axl) | 0:25 – 0:35 | Base común antes de las ramas de trabajo |
| 2 | `feat/ms-modulo1` | 0:55 | Los demás dependen de él |
| 3 | `feat/web-modulo1` | 1:00 | **Primer hito** |
| 4 | Módulo 2 (back + front) | 1:10 | Segundo hito |
| 5 | Módulo 3 (back + front) | 1:15 – 1:20 | Tercer hito |
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
| Luciana | Pegar enunciado y alcance en el informe (Acta y Visión) | Fase de Inicio (borrador) |

Tabla de mapeo (en la pizarra / chat del equipo):

| # | Módulo (nombre real) | Servicio | Entidad | Regla de negocio | Back | Front |
|---|---|---|---|---|---|---|
| 1 | | ms-modulo1 | | | Jean | Luciana |
| 2 | | ms-modulo2 | | | Laura | Luciana |
| 3 | | ms-modulo3 | | | Elias | Axl |
| 4 | | ms-modulo4 | | | Jean + Laura | Axl |

### ⏱ 0:10 – 0:25 · Historias de usuario y contratos establecidos
| Quién | Tarea | Entregable |
|---|---|---|
| Jean | `contracts/modulo1.md` y `contracts/modulo4.md`: entidad, campos, endpoints, JSON de ejemplo | Contratos m1, m4 |
| Laura | `contracts/modulo2.md` | Contrato m2 |
| Elias | `contracts/modulo3.md` | Contrato m3 |
| Axl | Revisar contratos: ¿alcanzan para cada pantalla? Mergearlos | Contratos en `main` |
| Luciana | Redactar **historias de usuario** (Como… quiero… para…) con criterios de aceptación; validar campos con los contratos | Backlog en el informe |

> Al minuto 25 los contratos **se congelan**. Cambios posteriores: avisar en el chat.

### ⏱ 0:25 – 0:35 · Adoptar el esqueleto ya preparado
| Quién | Tarea | Entregable |
|---|---|---|
| Axl | Renombrar dominio en `apps/web/lib/modules.ts` (nombre del sistema, títulos, entidades, iconos); PR directo a `main` | `main` adaptada |
| Jean, Laura, Elias | `git pull`; crear rama; renombrar el modelo `Registro` en `prisma/schema.prisma` según contrato; `Copy-Item .env.example .env`; `npm install`; `npm run db:setup` | Servicios con tablas reales |
| Luciana | `git pull`; rama `feat/web-modulo1`; `npm install`; `npm run dev`; ajustar tipos en `lib/api.ts` según contrato | Front corriendo |

### ⏱ 0:35 – 0:45 · Módulos en paralelo (front contra datos simulados)
| Quién | Tarea | Entregable |
|---|---|---|
| Jean | CRUD de `ms-modulo1` según contrato (DTOs, servicio, controller) | Endpoints m1 |
| Laura | Modelo + endpoints base de `ms-modulo2` | Endpoints m2 |
| Elias | Modelo + endpoints base de `ms-modulo3` | Endpoints m3 |
| Luciana | Pantalla módulo 1: columnas y formulario **con datos simulados** (JSON del contrato) | UI m1 con mocks |
| Axl | Pantalla módulo 3 con datos simulados | UI m3 con mocks |

### ⏱ 0:45 – 1:15 · Conexión del front con los endpoints
| Quién | Tarea | Entregable |
|---|---|---|
| Jean | Terminar m1 (baja lógica, validaciones, `/stats`) → **PR ms-modulo1 (0:55)**; luego empezar `ms-modulo4` | m1 en main |
| Laura | Regla de negocio de m2 (consulta a ms-modulo1 vía `modulo1.client.ts`) → **PR ms-modulo2 (1:05)**; luego apoyo a m4 | m2 en main |
| Elias | Lógica de m3 (consulta a ms-modulo1) → **PR ms-modulo3 (1:10)** | m3 en main |
| Luciana | Módulo 1: mocks → API real → **PR web-modulo1 (1:00)**; luego módulo 2 conectado, mostrando la regla en la UI → **PR (1:10)** | m1 y m2 funcionando |
| Axl | Mergear en orden; **probar m1 de punta a punta a las 1:00**; conectar módulo 3 | Hitos 1 y 2 |

### ⏱ 1:15 – 1:35 · Módulo 4, Dashboard e informe
| Quién | Tarea | Entregable |
|---|---|---|
| Jean + Laura | `ms-modulo4` (generar y almacenar + histórico) → **PR (1:30)** | m4 |
| Elias | Fixes de m3 tras integración; luego **informe**: sección de Arquitectura y tabla de endpoints/reglas por servicio | Secciones técnicas |
| Axl | Merge m3; front módulo 4 conectado | Hito 3 + UI m4 |
| Luciana | Dashboard con KPIs de `/stats`; luego **informe**: planificación de sprints | Dashboard + Planificación |

### ⏱ 1:35 – 1:45 · Integración final y pulido
| Quién | Tarea | Entregable |
|---|---|---|
| Axl | Merge m4 + Dashboard; probar todo en su máquina; **CODE FREEZE 1:45** | 100% en main |
| Jean, Laura | Fixes de integración; datos seed realistas | Demo con datos creíbles |
| Elias | Capturas de Swagger de los 4 servicios al informe | Evidencias back |
| Luciana | Pulido visual rápido + capturas de cada pantalla al informe | Evidencias front |

### ⏱ 1:45 – 2:00 · Cierre
| Quién | Tarea | Entregable |
|---|---|---|
| Axl | Ensayo de demo (3 min); `git tag v1.0` | Demo |
| Jean, Laura | Pasar a Elias endpoints y reglas implementadas de m1, m2 y m4 | Insumos para el informe |
| Elias | Cerrar Fase de Ejecución (backend) | Sección Ejecución |
| Luciana | Conclusiones, bibliografía (link GitHub), revisión final, exportar a PDF y **entregar** | **Informe PDF** |

### Vista en paralelo
```
         0:00      0:10      0:25      0:35      0:45            1:15           1:35      1:45    2:00
Jean     lectura  │contrat. │esqueleto│m1 CRUD  │m1 PR → m4       │m4 PR         │fixes    │insumos
Laura    lectura  │contrat. │esqueleto│m2 base  │m2 regla + PR    │m4 (apoyo)    │fixes    │insumos
Elias    lectura  │contrat. │esqueleto│m3 base  │m3 lógica + PR   │fix + inf.arq.│Swagger  │ejecución
Luciana  inicio   │HU       │front run│m1 mocks │m1 API → m2 API  │Dash + sprints│capturas │PDF
Axl      lectura  │revisión │renombrar│m3 mocks │MERGES + m3 UI   │m4 UI + merge │FREEZE   │demo
```

> **Plan B:** si a 1:25 el módulo 4 no está encaminado, se evalúa: si se recupera en 10 min se termina; si no, se pule lo que hay. Mejor 3 módulos impecables que 4 rotos.

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

### Jean, Laura, Elias
- [ ] Practicar: renombrar el modelo `Registro` a otra entidad, `npm run db:setup`, probar en Swagger.
- [ ] Revisar `src/integracion/modulo1.client.ts` (llamada entre servicios).

### Luciana
- [ ] Practicar: cambiar columnas/campos de `RegistrosCrud` y `RegistroFormDialog`.
- [ ] Practicar conectar una pantalla con `api.get/post/patch`.
- [ ] Informe en Google Docs desde `FormatoDocumento.docx`, prellenado con lo que no depende del dominio: integrantes y roles, normas del equipo, riesgos, estructura de sprints, definición de hecho, link de GitHub.
- [ ] Plantilla de historias de usuario (Como / Quiero / Para / Criterios de aceptación).

### Elias
- [ ] Prellenar en el informe la sección de Arquitectura genérica (microservicios, BD por servicio, API Gateway, stack) y una tabla vacía de endpoints por servicio.

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
| Conflictos en `ms-modulo4` (dos devs) | Jean dueño de schema/controller; Laura solo archivos nuevos |
| Integración falla al final | Code freeze 1:45; demo probada en la máquina de Axl |
| Informe incompleto | Prellenado desde hoy; Luciana y Elias en secciones separadas; Luciana cierra el PDF |
