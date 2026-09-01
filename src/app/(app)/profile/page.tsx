import type { Metadata } from "next";
import { requireUser } from "@/lib/session";
import { PageHeader, Panel, DataRow } from "@/components/ui/primitives";
import { connectDb } from "@/lib/db";
import { User } from "@/models";
import { PasswordForm, NotificationPrefsForm } from "./ProfileForms";

export const metadata: Metadata = { title: "My Profile" };

export default async function ProfilePage() {
  const user = await requireUser();
  await connectDb();
  const doc = await User.findById(user.id).lean();

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title="My Profile" />
      <div className="space-y-4">
        <Panel title="Account">
          <DataRow k="Name">{user.personName}</DataRow>
          <DataRow k="Phone">{doc?.phone}</DataRow>
          <DataRow k="Email">{doc?.email ?? "—"}</DataRow>
          <DataRow k="Role">{user.roles.join(", ")}</DataRow>
        </Panel>
        <NotificationPrefsForm sms={doc?.notificationPrefs?.sms ?? true} email={doc?.notificationPrefs?.email ?? false} />
        <PasswordForm />
      </div>
    </div>
  );
}
