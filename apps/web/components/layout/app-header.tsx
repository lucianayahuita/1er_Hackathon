import { Bell } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

export function AppHeader() {
  return (
    <header className="flex h-16 items-center justify-end gap-4 border-b bg-background px-6 print:hidden">
      <Bell className="size-5 text-muted-foreground" />
      <div className="flex items-center gap-2">
        <Avatar className="size-8">
          <AvatarFallback>AD</AvatarFallback>
        </Avatar>
        <div className="text-sm leading-tight">
          <p className="font-medium">Administrador</p>
          <p className="text-xs text-muted-foreground">admin@empresa.com</p>
        </div>
      </div>
    </header>
  );
}
