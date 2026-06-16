import { StrukClient } from "./client";

export function generateStaticParams() {
  return [{ billId: "_" }];
}

export default function StrukPage() {
  return <StrukClient />;
}
