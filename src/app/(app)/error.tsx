"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/Button";
import { Card, CardBody } from "@/components/ui/Card";

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <Card className="mx-auto mt-10 max-w-md">
      <CardBody className="text-center">
        <h1 className="text-lg font-semibold text-slate-800">Terjadi kesalahan</h1>
        <p className="mt-1 text-sm text-slate-500">
          Maaf, ada masalah saat memuat halaman ini. Silakan coba lagi.
        </p>
        <Button className="mt-4" onClick={reset}>
          Coba Lagi
        </Button>
      </CardBody>
    </Card>
  );
}
