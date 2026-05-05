import { CloudBrainEnv } from './types';

// Context size limit: 8-12 KB per request
const CONTEXT_SIZE_LIMIT = 12 * 1024; // 12 KB in bytes
const KV_NAMESPACE_NAME = 'cloudbrain';

/**
 * Get KV namespace ID from Cloudflare API
 * Creates namespace if it doesn't exist
 */
async function getOrCreateKVNamespace(env: CloudBrainEnv): Promise<string> {
  const accountId = env.CLOUDFLARE_ACCOUNT_ID;
  const apiToken = env.CLOUDFLARE_API_TOKEN;

  try {
    // List existing namespaces
    const listResponse = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${accountId}/storage/kv/namespaces`,
      {
        headers: {
          'Authorization': `Bearer ${apiToken}`,
          'Content-Type': 'application/json',
        },
      }
    );

    const listData = await listResponse.json() as any;
    
    // Find existing namespace
    if (listData.result) {
      const existing = listData.result.find((ns: any) => ns.title === KV_NAMESPACE_NAME);
      if (existing) {
        return existing.id;
      }
    }

    // Create new namespace if not found
    const createResponse = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${accountId}/storage/kv/namespaces`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ title: KV_NAMESPACE_NAME }),
      }
    );

    const createData = await createResponse.json() as any;
    if (createData.result?.id) {
      console.log(`✓ Created KV namespace: ${KV_NAMESPACE_NAME}`);
      return createData.result.id;
    }

    throw new Error('Failed to create KV namespace');
  } catch (error) {
    console.error('KV namespace error:', error);
    throw error;
  }
}

/**
 * Get a value from KV via API
 */
async function getKVValue(env: CloudBrainEnv, namespaceId: string, key: string): Promise<string | null> {
  try {
    const response = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${env.CLOUDFLARE_ACCOUNT_ID}/storage/kv/namespaces/${namespaceId}/values/${encodeURIComponent(key)}`,
      {
        headers: {
          'Authorization': `Bearer ${env.CLOUDFLARE_API_TOKEN}`,
        },
      }
    );

    if (response.status === 404) return null;
    return await response.text();
  } catch (error) {
    console.error('KV get error:', error);
    return null;
  }
}

/**
 * Store a value in KV via API (no TTL - size-based eviction only)
 */
async function putKVValue(env: CloudBrainEnv, namespaceId: string, key: string, value: string): Promise<void> {
  try {
    await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${env.CLOUDFLARE_ACCOUNT_ID}/storage/kv/namespaces/${namespaceId}/values/${encodeURIComponent(key)}`,
      {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${env.CLOUDFLARE_API_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: value,
      }
    );
  } catch (error) {
    console.error('KV put error:', error);
  }
}

/**
 * Delete a value from KV via API
 */
async function deleteKVValue(env: CloudBrainEnv, namespaceId: string, key: string): Promise<void> {
  try {
    await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${env.CLOUDFLARE_ACCOUNT_ID}/storage/kv/namespaces/${namespaceId}/values/${encodeURIComponent(key)}`,
      {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${env.CLOUDFLARE_API_TOKEN}`,
        },
      }
    );
  } catch (error) {
    console.error('KV delete error:', error);
  }
}

/**
 * Get a value from KV
 */
export async function getSession(key: string, env: CloudBrainEnv, namespaceId: string): Promise<any> {
  const value = await getKVValue(env, namespaceId, key);
  return value ? JSON.parse(value) : null;
}

/**
 * Store a value in KV (no TTL - size-based eviction only)
 */
export async function setSession(key: string, value: any, env: CloudBrainEnv, namespaceId: string): Promise<void> {
  if (!env) return;
  await putKVValue(env, namespaceId, key, JSON.stringify(value));
}

/**
 * Delete a value from KV
 */
export async function deleteSession(key: string, env: CloudBrainEnv, namespaceId: string): Promise<void> {
  await deleteKVValue(env, namespaceId, key);
}

/**
 * Get conversation context for a user
 * Returns null if no context exists
 */
export async function getConversationContext(userId: number, env: CloudBrainEnv, namespaceId: string): Promise<any> {
  return getSession(`user:${userId}:context`, env, namespaceId);
}

/**
 * Store conversation context for a user
 * Implements FIFO eviction: when context exceeds 12 KB, oldest entries are deleted
 * No TTL - cleanup is size-based only
 */
export async function setConversationContext(userId: number, context: any, env: CloudBrainEnv, namespaceId: string): Promise<void> {
  const contextStr = JSON.stringify(context);
  const contextSize = new Blob([contextStr]).size;
  
  // If context exceeds limit, trim oldest messages (FIFO)
  if (contextSize > CONTEXT_SIZE_LIMIT && context.messages && Array.isArray(context.messages)) {
    // Remove oldest messages until we're under the limit
    while (context.messages.length > 0 && new Blob([JSON.stringify(context)]).size > CONTEXT_SIZE_LIMIT) {
      context.messages.shift(); // Remove first (oldest) message
    }
  }
  
  // Store without TTL - API handles size-based eviction
  await setSession(`user:${userId}:context`, context, env, namespaceId);
}

/**
 * Cache automation state (temporary, no TTL)
 */
export async function cacheAutomationState(automationId: number, state: any, env: CloudBrainEnv, namespaceId: string): Promise<void> {
  await setSession(`automation:${automationId}`, state, env, namespaceId);
}

// Export for initialization
export { getOrCreateKVNamespace, KV_NAMESPACE_NAME };
