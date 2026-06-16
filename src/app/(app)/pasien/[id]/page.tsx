import { PatientDetailClient } from "./client";

export function generateStaticParams() {
  return [{ id: "_" }];
}

export default function PatientDetailPage() {
  return <PatientDetailClient />;
}
