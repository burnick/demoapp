import { cacheService } from '../services/cacheService';
import { sessionService } from '../services/sessionService';
import { redisConnection } from '../utils/redis';

// Mock Redis for testing
jest.mock('../utils/redis', () => ({
  redisConnection: {
    connect: jest.fn().mockResolvedValue({
      get: jest.fn(),
      set: jest.fn(),
      setEx: jest.fn(),
      del: jest.fn(),
      exists: jest.fn(),
      expire: jest.fn(),
      mGet: jest.fn(),
      mSet: jest.fn(),
      keys: jest.fn(),
      flushDb: jest.fn(),
      ping: jest.fn().mockResolvedValue('PONG'),
    }),
    disconnect: jest.fn(),
    ping: jest.fn().mockResolvedValue(true),
    isClientConnected: jest.fn().mockReturnValue(true),
    getClient: jest.fn(),
  },
}));

describe('Cache Service', () => {
  let mockClient: any;

  beforeEach(async () => {
    // Reset mocks
    jest.clearAllMocks();
    
    // Setup mock client
    mockClient = {
      get: jest.fn(),
      set: jest.fn(),
      setEx: jest.fn(),
      del: jest.fn(),
      exists: jest.fn(),
      expire: jest.fn(),
      mGet: jest.fn(),
      mSet: jest.fn(),
      keys: jest.fn(),
      flushDb: jest.fn(),
      ping: jest.fn().mockResolvedValue('PONG'),
    };

    (redisConnection.connect as jest.Mock).mockResolvedValue(mockClient);
    
    // Initialize cache service
    await cacheService.initialize();
  });

  describe('Basic Operations', () => {
    it('should set and get a value', async () => {
      const testKey = 'test-key';
      const testValue = { message: 'Hello, World!' };

      mockClient.get.mockResolvedValue(JSON.stringify(testValue));
      mockClient.set.mockResolvedValue('OK');

      // Set value
      const setResult = await cacheService.set(testKey, testValue);
      expect(setResult).toBe(true);
      expect(mockClient.set).toHaveBeenCalledWith(testKey, JSON.stringify(testValue));

      // Get value
      const getValue = await cacheService.get(testKey);
      expect(getValue).toEqual(testValue);
      expect(mockClient.get).toHaveBeenCalledWith(testKey);
    });

    it('should set a value with TTL', async () => {
      const testKey = 'test-key-ttl';
      const testValue = { message: 'Hello with TTL!' };
      const ttl = 300;

      mockClient.setEx.mockResolvedValue('OK');

      const result = await cacheService.set(testKey, testValue, { ttl });
      expect(result).toBe(true);
      expect(mockClient.setEx).toHaveBeenCalledWith(testKey, ttl, JSON.stringify(testValue));
    });

    it('should delete a value', async () => {
      const testKey = 'test-key-delete';

      mockClient.del.mockResolvedValue(1);

      const result = await cacheService.delete(testKey);
      expect(result).toBe(true);
      expect(mockClient.del).toHaveBeenCalledWith(testKey);
    });

    it('should check if a key exists', async () => {
      const testKey = 'test-key-exists';

      mockClient.exists.mockResolvedValue(1);

      const result = await cacheService.exists(testKey);
      expect(result).toBe(true);
      expect(mockClient.exists).toHaveBeenCalledWith(testKey);
    });

    it('should handle cache miss', async () => {
      const testKey = 'non-existent-key';

      mockClient.get.mockResolvedValue(null);

      const result = await cacheService.get(testKey);
      expect(result).toBeNull();
    });
  });

  describe('Prefix Operations', () => {
    it('should use prefix for keys', async () => {
      const testKey = 'test-key';
      const testValue = { message: 'Prefixed value' };
      const prefix = 'test-prefix';

      mockClient.get.mockResolvedValue(JSON.stringify(testValue));
      mockClient.set.mockResolvedValue('OK');

      await cacheService.set(testKey, testValue, { prefix });
      expect(mockClient.set).toHaveBeenCalledWith(`${prefix}:${testKey}`, JSON.stringify(testValue));

      await cacheService.get(testKey, { prefix });
      expect(mockClient.get).toHaveBeenCalledWith(`${prefix}:${testKey}`);
    });
  });

  describe('Batch Operations', () => {
    it('should get multiple values', async () => {
      const keys = ['key1', 'key2', 'key3'];
      const values = ['value1', 'value2', null];

      mockClient.mGet.mockResolvedValue([
        JSON.stringify('value1'),
        JSON.stringify('value2'),
        null,
      ]);

      const result = await cacheService.mget(keys);
      expect(result).toEqual(['value1', 'value2', null]);
      expect(mockClient.mGet).toHaveBeenCalledWith(keys);
    });

    it('should set multiple values', async () => {
      const keyValuePairs = [
        { key: 'key1', value: 'value1' },
        { key: 'key2', value: 'value2' },
      ];

      mockClient.mSet.mockResolvedValue('OK');

      const result = await cacheService.mset(keyValuePairs);
      expect(result).toBe(true);
      expect(mockClient.mSet).toHaveBeenCalledWith([
        'key1', JSON.stringify('value1'),
        'key2', JSON.stringify('value2'),
      ]);
    });

    it('should delete multiple values', async () => {
      const keys = ['key1', 'key2', 'key3'];

      mockClient.del.mockResolvedValue(2);

      const result = await cacheService.mdel(keys);
      expect(result).toBe(2);
      expect(mockClient.del).toHaveBeenCalledWith(keys);
    });
  });

  describe('Statistics', () => {
    beforeEach(() => {
      // Reset statistics before each test
      cacheService.resetStats();
    });

    it('should track cache statistics', async () => {
      mockClient.get.mockResolvedValueOnce(JSON.stringify('hit')).mockResolvedValueOnce(null);
      mockClient.set.mockResolvedValue('OK');

      // Cache hit
      await cacheService.get('key1');
      // Cache miss
      await cacheService.get('key2');
      // Cache set
      await cacheService.set('key3', 'value3');

      const stats = cacheService.getStats();
      expect(stats.hits).toBe(1);
      expect(stats.misses).toBe(1);
      expect(stats.sets).toBe(1);
    });

    it('should calculate hit ratio', async () => {
      mockClient.get.mockResolvedValueOnce(JSON.stringify('hit')).mockResolvedValueOnce(null);

      await cacheService.get('key1'); // hit
      await cacheService.get('key2'); // miss

      const hitRatio = cacheService.getHitRatio();
      expect(hitRatio).toBe(0.5);
    });
  });

  describe('Health Check', () => {
    it('should check if cache is healthy', async () => {
      const isHealthy = await cacheService.isHealthy();
      expect(isHealthy).toBe(true);
      expect(redisConnection.ping).toHaveBeenCalled();
    });
  });
});

