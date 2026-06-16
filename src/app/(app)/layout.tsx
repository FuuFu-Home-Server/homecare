import { redirect } from "next/navigation";
import { currentUser } from "@/lib/session";
import { getClinic } from "@/lib/db/settings";
import { AuthProvider } from "@/hooks/useAuth";
import { ClinicProvider } from "@/hooks/useClinic";
import { AppShell } from "@/components/layout/AppShell";
import type { AuthUser } from "@/hooks/useAuth";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await currentUser();
  if (!session || session.userId === undefined || session.role === undefined) {
    redirect("/login");
  }

  const user: AuthUser = {
    userId: session.userId,
    username: session.username ?? "",
    nama: session.nama ?? "",
    role: session.role,
  };

  return (
    <AuthProvider initialUser={user}>
      <ClinicProvider clinic={getClinic()}>
        <AppShell>{children}</AppShell>
      </ClinicProvider>
    </AuthProvider>
  );
}
