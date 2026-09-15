import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { getCurrentUser } from "@/lib/current-user";
import { OnboardingForm } from "./onboarding-form";

export const metadata: Metadata = { title: "Set up your clinic" };

export default async function OnboardingPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");
  if (user.organization) redirect("/");

  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-lg">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-brand-700">Welcome, {user.name.split(" ")[0]}</h1>
          <p className="mt-1 text-sm text-gray-500">
            Set up your dental center — you can add branches and staff later.
          </p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <OnboardingForm />
        </div>
      </div>
    </main>
  );
}
