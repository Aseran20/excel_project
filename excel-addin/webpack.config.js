const HtmlWebpackPlugin = require("html-webpack-plugin");
const CopyWebpackPlugin = require("copy-webpack-plugin");
const path = require("path");
const webpack = require("webpack");

module.exports = async (env, options) => {
    const dev = options.mode === "development";
    const config = {
        devtool: "source-map",
        entry: {
            functions: "./src/functions/functions.ts",
            taskpane: "./src/taskpane/index.tsx",
        },
        output: {
            clean: true,
        },
        resolve: {
            extensions: [".ts", ".tsx", ".html", ".js"],
        },
        module: {
            rules: [
                {
                    test: /\.tsx?$/,
                    exclude: /node_modules/,
                    use: "ts-loader",
                },
                {
                    test: /\.html$/,
                    exclude: /node_modules/,
                    use: "html-loader",
                },
                {
                    test: /\.(png|jpg|jpeg|gif|ico)$/,
                    type: "asset/resource",
                    generator: {
                        filename: "assets/[name][ext][query]",
                    },
                },
            ],
        },
        plugins: [
            new HtmlWebpackPlugin({
                filename: "taskpane.html",
                template: "./src/taskpane/taskpane.html",
                chunks: ["taskpane"],
            }),
            new CopyWebpackPlugin({
                patterns: [
                    {
                        from: "src/functions/functions.json",
                        to: "functions.json",
                    },
                    {
                        from: "src/functions/functions.html",
                        to: "functions.html",
                    },
                    {
                        from: "manifest.xml",
                        to: "manifest.xml",
                        transform(content) {
                            if (dev) {
                                return content;
                            } else {
                                return content.toString().replace(new RegExp("https://localhost:3000", "g"), "https://your-production-url");
                            }
                        },
                    },
                ],
            }),
        ],
        devServer: {
            headers: {
                "Access-Control-Allow-Origin": "*",
            },
            server: {
                type: "https",
                options: env.WEBPACK_BUILD || options.https !== undefined ? options.https : await require("office-addin-dev-certs").getHttpsServerOptions(),
            },
            port: 3000,
        },
    };

    return config;
};
