import { CloudBrainEnv, ActionResult } from './types';

export async function queryDatabase(query: string, env: CloudBrainEnv): Promise<ActionResult> {
  try {
    const db = env.DB;
    const result = await db.prepare(query).all();
    return {
      success: true,
      message: 'Query executed successfully',
      data: result.results,
    };
  } catch (error) {
    return {
      success: false,
      message: 'Database query failed',
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

export async function insertData(table: string, data: Record<string, any>, env: CloudBrainEnv): Promise<ActionResult> {
  try {
    const db = env.DB;
    const keys = Object.keys(data);
    const values = Object.values(data);
    const placeholders = keys.map(() => '?').join(',');
    const query = `INSERT INTO ${table} (${keys.join(',')}) VALUES (${placeholders})`;

    await db.prepare(query).bind(...values).run();
    return { success: true, message: `Data inserted into ${table}` };
  } catch (error) {
    return {
      success: false,
      message: 'Insert failed',
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

export async function updateData(table: string, id: number, data: Record<string, any>, env: CloudBrainEnv): Promise<ActionResult> {
  try {
    const db = env.DB;
    const keys = Object.keys(data);
    const values = [...Object.values(data), id];
    const setClause = keys.map((k) => `${k} = ?`).join(',');
    const query = `UPDATE ${table} SET ${setClause} WHERE id = ?`;

    await db.prepare(query).bind(...values).run();
    return { success: true, message: `${table} record updated` };
  } catch (error) {
    return {
      success: false,
      message: 'Update failed',
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

export async function deleteData(table: string, id: number, env: CloudBrainEnv): Promise<ActionResult> {
  try {
    const db = env.DB;
    await db.prepare(`DELETE FROM ${table} WHERE id = ?`).bind(id).run();
    return { success: true, message: `${table} record deleted` };
  } catch (error) {
    return {
      success: false,
      message: 'Delete failed',
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
