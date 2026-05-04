import { CloudBrainEnv } from './types';
import { deleteKVValue, getKVValue, putKVValue } from './cloudflare-api';

export async function getSession(key: string, env: CloudBrainEnv): Promise<any> {
  const value = await getKVValue(env, key);
  return value ? JSON.parse(value) : null;
}

export async function setSession(key: string, value: any, ttl?: number, env?: CloudBrainEnv): Promise<void> {
  if (!env) return;
  const expirationTtl = ttl || 86400; // Default 1 day
  void expirationTtl;
  await putKVValue(env, key, JSON.stringify(value));
}

export async function deleteSession(key: string, env: CloudBrainEnv): Promise<void> {
  await deleteKVValue(env, key);
}

export async function getConversationContext(userId: number, env: CloudBrainEnv): Promise<any> {
  return getSession(`user:${userId}:context`, env);
}

export async function setConversationContext(userId: number, context: any, env: CloudBrainEnv): Promise<void> {
  await setSession(`user:${userId}:context`, context, 604800, env); // 7 days
}

export async function cacheAutomationState(automationId: number, state: any, env: CloudBrainEnv): Promise<void> {
  await setSession(`automation:${automationId}`, state, 3600, env); // 1 hour
}
