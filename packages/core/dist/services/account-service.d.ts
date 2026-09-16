import { SafeSocialAccount } from '../types/index.js';
export interface ConnectAccountInput {
    userId: string;
    provider: 'linkedin' | 'x' | 'mock';
    providerAccountId: string;
    displayName: string;
    username?: string;
    avatarUrl?: string;
    accessToken: string;
    refreshToken?: string;
    tokenExpiresAt?: Date;
    scopes?: string;
}
export declare class AccountService {
    /**
     * Connects or updates a social account with encrypted tokens stored at rest.
     */
    static connectAccount(input: ConnectAccountInput): Promise<SafeSocialAccount>;
    /**
     * Lists all connected accounts for a user with raw/encrypted tokens stripped.
     */
    static listAccounts(userId?: string): Promise<SafeSocialAccount[]>;
    /**
     * Disconnects a social account.
     */
    static disconnectAccount(id: string): Promise<void>;
    /**
     * Internal-only: Retrieves decrypted credentials for the worker or auth refresh.
     * NEVER expose this via API or MCP!
     */
    static getDecryptedCredentials(accountId: string): Promise<{
        accessToken: string;
        refreshToken: string | null;
        provider: string;
        providerAccountId: string;
        displayName: string;
    }>;
    private static toSafeAccount;
}
//# sourceMappingURL=account-service.d.ts.map