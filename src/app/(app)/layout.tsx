import { redirect } from "next/navigation";
import { getAuthContext } from "@/lib/auth/context";
import { navFor } from "@/lib/nav";
import { Sidebar } from "@/components/Sidebar";
import { logoutAction } from "@/lib/auth/actions";

function roleLabel(keys: string[]) {
  const map: Record<string, string> = {
    headmaster: "Headmaster",
    teacher: "Teacher",
    class_teacher: "Class Teacher",
    student: "Student",
    parent: "Parent",
    exam_controller: "Examination Controller",
  };
  return keys.map((k) => map[k] ?? k).join(" · ");
}

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const ctx = await getAuthContext();
  if (!ctx) redirect("/login");

  const items = navFor(ctx);

  return (
    <div className="flex min-h-screen">
      <aside className="hidden w-60 shrink-0 flex-col border-r border-slate-200 bg-white md:flex">
        <div className="flex items-center gap-2 border-b border-slate-100 px-4 py-4">
          <div className="grid h-8 w-8 place-items-center rounded-lg bg-brand-600 text-sm font-bold text-white">G</div>
          <span className="font-semibold">Greenfield</span>
        </div>
        <div className="flex-1 overflow-y-auto">
          <Sidebar items={items} />
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3">
          <div className="md:hidden font-semibold">Greenfield</div>
          <div className="ml-auto flex items-center gap-4">
            <div className="text-right">
              <div className="text-sm font-medium text-slate-800">{ctx.name}</div>
              <div className="text-xs text-slate-500">{roleLabel(ctx.roleKeys)}</div>
            </div>
            <form action={logoutAction}>
              <button className="btn-ghost" type="submit">Sign out</button>
            </form>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}
