import { cn } from "@/lib/utils";

const styles = {
  activo: "bg-emerald-100 text-emerald-700",
  pendiente: "bg-amber-100 text-amber-700",
  inactivo: "bg-rose-100 text-rose-700",
} as const;

export function StatusBadge({ status, label }: { status: keyof typeof styles; label?: string }) {
  return (
    <span className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize", styles[status])}>
      {label ?? status}
    </span>
  );
}
