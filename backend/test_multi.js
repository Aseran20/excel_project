const https = require('https');

const agent = new https.Agent({ rejectUnauthorized: false });

async function testMultiField() {
    const data = JSON.stringify({
        prompt: "Acme SA",
        responseMode: "structured",
        schema: "multi(employees,sector,canton,revenue)",
        options: "web=true"
    });

    return new Promise((resolve, reject) => {
        const req = https.request({
            hostname: 'localhost',
            port: 3100,
            path: '/algosheet',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': data.length
            },
            agent: agent
        }, (res) => {
            let body = '';
            res.on('data', chunk => body += chunk);
            res.on('end', () => {
                const result = JSON.parse(body);
                console.log('\n🧪 Testing Multi-Field Enrichment\n');
                console.log('Prompt: "Acme SA"');
                console.log('Schema: multi(employees,sector,canton,revenue)\n');
                console.log('📊 Response:');
                console.log(JSON.stringify(result, null, 2));

                if (result.value && typeof result.value === 'object') {
                    console.log('\n✅ Multi-field object returned!');
                    console.log('Fields:', Object.keys(result.value).join(', '));
                } else {
                    console.log('\n⚠️ Value is not an object');
                }

                resolve();
            });
        });
        req.on('error', reject);
        req.write(data);
        req.end();
    });
}

testMultiField().catch(console.error);
