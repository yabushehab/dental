import Link from "next/link";
import { requirePermission } from "@/lib/rbac";

const SECTIONS = [
  { href: "/settings/branches", title: "Branches", desc: "Locations of your dental center" },
  { href: "/settings/chairs", title: "Chairs", desc: "Treatment chairs per branch" },
  { href: "/settings/appointment-types", title: "Appointment types", desc: "Visit types, durations, colors" },
  { href: "/settings/procedures", title: "Procedure catalog", desc: "Codes, prices, VAT rates" },
];

export default async function SettingsPage() {
  const { organization } = await requirePermission("settings:manage");

  const rows = [
    ["Name", organization.name],
    ["Country", organization.country],
    ["Currency", `${organization.currency} (${organization.currencyExponent} decimals)`],
    ["Timezone", organization.timezone],
    ["Default VAT rate", `${organization.defaultVatRate}%`],
    ["Plan", organization.plan],
  ] as const;

  return (
    <div>
      <h1 className="text-xl font-semibold">Settings</h1>
      <p className="mt-1 text-sm text-gray-500">
        Organization settings — branches, staff, tax, and channel connections arrive with their
        phases.
      </p>
      <div className="mt-6 grid max-w-3xl gap-4 sm:grid-cols-3">
        {SECTIONS.map((s) => (
          <Link
            key={s.href}
            href={s.href}
            className="rounded-xl border border-gray-200 bg-white p-4 hover:border-brand-300 hover:shadow-sm"
          >
            <div className="text-sm font-semibold text-gray-900">{s.title}</div>
            <div className="mt-1 text-xs text-gray-500">{s.desc}</div>
          </Link>
        ))}
      </div>

      <div className="mt-6 max-w-lg rounded-xl border border-gray-200 bg-white">
        <dl className="divide-y divide-gray-100">
          {rows.map(([label, value]) => (
            <div key={label} className="flex justify-between px-4 py-3 text-sm">
              <dt className="text-gray-500">{label}</dt>
              <dd className="font-medium text-gray-900">{value}</dd>
            </div>
          ))}
        </dl>
      </div>
    </div>
  );
}
