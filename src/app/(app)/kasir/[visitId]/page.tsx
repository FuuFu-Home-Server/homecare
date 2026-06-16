import { notFound } from "next/navigation";
import { BillView } from "@/components/kasir/BillView";

export default async function KasirBillPage({
  params,
}: {
  params: Promise<{ visitId: string }>;
}) {
  const { visitId } = await params;
  const id = Number(visitId);
  if (!Number.isInteger(id)) notFound();
  return <BillView visitId={id} />;
}
