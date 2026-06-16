import { redirect } from "next/navigation";
import { currentUser } from "@/lib/session";

export default async function RootPage() {
  const session = await currentUser();
  redirect(session ? "/dashboard" : "/login");
}
