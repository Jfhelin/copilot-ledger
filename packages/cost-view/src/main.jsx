import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";
import TooltipLayer from "./components/Tooltip.jsx";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <App />
    <TooltipLayer />
  </StrictMode>,
);
