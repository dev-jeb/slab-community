import { redirect } from "next/navigation";

/** The product list is a scope of the one search page. */
export default function SetsRedirectPage() {
  redirect("/search?scope=sets");
}
