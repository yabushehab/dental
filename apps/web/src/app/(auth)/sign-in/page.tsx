import Link from "next/link";
import type { Metadata } from "next";
import { AuthForm } from "@/components/auth-form";
import { signInAction } from "@/lib/actions/auth";

export const metadata: Metadata = { title: "Sign in" };

export default function SignInPage() {
  return (
    <div>
      <h2 className="mb-4 text-lg font-semibold">Sign in</h2>
      <AuthForm
        action={signInAction}
        submitLabel="Sign in"
        fields={[
          { name: "email", label: "Email", type: "email", placeholder: "you@clinic.com" },
          { name: "password", label: "Password", type: "password" },
        ]}
      />
      <p className="mt-4 text-center text-sm text-gray-500">
        New here?{" "}
        <Link href="/sign-up" className="font-medium text-brand-600 hover:underline">
          Create an account
        </Link>
      </p>
    </div>
  );
}
