import * as React from "react";
import { createRoot } from "react-dom/client";
import App from "./App";

/* global document, Office */

Office.onReady(() => {
    const rootElement = document.getElementById("container");
    if (rootElement) {
        const root = createRoot(rootElement);
        root.render(<App />);
    }
});
