const https = require('https');

const agent = new https.Agent({ rejectUnauthorized: false });

const data = JSON.stringify({
    prompt: "What is the number of employees at AUraia Capital advisory",
    responseMode: "structured",
    schema: "number",
    options: "web=true"
});

const options = {
    hostname: 'localhost',
    port: 3100,
    path: '/algosheet',
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Content-Length': data.length
    },
    agent: agent
};

console.log('🧪 Testing: Employees at Auraia Capital with web=true (Forced Prompt)\n');

const req = https.request(options, (res) => {
    let body = '';

    res.on('data', (chunk) => {
        body += chunk;
    });

    res.on('end', () => {
        try {
            const result = JSON.parse(body);
            console.log('✅ Response received:\n');
            console.log('Value:', result.value);
            console.log('Confidence:', result.confidence);
            console.log('Sources count:', result.sources?.length || 0);

            if (result.sources && result.sources.length > 0) {
                console.log('\n🔗 REAL SOURCES FROM GROUNDING:');
                result.sources.forEach((s, i) => {
                    console.log(`\n[${i + 1}] ${s.title}`);
                    console.log(`    URL: ${s.url}`);
                });
            } else {
                console.log('\n⚠ No sources found (grounding may not have been used)');
            }
        } catch (e) {
            console.error('❌ Parse error:', e.message);
            console.log('Raw body:', body);
        }
    });
});

req.on('error', (e) => {
    console.error('❌ Request error:', e.message);
});

req.write(data);
req.end();
