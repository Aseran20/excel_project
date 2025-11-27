/*
 * Copyright (c) Microsoft Corporation. All rights reserved. Licensed under the MIT license.
 * See LICENSE in the project root for license information.
 */

/* global console, document, Excel, Office, process */

// The initialize function must be run each time a new page is loaded
Office.onReady(() => {
  document.getElementById("sideload-msg").style.display = "none";
  document.getElementById("app-body").style.display = "flex";

  // Tab switching
  document.getElementById("tab-inspector").onclick = () => switchTab("inspector");
  document.getElementById("tab-examples").onclick = () => switchTab("examples");
  document.getElementById("tab-docs").onclick = () => switchTab("docs");
  document.getElementById("tab-debug").onclick = () => switchTab("debug");

  // Inspector buttons
  document.getElementById("btn-parse-manual").onclick = parseSelectedCellManually;

  // Listen for selection changes
  Excel.run(async (context) => {
    const sheet = context.workbook.worksheets.getActiveWorksheet();
    sheet.onSelectionChanged.add(onSelectionChanged);
    await context.sync();
  });

  // Debug buttons
  document.getElementById("test-backend").onclick = testBackend;
  document.getElementById("check-functions").onclick = checkCustomFunctions;
});

function switchTab(tabName: string) {
  // Hide all tabs
  document.querySelectorAll(".tab-content").forEach(el => el.classList.remove("active"));
  document.querySelectorAll(".tab-button").forEach(el => el.classList.remove("active"));

  // Show selected tab
  document.getElementById(`content-${tabName}`).classList.add("active");
  document.getElementById(`tab-${tabName}`).classList.add("active");
}

async function testBackend() {
  setStatus("Testing backend...");
  setResponse("");
  try {
    // @ts-ignore - process.env.BACKEND_URL is injected by Webpack
    const backendUrl = process.env.BACKEND_URL || "https://api.auraia.ch/algosheet";
    console.log("Testing backend at:", backendUrl);

    const res = await fetch(backendUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt: "Test from Taskpane", responseMode: "free" })
    });

    if (!res.ok) {
      throw new Error(`HTTP ${res.status} ${res.statusText}`);
    }

    const text = await res.text();
    setResponse(text);
    setStatus("Backend OK ✅");
  } catch (e: any) {
    console.error(e);
    setResponse("Error: " + e.message);
    setStatus("Backend Failed ❌");
  }
}

function checkCustomFunctions() {
  const check: any = (window as any).CustomFunctions;
  if (check) {
    setResponse(`CustomFunctions found:\n${JSON.stringify(Object.keys(check || {}), null, 2)}`);
    setStatus("CustomFunctions available ✅");
  } else {
    setResponse("CustomFunctions is NOT available in this runtime.");
    setStatus("CustomFunctions missing ❌");
  }
}

function setStatus(text: string) {
  const el = document.getElementById("status");
  if (el) el.innerText = text;
}

function setResponse(text: string) {
  const el = document.getElementById("response");
  if (el) el.innerText = text;
}

// Inspector functionality
let currentCellData: any = null;

async function onSelectionChanged() {
  await Excel.run(async (context) => {
    const range = context.workbook.getSelectedRange();
    range.load(["values", "formulas"]);
    await context.sync();

    const value = range.values[0][0];
    const formula = range.formulas[0][0];

    inspectCell(value, formula);
  });
}

function inspectCell(value: any, formula: any) {
  showInspectorState("loading");

  // Check if it's an ALGOSHEET formula
  if (formula && typeof formula === 'string' && formula.toUpperCase().includes('ALGOSHEET')) {
    // It's a formula - try to parse the result
    parseAlgosheetResult(value);
    return;
  }

  // Check if it's pasted JSON data
  if (typeof value === 'string' && value.trim().startsWith('{')) {
    try {
      const data = JSON.parse(value);
      if (data.value !== undefined) {
        // Looks like ALGOSHEET JSON
        displayInspectorData(data);
        return;
      }
    } catch (e) {
      // Not valid JSON
    }
  }

  // Not ALGOSHEET data
  showInspectorState("error");
}

function parseAlgosheetResult(value: any) {
  if (typeof value === 'string' && value.trim().startsWith('{')) {
    try {
      const data = JSON.parse(value);
      displayInspectorData(data);
    } catch (e) {
      showInspectorState("error");
    }
  } else {
    showInspectorState("error");
  }
}

function parseSelectedCellManually() {
  Excel.run(async (context) => {
    const range = context.workbook.getSelectedRange();
    range.load("values");
    await context.sync();

    const value = range.values[0][0];
    if (typeof value === 'string') {
      try {
        const data = JSON.parse(value);
        displayInspectorData(data);
      } catch (e) {
        alert("Unable to parse as JSON");
      }
    }
  });
}

function displayInspectorData(data: any) {
  currentCellData = data;
  showInspectorState("data");

  // Display value/results
  const resultsDiv = document.getElementById("inspector-results");
  resultsDiv.innerHTML = "";

  if (typeof data.value === 'object' && data.value !== null) {
    // Multi-field result
    for (const [key, val] of Object.entries(data.value)) {
      const item = document.createElement("div");
      item.className = "result-item";
      item.innerHTML = `<strong>${key}:</strong> ${val}`;
      resultsDiv.appendChild(item);
    }
  } else {
    // Single value
    const item = document.createElement("div");
    item.className = "result-item";
    item.innerHTML = `<strong>Value:</strong> ${data.value}`;
    resultsDiv.appendChild(item);
  }

  // Display reasoning
  if (data.reasoning) {
    document.getElementById("inspector-reasoning-section").style.display = "block";
    document.getElementById("inspector-reasoning").innerText = data.reasoning;
  } else {
    document.getElementById("inspector-reasoning-section").style.display = "none";
  }

  // Display sources
  if (data.sources && data.sources.length > 0) {
    document.getElementById("inspector-sources-section").style.display = "block";
    const sourcesDiv = document.getElementById("inspector-sources");
    sourcesDiv.innerHTML = "";

    data.sources.forEach((source: any, i: number) => {
      const sourceItem = document.createElement("div");
      sourceItem.className = "source-item";
      const link = document.createElement("a");
      link.href = source.url;
      link.target = "_blank";
      link.innerText = `${i + 1}. ${source.title || "Source"}`;
      sourceItem.appendChild(link);
      sourcesDiv.appendChild(sourceItem);
    });
  } else {
    document.getElementById("inspector-sources-section").style.display = "none";
  }
}

function showInspectorState(state: "empty" | "loading" | "error" | "data") {
  document.getElementById("inspector-empty").style.display = state === "empty" ? "block" : "none";
  document.getElementById("inspector-loading").style.display = state === "loading" ? "block" : "none";
  document.getElementById("inspector-error").style.display = state === "error" ? "block" : "none";
  document.getElementById("inspector-data").style.display = state === "data" ? "block" : "none";
}

function copyRawJSON() {
  if (currentCellData) {
    const json = JSON.stringify(currentCellData, null, 2);
    navigator.clipboard.writeText(json).then(() => {
      alert("JSON copied to clipboard!");
    });
  }
}
