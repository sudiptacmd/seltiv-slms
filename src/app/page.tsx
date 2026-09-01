import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { HOME_BY_ROLE } from "@/lib/auth.config";

export default async function Home() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  redirect(HOME_BY_ROLE[user.primaryRole] ?? "/login");
}
