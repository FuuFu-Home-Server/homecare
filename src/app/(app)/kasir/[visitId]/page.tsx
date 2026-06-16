import { KasirBillClient } from "./client";

export function generateStaticParams() {
  return [{ visitId: "_" }];
}

export default function KasirBillPage() {
  return <KasirBillClient />;
}
