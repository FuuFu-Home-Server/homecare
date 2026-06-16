import { notFound } from "next/navigation";
import { StokDetail } from "@/components/stok/StokDetail";

export default async function StokDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const medicineId = Number(id);
  if (!Number.isInteger(medicineId)) notFound();
  return <StokDetail medicineId={medicineId} />;
}
