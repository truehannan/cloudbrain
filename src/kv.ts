import { CloudBrainEnv } from './types';
import { deleteKVValue, getKVValue, putKVValue } from './cloudflare-api';

// Context size limit: 8-12 KB per request
const CONTEXT_SIZE_LIMIT = 12 * 1024; // 12 KB in bytes

/**
 * Get a value from KV
 */
export async function getSession(key: string, env: CloudBrainEnv): Promise<any> {
  const value = await getKVValue(env, key);
  return value ? JSON.parse(value) : null;
}

/**
 * Store a value in KV (no TTL - size-based eviction only)
 */
export async function setSession(key: string, value: any, env: CloudBrainEnv): Promise<void> {
  if (!env) return;
  // No TTL parameter - KV will handle size-based eviction
  await putKVValue(env, key, JSON.stringify(value));
}

/**
 * Delete a value from KV
 */
export async function deleteSession(key: string, env: CloudBrainEnv): Promise<void> {
  await deleteKVValue(env, key);
}

/**
 * Get conversation context for a user
 * Returns null if no context exists
 */
export async function getConversationContext(userId: number, env: CloudBrainEnv): Promise<any> {
  return getSession(`user:${userId}:context`, env);
}

/**
 * Store conversation context for a user
 * Implements FIFO eviction: when context exceeds 12 KB, oldest entries are deleted
 * No TTL - cleanup is size-based only
 */
export async function setConversationContext(userId: number, context: any, env: CloudBrainEnv): Promise<void> {
  const contextStr = JSON.stringify(context);
  const contextSize = new Blob([contextStr]).size;
  
  // If context exceeds limit, trim oldest messages (FIFO)
  if (contextSize > CONTEXT_SIZE_LIMIT && context.messages && Array.isArray(context.messages)) {
    // Remove oldest messages until we're under the limit
    while (context.messages.length > 0 && new Blob([JSON.stringify(context)]).size > CONTEXT_SIZE_LIMIT) {
      context.messages.shift(); // Remove first (oldest) message
    }
  }
  
  // Store without TTL - KV handles size-based eviction
  await setSession(`user:${userId}:context`, context, env);
}

/**
 * Cache automation state (temporary, no TTL)
 */
export async function cacheAutomationState(automationId: number, state: any, env: CloudBrainEnv): Promise<void> {
  await setSession(`automation:${automationId}`, state, env);
}
