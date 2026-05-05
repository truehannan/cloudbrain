import { CloudBrainEnv, ActionResult } from './types';
import { listAutomationsForTelegramId, queryDatabase as runQueryDatabase } from './db';
import { AI_MODELS } from './models';

// Detect user intent from natural language
export function detectIntent(text: string): 'text' | 'image' | 'audio' | 'transcribe' {
  const lower = text.toLowerCase();

  // Image generation keywords
  if (lower.match(/generate|create|draw|paint|make|design|image|picture|photo|visual|illustration|render/)) {
    return 'image';
  }

  // Audio/transcription keywords
  if (lower.match(/transcribe|audio|voice|speech|record|listen|song|music|sound/)) {
    return 'transcribe';
  }

  // Default to text
  return 'text';
}

// Optimize prompt for image generation
function optimizeImagePrompt(prompt: string): string {
  // Remove generation verbs and enhance for Stable Diffusion
  const cleaned = prompt
    .replace(/^(generate|create|draw|paint|make|design|create an?)\s+/i, '')
    .trim();

  // Add quality keywords if not already present
  if (!cleaned.match(/quality|detailed|high|8k|4k|hd|resolution/i)) {
    return `${cleaned}, detailed, high quality, professional`;
  }

  return cleaned;
}

// Optimize prompt for text generation
function optimizeTextPrompt(prompt: string): string {
  // Mistral works well with direct prompts
  return prompt.trim();
}

export async function executeAction(actionType: string, params: any, env: CloudBrainEnv): Promise<ActionResult> {
  switch (actionType) {
    case 'generate_text':
      return generateText(params, env);
    case 'generate_image':
      return generateImage(params, env);
    case 'transcribe_audio':
      return transcribeAudio(params, env);
    case 'smart_generate':
      return smartGenerate(params, env);
    case 'query_database':
      return queryDatabase(params, env);
    case 'list_automations':
      return listAutomations(params, env);
    default:
      return { success: false, message: `Unknown action: ${actionType}` };
  }
}

// Smart generation - detects intent and routes to appropriate model
async function smartGenerate(params: any, env: CloudBrainEnv): Promise<ActionResult> {
  try {
    const { prompt } = params;

    if (!prompt) {
      return { success: false, message: 'Prompt required' };
    }

    const intent = detectIntent(prompt);

    switch (intent) {
      case 'image':
        return generateImage({ prompt: optimizeImagePrompt(prompt) }, env);
      case 'transcribe':
        // If user asks about transcription, explain it
        return generateText({ prompt: `The user wants to: ${prompt}. I'm ready to transcribe audio when provided.` }, env);
      case 'text':
      default:
        return generateText({ prompt: optimizeTextPrompt(prompt) }, env);
    }
  } catch (error) {
    return {
      success: false,
      message: 'Generation failed',
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

async function generateText(params: any, env: CloudBrainEnv): Promise<ActionResult> {
  try {
    const { prompt, model = '@cf/meta/llama-2-7b-chat-int8' } = params;

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
