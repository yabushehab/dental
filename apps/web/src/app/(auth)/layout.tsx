export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-brand-700">DentalOS</h1>
          <p className="mt-1 text-sm text-gray-500">Dental center management platform</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">{children}</div>
      </div>
    </main>
  );
}
