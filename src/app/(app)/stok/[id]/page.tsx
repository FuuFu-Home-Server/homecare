import { StokDetailClient } from "./client";

export function generateStaticParams() {
  return [{ id: "_" }];
}

export default function StokDetailPage() {
  return <StokDetailClient />;
}
