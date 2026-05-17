# CloudBrain Multi-Agent System - Quick Reference

## Overview

CloudBrain includes a powerful multi-agent coordination system that allows you to:
- Execute tasks in parallel or sequentially
- Delegate tasks to specific agents
- Create complex workflows with progress updates
- Manage multiple agents with different capabilities

---

## Default Agents

### 1. File Handler
- **ID:** `file-handler`
- **Role:** Handles file operations and transfers
- **Capabilities:** `send_file`, `receive_file`, `transfer_file`, `process_file`

### 2. Memory Manager
- **ID:** `memory-manager`
- **Role:** Manages user memories and context
- **Capabilities:** `store_memory`, `recall_memory`, `update_memory`, `delete_memory`

### 3. Communication Agent
- **ID:** `communication`
- **Role:** Handles multi-channel messaging
- **Capabilities:** `send_message`, `broadcast_message`, `receive_message`

### 4. Analysis Agent
- **ID:** `analyzer`
- **Role:** Analyzes content and provides insights
- **Capabilities:** `analyze_text`, `summarize`, `extract_info`, `classify`

---

## Usage Examples

### Example 1: Single Task Execution

```typescript
const result = await agentCoordinator.executeTask(taskId);

// Returns:
// {
//   taskId: "abc123",
//   success: true,
//   result: "Task completed successfully",
//   executionTime: 1234
// }
```

### Example 2: Parallel Task Execution

Execute multiple tasks simultaneously:

```typescript
const results = await agentCoordinator.executeParallel([
  { description: "Send file to user", agent: "file-handler" },
  { description: "Store conversation in memory", agent: "memory-manager" },
  { description: "Analyze document", agent: "analyzer" }
]);

// All tasks execute at the same time
// Returns array of TaskResult objects
```

**Use Case:** When tasks are independent and don't depend on each other

### Example 3: Sequential Task Execution

Execute tasks one after another:

```typescript
const results = await agentCoordinator.executeSequential([
  { description: "Fetch file from storage" },
  { description: "Process file content" },
  { description: "Send processed file to user" }
]);

// Tasks execute in order
// Each task waits for the previous one to complete
// Returns array of TaskResult objects
```

**Use Case:** When tasks depend on each other or order matters

### Example 4: Task Delegation

Delegate a task to a specific agent:

```typescript
const result = await agentCoordinator.delegateTask(
  "Analyze this document for key insights",
  "analyzer"
);

// Task is assigned to the Analysis Agent
// Returns TaskResult object
```

**Use Case:** When you want a specific agent to handle a task

### Example 5: Complex Workflow

Execute a complex workflow with multiple steps and progress updates:

```typescript
await agentCoordinator.executeWorkflow(
  userId,
  "telegram",
  "Create a report, send it to Discord, and save to memory"
);

// User receives:
// 1. "🚀 Starting workflow: Create a report, send it to Discord, and save to memory"
// 2. "📋 Tasks to execute:\n1. Create a report\n2. Send it to Discord\n3. Save to memory"
// 3. "✅ Task 1: Report created successfully"
// 4. "✅ Task 2: Report sent to Discord"
// 5. "✅ Task 3: Memory saved"
// 6. "✨ Workflow completed!\n✅ Successful: 3\n❌ Failed: 0"
```

**Use Case:** Complex multi-step operations with user feedback

---

## Task Management

### Get Task Status

```typescript
const task = agentCoordinator.getTaskStatus(taskId);

// Returns:
// {
//   id: "abc123",
//   description: "Send file to user",
//   assignedAgent: "file-handler",
//   status: "completed",
//   result: "File sent successfully"
// }
```

### Get All Tasks

```typescript
const allTasks = agentCoordinator.getAllTasks();

// Returns array of all tasks (pending, in_progress, completed, failed)
```

### Get Tasks by Status

```typescript
const completedTasks = agentCoordinator.getTasksByStatus('completed');
const failedTasks = agentCoordinator.getTasksByStatus('failed');
const pendingTasks = agentCoordinator.getTasksByStatus('pending');

// Returns array of tasks with specified status
```

---

## Agent Management

### Get All Agents

