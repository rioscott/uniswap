import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { bind, setVolume } from "cuelume";
import { App } from "./App";
import "./index.css";

bind();
setVolume(0.7);

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
