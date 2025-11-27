import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import fastify from 'fastify';
import cors from '@fastify/cors';
import algosheetRoutes from './routes/algosheet';

// Load environment variables before anything else
const envPath = path.resolve(__dirname, '..', '.env');
console.log('Loading .env from:', envPath);
const result = dotenv.config({ path: envPath, override: true });

if (result.error) {
    console.error('Error loading .env:', result.error);
} else {
    console.log('.env loaded successfully');
}

console.log('GEMINI_API_KEY:', process.env.GEMINI_API_KEY ? `Set (${process.env.GEMINI_API_KEY.length} chars)` : 'NOT SET');

// Load HTTPS certificates for development
const certPath = path.join(process.env.USERPROFILE || process.env.HOME || '', '.office-addin-dev-certs', 'localhost.crt');
const keyPath = path.join(process.env.USERPROFILE || process.env.HOME || '', '.office-addin-dev-certs', 'localhost.key');

let httpsOptions: any = undefined;
if (fs.existsSync(certPath) && fs.existsSync(keyPath)) {
    httpsOptions = {
        key: fs.readFileSync(keyPath),
        cert: fs.readFileSync(certPath)
    };
    console.log('HTTPS certificates loaded');
} else {
    console.warn('HTTPS certificates not found, falling back to HTTP');
}

const server = fastify({
    logger: true,
    https: httpsOptions
});

// Allow requests from Excel web/localhost/tunnels during MVP
server.register(cors, {
    origin: true,
    methods: ['POST', 'OPTIONS']
});

server.register(algosheetRoutes);

const start = async () => {
    try {
        const port = process.env.PORT ? parseInt(process.env.PORT) : 3100;
        await server.listen({ port, host: '0.0.0.0' });
        const protocol = httpsOptions ? 'https' : 'http';
        console.log(`Server listening on ${protocol}://localhost:${port}`);
    } catch (err) {
        server.log.error(err);
        process.exit(1);
    }
};

start();