```typescript
const agents = agentCoordinator.getAgents();

// Returns:
// [
//   { id: "file-handler", name: "File Handler", role: "...", capabilities: [...] },
//   { id: "memory-manager", name: "Memory Manager", role: "...", capabilities: [...] },
//   ...
// ]
```

### Get Specific Agent

```typescript
const agent = agentCoordinator.getAgent('analyzer');

// Returns:
// {
//   id: "analyzer",
//   name: "Analysis Agent",
//   role: "Analyzes content and provides insights",
//   capabilities: ["analyze_text", "summarize", "extract_info", "classify"]
// }
```

### Register Custom Agent

```typescript
agentCoordinator.registerAgent({
  id: 'custom-agent',
  name: 'Custom Agent',
  role: 'Performs custom operations',
  capabilities: ['custom_action_1', 'custom_action_2']
});

// Now you can delegate tasks to this agent
```

---

## Logging & Monitoring

### Agent Logs

All agent operations are logged with the `[AGENT]` tag:

```
[2024-01-15T10:30:45.123Z] [INFO] [AGENT] Registering agent: File Handler
[2024-01-15T10:30:45.234Z] [INFO] [AGENT] Delegating task to agent: Analysis Agent
```

### Task Logs

All task operations are logged with the `[TASK]` tag:

```
[2024-01-15T10:30:45.123Z] [INFO] [TASK] Task created: Send file to user
[2024-01-15T10:30:45.234Z] [INFO] [TASK] Executing task: Send file to user
[2024-01-15T10:30:45.456Z] [INFO] [TASK] Task completed: Send file to user
```

### Workflow Logs

All workflow operations are logged with the `[WORKFLOW]` tag:

```
[2024-01-15T10:30:45.123Z] [INFO] [WORKFLOW] Starting workflow: Create a report...
[2024-01-15T10:30:45.234Z] [INFO] [WORKFLOW] Parsed 3 tasks from workflow
[2024-01-15T10:30:45.567Z] [INFO] [WORKFLOW] Workflow completed
```

---

## Error Handling

### Task Failures

If a task fails, the result will contain error information:

```typescript
const result = await agentCoordinator.executeTask(taskId);

if (!result.success) {
  console.error('Task failed:', result.error);
  // Handle error
}
```

### Workflow Error Recovery

If a task in a workflow fails, the workflow continues with remaining tasks:

```
✅ Task 1: Completed successfully
❌ Task 2: Failed - File not found
✅ Task 3: Completed successfully
✨ Workflow completed!
✅ Successful: 2
❌ Failed: 1
```

### Agent Not Found

If you try to delegate to a non-existent agent:

```typescript
const result = await agentCoordinator.delegateTask(
  "Do something",
  "non-existent-agent"
);

// Returns:
// {
//   taskId: "",
//   success: false,
//   error: "Agent non-existent-agent not found",
//   executionTime: 0
// }
```

---

## Performance Tips

### 1. Use Parallel Execution for Independent Tasks

```typescript
// Good - tasks don't depend on each other
await agentCoordinator.executeParallel([
  { description: "Send message", agent: "communication" },
  { description: "Store memory", agent: "memory-manager" }
]);
```

### 2. Use Sequential Execution for Dependent Tasks

```typescript
// Good - tasks depend on each other
await agentCoordinator.executeSequential([
  { description: "Fetch file" },
  { description: "Process file" },
  { description: "Send file" }
]);
```

### 3. Delegate to Specific Agents

```typescript
// Good - use the right agent for the job
await agentCoordinator.delegateTask(
  "Analyze this document",
  "analyzer"  // Use the Analysis Agent
);
```

### 4. Monitor Task Status

```typescript
// Good - check status before taking action
const task = agentCoordinator.getTaskStatus(taskId);
if (task.status === 'completed') {
  // Use the result
}
```

---

## Common Patterns

### Pattern 1: File Processing Workflow

```typescript
await agentCoordinator.executeWorkflow(
  userId,
  "telegram",
  "Download file, process it, and send back"
);
```

### Pattern 2: Multi-Channel Broadcasting

