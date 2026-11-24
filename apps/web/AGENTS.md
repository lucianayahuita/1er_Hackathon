# AGENTS.md – apps/web (Frontend)

**Dueños:** Luciana (módulo 1, módulo 2, Dashboard) · Axl (módulo 3, módulo 4, layout, archivos compartidos)
**Puerto:** `3000` · Lee también el [`AGENTS.md` raíz](../../AGENTS.md).

## Stack
Next.js 15 (App Router) · React 19 · TypeScript · Tailwind v4 · shadcn/ui (estilo radix-nova, iconos lucide) · `sonner` (toasts) · `recharts` vía `components/ui/chart` · `react-hook-form` + `zod`.

## Cómo habla con el backend
- `next.config.ts` = **API Gateway**: `/api/m1..m4/*` → `localhost:3001..3004`. Nunca llamar a `localhost:300X` directo desde el navegador.
- Usar siempre `lib/api.ts`: `api.get("m1", "/registros")`, `api.post(...)`, `api.patch(...)`. Ya muestra toast de error.
- Tipos de datos en `lib/api.ts` (ajustar al contrato de `contracts/moduloX.md`).

## Estructura y dueños
| Ruta | Dueño | Qué es |
|---|---|---|
| `lib/modules.ts` | **Axl** | ÚNICO lugar con nombre del sistema, títulos, entidades e iconos de cada módulo |
| `app/layout.tsx`, `components/layout/*`, `next.config.ts` | **Axl** | layout, sidebar, header, gateway |
| `app/page.tsx` | Luciana | Dashboard (KPIs de `GET /api/m1/registros/stats` + gráfico) |
| `app/modulo1/`, `app/modulo2/` | Luciana | pantallas de módulos 1 y 2 |
| `app/modulo3/`, `app/modulo4/` | Axl | pantallas de módulos 3 y 4 (m3 trae ejemplo de documento imprimible) |
| `components/shared/*` | compartido (avisar antes de cambiar) | `RegistrosCrud`, `RegistroFormDialog`, `ConfirmDialog`, `KpiCard`, `StatusBadge`, `PageHeader`, `EmptyState`, `PrintableDocument` + `renderTemplate` |
| `components/ui/*` | — | componentes shadcn: no modificar |

## Patrones a seguir
- Pantalla nueva = copiar el patrón de `components/shared/registros-crud.tsx` (tabla + búsqueda + diálogo + baja) y ajustar columnas/campos. Si se necesita una versión distinta, **crear un componente nuevo en la carpeta del módulo** en vez de modificar el compartido.
- Formularios: `react-hook-form` + `zod` como en `registro-form-dialog.tsx`.
- Regla de negocio visible: `Alert`, `StatusBadge`, botón deshabilitado + `Tooltip` con el motivo.
- Feedback: `toast.success(...)` tras cada acción; `Skeleton` al cargar; `EmptyState` sin datos.
- Mientras el back no esté listo: datos simulados con el JSON de ejemplo del contrato, luego cambiar a `api.*`.
- Textos en español. Montos con `formatMoney`, fechas con `formatDate` (`lib/api.ts`).

## Reglas para el asistente de IA
- Edita solo los archivos del dueño que te usa (tabla de arriba). Los de Axl solo si el usuario es Axl.
- **No instales paquetes** ni agregues componentes shadcn nuevos sin confirmación.
- No hagas commit/push salvo que te lo pidan.
- Verifica con `npm run build` antes de terminar.

## Comandos
```powershell
npm install
npm run dev      # http://localhost:3000
npm run build    # verificar compilación
```

## Tareas de Luciana (completar el día de la hackathon)
<!-- Luciana: tareas concretas de módulo 1, módulo 2 y Dashboard. -->
- [ ] Módulo 1:
- [ ] Módulo 2:
- [ ] Dashboard:
- [ ]

## Tareas de Axl (completar el día de la hackathon)
<!-- Axl: renombrado de dominio, módulo 3, módulo 4, integración. -->
- [ ] Renombrar `lib/modules.ts`:
- [ ] Módulo 3:
- [ ] Módulo 4:
- [ ]
