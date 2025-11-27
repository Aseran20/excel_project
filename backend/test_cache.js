const https = require('https');

const agent = new https.Agent({ rejectUnauthorized: false });

async function testCache() {
    const makeRequest = async (label) => {
        const start = Date.now();
        const data = JSON.stringify({
            prompt: "Number of employees at Microsoft",
            responseMode: "structured",
            schema: "number",
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
                    const duration = Date.now() - start;
                    console.log(`\n${label}:`);
                    console.log(`  Time: ${duration}ms`);
                    console.log(`  Value: ${JSON.parse(body).value}`);
                    resolve(duration);
                });
            });
            req.on('error', reject);
            req.write(data);
            req.end();
        });
    };

    console.log('🧪 Testing Cache Functionality\n');
    console.log('Making first request (should call Gemini API)...');
    const time1 = await makeRequest('Request 1');

    console.log('\nMaking second identical request (should hit cache)...');
    const time2 = await makeRequest('Request 2');

    console.log('\n📊 Results:');
    console.log(`  First request: ${time1}ms (Gemini API call)`);
    console.log(`  Second request: ${time2}ms (Should be cached)`);
    console.log(`  Speedup: ${Math.round(time1 / time2)}x faster`);

    if (time2 < 1000) {
        console.log('\n✅ Cache is working correctly!');
    } else {
        console.log('\n⚠️  Cache might not be working (second request too slow)');
    }
}

testCache().catch(console.error);
