import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Class Records",
  description: "Unofficial fastest timed passes by class and year at Little Doo Mud Bog, using results recorded since website tracking began.",
};

export default function RecordsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
