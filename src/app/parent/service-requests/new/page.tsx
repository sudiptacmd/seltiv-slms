import type { Metadata } from "next";
import { requireRole } from "@/lib/session";
import { PageHeader, EmptyState } from "@/components/ui/primitives";
import { Breadcrumbs } from "@/components/ui/misc";
import { connectDb } from "@/lib/db";
import { ServiceRequestType } from "@/models";
import { parentChildren } from "@/lib/parent";
import { NewRequestForm } from "./NewRequestForm";

export const metadata: Metadata = { title: "New request" };

export default async function NewServiceRequestPage() {
  const user = await requireRole("parent");
  await connectDb();
  const [types, children] = await Promise.all([
    ServiceRequestType.find({ active: true }).sort({ name: 1 }).lean(),
    parentChildren(user),
  ]);

  return (
    <div className="mx-auto max-w-lg">
      <Breadcrumbs items={[{ label: "Service Requests", href: "/parent/service-requests" }, { label: "New" }]} />
      <PageHeader title="New service request" />
      {children.length === 0 ? (
        <EmptyState title="No child linked" hint="Link a child first." />
      ) : (
        <NewRequestForm
          types={types.map((t) => ({ id: String(t._id), name: t.name, fee: t.fee, description: t.description }))}
          children={children.map((c) => ({ id: c.id, name: c.name }))}
        />
      )}
    </div>
  );
}
