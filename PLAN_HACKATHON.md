# Plan de Implementación GENÉRICO – Hackathon Kata Arquitectónico (2 horas)

> Plan **independiente del dominio**. Sirve para cualquier kata con la forma de los desafíos anteriores:
> **N módulos MVP con ponderación acumulativa** (ej. 60/70/80/100%), **BD relacional**, **microservicios**, **"capa de presentación con impacto"** y **documentación Scrum** según `FormatoDocumento.docx`.
> Todo se nombra `modulo1..modulo4`; mañana, en los primeros 10 minutos, solo se **renombran textos**.

**Equipo:** Jean (Back) · Laura (Back) · Elias (Back) · Luciana (Front/Scrum Master) · Axl (Front/Integrador/**Arquitecto de Software**)

---

## Índice
1. Patrón de los katas y análisis inicial
2. Stack tecnológico
3. Estructura del repositorio
4. Roles
5. Git sin conflictos y orden de merge
6. Docker (creación por etapas y velocidad)
7. Mockups / wireframes genéricos
8. Plan de 15 en 15 minutos
9. Qué preparar HOY
10. Definición de Hecho
11. Riesgos y mitigación

---

## 1. Patrón de los katas y análisis inicial

| Elemento del enunciado | Qué hacemos |
|---|---|
| Módulos con **ponderación acumulativa** | Se entrega en orden 1 → 2 → 3 → 4. Nunca se integra el 4 si el 1 no funciona. |
| Módulo 1 = **entidad central** con alta/modificación/baja | `ms-modulo1` es el servicio "maestro"; los demás le consultan por HTTP. |
| Módulos 2–3 con **regla de negocio** (condición, cálculo, validación, documento parametrizable) | La regla va en el **backend** y se **muestra en la UI** (badge, alerta, botón deshabilitado + tooltip). |
| Último módulo **genera y almacena** algo (pagos, reportes, facturas, certificados) | `POST /generar` + histórico + vista imprimible. |
| "No pueden ser básicos / impacto" | Dashboard con KPIs y gráfico, tablas con búsqueda, diálogos, toasts, estados vacíos, impresión. |
| BD relacional + microservicios | PostgreSQL, **una BD por servicio**, API Gateway, REST entre servicios, diagrama C4. |
| "Documentado según desafíos anteriores" | Informe con la plantilla: Acta, Visión, Planificación, Sprints, Dailys, Cierre, Bibliografía. |

### Checklist de análisis (minutos 0–10)
1. Listar módulos y ponderación → asignar `modulo1..4`.
2. Identificar la **entidad central** y sus campos.
3. Por módulo: ¿qué **regla de negocio**? ¿qué necesita de otro módulo?
4. ¿Qué módulo **genera un documento**? → mockup M5.
5. Elegir 3–4 **KPIs** del dashboard.

| # | Módulo (nombre real) | Servicio | Entidades | Regla de negocio | Depende de | Back | Front | Mockups |
|---|---|---|---|---|---|---|---|---|
| 1 | | ms-modulo1 | | | — | Jean | Luciana | M2, M3, M4 |
| 2 | | ms-modulo2 | | | ms-modulo1 | Laura | Luciana | M2, M4 |
| 3 | | ms-modulo3 | | | ms-modulo1 | Elias | Axl | M2, M5 |
| 4 | | ms-modulo4 | | | ms-modulo1 | Laura/Jean | Luciana/Axl | M2, M5 |

> **3 módulos:** Laura y Jean comparten el último. **5 módulos:** Jean toma el quinto tras mergear el módulo 1.

---

## 2. Stack tecnológico

| Capa | Tecnología | Por qué |
|---|---|---|
| Frontend | **Next.js (App Router) + React + TypeScript + Tailwind + shadcn/ui**, `lucide-react`, `recharts`, `sonner`, `react-hook-form` + `zod` | Look profesional inmediato |
| API Gateway | **`rewrites` de Next.js** (`/api/m1/* → :3001` …), documentado como *API Gateway/BFF* | 0 código, 0 CORS |
| Backend | **NestJS**, una app independiente por módulo | Estructura estándar, CLI rápida |
| ORM | **Prisma** (`db push` + seed) | Tablas en segundos |
| BD | **PostgreSQL 16 (alpine) en Docker**, `db_modulo1..4` (*Database per Service*) | Sin choques de schema |
| Comunicación | REST síncrono | Simple; broker (RabbitMQ) como mejora futura |
| Repo | **Monorepo GitHub**, una carpeta por servicio | Cada dev toca solo su carpeta |
| Gestión | Trello / GitHub Projects + Google Docs | Edición simultánea sin conflictos |

**Puertos fijos:** web `3000` · ms-modulo1..4 `3001–3004` · Postgres `5433` (host).

---

## 3. Estructura del repositorio

```
hackathon-kata/
├── apps/web/app/
│   ├── page.tsx                 ← Dashboard (Luciana)
│   ├── modulo1/ modulo2/        ← Luciana
│   ├── modulo3/ modulo4/        ← Axl / Luciana
│   ├── layout.tsx, components/layout/*   ← SOLO Axl
│   └── components/shared/*      ← DataTable, FormDialog, KpiCard… (hechos hoy)
├── services/
│   ├── ms-template/             ← CRUD ejemplo para copiar (hoy)
│   ├── ms-modulo1/              ← Jean
│   ├── ms-modulo2/              ← Laura
│   ├── ms-modulo3/              ← Elias
│   └── ms-modulo4/              ← Laura (Jean apoya)
├── contracts/modulo1..4.md      ← endpoints + JSON ejemplo (se congelan al min 15)
├── docker/init.sql, Dockerfile.nest   ← SOLO Axl
├── docs/mockups/, docs/diagramas/
├── docker-compose.yml           ← SOLO Axl
└── README.md                    ← SOLO Axl
```

---

## 4. Roles

| Persona | Rol Scrum (informe) | Rol técnico |
|---|---|---|
| **Jean** | Dev Backend | `ms-modulo1` (crítico) → apoyo módulo 4 + `/stats` |
| **Laura** | Dev Backend | `ms-modulo2` → `ms-modulo4` |
| **Elias** | Dev Backend | `ms-modulo3` → apoyo `ms-modulo4` + diagramas ER (desde los `schema.prisma`) + evidencias Swagger |
| **Luciana** | Dev Frontend / Scrum Master | **Mockups**, pantallas módulo 1, 2 y Dashboard; tablero, dailys, consolida informe |
| **Axl** | **Arquitecto de Software** / Dev Frontend / Integrador | Decisiones de arquitectura, diagramas C4 y despliegue, sección de arquitectura del informe, **Docker**, layout, gateway, front módulo 3, merges, demo |
| Product Owner | Docente / rol del enunciado | — |

---

## 5. Git sin conflictos y orden de merge

1. `main` protegida, requiere PR. **Solo Axl mergea.**
2. Ramas por persona/carpeta: `feat/ms-modulo1`, `feat/web-modulo1`, …
3. PRs **pequeños cada 15–30 min**.
4. Antes del PR: `git pull --rebase origin main` y verificar que levanta.
5. Commits: `feat(modulo1): alta de registro`.
6. **Nadie instala dependencias mañana** sin avisar (todo se instala hoy → `package-lock.json` estable).
7. Archivos compartidos (sidebar, layout, `next.config`, Docker) → solo Axl.
8. Un conflicto lo resuelve el dueño de la rama.

| # | Rama | Minuto | Motivo |
|---|---|---|---|
| 0 | Esqueleto (hoy) | antes | Base que compila |
| 1 | Renombrado + `contracts/` | 0:15 | Front mockea, back implementa lo mismo |
| 2 | `feat/ms-modulo1` | 0:45 | Los demás dependen de él |
| 3 | `feat/web-modulo1` | 0:50 | **Primer hito** |
| 4 | módulo 2 (back + front) | 1:05 | Segundo hito |
| 5 | módulo 3 (back + front) | 1:20 | Tercer hito |
| 6 | módulo 4 (back + front) | 1:35 | 100% |
| 7 | Dashboard + pulido | 1:45 | Impacto |
| — | **CODE FREEZE** | **1:45** | Solo fixes críticos |

---

## 6. Docker: creación por etapas y velocidad

**Dueño: Axl.** Jean valida la conexión con `ms-template`. Todos instalan Docker Desktop hoy.

### Etapa 0 – HOY (Axl, ~30 min): dejarlo todo descargado y probado
- `docker compose pull` en **las 5 máquinas** → imágenes en caché, no dependemos del wifi mañana.
- Imágenes **alpine** (más livianas y rápidas de bajar).
- **Un solo Postgres con 4 BDs** (no 4 contenedores): arranca en segundos, menos RAM.
- `healthcheck` para que nada arranque antes que la BD.

`docker-compose.yml`
```yaml
services:
  postgres:
    image: postgres:16-alpine
    container_name: kata-db
    environment:
      POSTGRES_USER: kata
      POSTGRES_PASSWORD: kata
    ports: ["5433:5432"]
    volumes:
      - ./docker/init.sql:/docker-entrypoint-initdb.d/init.sql
      - pgdata:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U kata"]
      interval: 3s
      retries: 10

  # ---- Solo para la demo: docker compose --profile full up --build ----
  ms-modulo1:
    profiles: ["full"]
    build: { context: ./services/ms-modulo1, dockerfile: ../../docker/Dockerfile.nest }
    environment:
      DATABASE_URL: postgresql://kata:kata@postgres:5432/db_modulo1
      PORT: 3001
    ports: ["3001:3001"]
    depends_on: { postgres: { condition: service_healthy } }
  # ms-modulo2..4 iguales cambiando puerto, BD y URLs entre servicios
  #   (ej. MS_MODULO1_URL: http://ms-modulo1:3001)

volumes:
  pgdata:
```

`docker/init.sql`
```sql
CREATE DATABASE db_modulo1;
CREATE DATABASE db_modulo2;
CREATE DATABASE db_modulo3;
CREATE DATABASE db_modulo4;
```

`docker/Dockerfile.nest` (multi-stage, caché de dependencias primero)
```dockerfile
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npx prisma generate && npm run build

FROM node:20-alpine
WORKDIR /app
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/prisma ./prisma
CMD ["node", "dist/main.js"]
```
`.dockerignore` en cada servicio: `node_modules`, `dist`, `.env`.
**Hoy se hace un build completo una vez** → mañana la caché lo deja en segundos.

### Etapa 1 – Durante la hackathon (0:00–1:45): Docker solo para la BD
- `docker compose up -d` → levanta **solo** Postgres (los servicios están en el perfil `full`).
- Cada dev corre su servicio **local** con `npm run start:dev` (hot reload; nada de rebuilds de 30–60 s por cambio).
- Tablas: `npx prisma db push` + `npx prisma db seed`.
- `.env` de cada servicio: `DATABASE_URL=postgresql://kata:kata@localhost:5433/db_moduloX`, `PORT=300X`.
- **Opción BD compartida:** Axl corre Postgres y los demás usan `@IP_DE_AXL:5433` (practicarlo hoy, mismo wifi). Si falla, cada uno usa su Postgres local.

### Etapa 2 – Demo (desde 1:45, opcional)
- `docker compose --profile full up --build` en la máquina de Axl → todo containerizado.
- Si no da el tiempo: se demuestra con BD en Docker + servicios locales y el compose completo va al informe como **vista de despliegue**.

---

## 7. Mockups / wireframes genéricos

**Dueña: Luciana, en Figma** (HOY, ~1–1,5 h). **Revisa: Axl.**

### Cómo armarlo en Figma (rápido y fiel al código)
1. **Usar un kit de shadcn/ui para Figma** (Figma Community → buscar "shadcn/ui" y duplicar uno gratuito). Así lo diseñado = lo que existe en código, sin reinventar componentes.
2. Archivo `Kata – Mockups` con 3 páginas: **Componentes**, **Pantallas (M1–M5)**, **Export**.
3. **Variables/estilos** primero: color primario, gris, éxito/alerta/error; tipografía Inter; radio 12 px. (Esos mismos valores se pasan a `tailwind`/`globals.css`.)
4. **Frame base** 1440×900 con sidebar (240 px) + header (64 px) como **componente** → se reutiliza en las 5 pantallas.
5. **Auto Layout** en todo (cards, tablas, formularios) → mañana cambias textos y todo se reacomoda solo.
6. Textos genéricos ("Módulo 1", "Campo 1", "KPI 1") en **capas con nombre claro** para renombrar rápido al dominio del kata.
7. Hacer **M1 Dashboard al final**: es el que más impacto da en el informe, se pule con lo que sobre de tiempo.
8. (Opcional) **Prototype**: enlazar sidebar → pantallas y botón "Nuevo" → M3, para mostrar navegación en la presentación.
9. Exportar cada frame a **PNG 2x** en `docs/mockups/` y compartir el link de Figma (solo lectura) para la Bibliografía del informe.

**Mañana (0:00–0:15):** Luciana duplica las pantallas, cambia títulos/columnas/campos al dominio real y exporta (≈10 min). Axl y Luciana usan Figma como referencia mientras codean; no se diseña nada nuevo durante la hackathon.
Son 5 pantallas que cubren cualquier módulo de cualquier kata. Mañana solo se cambian títulos, columnas y campos.
Se exportan a PNG en `docs/mockups/` y van al informe (Fase de Planificación). Cada pantalla se implementa con componentes de `components/shared` hechos hoy.

### M1 – Dashboard (`/`)
```
┌──────────┬──────────────────────────────────────────────────────┐
│  LOGO    │  Dashboard                          [🔔] [Avatar ▾] │
│          ├──────────────────────────────────────────────────────┤
│ ▣ Inicio │ ┌─KPI 1──┐ ┌─KPI 2──┐ ┌─KPI 3──┐ ┌─KPI 4──┐         │
│ ○ Mód. 1 │ │  128   │ │   12   │ │   45   │ │ Bs 98k │         │
│ ○ Mód. 2 │ │ ↑ 5%   │ │ pend.  │ │ mes    │ │ total  │         │
│ ○ Mód. 3 │ └────────┘ └────────┘ └────────┘ └────────┘         │
│ ○ Mód. 4 │ ┌─ Gráfico barras por categoría ─┐ ┌─ Últimos ─────┐│
│          │ │  ▇ ▅ ▇▇ ▃ ▆                    │ │ • registro... ││
│          │ └────────────────────────────────┘ │ • registro... ││
│          │                                     └───────────────┘│
└──────────┴──────────────────────────────────────────────────────┘
```
Componentes: `KpiCard`, `chart` (recharts), `Card`, sidebar.

### M2 – Listado (patrón de todos los módulos)
```
│ Módulo X                                    [+ Nuevo]  │
│ [🔍 Buscar...] [Filtro estado ▾]                       │
│ ┌──────┬──────────┬─────────┬──────────┬──────────┐    │
│ │ Cód. │ Nombre   │ Campo   │ Estado   │ Acciones │    │
│ │ 001  │ ...      │ ...     │ (Activo) │ ✎ 👁 🗑  │    │
│ └──────┴──────────┴─────────┴──────────┴──────────┘    │
│                                 ‹ 1 2 3 ›              │
```
Componentes: `PageHeader`, `DataTable`, `StatusBadge`, `EmptyState`, `Skeleton`.

### M3 – Formulario en diálogo (alta / modificación)
```
┌─ Nuevo registro ───────────────── ✕ ┐
│ Campo 1 [__________]  Campo 2 [__▾] │
│ Fecha   [📅_______]   Monto [_____] │
│ ⚠ mensaje de validación (zod)       │
│               [Cancelar] [Guardar]  │
└─────────────────────────────────────┘
```
Componentes: `FormDialog`, `Form`, `Input`, `Select`, `Calendar`, toast de éxito/error. Baja → `ConfirmDialog`.

### M4 – Detalle con pestañas + regla de negocio visible
```
│ ← Volver   Nombre del registro   (Badge estado)         │
│ [Datos] [Historial] [Documentos]                         │
│ ┌ ⚠ Alerta: "No cumple la condición X" (regla negocio) ┐ │
│ │ [Solicitar] (deshabilitado + tooltip con el motivo)  │ │
│ └──────────────────────────────────────────────────────┘ │
│ Tabla de historial (DataTable)                           │
```
Componentes: `Tabs`, `Alert`, `Tooltip`, `Badge`, `DataTable`.

### M5 – Documento generado / imprimible (contrato, boleta, reporte, certificado…)
```
│ Plantilla [▾]  Parámetros: {{a}} [__] {{b}} [__]  [Generar] │
│ ┌──────────── Vista previa (hoja A4) ──────────────┐ [🖨 PDF] │
│ │  LOGO           TÍTULO DEL DOCUMENTO             │          │
│ │  Texto con variables reemplazadas...             │          │
│ │  Tabla de montos / firmas                        │          │
│ └──────────────────────────────────────────────────┘          │
│ Historial de documentos generados (DataTable)                 │
```
Componentes: `PrintableDocument` (`@media print` + `window.print()`), `Select`, `DataTable`.

### Mapeo mockup → módulo
| Tipo de módulo | Pantallas |
|---|---|
| Entidad central (alta/modif./baja) | M2 + M3 + M4 |
| Módulo con regla de negocio | M2 + M4 |
| Módulo que genera/almacena documentos o pagos | M2 + M5 |
| Inicio | M1 |

### Guía visual
- Sidebar oscuro + contenido claro, **1 color primario** corporativo.
- Tipografía Inter/Geist, `rounded-xl`, sombras suaves, iconos lucide.
- Badges de color por estado (verde activo, ámbar pendiente, rojo baja).
- Toast en cada acción, skeletons al cargar, estado vacío ilustrado.
- Datos seed **realistas** (nombres, montos, fechas) → la demo se ve profesional.

---

## 8. Plan de 15 en 15 minutos

### ⏱ 0:00 – 0:15 · Análisis + contratos
| Quién | Tarea | Entregable |
|---|---|---|
| Todos (7 min) | Leer kata, llenar tabla de la sección 1 (incluye qué mockup usa cada módulo) | Mapa del kata |
| Axl | `docker compose up -d`, renombrar textos (sidebar/títulos), validar que los contratos respetan la arquitectura, mergear; renombrar diagrama C4 al dominio | BD arriba + `main` lista + C4 v1 |
| Jean, Laura, Elias | `contracts/moduloX.md`: entidades, campos, endpoints, JSON de ejemplo | Contratos API |
| Luciana | Backlog en tablero; ajustar textos/campos de los mockups al dominio | Tablero + mockups v2 |

### ⏱ 0:15 – 0:30 · Modelos y mocks
| Quién | Tarea | Entregable |
|---|---|---|
| Jean | Copiar `ms-template` → `ms-modulo1`: schema, `db push`, seed realista | Tablas con datos |
| Laura | Modelo `ms-modulo2` + cliente HTTP a ms-modulo1 | Modelo + cliente |
| Elias | Modelo `ms-modulo3` | Modelo |
| Luciana | Módulo 1 (M2 + M3) con **datos mock** | UI con mocks |
| Axl | Gateway (rewrites) probado con `/health` de los 4; layout final | Navegación + gateway |

### ⏱ 0:30 – 0:45 · CRUD módulo 1
| Quién | Tarea | Entregable |
|---|---|---|
| Jean | CRUD completo + baja lógica + DTOs + Swagger | **PR ms-modulo1** |
| Laura | Endpoints módulo 2 con su regla | Endpoints |
| Elias | Endpoints módulo 3 | Endpoints |
| Luciana | Módulo 1: mock → API real; M4 detalle | Módulo 1 funcional |
| Axl | Módulo 3 (M2 + M5) con mocks; mergear PR de Jean | Merge |

### ⏱ 0:45 – 1:00 · ✅ Hito módulo 1
| Quién | Tarea | Entregable |
|---|---|---|
| Jean | Extras módulo 1 (filtros, historial, catálogos) | Valor agregado |
| Laura | Cerrar regla módulo 2 + errores | **PR ms-modulo2** |
| Elias | Lógica principal módulo 3 (consulta ms-modulo1) | Lógica |
| Luciana | **PR web-modulo1**; empezar módulo 2 (M2 + M4) | PR |
| Axl | Merge + prueba punta a punta módulo 1 | Hito 1 |
| Luciana | Daily #1 en el informe | Daily |

### ⏱ 1:00 – 1:15 · ✅ Hito módulo 2
| Quién | Tarea | Entregable |
|---|---|---|
| Jean | Apoyo `ms-modulo4` | — |
| Laura | Modelo + endpoints base `ms-modulo4` | Base m4 |
| Elias | **PR ms-modulo3**; luego apoyo `ms-modulo4` | PR |
| Luciana | Módulo 2 conectado, regla visible | **PR web-modulo2** |
| Axl | Módulo 3 conectado (M5 imprimible) | UI m3 |

### ⏱ 1:15 – 1:30 · ✅ Hito módulo 3
| Quién | Tarea | Entregable |
|---|---|---|
| Jean + Laura | Generación/almacenamiento módulo 4 + histórico | **PR ms-modulo4** |
| Elias | Diagramas ER por servicio (desde `schema.prisma`, ej. `prisma-erd-generator` o dbdiagram.io) | `docs/diagramas/` |
| Luciana | Módulo 4 (M2 + M5) | UI m4 |
| Axl | Merge módulo 3; pruebas integradas; diagrama de despliegue final (según compose) | Hito 3 + despliegue |

### ⏱ 1:30 – 1:45 · ✅ Hito módulo 4 + Dashboard
| Quién | Tarea | Entregable |
|---|---|---|
| Jean | `GET /stats` para KPIs | KPIs |
| Laura | Fixes módulo 4 | — |
| Elias | Capturas Swagger/Prisma Studio + pegar ER en el informe | Evidencias |
| Luciana | Dashboard (M1) conectado | Dashboard |
| Axl | Merge módulo 4 → **CODE FREEZE** | 100% |

### ⏱ 1:45 – 2:00 · Cierre
| Quién | Tarea | Entregable |
|---|---|---|
| Axl | Sección de arquitectura en el informe (prellenada hoy, solo ajustar); (opcional) `--profile full up --build`; ensayo demo; `git tag v1.0` | Demo + sección arquitectura |
| Jean, Laura | Capturas Swagger/Postman/Prisma Studio | Evidencias |
| Elias | Conclusiones + bibliografía (GitHub/Trello/Drive) | Cierre |
| Luciana | Daily #2, retro, mockups finales al informe, exportar PDF y entregar | **Informe** |

### Vista en paralelo
```
         0:00    0:15        0:30        0:45        1:00        1:15        1:30    1:45   2:00
Jean     contr.  │m1 modelo  │m1 CRUD    │m1 extras  │apoyo m4   │m4 lógica  │stats  │evid.
Laura    contr.  │m2 modelo  │m2 reglas  │m2 PR      │m4 base    │m4 lógica  │fixes  │evid.
Elias    contr.  │m3 modelo  │m3 endpts  │m3 lógica  │PR m3/ m4  │ER         │evid.  │concl.
Luciana  backlog │m1 mock    │m1 API+M4  │m1 PR / m2 │m2 API     │m4 UI      │Dashbrd│PDF
Axl      docker+C4│layout/gw │m3 mock    │MERGE m1   │m3 UI      │MERGE m3+despl.│MERGE│arq+demo
```

> **Plan B:** si a 1:15 el módulo 3 no está, se evalúa: si se recupera en 10 min se termina; si no, se pule lo que hay. Mejor 3 módulos impecables que 4 rotos.

---

## 9. Qué preparar HOY

> ⚠️ Confirmar con el docente qué puede traerse pre-hecho. Si no se permite código previo, dejar todo instalado/probado y un **script de scaffolding** que lo regenere en ~10 min.

### Axl – Repo + Docker + layout
- [ ] Repo GitHub, 5 colaboradores, `main` protegida, plantilla de PR, `.gitignore`.
- [ ] `docker-compose.yml`, `docker/init.sql`, `docker/Dockerfile.nest`, `.dockerignore` (sección 6).
- [ ] Probar `docker compose up -d` y un `--profile full up --build` completo (calienta caché).
- [ ] Probar BD compartida por IP con al menos otra máquina.
- [ ] Next.js + Tailwind + shadcn con componentes agregados:
  `npx shadcn@latest add button card table dialog form input textarea select badge tabs sonner dropdown-menu sheet avatar separator tooltip calendar popover chart skeleton alert`
- [ ] Layout con sidebar (Dashboard + Módulo 1..4), páginas placeholder, rewrites, `lib/api.ts`.

### Todos
- [ ] Instalar Docker Desktop, Node 20, Git; clonar repo; `docker compose pull`; `npm install` en todo.

### Jean, Laura, Elias – Backend
- [ ] `ms-template` NestJS: Prisma, `ValidationPipe`, CORS, Swagger `/docs`, `/health`, CRUD genérico + seed.
- [ ] `ms-modulo1..4` copiados del template, levantando a la vez en 3001–3004.
- [ ] Snippets: llamada entre servicios, baja lógica (`activo`), reemplazo `{{variable}}` en plantillas.

### Luciana – Mockups + Front
- [ ] **Mockups M1–M5** en Figma/shadcn blocks → PNG en `docs/mockups/`.
- [ ] Componentes: `DataTable`, `FormDialog`, `ConfirmDialog`, `KpiCard`, `StatusBadge`, `PageHeader`, `EmptyState`, `PrintableDocument`.
- [ ] Página CRUD ejemplo contra `ms-template` (M2 + M3) para replicar en 15 min.
- [ ] Tema/paleta y logo genérico.

### Axl – Arquitectura (Arquitecto de Software)
- [ ] Plantillas draw.io: C4 contexto y contenedores (Web → Gateway → ms-modulo1..4 → db_modulo1..4), despliegue (Docker).
- [ ] Sección de arquitectura del informe prellenada al 80%: patrón microservicios, Database per Service, API Gateway, REST síncrono, justificación del stack, atributos de calidad (escalabilidad, mantenibilidad, despliegue independiente), mejoras futuras (broker, auth).

### Elias – Datos
- [ ] Probar generar diagrama ER desde `schema.prisma` (`prisma-erd-generator` o dbdiagram.io) con `ms-template`.

### Luciana – Documentación
- [ ] Informe en Google Docs con lo no dependiente del dominio prellenado: integrantes/roles, normas, riesgos, estructura de sprints (Sprint 1 = módulos 1–2, Sprint 2 = 3–4), tablas de dailys, DoD, links.
- [ ] Tablero (Backlog / To Do / In Progress / Review / Done) con etiquetas por persona.
- [ ] Guion de demo: problema → arquitectura → módulos 1..4 → dashboard → cierre.

### Ensayo (45 min, muy recomendado)
- [ ] Simular con el kata anterior los primeros 45 min con cronómetro.

---

## 10. Definición de Hecho por módulo
- Endpoints en Swagger y regla de negocio en backend.
- Pantalla según su mockup, conectada a la API real, con validación, toasts y estado vacío.
- Mergeado en `main` y probado por Axl de punta a punta.
- Captura agregada al informe.

## 11. Riesgos y mitigación
| Riesgo | Mitigación |
|---|---|
| Kata con más/menos módulos | Regla de la sección 1 |
| Wifi lento / Docker no levanta | Imágenes descargadas hoy; fallback a Postgres local |
| Un servicio se atrasa | Front sigue con mocks del contrato; Jean apoya |
| Conflictos en `package-lock` | Dependencias instaladas hoy |
| Integración falla al final | Code freeze 1:45; demo probada desde 1:30 |
| Informe incompleto | Prellenado hoy; dailys en el momento |
