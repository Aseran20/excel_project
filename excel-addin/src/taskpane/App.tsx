import * as React from "react";

const App = () => {
    const [status, setStatus] = React.useState("Ready");
    const [response, setResponse] = React.useState("");

    const testBackend = async () => {
        setStatus("Testing backend...");
        try {
            const res = await fetch("https://localhost:3100/algosheet", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ prompt: "Test from Taskpane", responseMode: "free" })
            });
            const text = await res.text();
            setResponse(text);
            setStatus("Backend OK");
        } catch (e: any) {
            setResponse("Error: " + e.message);
            setStatus("Backend Failed");
        }
    };

    const checkCustomFunctions = () => {
        const check: any = (window as any).CustomFunctions;
        if (check) {
            setResponse(`CustomFunctions found: ${JSON.stringify(Object.keys(check || {}), null, 2)}`);
            setStatus("CustomFunctions available");
        } else {
            setResponse("CustomFunctions is NOT available in this runtime.");
            setStatus("CustomFunctions missing");
        }
    };

    return (
        <div style={{ padding: "10px", fontFamily: "sans-serif" }}>
            <h1>AlgoSheet Debug</h1>
            <p>Status: {status}</p>
            <button onClick={testBackend} style={{ padding: "8px 16px", cursor: "pointer", marginRight: "8px" }}>
                Test Backend Connection
            </button>
            <button onClick={checkCustomFunctions} style={{ padding: "8px 16px", cursor: "pointer" }}>
                Check Custom Functions
            </button>
            <pre style={{ background: "#f0f0f0", padding: "10px", marginTop: "10px", whiteSpace: "pre-wrap" }}>
                {response}
            </pre>
            <hr />
            <p>If this pane loads, the Add-in is working.</p>
            <p>If functions show #NAME?, try:</p>
            <ul>
                <li>Reloading the add-in</li>
                <li>Clearing Excel cache</li>
            </ul>
        </div>
    );
};

export default App;
