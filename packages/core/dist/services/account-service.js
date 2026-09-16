"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AccountService = void 0;
const database_1 = require("@open-social/database");
class AccountService {
    /**
     * Connects or updates a social account with encrypted tokens stored at rest.
     */
    static async connectAccount(input) {
        const encryptedAccessToken = (0, database_1.encryptSecret)(input.accessToken);
        const encryptedRefreshToken = input.refreshToken ? (0, database_1.encryptSecret)(input.refreshToken) : null;
        const account = await database_1.prisma.socialAccount.upsert({
            where: {
                provider_providerAccountId: {
                    provider: input.provider,
                    providerAccountId: input.providerAccountId,
                },
            },
            update: {
                userId: input.userId,
                displayName: input.displayName,
                username: input.username,
                avatarUrl: input.avatarUrl,
                encryptedAccessToken,
                encryptedRefreshToken,
                tokenExpiresAt: input.tokenExpiresAt,
                scopes: input.scopes,
                status: 'active',
            },
            create: {
                userId: input.userId,
                provider: input.provider,
                providerAccountId: input.providerAccountId,
                displayName: input.displayName,
                username: input.username,
                avatarUrl: input.avatarUrl,
                encryptedAccessToken,
                encryptedRefreshToken,
                tokenExpiresAt: input.tokenExpiresAt,
                scopes: input.scopes,
                status: 'active',
            },
        });
        return this.toSafeAccount(account);
    }
    /**
     * Lists all connected accounts for a user with raw/encrypted tokens stripped.
     */
    static async listAccounts(userId) {
        const accounts = await database_1.prisma.socialAccount.findMany({
            where: userId ? { userId } : undefined,
            orderBy: { createdAt: 'desc' },
        });
        return accounts.map((acc) => this.toSafeAccount(acc));
    }
    /**
     * Disconnects a social account.
     */
    static async disconnectAccount(id) {
        await database_1.prisma.socialAccount.delete({
            where: { id },
        });
    }
    /**
     * Internal-only: Retrieves decrypted credentials for the worker or auth refresh.
     * NEVER expose this via API or MCP!
     */
    static async getDecryptedCredentials(accountId) {
        const account = await database_1.prisma.socialAccount.findUniqueOrThrow({
            where: { id: accountId },
        });
        return {
            accessToken: (0, database_1.decryptSecret)(account.encryptedAccessToken),
            refreshToken: account.encryptedRefreshToken ? (0, database_1.decryptSecret)(account.encryptedRefreshToken) : null,
            provider: account.provider,
            providerAccountId: account.providerAccountId,
            displayName: account.displayName,
        };
    }
    static toSafeAccount(account) {
        return {
            id: account.id,
            userId: account.userId,
            provider: account.provider,
            providerAccountId: account.providerAccountId,
            displayName: account.displayName,
            username: account.username,
            avatarUrl: account.avatarUrl,
            status: account.status,
            tokenExpiresAt: account.tokenExpiresAt,
            scopes: account.scopes,
            createdAt: account.createdAt,
            updatedAt: account.updatedAt,
        };
    }
}
exports.AccountService = AccountService;
//# sourceMappingURL=account-service.js.map