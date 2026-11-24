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

> **Kata de hoy:** Banca por Internet – STARTUP CHUNO (24/11/2026). Ver `AGENTS.md` raíz y `contracts/`.

## Tareas de Luciana · Clientes, Cuentas, Dashboard + informe (gestión)
- [ ] **Clientes (`app/modulo1`):** tabla (CI, nombre completo, email, teléfono, usuario, estado: Activo/Inactivo/Bloqueado), búsqueda, formulario alta/edición (password solo en alta), baja con confirmación, botón "Desbloquear" si `bloqueado`. Endpoints `/api/m1/clientes...`. Crear componentes propios en `app/modulo1/` (no modificar `components/shared`).
- [ ] **Cuentas (`app/modulo2`):** tabla (número, cliente, moneda, saldo con `formatMoney`, estado), crear cuenta (select de clientes desde `/api/m1/clientes?activo=true`), diálogos **Depositar** y **Extraer** (mostrar error "Saldo insuficiente" con toast), vista de movimientos (Sheet o Tabs).
- [ ] **Dashboard (`app/page.tsx`):** KPIs: clientes activos (`/api/m1/clientes/stats`), cuentas y saldo total (`/api/m2/cuentas/stats`), pagos (`/api/m3/pagos/stats`), transferencias (`/api/m4/transferencias/stats`); gráfico de pagos por categoría; tolerar servicios caídos (mostrar "—").
- [ ] Ajustar tipos en `lib/api.ts` (`Cliente`, `Cuenta`, `Movimiento`) — coordinar con Axl porque es compartido.
- [ ] **Préstamos (`app/modulo5`, bonus, después del Dashboard):** tabla de préstamos con estado, formulario de solicitud (cliente, cuenta, monto, tasa, plazo) mostrando la cuota calculada, botones Aprobar/Rechazar. Endpoints `/api/m5/prestamos...`. Si no llegas, lo toma Axl.
- [ ] **Informe:** carátula (integrantes asistentes + fecha 24/11/2026), Fase de Inicio, **historias de usuario** de los 5 módulos, planificación, capturas de pantallas, conclusiones, PDF y **carga al LMS antes de las 20:45**.

## Tareas de Axl · Renombrado, Pagos, Transferencias, integración
- [ ] **`lib/modules.ts`:** `APP_NAME = "Chuno Banca"`, subtítulo "Banca por Internet"; módulos: Clientes (`Users`), Cuentas (`Wallet`/`PiggyBank`), Pagos de servicios (`Receipt`), Transferencias (`ArrowLeftRight`); entidades Cliente, Cuenta, Pago, Transferencia.
- [ ] **Pagos (`app/modulo3`):** reemplazar el ejemplo de documento por: selector de proveedor (tarjetas con icono por categoría) → buscar deudas por código → elegir cliente y cuenta → pagar → **comprobante imprimible** (`PrintableDocument`) + historial.
- [ ] **Transferencias (`app/modulo4`):** Tabs Propia / Tercero / Otro banco; formulario (cuenta origen del cliente, destino, banco y titular en interbancaria, monto, glosa) → comprobante imprimible + historial con badge de estado.
- [ ] Mergear en orden (m1 → m2 → m3 → m4), probar de punta a punta, **code freeze 20:15**, ensayo de demo.
- [ ] Renombrar el módulo 5 en `lib/modules.ts`: Préstamos (`Landmark`), entidad Préstamo (gateway `/api/m5` y página `/modulo5` ya existen).
