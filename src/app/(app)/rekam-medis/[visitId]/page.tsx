import { ConsultClient } from "./client";

export function generateStaticParams() {
  return [{ visitId: "_" }];
}

export default function ConsultPage() {
  return <ConsultClient />;
}
