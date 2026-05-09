/**
 * Memory database layer for storing important memories
 * Uses Cloudflare D1 database with automatic creation
 */

export interface Memory {
  id: string;
  userId: string;
  channelType: 'telegram' | 'discord' | 'whatsapp';
  content: string;
  importance: number; // 1-10 scale
  createdAt: number;
  updatedAt: number;
  tags?: string[];
}

export class MemoryDatabase {
  private db: any;
  private dbName: string = 'cloudbrain_memories';
  private initialized: boolean = false;

  constructor(db: any) {
    this.db = db;
  }

  /**
   * Initialize database - create table if it doesn't exist
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    try {
      // Create memories table if it doesn't exist
      await this.db.prepare(`
        CREATE TABLE IF NOT EXISTS memories (
          id TEXT PRIMARY KEY,
          userId TEXT NOT NULL,
          channelType TEXT NOT NULL,
          content TEXT NOT NULL,
          importance INTEGER NOT NULL DEFAULT 5,
          createdAt INTEGER NOT NULL,
          updatedAt INTEGER NOT NULL,
          tags TEXT
        )
      `).run();

      // Create index for faster queries
      await this.db.prepare(`
        CREATE INDEX IF NOT EXISTS idx_userId ON memories(userId)
      `).run();

      await this.db.prepare(`
        CREATE INDEX IF NOT EXISTS idx_importance ON memories(importance DESC)
      `).run();

      this.initialized = true;
      console.log('Memory database initialized');
    } catch (error) {
      console.error('Failed to initialize memory database:', error);
      throw error;
    }
  }

  /**
   * Store a memory
   */
  async storeMemory(memory: Omit<Memory, 'id' | 'createdAt' | 'updatedAt'>): Promise<Memory> {
    await this.initialize();

    const id = `mem_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const now = Date.now();
    const tagsJson = memory.tags ? JSON.stringify(memory.tags) : null;

    try {
      await this.db.prepare(`
        INSERT INTO memories (id, userId, channelType, content, importance, createdAt, updatedAt, tags)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(
        id,
        memory.userId,
        memory.channelType,
        memory.content,
        memory.importance,
        now,
        now,
        tagsJson
      ).run();

      return {
        id,
        ...memory,
        createdAt: now,
        updatedAt: now,
      };
    } catch (error) {
      console.error('Failed to store memory:', error);
      throw error;
    }
  }

  /**
   * Get memories for a user
   */
  async getUserMemories(userId: string, limit: number = 10): Promise<Memory[]> {
    await this.initialize();

    try {
      const result = await this.db.prepare(`
        SELECT * FROM memories
        WHERE userId = ?
        ORDER BY importance DESC, updatedAt DESC
        LIMIT ?
      `).bind(userId, limit).all();

      return (result.results || []).map((row: any) => ({
        ...row,
        tags: row.tags ? JSON.parse(row.tags) : undefined,
      }));
    } catch (error) {
      console.error('Failed to get user memories:', error);
      return [];
    }
  }

  /**
   * Get important memories (importance >= threshold)
   */
  async getImportantMemories(threshold: number = 7, limit: number = 5): Promise<Memory[]> {
    await this.initialize();

    try {
      const result = await this.db.prepare(`
        SELECT * FROM memories
        WHERE importance >= ?
        ORDER BY importance DESC, updatedAt DESC
        LIMIT ?
      `).bind(threshold, limit).all();

      return (result.results || []).map((row: any) => ({
        ...row,
        tags: row.tags ? JSON.parse(row.tags) : undefined,
      }));
    } catch (error) {
      console.error('Failed to get important memories:', error);
      return [];
    }
  }

  /**
   * Search memories by content
   */
  async searchMemories(query: string, userId?: string, limit: number = 10): Promise<Memory[]> {
    await this.initialize();

    try {
      let sql = `
        SELECT * FROM memories
        WHERE content LIKE ?
      `;
      const params: any[] = [`%${query}%`];

      if (userId) {
        sql += ` AND userId = ?`;
        params.push(userId);
      }

      sql += ` ORDER BY importance DESC, updatedAt DESC LIMIT ?`;
      params.push(limit);

      const result = await this.db.prepare(sql).bind(...params).all();

      return (result.results || []).map((row: any) => ({
        ...row,
        tags: row.tags ? JSON.parse(row.tags) : undefined,
      }));
    } catch (error) {
      console.error('Failed to search memories:', error);
      return [];
    }
  }

  /**
   * Update a memory
   */
  async updateMemory(id: string, updates: Partial<Memory>): Promise<Memory | null> {
    await this.initialize();

    try {
      const memory = await this.getMemory(id);
      if (!memory) {
        return null;
      }

      const updated = {
        ...memory,
        ...updates,
        updatedAt: Date.now(),
      };

      const tagsJson = updated.tags ? JSON.stringify(updated.tags) : null;

      await this.db.prepare(`
        UPDATE memories
        SET content = ?, importance = ?, updatedAt = ?, tags = ?
        WHERE id = ?
      `).bind(
        updated.content,
        updated.importance,
        updated.updatedAt,
        tagsJson,
        id
      ).run();

      return updated;
    } catch (error) {
      console.error('Failed to update memory:', error);
      throw error;
    }
  }

  /**
   * Delete a memory
   */
  async deleteMemory(id: string): Promise<boolean> {
    await this.initialize();

    try {
      const result = await this.db.prepare(`
        DELETE FROM memories WHERE id = ?
      `).bind(id).run();

      return (result.meta?.changes || 0) > 0;
    } catch (error) {
      console.error('Failed to delete memory:', error);
      return false;
    }
  }

  /**
   * Get a specific memory
   */
  async getMemory(id: string): Promise<Memory | null> {
    await this.initialize();

    try {
      const result = await this.db.prepare(`
        SELECT * FROM memories WHERE id = ?
      `).bind(id).first();

      if (!result) {
        return null;
      }

      return {
        ...result,
        tags: result.tags ? JSON.parse(result.tags) : undefined,
      };
    } catch (error) {
      console.error('Failed to get memory:', error);
      return null;
    }
  }

  /**
   * Clear old memories (older than specified days)
   */
  async clearOldMemories(daysOld: number = 30): Promise<number> {
    await this.initialize();

    try {
      const cutoffTime = Date.now() - daysOld * 24 * 60 * 60 * 1000;

      const result = await this.db.prepare(`
        DELETE FROM memories WHERE updatedAt < ?
      `).bind(cutoffTime).run();

      return result.meta?.changes || 0;
    } catch (error) {
      console.error('Failed to clear old memories:', error);
      return 0;
    }
  }
}
