import { CloudBrainEnv, ActionResult } from './types';

export async function uploadFile(fileName: string, fileData: ArrayBuffer, env: CloudBrainEnv): Promise<ActionResult> {
  try {
    const bucket = env.BUCKET;
    const key = `${Date.now()}-${fileName}`;

    await bucket.put(key, fileData, {
      customMetadata: {
        uploadedAt: new Date().toISOString(),
      },
    });

    return {
      success: true,
      message: `File uploaded: ${fileName}`,
      data: { key, fileName, size: fileData.byteLength },
    };
  } catch (error) {
    return {
      success: false,
      message: 'File upload failed',
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

export async function downloadFile(key: string, env: CloudBrainEnv): Promise<ArrayBuffer | null> {
  try {
    const bucket = env.BUCKET;
    const object = await bucket.get(key);
    return object ? await object.arrayBuffer() : null;
  } catch (error) {
    console.error('Download error:', error);
    return null;
  }
}

export async function deleteFile(key: string, env: CloudBrainEnv): Promise<ActionResult> {
  try {
    const bucket = env.BUCKET;
    await bucket.delete(key);
    return { success: true, message: `File deleted: ${key}` };
  } catch (error) {
    return {
      success: false,
      message: 'Delete failed',
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

export async function listFiles(env: CloudBrainEnv, limit: number = 100): Promise<ActionResult> {
  try {
    const bucket = env.BUCKET;
    const list = await bucket.list({ limit });
    return {
      success: true,
      message: 'Files listed',
      data: list.objects.map((obj) => ({ key: obj.key, size: obj.size, uploaded: obj.uploaded })),
    };
  } catch (error) {
    return {
      success: false,
      message: 'List failed',
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
