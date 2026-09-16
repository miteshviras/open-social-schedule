import { prisma, encryptSecret, decryptSecret } from '@open-social/database';
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

export class AccountService {
  /**
   * Connects or updates a social account with encrypted tokens stored at rest.
   */
  public static async connectAccount(input: ConnectAccountInput): Promise<SafeSocialAccount> {
    const encryptedAccessToken = encryptSecret(input.accessToken);
    const encryptedRefreshToken = input.refreshToken ? encryptSecret(input.refreshToken) : null;

    const account = await prisma.socialAccount.upsert({
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
  public static async listAccounts(userId?: string): Promise<SafeSocialAccount[]> {
    const accounts = await prisma.socialAccount.findMany({
      where: userId ? { userId } : undefined,
      orderBy: { createdAt: 'desc' },
    });

    return accounts.map((acc) => this.toSafeAccount(acc));
  }

  /**
   * Disconnects a social account.
   */
  public static async disconnectAccount(id: string): Promise<void> {
    await prisma.socialAccount.delete({
      where: { id },
    });
  }

  /**
   * Internal-only: Retrieves decrypted credentials for the worker or auth refresh.
   * NEVER expose this via API or MCP!
   */
  public static async getDecryptedCredentials(accountId: string): Promise<{
    accessToken: string;
    refreshToken: string | null;
    provider: string;
    providerAccountId: string;
    displayName: string;
  }> {
    const account = await prisma.socialAccount.findUniqueOrThrow({
      where: { id: accountId },
    });

    return {
      accessToken: decryptSecret(account.encryptedAccessToken),
      refreshToken: account.encryptedRefreshToken ? decryptSecret(account.encryptedRefreshToken) : null,
      provider: account.provider,
      providerAccountId: account.providerAccountId,
      displayName: account.displayName,
    };
  }

  private static toSafeAccount(account: any): SafeSocialAccount {
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
