import { redirect } from "next/navigation";

export default function SetsRedirectPage() {
  redirect("/browse?tab=sets");
}
