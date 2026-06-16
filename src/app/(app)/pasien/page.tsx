import { Suspense } from "react";
import { PasienView } from "@/components/pasien/PasienView";

export default function PasienPage() {
  return (
    <Suspense fallback={null}>
      <PasienView />
    </Suspense>
  );
}
