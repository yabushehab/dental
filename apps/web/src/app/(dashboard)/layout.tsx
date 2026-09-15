import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/current-user";
import { signOutAction } from "@/lib/actions/auth";

const NAV = [
  { href: "/", label: "Dashboard", icon: "◧" },
  { href: "/patients", label: "Patients", icon: "☺" },
  { href: "/schedule", label: "Schedule", icon: "▦" },
  { href: "/clinical", label: "Clinical", icon: "✚" },
  { href: "/billing", label: "Billing", icon: "▤" },
  { href: "/inbox", label: "Inbox", icon: "✉" },
  { href: "/campaigns", label: "Campaigns", icon: "➤" },
  { href: "/reports", label: "Reports", icon: "◫" },
  { href: "/settings", label: "Settings", icon: "⚙" },
];

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");
  if (!user.organization || !user.membership) redirect("/onboarding");

  return (
    <div className="flex min-h-screen">
      <aside className="flex w-60 flex-col border-r border-gray-200 bg-white">
        <div className="border-b border-gray-200 px-4 py-4">
          <div className="text-lg font-bold text-brand-700">DentalOS</div>
          <div className="mt-0.5 truncate text-xs text-gray-500">{user.organization.name}</div>
        </div>
        <nav className="flex-1 space-y-0.5 p-2">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-gray-700 hover:bg-brand-50 hover:text-brand-700"
            >
              <span className="w-4 text-center text-gray-400">{item.icon}</span>
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="border-t border-gray-200 p-3">
          <div className="mb-2 px-1">
            <div className="truncate text-sm font-medium text-gray-800">{user.name}</div>
            <div className="text-xs text-gray-500">{user.membership.role}</div>
          </div>
          <form action={signOutAction}>
            <button
              type="submit"
              className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50"
            >
              Sign out
            </button>
          </form>
        </div>
      </aside>
      <main className="flex-1 p-8">{children}</main>
    </div>
  );
}
