export function PlaceholderPage({
  title,
  phase,
  description,
}: {
  title: string;
  phase: string;
  description: string;
}) {
  return (
    <div>
      <h1 className="text-xl font-semibold">{title}</h1>
      <div className="mt-6 rounded-xl border border-dashed border-gray-300 bg-white p-12 text-center">
        <div className="text-sm font-medium text-brand-600">{phase}</div>
        <p className="mx-auto mt-2 max-w-md text-sm text-gray-500">{description}</p>
      </div>
    </div>
  );
}
