import * as React from "react";

const App = () => {
    return (
        <div style={{ padding: "10px", fontFamily: "Segoe UI, sans-serif" }}>
            <h1>AlgoSheet</h1>
            <p>Backend URL: http://localhost:3000</p>
            <hr />
            <h2>Functions</h2>
            <p><b>=ALGOSHEET(Prompt, [ResponseMode], [Schema], [Options])</b></p>
            <p><b>=ALGOSHEET_PARSE(JsonText, Field)</b></p>
            <hr />
            <p>Status: Ready</p>
        </div>
    );
};

export default App;
