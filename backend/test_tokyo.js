const https = require('https');

const agent = new https.Agent({ rejectUnauthorized: false });

const data = JSON.stringify({
    prompt: "What is the current temperature in Tokyo right now?",
    responseMode: "free",
    schema: "",
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

console.log('🧪 Testing: Temperature in Tokyo (Obvious Web Search)\n');

const req = https.request(options, (res) => {
    let body = '';
    res.on('data', chunk => body += chunk);
    res.on('end', () => {
        try {
            const result = JSON.parse(body);
            console.log('Value:', result.value);
            console.log('Sources count:', result.sources?.length || 0);
            if (result.sources?.length > 0) {
                console.log('✅ Sources found!');
                result.sources.forEach(s => console.log(`- ${s.title} (${s.url})`));
            } else {
                console.log('❌ No sources found');
            }
        } catch (e) { console.error(e); }
    });
});
req.write(data);
req.end();
