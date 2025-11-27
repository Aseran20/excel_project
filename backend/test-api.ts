import fetch from 'node-fetch';
import https from 'https';

// Create an agent that ignores SSL certificate errors for localhost testing
const httpsAgent = new https.Agent({
    rejectUnauthorized: false
});

const BACKEND_URL = 'https://localhost:3100/algosheet';

async function testAlgoSheet(prompt: string, mode: string = 'free', schema: string = '', options: string = '') {
    console.log('\n' + '='.repeat(80));
    console.log(`🧪 TEST: ${prompt}`);
    console.log(`   Mode: ${mode}, Schema: ${schema || 'none'}, Options: ${options || 'none'}`);
    console.log('='.repeat(80));

    try {
        const response = await fetch(BACKEND_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                prompt,
                responseMode: mode,
                schema,
                options
            }),
            agent: httpsAgent
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();

        console.log('\n📊 RESPONSE:');
        console.log(`   Value: ${JSON.stringify(data.value)}`);
        console.log(`   Confidence: ${data.confidence ?? 'N/A'}`);
        console.log(`   Sources: ${data.sources?.length ?? 0} found`);

        if (data.sources && data.sources.length > 0) {
            console.log('\n🔗 SOURCES:');
            data.sources.forEach((source: any, index: number) => {
                console.log(`   [${index + 1}] ${source.title || 'No title'}`);
                console.log(`       URL: ${source.url}`);
                if (source.snippet) {
                    console.log(`       Snippet: ${source.snippet.substring(0, 100)}...`);
                }
            });
        }

        return data;
    } catch (error: any) {
        console.error('\n❌ ERROR:', error.message);
        return null;
    }
}

async function runTests() {
    console.log('\n🚀 Starting Backend API Tests...\n');

    // Test 1: Number extraction with web search
    await testAlgoSheet(
        'Revenue of Microsoft 2023 in billions',
        'structured',
        'number',
        'web=true'
    );

    // Test 2: Recent event with web search
    await testAlgoSheet(
        'Who won Euro 2024?',
        'free',
        '',
        'web=true'
    );

    // Test 3: Number without web search (for comparison)
    await testAlgoSheet(
        'What is 15 + 27?',
        'structured',
        'number',
        ''
    );

    // Test 4: Financial metric with web search
    await testAlgoSheet(
        'P/E ratio of Tesla',
        'structured',
        'number',
        'web=true'
    );

    console.log('\n✅ All tests completed!\n');
}

runTests();
