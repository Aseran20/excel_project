import { FastifyInstance } from 'fastify';
import { AlgoSheetRequest, AlgoSheetError } from '../types/algosheet';
import { parseOptions } from '../utils/optionsParser';
import { callGemini } from '../services/gemini';

export default async function algosheetRoutes(fastify: FastifyInstance) {
    fastify.post<{ Body: AlgoSheetRequest }>('/algosheet', async (request, reply) => {
        const { prompt, responseMode, schema, options: optionsStr } = request.body;

        if (!prompt) {
            return reply.code(400).send({ error: "Prompt is required" } as AlgoSheetError);
        }

        try {
            const options = parseOptions(optionsStr);
            const result = await callGemini(prompt, responseMode, schema, options);
            return result;
        } catch (error: any) {
            request.log.error(error);
            return reply.code(500).send({
                error: "Internal Server Error",
                details: error.message
            } as AlgoSheetError);
        }
    });
}
