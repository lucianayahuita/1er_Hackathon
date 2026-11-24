import type { ReactNode } from "react";
import { APP_NAME } from "@/lib/modules";

/** Hoja A4 imprimible (mockup M5). Usar window.print() para exportar a PDF. */
export function PrintableDocument({ title, children, footer }: { title: string; children: ReactNode; footer?: ReactNode }) {
  return (
    <div className="mx-auto w-full max-w-[210mm] bg-white p-12 text-slate-900 shadow-sm ring-1 ring-border print:max-w-none print:shadow-none print:ring-0">
      <div className="mb-8 flex items-center justify-between border-b pb-4">
        <p className="text-lg font-semibold">{APP_NAME}</p>
        <p className="text-sm text-slate-500">{new Date().toLocaleDateString("es-BO")}</p>
      </div>
      <h2 className="mb-6 text-center text-xl font-bold uppercase tracking-wide">{title}</h2>
      <div className="space-y-4 whitespace-pre-line text-sm leading-relaxed">{children}</div>
      {footer && <div className="mt-16">{footer}</div>}
    </div>
  );
}

/** Reemplaza {{variable}} por valores: base de cualquier "documento parametrizable". */
export function renderTemplate(template: string, values: Record<string, string | number>) {
  return template.replace(/\{\{\s*(\w+)\s*\}\}/g, (_m, k: string) => String(values[k] ?? `{{${k}}}`));
}