describe('Session Service', () => {
  let mockClient: any;

  beforeEach(async () => {
    jest.clearAllMocks();
    
    mockClient = {
      get: jest.fn(),
      set: jest.fn(),
      setEx: jest.fn(),
      del: jest.fn(),
      exists: jest.fn(),
      expire: jest.fn(),
      mGet: jest.fn(),
      mSet: jest.fn(),
      keys: jest.fn(),
      flushDb: jest.fn(),
      ping: jest.fn().mockResolvedValue('PONG'),
    };

    (redisConnection.connect as jest.Mock).mockResolvedValue(mockClient);
    await cacheService.initialize();
  });

  describe('Session Management', () => {
    it('should create a new session', async () => {
      const userId = 'user123';
      const sessionData = {
        email: 'test@example.com',
        name: 'Test User',
        ipAddress: '127.0.0.1',
      };

      mockClient.set.mockResolvedValue('OK');
      mockClient.setEx.mockResolvedValue('OK');
      mockClient.get.mockResolvedValue(JSON.stringify([])); // For user sessions list

      const sessionId = await sessionService.createSession(userId, sessionData);
      
      expect(sessionId).toBeDefined();
      expect(typeof sessionId).toBe('string');
      expect(sessionId.length).toBe(64); // 32 bytes = 64 hex chars
    });

    it('should get session data', async () => {
      const sessionId = 'test-session-id';
      const sessionData = {
        userId: 'user123',
        email: 'test@example.com',
        name: 'Test User',
        createdAt: new Date(),
        lastAccessedAt: new Date(),
      };

      mockClient.get
        .mockResolvedValueOnce(JSON.stringify(sessionData)) // First call for getSession
        .mockResolvedValueOnce(JSON.stringify([])); // Second call for renewUserSession
      mockClient.setEx.mockResolvedValue('OK');

      const result = await sessionService.getSession(sessionId);
      
      expect(result).toBeDefined();
      expect(result?.userId).toBe(sessionData.userId);
      expect(result?.email).toBe(sessionData.email);
    });

    it('should delete a session', async () => {
      const sessionId = 'test-session-id';
      const sessionData = {
        userId: 'user123',
        email: 'test@example.com',
        name: 'Test User',
        createdAt: new Date(),
        lastAccessedAt: new Date(),
      };

      mockClient.get
        .mockResolvedValueOnce(JSON.stringify(sessionData)) // First call for deleteSession
        .mockResolvedValueOnce(JSON.stringify([])); // Second call for removeSessionFromUser
      mockClient.del.mockResolvedValue(1);

      const result = await sessionService.deleteSession(sessionId);
      expect(result).toBe(true);
    });

    it('should validate session existence', async () => {
      const sessionId = 'test-session-id';

      mockClient.exists.mockResolvedValue(1);

      const isValid = await sessionService.isValidSession(sessionId);
      expect(isValid).toBe(true);
    });

    it('should extend session TTL', async () => {
      const sessionId = 'test-session-id';
      const ttl = 3600;
      const sessionData = {
        userId: 'user123',
        email: 'test@example.com',
        name: 'Test User',
        createdAt: new Date(),
        lastAccessedAt: new Date(),
      };

      mockClient.expire.mockResolvedValue(true);
      mockClient.get
        .mockResolvedValueOnce(JSON.stringify(sessionData)) // First call for extendSession
        .mockResolvedValueOnce(JSON.stringify([])); // Second call for renewUserSession

      const result = await sessionService.extendSession(sessionId, ttl);
      expect(result).toBe(true);
      expect(mockClient.expire).toHaveBeenCalledWith(`session:${sessionId}`, ttl);
    });
  });

  describe('User Session Management', () => {
    it('should get user sessions', async () => {
      const userId = 'user123';
      const sessions = ['session1', 'session2', 'session3'];

      mockClient.get.mockResolvedValue(JSON.stringify(sessions));

      const result = await sessionService.getUserSessions(userId);
      expect(result).toEqual(sessions);
    });

    it('should delete all user sessions', async () => {
      const userId = 'user123';
      const sessions = ['session1', 'session2'];

      mockClient.get.mockResolvedValue(JSON.stringify(sessions));
      mockClient.del.mockResolvedValue(2);

      const deletedCount = await sessionService.deleteUserSessions(userId);
      expect(deletedCount).toBe(2);
    });
  });
});