import { requireRole } from "@/lib/session";
import { NoticeDetail } from "@/components/NoticeDetail";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireRole("parent");
  const { id } = await params;
  return <NoticeDetail id={id} user={user} backHref="/parent/notices" />;
}
