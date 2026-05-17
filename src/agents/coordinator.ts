/**
 * Agent Coordinator - Manages multi-agent task execution and delegation
 */

import { ChannelManager } from '../channels/manager';
import { MemoryDatabase } from '../db/memory';

export interface Agent {
  id: string;
  name: string;
  role: string;
  capabilities: string[];
}

export interface Task {
  id: string;
  description: string;
  assignedAgent?: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  result?: string;
  error?: string;
}

export interface TaskResult {
  taskId: string;
  success: boolean;
  result?: string;
  error?: string;
  executionTime: number;
}

const logger = {
  info: (tag: string, message: string, data?: any) => {
    console.log(`[${new Date().toISOString()}] [INFO] [${tag}] ${message}`, data || '');
  },
  error: (tag: string, message: string, error?: any) => {
    console.error(`[${new Date().toISOString()}] [ERROR] [${tag}] ${message}`, error || '');
  },
  warn: (tag: string, message: string, data?: any) => {
    console.warn(`[${new Date().toISOString()}] [WARN] [${tag}] ${message}`, data || '');
  },
  debug: (tag: string, message: string, data?: any) => {
    console.log(`[${new Date().toISOString()}] [DEBUG] [${tag}] ${message}`, data || '');
  },
};

export class AgentCoordinator {
  private agents: Map<string, Agent> = new Map();
  private tasks: Map<string, Task> = new Map();
  private channelManager: ChannelManager;
  private memoryDb: MemoryDatabase;
  private aiBinding: any;

  constructor(channelManager: ChannelManager, memoryDb: MemoryDatabase, aiBinding: any) {
    this.channelManager = channelManager;
    this.memoryDb = memoryDb;
    this.aiBinding = aiBinding;
    this.initializeDefaultAgents();
  }

  /**
   * Initialize default agents
   */
  private initializeDefaultAgents(): void {
    logger.info('AGENT', 'Initializing default agents');

    // File Handler Agent
    this.registerAgent({
      id: 'file-handler',
      name: 'File Handler',
      role: 'Handles file operations and transfers',
      capabilities: ['send_file', 'receive_file', 'transfer_file', 'process_file'],
    });

    // Memory Manager Agent
    this.registerAgent({
      id: 'memory-manager',
      name: 'Memory Manager',
      role: 'Manages user memories and context',
      capabilities: ['store_memory', 'recall_memory', 'update_memory', 'delete_memory'],
    });

    // Communication Agent
    this.registerAgent({
      id: 'communication',
      name: 'Communication Agent',
      role: 'Handles multi-channel messaging',
      capabilities: ['send_message', 'broadcast_message', 'receive_message'],
    });

    // Analysis Agent
    this.registerAgent({
      id: 'analyzer',
      name: 'Analysis Agent',
      role: 'Analyzes content and provides insights',
      capabilities: ['analyze_text', 'summarize', 'extract_info', 'classify'],
    });

    logger.info('AGENT', 'Default agents initialized');
  }

  /**
   * Register a new agent
   */
  registerAgent(agent: Agent): void {
    logger.info('AGENT', `Registering agent: ${agent.name}`, { agentId: agent.id });
    this.agents.set(agent.id, agent);
  }

  /**
   * Get all agents
   */
  getAgents(): Agent[] {
    return Array.from(this.agents.values());
  }

  /**
   * Get agent by ID
   */
  getAgent(agentId: string): Agent | undefined {
    return this.agents.get(agentId);
  }

  /**
   * Create a task
   */
  createTask(description: string, assignedAgent?: string): Task {
    const taskId = Math.random().toString(36).substring(7);
    const task: Task = {
      id: taskId,
      description,
      assignedAgent,
      status: 'pending',
    };

    this.tasks.set(taskId, task);
    logger.info('TASK', `Task created: ${description}`, { taskId, assignedAgent });
    return task;
  }

  /**
   * Execute a single task
   */
  async executeTask(taskId: string, context?: any): Promise<TaskResult> {
    const startTime = Date.now();
    const task = this.tasks.get(taskId);

    if (!task) {
      logger.error('TASK', `Task not found: ${taskId}`);
      return {
        taskId,
        success: false,
        error: 'Task not found',
        executionTime: 0,
      };
    }

    logger.info('TASK', `Executing task: ${task.description}`, { taskId });

    try {
      task.status = 'in_progress';

      // Get AI to analyze and execute task
      const aiResponse = await this.aiBinding.run('@cf/meta/llama-2-7b-chat-int8', {
        messages: [
          {
            role: 'system',
            content: `You are a task executor. Execute this task: ${task.description}. Provide a clear result or action taken.`,
          },
          {
            role: 'user',
            content: `Execute: ${task.description}`,
          },
        ],
      });

      const result = aiResponse.response || 'Task executed';
      task.status = 'completed';
      task.result = result;

      const executionTime = Date.now() - startTime;
      logger.info('TASK', `Task completed: ${taskId}`, { executionTime });

      return {
        taskId,
        success: true,
        result,
        executionTime,
      };
    } catch (error) {
      task.status = 'failed';
      task.error = error instanceof Error ? error.message : 'Unknown error';

      logger.error('TASK', `Task failed: ${taskId}`, error);

      return {
        taskId,
        success: false,
        error: task.error,
        executionTime: Date.now() - startTime,
      };
    }
  }