```typescript
await agentCoordinator.executeParallel([
  { description: "Send message to Telegram", agent: "communication" },
  { description: "Send message to Discord", agent: "communication" },
  { description: "Send message to WhatsApp", agent: "communication" }
]);
```

### Pattern 3: Memory-Augmented Analysis

```typescript
await agentCoordinator.executeSequential([
  { description: "Recall relevant memories", agent: "memory-manager" },
  { description: "Analyze with context", agent: "analyzer" },
  { description: "Store new insights", agent: "memory-manager" }
]);
```

### Pattern 4: Error Recovery

```typescript
const results = await agentCoordinator.executeSequential([
  { description: "Try primary method" },
  { description: "If failed, try fallback method" }
]);

// If first task fails, second task can handle recovery
```

---

## Integration with Channels

### Send Progress Updates to User

```typescript
// In your workflow
await channelManager.sendMessage(
  channelType,
  userId,
  `📋 Starting task: ${taskDescription}`
);

const result = await agentCoordinator.executeTask(taskId);

await channelManager.sendMessage(
  channelType,
  userId,
  result.success 
    ? `✅ ${result.result}`
    : `❌ ${result.error}`
);
```

### Multi-Channel Task Execution

```typescript
// Execute same task across multiple channels
const channels = ['telegram', 'discord', 'whatsapp'];

for (const channel of channels) {
  await agentCoordinator.executeWorkflow(
    userId,
    channel,
    "Process and send report"
  );
}
```

---

## Troubleshooting

### Task Not Executing

1. Check if agent is registered: `agentCoordinator.getAgent(agentId)`
2. Check logs for `[TASK]` errors
3. Verify task description is clear
4. Check AI binding is available

### Workflow Not Progressing

1. Check logs for `[WORKFLOW]` errors
2. Verify tasks are being parsed correctly
3. Check if any task is stuck in `in_progress` status
4. Verify channel can send messages

### Agent Not Found

1. Check agent ID is correct
2. Verify agent is registered
3. Use `getAgents()` to list all available agents
4. Register custom agent if needed

---

## Best Practices

1. **Use Descriptive Task Descriptions**
   - ✅ "Send the processed report to the user"
   - ❌ "Send file"

2. **Delegate to Appropriate Agents**
   - ✅ Use `analyzer` for analysis tasks
   - ❌ Use `file-handler` for analysis tasks

3. **Monitor Task Status**
   - ✅ Check `result.success` before using result
   - ❌ Assume task succeeded

4. **Handle Errors Gracefully**
   - ✅ Send user-friendly error messages
   - ❌ Expose technical error details

5. **Use Parallel Execution When Possible**
   - ✅ Execute independent tasks in parallel
   - ❌ Execute all tasks sequentially

---

## API Reference

### AgentCoordinator Methods

| Method | Parameters | Returns | Description |
|--------|-----------|---------|-------------|
| `registerAgent()` | `agent: Agent` | `void` | Register a new agent |
| `getAgents()` | - | `Agent[]` | Get all agents |
| `getAgent()` | `agentId: string` | `Agent \| undefined` | Get specific agent |
| `createTask()` | `description: string, assignedAgent?: string` | `Task` | Create a task |
| `executeTask()` | `taskId: string, context?: any` | `Promise<TaskResult>` | Execute single task |
| `executeParallel()` | `tasks: Array<{description, agent?}>` | `Promise<TaskResult[]>` | Execute tasks in parallel |
| `executeSequential()` | `tasks: Array<{description, agent?}>` | `Promise<TaskResult[]>` | Execute tasks sequentially |
| `delegateTask()` | `taskDescription: string, agentId: string` | `Promise<TaskResult>` | Delegate to specific agent |
| `getTaskStatus()` | `taskId: string` | `Task \| undefined` | Get task status |
| `getAllTasks()` | - | `Task[]` | Get all tasks |
| `getTasksByStatus()` | `status: Task['status']` | `Task[]` | Get tasks by status |
| `executeWorkflow()` | `userId: string, channelType: string, workflowDescription: string` | `Promise<void>` | Execute complex workflow |

---

**Last Updated:** After implementing multi-agent system
**Status:** Production ready
**Version:** 2.0.0
