"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.start = start;
const fastify_1 = __importDefault(require("fastify"));
const cors_1 = __importDefault(require("@fastify/cors"));
const database_1 = require("@open-social/database");
const core_1 = require("@open-social/core");
const fastify = (0, fastify_1.default)({
    logger: process.env.NODE_ENV !== 'test',
});
// Setup CORS for local frontend communication
await fastify.register(cors_1.default, {
    origin: true,
});
// -------------------------------------------------------------
// Health Check Endpoint (FR-13)
// -------------------------------------------------------------
fastify.get('/api/health', async (_request, reply) => {
    try {
        // Check DB readiness
        await database_1.prisma.$queryRaw `SELECT 1`;
        return reply.send({
            status: 'ok',
            timestamp: new Date().toISOString(),
            database: 'connected',
        });
    }
    catch (err) {
        return reply.status(503).send({
            status: 'degraded',
            error: 'Database connection failed',
            timestamp: new Date().toISOString(),
        });
    }
});
// -------------------------------------------------------------
// Social Accounts Endpoints
// -------------------------------------------------------------
fastify.get('/api/social-accounts', async () => {
    return await core_1.AccountService.listAccounts();
});
fastify.delete('/api/social-accounts/:id', async (request, reply) => {
    const { id } = request.params;
    await core_1.AccountService.disconnectAccount(id);
    return reply.send({ success: true });
});
// -------------------------------------------------------------
// Posts & Scheduling Endpoints
// -------------------------------------------------------------
fastify.get('/api/posts', async (request) => {
    const { limit, offset } = request.query;
    return await core_1.PostService.listPosts(undefined, Number(limit) || 50, Number(offset) || 0);
});
fastify.post('/api/posts', async (request, reply) => {
    const body = request.body;
    const post = await core_1.PostService.createPost({
        userId: body.userId || 'default_local_user',
        canonicalContent: body.canonicalContent,
        targets: body.targets,
    });
    return reply.status(201).send(post);
});
fastify.get('/api/post-targets', async (request) => {
    const query = request.query;
    return await core_1.ScheduleService.listScheduled({
        status: query.status,
        provider: query.provider,
        fromUtc: query.from ? new Date(query.from) : undefined,
        toUtc: query.to ? new Date(query.to) : undefined,
    });
});
fastify.get('/api/post-targets/:id', async (request, reply) => {
    const { id } = request.params;
    const target = await core_1.ScheduleService.getTargetDetails(id);
    if (!target) {
        return reply.status(404).send({ error: 'Post target not found' });
    }
    return reply.send(target);
});
fastify.patch('/api/post-targets/:id', async (request, reply) => {
    const { id } = request.params;
    const body = request.body;
    const updated = await core_1.ScheduleService.rescheduleTarget(id, new Date(body.publishAtUtc), body.timezone);
    return reply.send(updated);
});
fastify.delete('/api/post-targets/:id', async (request, reply) => {
    const { id } = request.params;
    const canceled = await core_1.ScheduleService.cancelSchedule(id);
    return reply.send(canceled);
});
fastify.post('/api/post-targets/:id/publish', async (request, reply) => {
    const { id } = request.params;
    const published = await core_1.ScheduleService.publishNow(id);
    return reply.send(published);
});
// Bulk preview & commit
fastify.post('/api/schedules/bulk-preview', async (request, reply) => {
    const body = request.body;
    const preview = await core_1.ScheduleService.bulkSchedulePreview(body.rows, body.cadence);
    return reply.send(preview);
});
fastify.post('/api/schedules/bulk-commit', async (request, reply) => {
    const body = request.body;
    const results = await core_1.ScheduleService.bulkScheduleCommit(body.userId || 'default_local_user', body.items);
    return reply.status(201).send(results);
});
const port = Number(process.env.API_PORT) || 4000;
async function start() {
    try {
        await fastify.listen({ port, host: '0.0.0.0' });
        console.log(`API server listening on port ${port}`);
    }
    catch (err) {
        fastify.log.error(err);
        process.exit(1);
    }
}
if (process.env.NODE_ENV !== 'test') {
    start();
}
exports.default = fastify;
//# sourceMappingURL=index.js.map