  /**
   * Execute multiple tasks in parallel
   */
  async executeParallel(
    tasks: Array<{ description: string; agent?: string }>
  ): Promise<TaskResult[]> {
    logger.info('TASK', `Executing ${tasks.length} tasks in parallel`);

    const createdTasks = tasks.map((t) => this.createTask(t.description, t.agent));
    const results = await Promise.all(createdTasks.map((t) => this.executeTask(t.id)));

    logger.info('TASK', `Parallel execution completed`, {
      total: tasks.length,
      successful: results.filter((r) => r.success).length,
    });

    return results;
  }

  /**
   * Execute multiple tasks sequentially
   */
  async executeSequential(
    tasks: Array<{ description: string; agent?: string }>
  ): Promise<TaskResult[]> {
    logger.info('TASK', `Executing ${tasks.length} tasks sequentially`);

    const results: TaskResult[] = [];

    for (const taskDesc of tasks) {
      const task = this.createTask(taskDesc.description, taskDesc.agent);
      const result = await this.executeTask(task.id);
      results.push(result);

      // Log progress
      logger.debug('TASK', `Sequential task completed`, {
        taskId: task.id,
        success: result.success,
      });
    }

    logger.info('TASK', `Sequential execution completed`, {
      total: tasks.length,
      successful: results.filter((r) => r.success).length,
    });

    return results;
  }

  /**
   * Delegate task to specific agent
   */
  async delegateTask(taskDescription: string, agentId: string): Promise<TaskResult> {
    const agent = this.getAgent(agentId);

    if (!agent) {
      logger.error('AGENT', `Agent not found: ${agentId}`);
      return {
        taskId: '',
        success: false,
        error: `Agent ${agentId} not found`,
        executionTime: 0,
      };
    }

    logger.info('AGENT', `Delegating task to agent: ${agent.name}`, { agentId });

    const task = this.createTask(taskDescription, agentId);
    return this.executeTask(task.id);
  }

  /**
   * Get task status
   */
  getTaskStatus(taskId: string): Task | undefined {
    return this.tasks.get(taskId);
  }

  /**
   * Get all tasks
   */
  getAllTasks(): Task[] {
    return Array.from(this.tasks.values());
  }

  /**
   * Get tasks by status
   */
  getTasksByStatus(status: Task['status']): Task[] {
    return Array.from(this.tasks.values()).filter((t) => t.status === status);
  }

  /**
   * Execute complex workflow with multiple agents
   */
  async executeWorkflow(
    userId: string,
    channelType: string,
    workflowDescription: string
  ): Promise<void> {
    const workflowId = Math.random().toString(36).substring(7);
    logger.info('WORKFLOW', `Starting workflow: ${workflowDescription}`, { workflowId, userId });

    try {
      // Send workflow start message
      await this.channelManager.sendMessage(
        channelType,
        userId,
        `🚀 Starting workflow: ${workflowDescription}\nWorkflow ID: ${workflowId}`
      );

      // Parse workflow into tasks
      const tasks = await this.parseWorkflow(workflowDescription);
      logger.info('WORKFLOW', `Parsed ${tasks.length} tasks from workflow`, { workflowId });

      // Send task breakdown
      const taskList = tasks.map((t, i) => `${i + 1}. ${t.description}`).join('\n');
      await this.channelManager.sendMessage(
        channelType,
        userId,
        `📋 Tasks to execute:\n${taskList}`
      );

      // Execute tasks sequentially
      const results = await this.executeSequential(tasks);

      // Send results
      let successCount = 0;
      let failureCount = 0;

      for (let i = 0; i < results.length; i++) {
        const result = results[i];
        const status = result.success ? '✅' : '❌';
        const message = result.success ? result.result : result.error;

        await this.channelManager.sendMessage(
          channelType,
          userId,
          `${status} Task ${i + 1}: ${message}`
        );

        if (result.success) successCount++;
        else failureCount++;
      }

      // Send workflow completion
      await this.channelManager.sendMessage(
        channelType,
        userId,
        `✨ Workflow completed!\n✅ Successful: ${successCount}\n❌ Failed: ${failureCount}\nWorkflow ID: ${workflowId}`
      );

      logger.info('WORKFLOW', `Workflow completed`, { workflowId, successCount, failureCount });
    } catch (error) {
      logger.error('WORKFLOW', `Workflow error: ${workflowDescription}`, { workflowId, error });
      await this.channelManager.sendMessage(
        channelType,
        userId,
        `❌ Workflow failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Parse workflow description into tasks
   */
  private async parseWorkflow(
    description: string
  ): Promise<Array<{ description: string; agent?: string }>> {
    // Use AI to parse workflow
    const aiResponse = await this.aiBinding.run('@cf/meta/llama-2-7b-chat-int8', {
      messages: [
        {
          role: 'system',
          content:
            'Parse this workflow into individual tasks. Return a JSON array of tasks with "description" and optional "agent" fields.',
        },
        {
          role: 'user',
          content: description,
        },
      ],
    });

    try {
      // Extract JSON from response
      const jsonMatch = aiResponse.response.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    } catch (error) {
      logger.warn('WORKFLOW', 'Failed to parse workflow JSON', error);
    }

    // Fallback: treat entire description as single task
    return [{ description }];
  }
}
