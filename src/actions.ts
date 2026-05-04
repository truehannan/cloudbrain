import { CloudBrainEnv, ActionResult } from './types';
import { listAutomationsForTelegramId, queryDatabase as runQueryDatabase } from './db';

export async function executeAction(actionType: string, params: any, env: CloudBrainEnv): Promise<ActionResult> {
  switch (actionType) {
    case 'generate_text':
      return generateText(params, env);
    case 'generate_image':
      return generateImage(params, env);
    case 'transcribe_audio':
      return transcribeAudio(params, env);
    case 'query_database':
      return queryDatabase(params, env);
    case 'list_automations':
      return listAutomations(params, env);
    default:
      return { success: false, message: `Unknown action: ${actionType}` };
  }
}

async function generateText(params: any, env: CloudBrainEnv): Promise<ActionResult> {
  try {
    const { prompt, model = '@cf/mistral/mistral-7b-instruct-v0.2' } = params;

    if (!prompt) {
      return { success: false, message: 'Prompt required' };
    }

    const messages = [{ role: 'user', content: prompt }];

    const response = await env.AI.run(model, { messages });

    return {
      success: true,
      message: 'Text generated',
      data: { text: response.response },
    };
  } catch (error) {
    return {
      success: false,
      message: 'Generation failed',
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

async function generateImage(params: any, env: CloudBrainEnv): Promise<ActionResult> {
  try {
    const { prompt } = params;

    if (!prompt) {
      return { success: false, message: 'Prompt required' };
    }

    const response = await env.AI.run('@cf/stabilityai/stable-diffusion-xl-generate', {
      prompt,
    });

    return {
      success: true,
      message: 'Image generated',
      data: { image: response.image },
    };
  } catch (error) {
    return {
      success: false,
      message: 'Image generation failed',
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

async function transcribeAudio(params: any, env: CloudBrainEnv): Promise<ActionResult> {
  try {
    const { audioData } = params;

    if (!audioData) {
      return { success: false, message: 'Audio data required' };
    }

    const response = await env.AI.run('@cf/openai/whisper', {
      audio: audioData,
    });

    return {
      success: true,
      message: 'Audio transcribed',
      data: { text: response.text },
    };
  } catch (error) {
    return {
      success: false,
      message: 'Transcription failed',
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

async function queryDatabase(params: any, env: CloudBrainEnv): Promise<ActionResult> {
  try {
    const { query, table } = params;

    if (!query && !table) {
      return { success: false, message: 'Query or table name required' };
    }

    const sql = query || `SELECT * FROM ${table}`;
    const result = await runQueryDatabase(sql, env);

    return {
      success: true,
      message: 'Query executed',
      data: result.data,
    };
  } catch (error) {
    return {
      success: false,
      message: 'Query failed',
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

async function listAutomations(params: any, env: CloudBrainEnv): Promise<ActionResult> {
  try {
    const { userId } = params;

    if (!userId) {
      return { success: false, message: 'User ID required' };
    }

    const automations = await listAutomationsForTelegramId(userId, env);

    return {
      success: true,
      message: 'Automations listed',
      data: automations.map((automation) => ({
        name: automation.name,
        description: automation.description,
        status: automation.status,
      })),
    };
  } catch (error) {
    return {
      success: false,
      message: 'Failed to list automations',
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
