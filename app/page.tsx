import type { Metadata } from "next";
import { TriageApp } from "./TriageApp";

export const metadata: Metadata = {
  title: "MCI Triage Evaluation",
  description: "Digitized Day 1 START and SIEVE score sheet with timers.",
};

export default function Home() {
  return <TriageApp />;
}
