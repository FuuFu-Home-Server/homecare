import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { IconAntrian } from "@/components/layout/icons";

export interface ComingSoonProps {
  modul: string;
}

export function ComingSoon({ modul }: ComingSoonProps) {
  return (
    <Card>
      <EmptyState
        icon={<IconAntrian className="h-10 w-10" />}
        title={`Modul ${modul} sedang disiapkan`}
        description="Layar ini akan diisi pada tahap pengembangan berikutnya."
      />
    </Card>
  );
}
