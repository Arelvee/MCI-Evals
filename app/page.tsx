import type { Metadata } from "next";
import { TriageApp } from "./TriageApp";

export const metadata: Metadata = {
  title: "MCI Triage Evaluation",
  description: "Digitized Day 1 to Day 3 MCI triage score sheets with timers.",
};

export default function Home() {
  return <TriageApp />;
}
