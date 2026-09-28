import { requireRole } from '@/lib/session';
import { PageHeader, Panel, StatTile, Tag } from '@/components/ui/primitives';
import { Table, TableHeadRow, TH, TR, TD } from '@/components/ui/table';
import { connectDb } from '@/lib/db';
import { Staff } from '@/models';
import { StaffAttendance } from '@/models/staff-attendance';

export const metadata={title:'Teacher Attendance'};
export default async function Page({searchParams}:{searchParams:Promise<{date?:string}>}) {
 await requireRole('admin'); await connectDb();
 const sp=await searchParams;
 const date=sp.date && /^\d{4}-\d{2}-\d{2}$/.test(sp.date)?sp.date:new Date().toISOString().slice(0,10);
 const [teachers,records]=await Promise.all([Staff.find({type:'teaching',active:true}).sort({name:1}).lean(),StaffAttendance.find({date}).lean()]);
 const byId=new Map(records.map(r=>[String(r.staff),r]));
 return <div><PageHeader title="Teacher Attendance" subtitle="Daily staff attendance records — separate from student roll calls." />
 <form className="mb-4 flex items-end gap-3"><label className="text-sm">Attendance date<input className="ml-3 rounded border border-line bg-white p-2" type="date" name="date" defaultValue={date}/></label><button className="rounded bg-accent px-4 py-2 text-sm text-white">Load records</button></form>
 <div className="grid grid-cols-4 gap-3"><StatTile value={teachers.length} label="Active teachers"/><StatTile value={records.filter(r=>r.status==='present').length} label="Present" tone="ok"/><StatTile value={records.filter(r=>r.status==='late').length} label="Late" tone="warn"/><StatTile value={records.filter(r=>r.status==='absent'||r.status==='leave').length} label="Absent / on leave"/></div>
 <Panel title={`Per-teacher attendance · ${date}`} className="mt-4" bodyClassName="p-0"><Table><TableHeadRow><TH>Teacher</TH><TH>Designation</TH><TH>Check-in</TH><TH>Status</TH><TH>Note</TH></TableHeadRow><tbody>{teachers.map(t=>{const r=byId.get(String(t._id));return <TR key={String(t._id)}><TD className="font-medium">{t.name}</TD><TD>{t.designation}</TD><TD>{r?.checkIn??'—'}</TD><TD><Tag tone={r?.status==='present'?'ok':r?.status==='late'?'warn':'neutral'}>{r?.status??'Not recorded'}</Tag></TD><TD className="text-muted">{r?.note??'—'}</TD></TR>})}</tbody></Table></Panel></div>;
}
