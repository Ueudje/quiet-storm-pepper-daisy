import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { EclatGame } from "@/components/EclatGame";
import "../src/styles.css";

const root = document.getElementById("root");
if (!root) throw new Error("missing #root");

createRoot(root).render(
  <StrictMode>
    <EclatGame />
  </StrictMode>,
);
