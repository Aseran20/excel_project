const https = require("https");

const agent = new https.Agent({ rejectUnauthorized: false });

const data = JSON.stringify({
  prompt: "What is the number of employees at Auraia Capital advisory?",
  responseMode: "structured",
  schema: "number",
  options: "web=true",
});

const options = {
  hostname: "localhost",
  port: 3100,
  path: "/algosheet",
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "Content-Length": data.length,
  },
  agent: agent,
};

console.log("🧪 Testing: Reasoning Field Extraction\n");

const req = https.request(options, (res) => {
  let body = "";
  res.on("data", (chunk) => (body += chunk));
  res.on("end", () => {
    try {
      const result = JSON.parse(body);
      console.log("✅ Response received:\n");
      console.log("Value:", result.value);
      console.log("Reasoning:", result.reasoning); // Check if reasoning is present
      console.log("Confidence:", result.confidence);
    } catch (e) {
      console.error(e);
    }
  });
});
req.write(data);
req.end();
