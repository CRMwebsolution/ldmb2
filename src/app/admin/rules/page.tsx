import { redirect } from "next/navigation";

// Class rules and fees live in class_catalog, alongside class order and scoring.
export default function RulesRedirect() {
  redirect("/admin/classes");
}
