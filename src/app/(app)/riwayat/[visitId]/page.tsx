import { RiwayatDetailClient } from "./client";

export function generateStaticParams() {
  return [{ visitId: "_" }];
}

export default function RiwayatDetailPage() {
  return <RiwayatDetailClient />;
}
