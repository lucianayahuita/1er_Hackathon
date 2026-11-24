import { LayoutDashboard, Users, Wallet, Receipt, ArrowLeftRight, Landmark, type LucideIcon } from "lucide-react";

/**
 * ÚNICO lugar para renombrar el dominio del kata (lo edita Axl en el minuto 0).
 */
export const APP_NAME = "Chuno Banca";
export const APP_SUBTITLE = "Banca por Internet – Startup Chuno";

export type ModuleKey = "m1" | "m2" | "m3" | "m4" | "m5";

export interface ModuleDef {
  key: ModuleKey;
  href: string;
  title: string;
  description: string;
  icon: LucideIcon;
  entity: string; // singular, ej. "Cliente"
}

export const MODULES: ModuleDef[] = [
  { key: "m1", href: "/modulo1", title: "Clientes", description: "Alta, modificación, baja lógica y seguridad", icon: Users, entity: "Cliente" },
  { key: "m2", href: "/modulo2", title: "Cuentas", description: "Cuentas de ahorro, depósitos, retiros y movimientos", icon: Wallet, entity: "Cuenta" },
  { key: "m3", href: "/modulo3", title: "Pagos de servicios", description: "Luz, agua, telefonía, gas y comprobantes", icon: Receipt, entity: "Pago" },
  { key: "m4", href: "/modulo4", title: "Transferencias", description: "Cuentas propias, terceros e interbancarias (ACH)", icon: ArrowLeftRight, entity: "Transferencia" },
  { key: "m5", href: "/modulo5", title: "Préstamos", description: "Simulación, solicitud, aprobación y desembolso", icon: Landmark, entity: "Préstamo" },
];

export const NAV = [{ href: "/", title: "Dashboard", icon: LayoutDashboard }, ...MODULES];

export const getModule = (key: ModuleKey) => MODULES.find((m) => m.key === key)!;
