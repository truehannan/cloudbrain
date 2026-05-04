import { CloudBrainEnv, ActionResult, Automation } from './types';

export async function createWorkerAutomation(
  name: string,
  description: string,
  trigger: string,
  interval: number,
  logic: string,
  env: CloudBrainEnv
): Promise<ActionResult> {
  try {
    // Validate inputs
    if (!name || !description) {
      return { success: false, message: 'Name and description required' };
    }

    // Generate unique worker name
    const workerName = `${name.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}`;

    // Prepare worker code (Wrangler worker template)
    const workerCode = generateWorkerCode(logic, name, description);

    // Create worker via Cloudflare API
    const createResult = await callCloudflareAPI(`/accounts/${env.CLOUDFLARE_ACCOUNT_ID}/workers/scripts`, 'PUT', {
      main: {
        name: 'index.js',
        type: 'javascript',
        source: workerCode,
      },
    }, env);

    if (!createResult.success) {
      return { success: false, message: 'Failed to deploy worker', error: createResult.error };
    }

    // Store automation metadata in D1
    const db = env.DB;
    await db
      .prepare(
        'INSERT INTO automations (user_id, name, description, worker_name, trigger_type, trigger_config, status) VALUES (?, ?, ?, ?, ?, ?, ?)'
      )
      .bind(1, name, description, workerName, trigger, JSON.stringify({ interval }), 'active')
      .run();

    return {
      success: true,
      message: `Automation "${name}" deployed as worker "${workerName}"`,
      data: { workerName, interval },
    };
  } catch (error) {
    return {
      success: false,
      message: 'Worker creation failed',
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

export async function deleteWorkerAutomation(automationId: number, env: CloudBrainEnv): Promise<ActionResult> {
  try {
    const db = env.DB;

    // Get automation details
    const automation = await db.prepare('SELECT * FROM automations WHERE id = ?').bind(automationId).first();

    if (!automation) {
      return { success: false, message: 'Automation not found' };
    }

    // Delete worker via Cloudflare API
    const deleteResult = await callCloudflareAPI(
      `/accounts/${env.CLOUDFLARE_ACCOUNT_ID}/workers/scripts/${automation.worker_name}`,
      'DELETE',
      {},
      env
    );

    if (!deleteResult.success) {
      return { success: false, message: 'Failed to delete worker', error: deleteResult.error };
    }

    // Delete from database
    await db.prepare('DELETE FROM automations WHERE id = ?').bind(automationId).run();

    return { success: true, message: `Automation "${automation.name}" deleted` };
  } catch (error) {
    return {
      success: false,
      message: 'Deletion failed',
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

function generateWorkerCode(logic: string, name: string, description: string): string {
  return `
// CloudBrain Automation: ${name}
// Description: ${description}
// Auto-generated worker code

export default {
  async fetch(request) {
    return new Response('Automation running', { status: 200 });
  },

  async scheduled(event) {
    // This runs on the cron schedule
    console.log('Executing automation: ${name}');

    try {
      // User-provided logic (unsafe - should be sandboxed)
      ${logic}
    } catch (err) {
      console.error('Automation error:', err);
    }
  }
};
`;
}

async function callCloudflareAPI(path: string, method: string, body: any, env: CloudBrainEnv): Promise<{ success: boolean; error?: string }> {
  try {
    const url = `https://api.cloudflare.com/client/v4${path}`;
    const response = await fetch(url, {
      method,
      headers: {
        'Authorization': `Bearer ${env.CLOUDFLARE_API_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: method !== 'DELETE' ? JSON.stringify(body) : undefined,
    });

    const result = await response.json() as any;
    return { success: result.success, error: result.errors?.[0]?.message };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

export async function listUserAutomations(userId: number, env: CloudBrainEnv): Promise<Automation[]> {
  const db = env.DB;
  const automations = await db
    .prepare('SELECT * FROM automations WHERE user_id = ? ORDER BY created_at DESC')
    .bind(userId)
    .all();

  return (automations.results || []) as Automation[];
}

export async function getAutomationStatus(automationId: number, env: CloudBrainEnv): Promise<string> {
  const db = env.DB;
  const automation = await db.prepare('SELECT status FROM automations WHERE id = ?').bind(automationId).first();

  return automation?.status || 'unknown';
}
