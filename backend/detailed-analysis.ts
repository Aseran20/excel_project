import fetch from 'node-fetch';

const API_URL = "http://localhost:3000/algosheet";

async function detailedTest(name: string, body: any) {
    console.log(`\n${'='.repeat(80)}`);
    console.log(`${name}`);
    console.log(`${'='.repeat(80)}`);
    console.log(`Request:`, JSON.stringify(body, null, 2));

    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });

        const result = await response.json();
        console.log(`\nResponse:`, JSON.stringify(result, null, 2));

        // Analysis
        console.log(`\n--- ANALYSIS ---`);
        console.log(`Value Type: ${typeof result.value}`);
        console.log(`Value: ${result.value}`);
        console.log(`Confidence: ${result.confidence}`);
        console.log(`Sources Count: ${result.sources?.length || 0}`);

        if (result.sources && result.sources.length > 0) {
            console.log(`\nFirst Source:`);
            console.log(`  URL: ${result.sources[0].url}`);
            console.log(`  Title: ${result.sources[0].title || 'N/A'}`);
        }

        return result;
    } catch (error: any) {
        console.log(`ERROR: ${error.message}`);
    }
}

async function main() {
    console.log('DETAILED API RESPONSE ANALYSIS\n');

    // Test 1: Number response
    await detailedTest('Test 1: FTE Number (Google)', {
        prompt: "How many employees does Google have in 2024?",
        responseMode: "structured",
        schema: "number",
        options: "web=true;sources=true"
    });

    await new Promise(r => setTimeout(r, 2000));

    // Test 2: Enum response
    await detailedTest('Test 2: Enum (SpaceX Public?)', {
        prompt: "Is SpaceX publicly traded? Answer Yes or No.",
        responseMode: "structured",
        schema: "enum(Yes,No)",
        options: "web=true"
    });

    await new Promise(r => setTimeout(r, 2000));

    // Test 3: Free text
    await detailedTest('Test 3: Free Text (Airbus)', {
        prompt: "Describe Airbus main business in one sentence.",
        responseMode: "free",
        options: "web=true"
    });

    await new Promise(r => setTimeout(r, 2000));

    // Test 4: Classification
    await detailedTest('Test 4: Classification (Tesla)', {
        prompt: "Classify Tesla as Independent, Group, or Private Equity owned.",
        responseMode: "structured",
        schema: "enum(Independent,Group,Private Equity)",
        options: "web=true;sources=true"
    });

    await new Promise(r => setTimeout(r, 2000));

    // Test 5: Recent data
    await detailedTest('Test 5: Recent Acquisition (Microsoft)', {
        prompt: "What major company did Microsoft acquire in 2023? Give only the company name.",
        responseMode: "structured",
        schema: "text",
        options: "web=true;sources=true"
    });
}

main().catch(console.error);
