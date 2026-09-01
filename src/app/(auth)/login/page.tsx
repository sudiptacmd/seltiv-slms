import Link from "next/link";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { HOME_BY_ROLE } from "@/lib/auth.config";
import { LoginForm } from "./LoginForm";

export const metadata: Metadata = { title: "Sign in" };

export default async function LoginPage() {
  const user = await getCurrentUser();
  if (user) redirect(HOME_BY_ROLE[user.primaryRole] ?? "/");

  return (
    <div>
      <h1 className="mb-1 font-serif text-[18px] font-semibold">Sign in</h1>
      <p className="mb-5 text-[12px] text-muted">Use your registered phone number or email.</p>
      <LoginForm />
      <div className="mt-4 flex items-center justify-between text-[12px]">
        <Link href="/forgot-password" className="text-accent-700 hover:underline">
          Forgot password?
        </Link>
        <Link href="/admissions/apply" className="text-accent-700 hover:underline">
          Apply for admission
        </Link>
      </div>
    </div>
  );
}
