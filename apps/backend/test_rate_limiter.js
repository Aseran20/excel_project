const https = require("https");

const agent = new https.Agent({ rejectUnauthorized: false });

async function testRateLimiter() {
  console.log("🧪 Testing Rate Limiter\n");
  console.log("Sending 10 rapid requests to test queue behavior...\n");

  const promises = [];
  const startTime = Date.now();

  for (let i = 1; i <= 10; i++) {
    const promise = makeRequest(`Request ${i}`).then((duration) => {
      console.log(`✅ Request ${i} completed in ${duration}ms`);
      return duration;
    });
    promises.push(promise);

    // Add small delay to avoid overwhelming the client
    await new Promise((resolve) => setTimeout(resolve, 50));
  }

  const results = await Promise.all(promises);
  const totalTime = Date.now() - startTime;

  console.log("\n📊 Results:");
  console.log(`Total time: ${totalTime}ms`);
  console.log(`Average per request: ${Math.round(results.reduce((a, b) => a + b, 0) / results.length)}ms`);
  console.log(`Requests should be processed in batches of 5 (concurrency limit)`);
}

async function makeRequest(label) {
  const start = Date.now();
  const data = JSON.stringify({
    prompt: `Company ${Math.random().toString(36).substring(7)}`,
    responseMode: "structured",
    schema: "multi(employees,sector)",
    options: "web=true",
  });

  return new Promise((resolve, reject) => {
    const req = https.request(
      {
        hostname: "localhost",
        port: 3100,
        path: "/algosheet",
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Content-Length": data.length,
        },
        agent: agent,
      },
      (res) => {
        let body = "";
        res.on("data", (chunk) => (body += chunk));
        res.on("end", () => resolve(Date.now() - start));
      }
    );
    req.on("error", reject);
    req.write(data);
    req.end();
  });
}

testRateLimiter().catch(console.error);
