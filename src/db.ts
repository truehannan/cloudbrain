import { ActionResult, Automation, CloudBrainEnv } from './types';
import { ensureCloudBrainResources, executeD1Query } from './cloudflare-api';

const SCHEMA_STATEMENTS = [
  `CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    telegram_id TEXT UNIQUE NOT NULL,
    telegram_name TEXT NOT NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    last_active TEXT DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    role TEXT CHECK(role IN ('user', 'assistant', 'system')) NOT NULL,
    content TEXT NOT NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  )`,
  `CREATE TABLE IF NOT EXISTS automations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    name TEXT UNIQUE NOT NULL,
    description TEXT,
    worker_name TEXT NOT NULL,
    trigger_type TEXT CHECK(trigger_type IN ('cron', 'webhook', 'manual')) NOT NULL,
    trigger_config TEXT,
    status TEXT CHECK(status IN ('active', 'paused', 'error')) DEFAULT 'active',
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  )`,
  `CREATE TABLE IF NOT EXISTS credentials (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    service TEXT NOT NULL,
    key_name TEXT NOT NULL,
    value TEXT NOT NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, service, key_name),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  )`,
  `CREATE TABLE IF NOT EXISTS files (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    filename TEXT NOT NULL,
    r2_key TEXT UNIQUE NOT NULL,
    file_type TEXT,
    file_size INTEGER,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  )`,
  `CREATE TABLE IF NOT EXISTS action_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    action_type TEXT NOT NULL,
    status TEXT CHECK(status IN ('success', 'error')) NOT NULL,
    details TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  )`,
  `CREATE INDEX IF NOT EXISTS idx_messages_user_id ON messages(user_id)`,
  `CREATE INDEX IF NOT EXISTS idx_automations_user_id ON automations(user_id)`,
  `CREATE INDEX IF NOT EXISTS idx_credentials_user_id ON credentials(user_id)`,
  `CREATE INDEX IF NOT EXISTS idx_files_user_id ON files(user_id)`,
  `CREATE INDEX IF NOT EXISTS idx_action_logs_user_id ON action_logs(user_id)`
];

let schemaReady = false;
let schemaBootstrap: Promise<void> | null = null;

function assertIdentifier(name: string): void {
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(name)) {
    throw new Error(`Invalid table name: ${name}`);
  }
}

async function ensureDatabaseSchema(env: CloudBrainEnv): Promise<void> {
  if (schemaReady) {
    return;
  }

  if (!schemaBootstrap) {
    schemaBootstrap = (async () => {
      await ensureCloudBrainResources(env);
      const existing = await executeD1Query<{ name: string }>(
        env,
        `SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'users' LIMIT 1`
      );

      if (existing.length === 0) {
        for (const statement of SCHEMA_STATEMENTS) {
          await executeD1Query(env, statement);
        }
      }

      schemaReady = true;
    })();
  }

  await schemaBootstrap;
}

export async function queryDatabase(
  query: string,
  env: CloudBrainEnv,
  params: Array<string | number | boolean | null> = []
): Promise<ActionResult> {
  try {
    await ensureDatabaseSchema(env);
    const result = await executeD1Query(env, query, params);
    return {
      success: true,
      message: 'Query executed successfully',
      data: result,
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
    assertIdentifier(table);
    await ensureDatabaseSchema(env);
    const keys = Object.keys(data);
    const values = Object.values(data);
    const placeholders = keys.map(() => '?').join(',');
    const query = `INSERT INTO ${table} (${keys.join(',')}) VALUES (${placeholders})`;

    await executeD1Query(env, query, values as Array<string | number | boolean | null>);
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
    assertIdentifier(table);
    await ensureDatabaseSchema(env);
    const keys = Object.keys(data);
    const values = [...Object.values(data), id];
    const setClause = keys.map((k) => `${k} = ?`).join(',');
    const query = `UPDATE ${table} SET ${setClause} WHERE id = ?`;

    await executeD1Query(env, query, values as Array<string | number | boolean | null>);
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
    assertIdentifier(table);
    await ensureDatabaseSchema(env);
    await executeD1Query(env, `DELETE FROM ${table} WHERE id = ?`, [id]);
    return { success: true, message: `${table} record deleted` };
  } catch (error) {
    return {
      success: false,
      message: 'Delete failed',
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

  export async function getUserIdByTelegramId(telegramId: number, env: CloudBrainEnv): Promise<number | null> {
    await ensureDatabaseSchema(env);
    const rows = await executeD1Query<{ id: number }>(
      env,
      'SELECT id FROM users WHERE telegram_id = ? LIMIT 1',
      [telegramId.toString()]
    );

    return rows[0]?.id ?? null;
  }

  export async function upsertUser(telegramId: number, name: string, env: CloudBrainEnv): Promise<void> {
    await ensureDatabaseSchema(env);
    const existing = await getUserIdByTelegramId(telegramId, env);

    if (existing === null) {
      await executeD1Query(env, 'INSERT INTO users (telegram_id, telegram_name) VALUES (?, ?)', [telegramId.toString(), name]);
      return;
    }

    await executeD1Query(env, 'UPDATE users SET telegram_name = ?, last_active = CURRENT_TIMESTAMP WHERE telegram_id = ?', [
      name,
      telegramId.toString(),
    ]);
  }

  export async function storeMessage(userTelegramId: number, role: string, content: string, env: CloudBrainEnv): Promise<void> {
    await ensureDatabaseSchema(env);
    const userId = await getUserIdByTelegramId(userTelegramId, env);

    if (userId === null) {
      return;
    }

    await executeD1Query(env, 'INSERT INTO messages (user_id, role, content) VALUES (?, ?, ?)', [userId, role, content]);
  }

  export async function listFilesForTelegramId(
    userTelegramId: number,
    env: CloudBrainEnv
  ): Promise<Array<{ filename: string; file_size: number; created_at: string }>> {
    await ensureDatabaseSchema(env);
    return await executeD1Query<{ filename: string; file_size: number; created_at: string }>(
      env,
      `SELECT filename, file_size, created_at
       FROM files
       WHERE user_id = (SELECT id FROM users WHERE telegram_id = ?)
       ORDER BY created_at DESC`,
      [userTelegramId.toString()]
    );
  }

  export async function listAutomationsForTelegramId(userTelegramId: number, env: CloudBrainEnv): Promise<Automation[]> {
    await ensureDatabaseSchema(env);
    return await executeD1Query<Automation>(
      env,
      `SELECT a.*
       FROM automations a
       INNER JOIN users u ON u.id = a.user_id
       WHERE u.telegram_id = ?
       ORDER BY a.created_at DESC`,
      [userTelegramId.toString()]
    );
  }

  export async function listDatabaseTables(env: CloudBrainEnv): Promise<string[]> {
    await ensureDatabaseSchema(env);
    const tables = await executeD1Query<{ name: string }>(
      env,
      `SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name`
    );

    return tables.map((table) => table.name);
  }
