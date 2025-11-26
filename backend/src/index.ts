import dotenv from 'dotenv';
import path from 'path';
import fastify from 'fastify';
import cors from '@fastify/cors';
import algosheetRoutes from './routes/algosheet';

// Load environment variables before anything else
const envPath = path.resolve(__dirname, '..', '.env');
console.log('Loading .env from:', envPath);
const result = dotenv.config({ path: envPath });

if (result.error) {
    console.error('Error loading .env:', result.error);
} else {
    console.log('.env loaded successfully');
}

console.log('GEMINI_API_KEY:', process.env.GEMINI_API_KEY ? `Set (${process.env.GEMINI_API_KEY.length} chars)` : 'NOT SET');

const server = fastify({
    logger: true
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
        console.log(`Server listening on http://localhost:${port}`);
    } catch (err) {
        server.log.error(err);
        process.exit(1);
    }
};

start();
