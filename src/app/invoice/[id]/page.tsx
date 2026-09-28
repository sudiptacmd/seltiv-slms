import { notFound } from 'next/navigation';
import { requireUser } from '@/lib/session';
import { connectDb } from '@/lib/db';
import { Invoice, Student } from '@/models';
import { assertChildOfParent } from '@/lib/parent';
import { env } from '@/lib/env';
import { taka, formatDate } from '@/lib/utils';
import { PrintButton } from './print-button';

export default async function InvoicePreview({params}: {params: Promise<{id:string}>}) {
  const user = await requireUser();
  await connectDb();
  const {id} = await params;
  const invoice = await Invoice.findById(id).lean();
  if (!invoice) notFound();
  if (!user.roles.some(r=>r==='admin'||r==='accountant') && !(user.roles.includes('parent') && await assertChildOfParent(user, String(invoice.student)))) notFound();
  const student = await Student.findById(invoice.student).lean();
  return <main className="min-h-screen bg-stone-100 px-8 py-8 print:bg-white print:p-0">
    <nav className="mx-auto mb-6 flex max-w-3xl items-center justify-between print:hidden">
      <a className="text-sm text-accent-700" href={user.roles.includes('parent')?'/parent/fees':`/accounts/fees/${invoice.student}`}>← Back to fees</a>
      <div className="flex gap-3"><a href={`/print/invoice/${id}`} download className="rounded border border-line bg-white px-4 py-2 text-sm">Download PDF</a><PrintButton /></div>
    </nav>
    <article className="mx-auto min-h-[760px] max-w-3xl bg-white p-12 shadow-sm print:shadow-none">
      <header className="flex justify-between border-b-2 border-accent pb-8"><div><h1 className="font-serif text-2xl font-bold">{env.school.name}</h1><p className="mt-2 text-sm text-muted">{env.school.address}</p></div><div className="text-right"><p className="text-sm uppercase tracking-widest text-accent-700">Fee invoice</p><p className="mt-2 text-sm">{invoice.invoiceNo}</p></div></header>
      <div className="my-9 flex justify-between"><div><p className="text-xs uppercase text-muted">Billed to</p><h2 className="mt-2 text-xl font-semibold">{student?.name}</h2><p className="text-sm text-muted">{student?.studentCode}</p></div><div className="text-right text-sm"><p>Due {formatDate(invoice.dueDate)}</p><p className="mt-2 capitalize">Status: {invoice.status}</p></div></div>
      <h2 className="mb-5 font-serif text-xl">{invoice.title}</h2>
      <table className="w-full text-sm"><thead className="bg-stone-100"><tr><th className="p-3 text-left">Description</th><th className="p-3 text-right">Amount</th></tr></thead><tbody>{invoice.lines.map((line,i)=><tr key={i} className="border-b border-line"><td className="p-3">{line.label}</td><td className="p-3 text-right">{taka(line.amount)}</td></tr>)}</tbody></table>
      <dl className="ml-auto mt-6 w-72 space-y-3 text-sm"><div className="flex justify-between"><dt>Total payable</dt><dd>{taka(invoice.netPayable)}</dd></div><div className="flex justify-between"><dt>Already paid</dt><dd>{taka(invoice.paidAmount)}</dd></div><div className="flex justify-between border-t border-line pt-3 text-lg font-semibold"><dt>Balance</dt><dd>{taka(Math.max(0,invoice.netPayable-invoice.paidAmount))}</dd></div></dl>
      <footer className="mt-16 border-t border-line pt-5 text-sm text-muted">Pay online through the parent portal, or bring this invoice to the school accounts desk. Please keep your receipt for your records.</footer>
    </article>
  </main>;
}
