import fetch from 'node-fetch';

const API_URL = "http://localhost:3000/algosheet";

interface TestCase {
    name: string;
    prompt: string;
    responseMode: 'free' | 'structured';
    schema?: string;
    options?: string;
    expectedType?: string;
}

const testCases: TestCase[] = [
    // Test 1: FTE Estimation (number, web search)
    {
        name: "FTE Estimation - Google",
        prompt: "Estimate the number of full-time employees (FTE) for Google as of 2024.",
        responseMode: "structured",
        schema: "number",
        options: "web=true;sources=true",
        expectedType: "number"
    },

    // Test 2: FTE Estimation - Smaller company
    {
        name: "FTE Estimation - Stripe",
        prompt: "Estimate the number of employees for Stripe.",
        responseMode: "structured",
        schema: "number",
        options: "web=true;sources=true",
        expectedType: "number"
    },

    // Test 3: Company Classification
    {
        name: "Company Type - Tesla",
        prompt: "Classify Tesla as either Independent, Subsidiary of a Group, or owned by a Private Equity fund.",
        responseMode: "structured",
        schema: "enum(Independent,Group,Private Equity)",
        options: "web=true;sources=true",
        expectedType: "enum"
    },

    // Test 4: Company Classification - PE owned
    {
        name: "Company Type - Toys R Us",
        prompt: "Classify Toys R Us as either Independent, Subsidiary of a Group, or owned by a Private Equity fund.",
        responseMode: "structured",
        schema: "enum(Independent,Group,Private Equity)",
        options: "web=true",
        expectedType: "enum"
    },

    // Test 5: Free text - Company description
    {
        name: "Company Description - Airbus",
        prompt: "In one sentence, describe the main business activity of Airbus.",
        responseMode: "free",
        options: "web=true",
        expectedType: "text"
    },

    // Test 6: Revenue estimation
    {
        name: "Revenue - Salesforce 2024",
        prompt: "What was Salesforce's annual revenue in 2024? Give only the number in billions USD.",
        responseMode: "structured",
        schema: "number",
        options: "web=true;sources=true",
        expectedType: "number"
    },

    // Test 7: Headquarters location
    {
        name: "HQ Location - LVMH",
        prompt: "What is the headquarters location (city) of LVMH?",
        responseMode: "structured",
        schema: "text",
        options: "web=true",
        expectedType: "text"
    },

    // Test 8: Industry classification
    {
        name: "Industry - Schneider Electric",
        prompt: "What industry does Schneider Electric operate in? Choose from: Technology, Industrial, Consumer Goods, Healthcare, Financial Services.",
        responseMode: "structured",
        schema: "enum(Technology,Industrial,Consumer Goods,Healthcare,Financial Services)",
        options: "web=true",
        expectedType: "enum"
    },

    // Test 9: Yes/No question
    {
        name: "Public Status - SpaceX",
        prompt: "Is SpaceX a publicly traded company? Answer only Yes or No.",
        responseMode: "structured",
        schema: "enum(Yes,No)",
        options: "web=true",
        expectedType: "enum"
    },

    // Test 10: Founded year
    {
        name: "Founded Year - Microsoft",
        prompt: "In what year was Microsoft founded? Give only the year as a number.",
        responseMode: "structured",
        schema: "number",
        options: "web=false",
        expectedType: "number"
    },

    // Test 11: Complex analysis (without web search, testing knowledge)
    {
        name: "Market Position - No Web Search",
        prompt: "Is Amazon primarily an e-commerce company or a cloud computing company?",
        responseMode: "free",
        options: "web=false",
        expectedType: "text"
    },

    // Test 12: With sources validation
    {
        name: "Recent Acquisition",
        prompt: "What major acquisition did Microsoft announce in 2023? Give the company name.",
        responseMode: "structured",
        schema: "text",
        options: "web=true;sources=true",
        expectedType: "text"
    }
];

async function runTest(testCase: TestCase): Promise<any> {
    const body = {
        prompt: testCase.prompt,
        responseMode: testCase.responseMode,
        schema: testCase.schema,
        options: testCase.options
    };

    console.log(`\n${'='.repeat(80)}`);
    console.log(`TEST: ${testCase.name}`);
    console.log(`${'='.repeat(80)}`);
    console.log(`Prompt: ${testCase.prompt}`);
    console.log(`Mode: ${testCase.responseMode}, Schema: ${testCase.schema || 'N/A'}`);
    console.log(`Options: ${testCase.options || 'none'}`);
    console.log(`\nSending request...`);

    const startTime = Date.now();

    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });

        const elapsed = Date.now() - startTime;

        if (!response.ok) {
            const error = await response.text();
            console.log(`❌ FAILED (${response.status}): ${error}`);
            return { success: false, error, elapsed };
        }

        const result = await response.json();

        console.log(`\n✅ SUCCESS (${elapsed}ms)`);
        console.log(`Value: ${JSON.stringify(result.value)}`);
        console.log(`Confidence: ${result.confidence || 'N/A'}`);

        if (result.sources && result.sources.length > 0) {
            console.log(`Sources (${result.sources.length}):`);
            result.sources.slice(0, 3).forEach((s: any, i: number) => {
                console.log(`  ${i + 1}. ${s.url}`);
                if (s.title) console.log(`     Title: ${s.title}`);
            });
        } else {
            console.log(`Sources: None`);
        }

        return { success: true, result, elapsed };

    } catch (error: any) {
        const elapsed = Date.now() - startTime;
        console.log(`❌ ERROR: ${error.message}`);
        return { success: false, error: error.message, elapsed };
    }
}

async function runAllTests() {
    console.log('\n');
    console.log('╔═══════════════════════════════════════════════════════════════════════════════╗');
    console.log('║                    AlgoSheet Backend Calibration Test Suite                  ║');
    console.log('╚═══════════════════════════════════════════════════════════════════════════════╝');
    console.log(`\nRunning ${testCases.length} tests...\n`);

    const results = [];

    for (const testCase of testCases) {
        const result = await runTest(testCase);
        results.push({ testCase, ...result });

        // Wait a bit between requests to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000));
    }

    // Summary
    console.log('\n\n');
    console.log('╔═══════════════════════════════════════════════════════════════════════════════╗');
    console.log('║                              TEST SUMMARY                                     ║');
    console.log('╚═══════════════════════════════════════════════════════════════════════════════╝');

    const successful = results.filter(r => r.success);
    const failed = results.filter(r => !r.success);

    console.log(`\nTotal Tests: ${results.length}`);
    console.log(`✅ Passed: ${successful.length}`);
    console.log(`❌ Failed: ${failed.length}`);

    if (successful.length > 0) {
        const avgTime = successful.reduce((sum, r) => sum + r.elapsed, 0) / successful.length;
        console.log(`⏱️  Average Response Time: ${Math.round(avgTime)}ms`);
    }

    if (failed.length > 0) {
        console.log('\n\nFailed Tests:');
        failed.forEach(f => {
            console.log(`  - ${f.testCase.name}: ${f.error}`);
        });
    }

    console.log('\n');
}

runAllTests().catch(console.error);
