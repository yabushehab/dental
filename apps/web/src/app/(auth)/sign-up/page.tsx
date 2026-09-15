import Link from "next/link";
import type { Metadata } from "next";
import { AuthForm } from "@/components/auth-form";
import { signUpAction } from "@/lib/actions/auth";

export const metadata: Metadata = { title: "Create account" };

export default function SignUpPage() {
  return (
    <div>
      <h2 className="mb-4 text-lg font-semibold">Create your account</h2>
      <AuthForm
        action={signUpAction}
        submitLabel="Create account"
        fields={[
          { name: "name", label: "Full name", type: "text", placeholder: "Dr. Ahmed Al-Sayed" },
          { name: "email", label: "Email", type: "email", placeholder: "you@clinic.com" },
          { name: "password", label: "Password (min 8 characters)", type: "password" },
        ]}
      />
      <p className="mt-4 text-center text-sm text-gray-500">
        Already have an account?{" "}
        <Link href="/sign-in" className="font-medium text-brand-600 hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}
