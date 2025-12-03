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

  // Debug buttons
  document.getElementById("btn-clear-logs").onclick = clearLogs;
  document.getElementById("btn-clear-history").onclick = clearHistory;
  document.getElementById("test-backend").onclick = testBackend;

  // Initialize debug system
  initDebugSystem();

  // Listen for selection changes
  Excel.run(async (context) => {
    const sheet = context.workbook.worksheets.getActiveWorksheet();
    sheet.onSelectionChanged.add(onSelectionChanged);
    await context.sync();
  });
});

function switchTab(tabName: string) {
  // Hide all tabs
  document.querySelectorAll(".tab-content").forEach(el => el.classList.remove("active"));
  document.querySelectorAll(".tab-button").forEach(el => el.classList.remove("active"));

  // Show selected tab
  document.getElementById(`content-${tabName}`).classList.add("active");
  document.getElementById(`tab-${tabName}`).classList.add("active");
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
      const formattedVal = typeof val === 'string' ? parseMarkdown(val) : val;
      item.innerHTML = `<strong>${key}:</strong> ${formattedVal}`;
      resultsDiv.appendChild(item);
    }
  } else {
    // Single value
    const item = document.createElement("div");
    item.className = "result-item";
    const formattedValue = typeof data.value === 'string' ? parseMarkdown(data.value) : data.value;
    item.innerHTML = `<strong>Value:</strong> ${formattedValue}`;
    resultsDiv.appendChild(item);
  }

  // Display reasoning
  if (data.reasoning) {
    document.getElementById("inspector-reasoning-section").style.display = "block";
    // Parse simple markdown
    const formattedReasoning = parseMarkdown(data.reasoning);
    document.getElementById("inspector-reasoning").innerHTML = formattedReasoning;
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

// Debug System
interface DebugLog {
  timestamp: Date;
  level: 'info' | 'success' | 'warning' | 'error';
  message: string;
}

interface RequestHistoryItem {
  timestamp: Date;
  prompt: string;
  duration: number;
  cached: boolean;
  success: boolean;
  error?: string;
  response?: any; // Added response field
}

let debugLogs: DebugLog[] = [];
let requestHistory: RequestHistoryItem[] = [];

function initDebugSystem() {
  log('Debug system initialized', 'info');

  // Make debug functions globally available for functions.ts to call
  (window as any).debugLog = log;
  (window as any).addRequestHistory = addRequestHistory;
}

function log(message: string, level: 'info' | 'success' | 'warning' | 'error' = 'info') {
  const logEntry: DebugLog = {
    timestamp: new Date(),
    level,
    message
  };

  debugLogs.push(logEntry);
  if (debugLogs.length > 100) debugLogs.shift(); // Keep last 100 logs

  updateLiveConsole();
}

function updateLiveConsole() {
  const consoleEl = document.getElementById('live-console');
  if (!consoleEl) return;

  consoleEl.innerHTML = debugLogs.map(log => {
    const time = log.timestamp.toLocaleTimeString();
    return `<div class="debug-log log-${log.level}">
      <span class="log-timestamp">[${time}]</span>
      <span>${log.message}</span>
    </div>`;
  }).join('');

  consoleEl.scrollTop = consoleEl.scrollHeight;
}

function addRequestHistory(item: RequestHistoryItem) {
  requestHistory.unshift(item); // Add to beginning
  if (requestHistory.length > 20) requestHistory.pop(); // Keep last 20

  updateRequestHistory();
}

function updateRequestHistory() {
  const historyEl = document.getElementById('request-history');
  if (!historyEl) return;

  if (requestHistory.length === 0) {
    historyEl.innerHTML = '<p style="color: #605e5c; font-size: 12px; text-align: center; padding: 20px;">No requests yet</p>';
    return;
  }

  historyEl.innerHTML = requestHistory.map((item, index) => {
    const time = item.timestamp.toLocaleTimeString();
    const cacheClass = item.cached ? 'cache-hit' : 'cache-miss';
    const cacheText = item.cached ? '⚡ Cache Hit' : '🌐 API Call';
    const statusIcon = item.success ? '✅' : '❌';
    const uniqueId = `history-item-${index}`;

    // Format response/error for display
    let detailsHtml = '';
    if (item.error) {
      detailsHtml += `<div style="color: #c62828; margin-bottom: 8px;"><strong>Error:</strong> ${item.error}</div>`;
    }
    if (item.response) {
      detailsHtml += `<div style="background: #f3f2f1; padding: 8px; border-radius: 4px; margin-top: 8px;">
        <strong>Response:</strong>
        <pre style="margin: 4px 0 0 0; white-space: pre-wrap; font-size: 10px; color: #323130;">${JSON.stringify(item.response, null, 2)}</pre>
      </div>`;
    }

    return `<div class="history-item">
      <div class="history-header" onclick="document.getElementById('${uniqueId}').style.display = document.getElementById('${uniqueId}').style.display === 'none' ? 'block' : 'none'" style="cursor: pointer;">
        <div style="display: flex; justify-content: space-between; align-items: center; width: 100%;">
            <span class="history-time">${time}</span>
            <div>
                <span class="history-cache ${cacheClass}">${cacheText}</span>
                <span style="margin-left: 5px; font-size: 11px;">⏱️ ${item.duration}ms</span>
            </div>
        </div>
        <div style="margin-top: 6px; font-weight: 600; color: #323130; word-break: break-word;">${statusIcon} ${item.prompt}</div>
        <div style="text-align: center; margin-top: 4px; color: #0078d4; font-size: 10px;">▼ Details</div>
      </div>

      <div id="${uniqueId}" class="history-details" style="display: none; margin-top: 10px; border-top: 1px solid #edebe9; padding-top: 10px;">
        ${detailsHtml}
      </div>
    </div>`;
  }).join('');
}

function clearLogs() {
  debugLogs = [];
  updateLiveConsole();
  log('Logs cleared', 'info');
}

function clearHistory() {
  requestHistory = [];
  updateRequestHistory();
  log('Request history cleared', 'info');
}

async function testBackend() {
  const resultEl = document.getElementById('test-result');
  if (!resultEl) return;

  resultEl.innerHTML = '<div style="color: #0078d4;">Testing connection...</div>';
  log('Testing backend connection...', 'info');

  const startTime = Date.now();

  try {
    // @ts-ignore
    const backendUrl = process.env.BACKEND_URL || "https://algosheet.auraia.ch/api/algosheet";

    const res = await fetch(backendUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt: "Connection test", responseMode: "free" })
    });

    const duration = Date.now() - startTime;

    if (!res.ok) {
      throw new Error(`HTTP ${res.status} ${res.statusText}`);
    }

    const data = await res.json();

    resultEl.innerHTML = `<div class="test-success">✅ Backend OK (${duration}ms)</div>`;
    log(`Backend connection successful (${duration}ms)`, 'success');

    addRequestHistory({
      timestamp: new Date(),
      prompt: 'Connection test',
      duration,
      cached: false,
      success: true
    });

  } catch (e: any) {
    const duration = Date.now() - startTime;
    resultEl.innerHTML = `<div class="test-error">❌ ${e.message}</div>`;
    log(`Backend connection failed: ${e.message}`, 'error');

    addRequestHistory({
      timestamp: new Date(),
      prompt: 'Connection test',
      duration,
      cached: false,
      success: false,
      error: e.message
    });
  }
}

// Helper to parse simple markdown
function parseMarkdown(text: string): string {
  if (!text) return "";

  // Escape HTML first to prevent XSS
  let html = text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  // Bold: **text**
  html = html.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");

  // Italic: *text*
  html = html.replace(/\*(.*?)\*/g, "<em>$1</em>");

  // Lists: - item
  html = html.replace(/^- (.*)$/gm, "<li>$1</li>");

  // Wrap lists in <ul> if any list items exist
  if (html.includes("<li>")) {
    // Simple line breaks for non-list items
    html = html.replace(/\n/g, "<br>");
    // Fix <br> inside lists (remove them between </li> and <li>)
    html = html.replace(/<\/li><br><li>/g, "</li><li>");
  } else {
    // Just line breaks
    html = html.replace(/\n/g, "<br>");
  }

  return html;
}
