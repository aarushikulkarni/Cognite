import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { InterventionApp } from "./InterventionApp";
import "../shared/ui.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <InterventionApp />
  </StrictMode>,
);
