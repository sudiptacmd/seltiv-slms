import "server-only";
import { Student, Guardian, Enrollment, User, nextSeq, type IAdmissionApplication, type IAcademicYear } from "@/models";
import { env } from "@/lib/env";

/** Creates the student, guardian login and enrollment for an admitted applicant. */
export async function enrolApplicant(
  app: IAdmissionApplication,
  year: Pick<IAcademicYear, "_id" | "name">,
  section: { _id: unknown; klass: unknown },
  rollNumber: number,
) {
  let guardian = await Guardian.findOne({ phone: app.guardianPhone });
  if (!guardian) {
    guardian = await Guardian.create({
      name: app.guardianName,
      relation: app.guardianRelation,
      phone: app.guardianPhone,
      email: app.guardianEmail,
      occupation: app.guardianOccupation,
      address: app.address,
    });
  }
  const sseq = await nextSeq(`student-${year.name}`);
  const student = await Student.create({
    studentCode: `${env.school.code}-${year.name}-${1000 + sseq}`,
    name: app.studentName,
    gender: app.gender,
    dateOfBirth: app.dateOfBirth,
    birthCertNo: app.birthCertNo,
    religion: app.religion,
    address: app.address,
    admissionDate: new Date(),
    status: "active",
    guardians: [{ guardian: guardian._id, isPrimary: true }],
    fromApplication: app._id,
  });
  await Enrollment.create({
    student: student._id,
    year: year._id,
    klass: section.klass,
    section: section._id,
    rollNumber,
    status: "active",
  });
  if (!(await User.findOne({ phone: guardian.phone }))) {
    const bcrypt = (await import("bcryptjs")).default;
    await User.create({
      name: guardian.name,
      phone: guardian.phone,
      passwordHash: await bcrypt.hash("changeme123", 10),
      roles: ["parent"],
      guardian: guardian._id,
      mustChangePassword: true,
    });
  }
  return { student, guardian };
}
