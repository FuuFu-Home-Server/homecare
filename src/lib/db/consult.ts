import { getQueueEntry } from "@/lib/db/queue";
import { getPatient } from "@/lib/db/patients";
import { getSoapNotes, getInterventions, getAccessLog } from "@/lib/db/records";
import { getPrescriptions } from "@/lib/db/inventory";
import type { ConsultBundle } from "@/types";

/** Compose everything the consultation screen needs for one visit. */
export function getConsultBundle(visitId: number): ConsultBundle | null {
  const entry = getQueueEntry(visitId);
  if (!entry) return null;
  const patient = getPatient(entry.patientId);
  if (!patient) return null;

  return {
    entry,
    patient,
    soapNotes: getSoapNotes(visitId),
    interventions: getInterventions(visitId),
    prescriptions: getPrescriptions(visitId),
    accessLog: getAccessLog(visitId),
  };
}
