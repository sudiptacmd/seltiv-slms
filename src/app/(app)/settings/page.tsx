import { redirect } from "next/navigation";
import { requireUser } from "@/lib/session";
import { HOME_BY_ROLE } from "@/lib/auth.config";

export default async function SettingsRedirect() {
  const user = await requireUser();
  if (user.roles.includes("admin")) redirect("/admin/settings/school");
  redirect(`${HOME_BY_ROLE[user.primaryRole]}`);
}
