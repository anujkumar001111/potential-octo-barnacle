import { describe, it, expect, beforeEach, afterEach} from '@jest/globals';
import path from 'path';
import fs from 'fs-extra';
import { taskCheckpointManager, type Checkpoint } from '../electron/main/services/task-checkpoint';

describe('TaskCheckpointManager', () => {
  const testCheckpointsDir = path.join(__dirname, 'test-checkpoints');
  const testTaskId = 'test_task_' + Date.now();

  beforeEach(async () => {
    // Ensure test directory exists
    await fs.ensureDir(testCheckpointsDir);
    // Override checkpoint directory for testing
    process.env.CHECKPOINT_DIR = testCheckpointsDir;
  });

  afterEach(async () => {
    // Clean up test checkpoints
    if (await fs.pathExists(testCheckpointsDir)) {
      await fs.remove(testCheckpointsDir);
    }
  });

  describe('createCheckpoint', () => {
    it('should create a new checkpoint with initial state', async () => {
      const workflowXml = '<root><name>Test Workflow</name></root>';
      const checkpoint = await taskCheckpointManager.createCheckpoint(
        testTaskId,
        workflowXml,
        0,
        [],
        { variables: {}, sessionState: {} },
        { variables: {} },
        { iteration: 0, totalIterations: 10 }
      );

      expect(checkpoint).toBeDefined();
      expect(checkpoint.taskId).toBe(testTaskId);
      expect(checkpoint.status).toBe('in_progress');
      expect(checkpoint.currentNodeIndex).toBe(0);
      expect(checkpoint.workflowXml).toBe(workflowXml);
      expect(checkpoint.retryCount).toBe(0);
    });

    it('should include metadata in checkpoint', async () => {
      const metadata = { iteration: 5, totalIterations: 20, toolResults: [] };
      const checkpoint = await taskCheckpointManager.createCheckpoint(
        testTaskId,
        '<root></root>',
        5,
        ['node1', 'node2'],
        { variables: {}, sessionState: {} },
        { variables: {} },
        metadata
      );

      expect(checkpoint.iteration).toBe(5);
      expect(checkpoint.totalIterations).toBe(20);
      expect(checkpoint.completedNodes).toEqual(['node1', 'node2']);
    });
  });

  describe('persistCheckpoint', () => {
    it('should persist checkpoint to disk', async () => {
      const checkpoint: Checkpoint = {
        id: 'cp_test_' + Date.now(),
        taskId: testTaskId,
        timestamp: Date.now(),
        status: 'in_progress',
        workflowXml: '<root></root>',
        currentNodeIndex: 0,
        completedNodes: [],
        agentContext: { variables: {}, sessionState: {} },
        globalContext: { variables: {} },
        iteration: 0,
        totalIterations: 10,
        toolResults: [],
        retryCount: 0,
      };

      await taskCheckpointManager.persistCheckpoint(checkpoint);

      const filePath = path.join(testCheckpointsDir, `${testTaskId}.json`);
      expect(await fs.pathExists(filePath)).toBe(true);

      const savedData = await fs.readJson(filePath);
      expect(savedData.id).toBe(checkpoint.id);
      expect(savedData.taskId).toBe(testTaskId);
      expect(savedData.status).toBe('in_progress');
    });

    it('should overwrite existing checkpoint file', async () => {
      const checkpoint1: Checkpoint = {
        id: 'cp_1',
        taskId: testTaskId,
        timestamp: Date.now(),
        status: 'in_progress',
        workflowXml: '<root>v1</root>',
        currentNodeIndex: 0,
        completedNodes: [],
        agentContext: { variables: {}, sessionState: {} },
        globalContext: { variables: {} },
        iteration: 0,
        totalIterations: 10,
        toolResults: [],
        retryCount: 0,
      };

      const checkpoint2: Checkpoint = {
        ...checkpoint1,
        id: 'cp_2',
        currentNodeIndex: 5,
        workflowXml: '<root>v2</root>',
      };

      await taskCheckpointManager.persistCheckpoint(checkpoint1);
      await taskCheckpointManager.persistCheckpoint(checkpoint2);

      const filePath = path.join(testCheckpointsDir, `${testTaskId}.json`);
      const savedData = await fs.readJson(filePath);
      expect(savedData.id).toBe('cp_2');
      expect(savedData.currentNodeIndex).toBe(5);
    });
  });

  describe('loadCheckpoint', () => {
    it('should load checkpoint from disk', async () => {
      const checkpoint: Checkpoint = {
        id: 'cp_load_test',
        taskId: testTaskId,
        timestamp: Date.now(),
        status: 'paused',
        workflowXml: '<root><name>Loaded</name></root>',
        currentNodeIndex: 3,
        completedNodes: ['node1', 'node2', 'node3'],
        agentContext: { variables: { key: 'value' }, sessionState: {} },
        globalContext: { variables: { global: 'state' } },
        iteration: 3,
        totalIterations: 10,
        toolResults: [{ toolName: 'tool1', params: {}, result: 'result1', timestamp: Date.now() }],
        retryCount: 1,
      };

      await taskCheckpointManager.persistCheckpoint(checkpoint);
      const loaded = await taskCheckpointManager.loadCheckpoint(testTaskId);

      expect(loaded).toBeDefined();
      expect(loaded!.id).toBe(checkpoint.id);
      expect(loaded!.currentNodeIndex).toBe(3);
      expect(loaded!.agentContext.variables).toEqual({ key: 'value' });
      expect(loaded!.completedNodes).toEqual(['node1', 'node2', 'node3']);
    });

    it('should return null for non-existent checkpoint', async () => {
      const loaded = await taskCheckpointManager.loadCheckpoint('non_existent_task');
      expect(loaded).toBeNull();
    });
  });

  describe('updateCheckpoint', () => {
    it('should update checkpoint with new state', async () => {
      const original = await taskCheckpointManager.createCheckpoint(
        testTaskId,
        '<root></root>',
        0,
        [],
        { variables: {}, sessionState: {} },
        { variables: {} },
        { iteration: 0, totalIterations: 10 }
      );

      await taskCheckpointManager.updateCheckpoint(testTaskId, {
        currentNodeIndex: 5,
        completedNodes: ['n1', 'n2', 'n3', 'n4', 'n5'],
        iteration: 5,
      });

      const updated = await taskCheckpointManager.loadCheckpoint(testTaskId);
      expect(updated!.currentNodeIndex).toBe(5);
      expect(updated!.completedNodes).toEqual(['n1', 'n2', 'n3', 'n4', 'n5']);
      expect(updated!.iteration).toBe(5);
    });
  });

  describe('pauseCheckpoint', () => {
    it('should mark checkpoint as paused', async () => {
      await taskCheckpointManager.createCheckpoint(
        testTaskId,
        '<root></root>',
        2,
        ['n1', 'n2'],
        { variables: {}, sessionState: {} },
        { variables: {} },
        { iteration: 2, totalIterations: 10 }
      );

      await taskCheckpointManager.pauseCheckpoint(testTaskId);
      const checkpoint = await taskCheckpointManager.loadCheckpoint(testTaskId);

      expect(checkpoint!.status).toBe('paused');
    });
  });

  describe('failCheckpoint', () => {
    it('should mark checkpoint as failed with error details', async () => {
      await taskCheckpointManager.createCheckpoint(
        testTaskId,
        '<root></root>',
        1,
        ['n1'],
        { variables: {}, sessionState: {} },
        { variables: {} },
        { iteration: 1, totalIterations: 10 }
      );

      const error = { message: 'Network timeout', code: 'NET_TIMEOUT' };
      await taskCheckpointManager.failCheckpoint(testTaskId, error, 'tool_navigate_to');

      const checkpoint = await taskCheckpointManager.loadCheckpoint(testTaskId);
      expect(checkpoint!.status).toBe('failed');
      expect(checkpoint!.error).toEqual(error);
      expect(checkpoint!.failurePoint).toBe('tool_navigate_to');
    });

    it('should increment retry count on failure', async () => {
      await taskCheckpointManager.createCheckpoint(
        testTaskId,
        '<root></root>',
        0,
        [],
        { variables: {}, sessionState: {} },
        { variables: {} },
        { iteration: 0, totalIterations: 10 }
      );

      const error = { message: 'Error 1', code: 'ERR_1' };
      await taskCheckpointManager.failCheckpoint(testTaskId, error, 'point1');

      let checkpoint = await taskCheckpointManager.loadCheckpoint(testTaskId);
      expect(checkpoint!.retryCount).toBe(1);

      const error2 = { message: 'Error 2', code: 'ERR_2' };
      await taskCheckpointManager.failCheckpoint(testTaskId, error2, 'point2');

      checkpoint = await taskCheckpointManager.loadCheckpoint(testTaskId);
      expect(checkpoint!.retryCount).toBe(2);
    });
  });

  describe('completeCheckpoint', () => {
    it('should mark checkpoint as completed', async () => {
      await taskCheckpointManager.createCheckpoint(
        testTaskId,
        '<root></root>',
        10,
        ['n1', 'n2', 'n3', 'n4', 'n5', 'n6', 'n7', 'n8', 'n9', 'n10'],
        { variables: {}, sessionState: {} },
        { variables: {} },
        { iteration: 10, totalIterations: 10 }
      );

      const result = { success: true, data: 'Task completed' };
      await taskCheckpointManager.completeCheckpoint(testTaskId, result);

      const checkpoint = await taskCheckpointManager.loadCheckpoint(testTaskId);
      expect(checkpoint!.status).toBe('completed');
    });
  });

  describe('getCheckpointStatus', () => {
    it('should return correct status information', async () => {
      await taskCheckpointManager.createCheckpoint(
        testTaskId,
        '<root></root>',
        3,
        ['n1', 'n2', 'n3'],
        { variables: {}, sessionState: {} },
        { variables: {} },
        { iteration: 3, totalIterations: 10 }
      );

      const status = await taskCheckpointManager.getCheckpointStatus(testTaskId);

      expect(status.exists).toBe(true);
      expect(status.status).toBe('in_progress');
      expect(status.iteration).toBe(3);
    });

    it('should return exists:false for non-existent checkpoint', async () => {
      const status = await taskCheckpointManager.getCheckpointStatus('non_existent');
      expect(status.exists).toBe(false);
    });
  });

  describe('listCheckpoints', () => {
    it('should list all saved checkpoints', async () => {
      const taskId1 = 'task_1_' + Date.now();
      const taskId2 = 'task_2_' + Date.now();

      await taskCheckpointManager.createCheckpoint(
        taskId1,
        '<root></root>',
        0,
        [],
        { variables: {}, sessionState: {} },
        { variables: {} },
        { iteration: 0, totalIterations: 10 }
      );

      await taskCheckpointManager.createCheckpoint(
        taskId2,
        '<root></root>',
        5,
        [],
        { variables: {}, sessionState: {} },
        { variables: {} },
        { iteration: 5, totalIterations: 20 }
      );

      const checkpoints = await taskCheckpointManager.listCheckpoints();

      expect(checkpoints.length).toBeGreaterThanOrEqual(2);
      const ids = checkpoints.map(cp => cp.taskId);
      expect(ids).toContain(taskId1);
      expect(ids).toContain(taskId2);
    });

    it('should return empty array when no checkpoints exist', async () => {
      const tempDir = path.join(__dirname, 'empty-checkpoints');
      await fs.remove(tempDir);
      await fs.ensureDir(tempDir);
      process.env.CHECKPOINT_DIR = tempDir;

      const checkpoints = await taskCheckpointManager.listCheckpoints();
      expect(Array.isArray(checkpoints)).toBe(true);
      expect(checkpoints.length).toBe(0);

      await fs.remove(tempDir);
    });
  });

  describe('deleteCheckpoint', () => {
    it('should delete checkpoint file', async () => {
      await taskCheckpointManager.createCheckpoint(
        testTaskId,
        '<root></root>',
        0,
        [],
        { variables: {}, sessionState: {} },
        { variables: {} },
        { iteration: 0, totalIterations: 10 }
      );

      const filePath = path.join(testCheckpointsDir, `${testTaskId}.json`);
      expect(await fs.pathExists(filePath)).toBe(true);

      await taskCheckpointManager.deleteCheckpoint(testTaskId);

      expect(await fs.pathExists(filePath)).toBe(false);
    });

    it('should not throw error when deleting non-existent checkpoint', async () => {
      await expect(
        taskCheckpointManager.deleteCheckpoint('non_existent_task')
      ).resolves.not.toThrow();
    });
  });

  describe('cleanupOldCheckpoints', () => {
    it('should delete checkpoints older than specified age', async () => {
      const oldTaskId = 'old_task_' + Date.now();
      const newTaskId = 'new_task_' + Date.now();

      // Create old checkpoint
      const oldCheckpoint: Checkpoint = {
        id: 'cp_old',
        taskId: oldTaskId,
        timestamp: Date.now() - 10 * 24 * 60 * 60 * 1000, // 10 days ago
        status: 'completed',
        workflowXml: '<root></root>',
        currentNodeIndex: 10,
        completedNodes: [],
        agentContext: { variables: {}, sessionState: {} },
        globalContext: { variables: {} },
        iteration: 10,
        totalIterations: 10,
        toolResults: [],
        retryCount: 0,
      };

      // Create new checkpoint
      const newCheckpoint: Checkpoint = {
        id: 'cp_new',
        taskId: newTaskId,
        timestamp: Date.now(),
        status: 'completed',
        workflowXml: '<root></root>',
        currentNodeIndex: 10,
        completedNodes: [],
        agentContext: { variables: {}, sessionState: {} },
        globalContext: { variables: {} },
        iteration: 10,
        totalIterations: 10,
        toolResults: [],
        retryCount: 0,
      };

      await taskCheckpointManager.persistCheckpoint(oldCheckpoint);
      await taskCheckpointManager.persistCheckpoint(newCheckpoint);

      // Cleanup checkpoints older than 7 days
      await taskCheckpointManager.cleanupOldCheckpoints(7 * 24 * 60 * 60 * 1000);

      const oldPath = path.join(testCheckpointsDir, `${oldTaskId}.json`);
      const newPath = path.join(testCheckpointsDir, `${newTaskId}.json`);

      expect(await fs.pathExists(oldPath)).toBe(false);
      expect(await fs.pathExists(newPath)).toBe(true);
    });
  });

  describe('getRecoverySummary', () => {
    it('should provide recovery information for paused checkpoint', async () => {
      await taskCheckpointManager.createCheckpoint(
        testTaskId,
        '<workflow><node id="n1"/><node id="n2"/><node id="n3"/></workflow>',
        2,
        ['n1', 'n2'],
        { variables: { key: 'value' }, sessionState: {} },
        { variables: {} },
        { iteration: 2, totalIterations: 3 }
      );

      await taskCheckpointManager.pauseCheckpoint(testTaskId);

      const summary = await taskCheckpointManager.getRecoverySummary(testTaskId);

      expect(summary).toBeDefined();
      expect(summary!.canRecover).toBe(true);
      expect(summary!.progress).toBe(66); // 2/3
      expect(summary!.estimatedTokensSaved).toBeGreaterThan(0);
    });

    it('should indicate recovery possible from failed checkpoint', async () => {
      await taskCheckpointManager.createCheckpoint(
        testTaskId,
        '<root></root>',
        1,
        ['n1'],
        { variables: {}, sessionState: {} },
        { variables: {} },
        { iteration: 1, totalIterations: 5 }
      );

      await taskCheckpointManager.failCheckpoint(
        testTaskId,
        { message: 'Test error', code: 'TEST_ERROR' },
        'test_point'
      );

      const summary = await taskCheckpointManager.getRecoverySummary(testTaskId);

      expect(summary).toBeDefined();
      expect(summary!.canRecover).toBe(true);
      expect(summary!.failureReason).toContain('Test error');
    });

    it('should indicate no recovery from completed checkpoint', async () => {
      await taskCheckpointManager.createCheckpoint(
        testTaskId,
        '<root></root>',
        5,
        [],
        { variables: {}, sessionState: {} },
        { variables: {} },
        { iteration: 5, totalIterations: 5 }
      );

      await taskCheckpointManager.completeCheckpoint(testTaskId, { success: true });

      const summary = await taskCheckpointManager.getRecoverySummary(testTaskId);

      expect(summary).toBeDefined();
      expect(summary!.canRecover).toBe(false);
    });

    it('should return null for non-existent checkpoint', async () => {
      const summary = await taskCheckpointManager.getRecoverySummary('non_existent');
      expect(summary).toBeNull();
    });
  });

  describe('serialization and deserialization', () => {
    it('should correctly serialize and restore complex context', async () => {
      const complexContext = {
        variables: {
          url: 'https://example.com',
          count: 42,
          nested: { key: 'value', array: [1, 2, 3] },
        },
        sessionState: {
          cookies: ['session=abc123'],
          headers: { authorization: 'Bearer token' },
        },
      };

      const checkpoint = await taskCheckpointManager.createCheckpoint(
        testTaskId,
        '<root></root>',
        0,
        [],
        complexContext,
        { variables: { global: 'data' } },
        { iteration: 0, totalIterations: 10 }
      );

      await taskCheckpointManager.persistCheckpoint(checkpoint);
      const loaded = await taskCheckpointManager.loadCheckpoint(testTaskId);

      expect(loaded!.agentContext).toEqual(complexContext);
      expect(loaded!.globalContext.variables).toEqual({ global: 'data' });
    });
  });
});
