import { redirect } from "next/navigation";

export default function AdminInvoicesRedirect() {
  redirect("/accounts/fees/invoices");
}
