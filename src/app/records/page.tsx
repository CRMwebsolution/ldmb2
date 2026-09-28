import { permanentRedirect } from "next/navigation";

export default function LegacyRecordsRoute() {
  permanentRedirect("/race-results/records");
}
