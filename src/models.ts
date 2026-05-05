// All available Cloudflare Workers AI models
// Updated: May 2026

export const AI_MODELS = {
  text: [
    {
      id: '@cf/mistral/mistral-7b-instruct-v0.2',
      name: 'Mistral 7B',
      description: 'Fast, accurate text generation and chat',
      category: 'Text Generation',
    },
  ],
  image: [
    {
      id: '@cf/stabilityai/stable-diffusion-xl-generate',
      name: 'Stable Diffusion XL',
      description: 'High-quality image generation from text',
      category: 'Image Generation',
    },
  ],
  audio: [
    {
      id: '@cf/openai/whisper',
      name: 'Whisper',
      description: 'Audio transcription (speech to text)',
      category: 'Audio',
    },
  ],
};

export interface ModelInfo {
  id: string;
  name: string;
  description: string;
  category: string;
}

// Get all available models
export function getAllModels(): ModelInfo[] {
  return [
    ...AI_MODELS.text,
    ...AI_MODELS.image,
    ...AI_MODELS.audio,
  ];
}

// Get model by ID
export function getModelById(modelId: string): ModelInfo | undefined {
  const all = getAllModels();
  return all.find(m => m.id === modelId);
}

// Format models for display
export function formatModelsForDisplay(): string {
  const all = getAllModels();
  const grouped = new Map<string, ModelInfo[]>();

  all.forEach(model => {
    if (!grouped.has(model.category)) {
      grouped.set(model.category, []);
    }
    grouped.get(model.category)!.push(model);
  });

  let result = '🤖 *Available AI Models*\n\n';
  grouped.forEach((models, category) => {
    result += `*${category}*\n`;
    models.forEach(model => {
      result += `• ${model.name}: ${model.description}\n`;
    });
    result += '\n';
  });

  result += 'Just tell me what you need:\n';
  result += '• "Create a cat image"\n';
  result += '• "Transcribe my voice"\n';
  result += '• "Explain quantum physics"';

  return result;
}
