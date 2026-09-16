import { SocialProvider } from './types.js';
import { LinkedInProvider } from './linkedin/linkedin-provider.js';
import { XProvider } from './x/x-provider.js';
import { MockProvider } from './mock/mock-provider.js';

export class ProviderRegistry {
  private static providers: Map<string, SocialProvider> = new Map();

  static {
    // Register default providers
    this.register(new LinkedInProvider());
    this.register(new XProvider());
    this.register(new MockProvider());
  }

  public static register(provider: SocialProvider): void {
    this.providers.set(provider.type.toLowerCase(), provider);
  }

  public static get(providerType: string): SocialProvider {
    const provider = this.providers.get(providerType.toLowerCase());
    if (!provider) {
      throw new Error(
        `Social provider "${providerType}" is not registered. Available providers: ${Array.from(
          this.providers.keys()
        ).join(', ')}`
      );
    }
    return provider;
  }

  public static has(providerType: string): boolean {
    return this.providers.has(providerType.toLowerCase());
  }

  public static listAvailable(): string[] {
    return Array.from(this.providers.keys());
  }
}
