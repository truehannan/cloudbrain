import { CloudBrainEnv, ActionResult } from './types';
import { deleteKVValue, getKVValue, putKVValue } from './cloudflare-api';
import { queryDatabase } from './db';

function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  const chunkSize = 0x8000;

  for (let index = 0; index < bytes.length; index += chunkSize) {
    const chunk = bytes.subarray(index, index + chunkSize);
    binary += String.fromCharCode(...chunk);
  }

  return btoa(binary);
}

function base64ToBytes(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return bytes;
}

export async function uploadFile(fileName: string, fileData: ArrayBuffer, env: CloudBrainEnv): Promise<ActionResult> {
  try {
    const key = `${Date.now()}-${fileName}`;
    const encoded = bytesToBase64(new Uint8Array(fileData));

    await putKVValue(
      env,
      `file:${key}`,
      JSON.stringify({
        fileName,
        fileType: 'application/octet-stream',
        fileSize: fileData.byteLength,
        uploadedAt: new Date().toISOString(),
        data: encoded,
      })
    );

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
    const payload = await getKVValue(env, `file:${key}`);
    if (!payload) {
      return null;
    }

    const parsed = JSON.parse(payload) as { data?: string };
    if (!parsed.data) {
      return null;
    }

    const buffer = base64ToBytes(parsed.data);
    return buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength) as ArrayBuffer;
  } catch (error) {
    console.error('Download error:', error);
    return null;
  }
}

export async function deleteFile(key: string, env: CloudBrainEnv): Promise<ActionResult> {
  try {
    await deleteKVValue(env, `file:${key}`);
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
    const list = await queryDatabase('SELECT filename, file_size, created_at, r2_key FROM files ORDER BY created_at DESC', env);
    return {
      success: true,
      message: 'Files listed',
      data: (list.data || []).slice(0, limit),
    };
  } catch (error) {
    return {
      success: false,
      message: 'List failed',
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
