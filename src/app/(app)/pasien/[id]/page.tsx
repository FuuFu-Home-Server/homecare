import { notFound } from "next/navigation";
import { getPatient, getPatientHistory } from "@/lib/db/patients";
import { PatientDetail } from "@/components/pasien/PatientDetail";

export const dynamic = "force-dynamic";

export default async function PatientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const patientId = Number(id);
  const patient = Number.isInteger(patientId) ? getPatient(patientId) : null;
  if (!patient) notFound();

  return <PatientDetail patient={patient} history={getPatientHistory(patientId)} />;
}
