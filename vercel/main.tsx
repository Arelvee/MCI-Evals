import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "../app/globals.css";
import { PwaRegister } from "../app/PwaRegister";
import { TriageApp } from "../app/TriageApp";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <PwaRegister />
    <TriageApp />
  </StrictMode>,
);
