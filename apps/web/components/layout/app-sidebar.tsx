"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Building2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { APP_NAME, APP_SUBTITLE, NAV } from "@/lib/modules";

/** Sidebar fijo con las secciones que el rol puede ver (las recibe de AppShell). */
export function AppSidebar({ items = NAV }: { items?: typeof NAV }) {
  const pathname = usePathname();
  return (
    <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col overflow-y-auto bg-slate-950 text-slate-100 md:flex print:hidden">
      <div className="flex items-center gap-3 px-6 py-5">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-white/10 text-white">
          <Building2 className="size-5" />
        </div>
        <div className="min-w-0">
          <p className="font-semibold leading-tight">{APP_NAME}</p>
          <p className="text-xs leading-snug text-slate-400">{APP_SUBTITLE}</p>
        </div>
      </div>
      <nav className="flex flex-1 flex-col gap-1 px-3 py-2">
        {items.map((item) => {
          const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                active ? "bg-white/10 font-medium text-white" : "text-slate-400 hover:bg-white/5 hover:text-white",
              )}
            >
              <Icon className="size-4" />
              {item.title}
            </Link>
          );
        })}
      </nav>
      <p className="px-6 py-4 text-xs text-slate-500">Arquitectura de microservicios</p>
    </aside>
  );
}
