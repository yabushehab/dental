import Link from "next/link";

const TABS = [
  { href: "", label: "Overview" },
  { href: "/chart", label: "Tooth chart" },
  { href: "/plans", label: "Treatment plans" },
  { href: "/notes", label: "Clinical notes" },
  { href: "/prescriptions", label: "Prescriptions" },
  { href: "/medical", label: "Medical history" },
  { href: "/documents", label: "Documents" },
];

export default async function PatientLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <div>
      <nav className="mb-5 flex flex-wrap gap-1 border-b border-gray-200 pb-px text-sm">
        {TABS.map((t) => (
          <Link
            key={t.href}
            href={`/patients/${id}${t.href}`}
            className="rounded-t-md px-3 py-2 font-medium text-gray-600 hover:bg-brand-50 hover:text-brand-700"
          >
            {t.label}
          </Link>
        ))}
      </nav>
      {children}
    </div>
  );
}
