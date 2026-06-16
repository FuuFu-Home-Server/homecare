import { notFound } from "next/navigation";
import { ConsultView } from "@/components/rekam-medis/ConsultView";

export default async function ConsultPage({
  params,
}: {
  params: Promise<{ visitId: string }>;
}) {
  const { visitId } = await params;
  const id = Number(visitId);
  if (!Number.isInteger(id)) notFound();
  return <ConsultView visitId={id} />;
}
