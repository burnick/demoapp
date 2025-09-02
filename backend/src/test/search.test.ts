import { searchService } from '../services/searchService';
import { elasticsearchConnection } from '../utils/elasticsearch';
import { User } from '@prisma/client';

// Mock user data for testing
const mockUser: User = {
  id: 'test-user-id',
  email: 'test@example.com',
  name: 'Test User',
  password: 'hashed-password',
  createdAt: new Date('2024-01-01T00:00:00Z'),
  updatedAt: new Date('2024-01-01T00:00:00Z'),
};

const mockUser2: User = {
  id: 'test-user-id-2',
  email: 'john@example.com',
  name: 'John Doe',
  password: 'hashed-password',
  createdAt: new Date('2024-01-02T00:00:00Z'),
  updatedAt: new Date('2024-01-02T00:00:00Z'),
};

describe('Search Service', () => {
  beforeAll(async () => {
    // Skip tests if Elasticsearch is not available
    try {
      await elasticsearchConnection.connect();
    } catch (error) {
      console.log('Elasticsearch not available, skipping search tests');
      return;
    }
  });

  afterAll(async () => {
    try {
      await elasticsearchConnection.disconnect();
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  beforeEach(async () => {
    // Skip if Elasticsearch is not available
    if (!elasticsearchConnection.isHealthy()) {
      return;
    }

    try {
      await searchService.initialize();
    } catch (error) {
      // Skip tests if initialization fails
      return;
    }
  });

  describe('Service Initialization', () => {
    it('should initialize successfully', async () => {
      if (!elasticsearchConnection.isHealthy()) {
        console.log('Skipping test: Elasticsearch not available');
        return;
      }

      const isHealthy = await searchService.isHealthy();
      expect(isHealthy).toBe(true);
    });
  });

  describe('User Indexing', () => {
    it('should index a single user', async () => {
      if (!elasticsearchConnection.isHealthy()) {
        console.log('Skipping test: Elasticsearch not available');
        return;
      }

      await expect(searchService.indexUser(mockUser)).resolves.not.toThrow();
    });

    it('should bulk index multiple users', async () => {
      if (!elasticsearchConnection.isHealthy()) {
        console.log('Skipping test: Elasticsearch not available');
        return;
      }

      const users = [mockUser, mockUser2];
      await expect(searchService.bulkIndexUsers(users)).resolves.not.toThrow();
    });

    it('should update a user document', async () => {
      if (!elasticsearchConnection.isHealthy()) {
        console.log('Skipping test: Elasticsearch not available');
        return;
      }

      // First index the user
      await searchService.indexUser(mockUser);

      // Then update it
      const updatedUser = { ...mockUser, name: 'Updated Test User' };
      await expect(searchService.updateUser(updatedUser)).resolves.not.toThrow();
    });

    it('should delete a user document', async () => {
      if (!elasticsearchConnection.isHealthy()) {
        console.log('Skipping test: Elasticsearch not available');
        return;
      }

      // First index the user
      await searchService.indexUser(mockUser);

      // Then delete it
      await expect(searchService.deleteUser(mockUser.id)).resolves.not.toThrow();
    });
  });

  describe('User Search', () => {
    beforeEach(async () => {
      if (!elasticsearchConnection.isHealthy()) {
        return;
      }

      // Index test users
      await searchService.bulkIndexUsers([mockUser, mockUser2]);
      
      // Wait a bit for indexing to complete
      await new Promise(resolve => setTimeout(resolve, 1000));
    });

    it('should search users by name', async () => {
      if (!elasticsearchConnection.isHealthy()) {
        console.log('Skipping test: Elasticsearch not available');
        return;
      }

      const result = await searchService.searchUsers('Test');
      
      expect(result.hits).toBeDefined();
      expect(result.total).toBeDefined();
      expect(result.maxScore).toBeDefined();
    });

    it('should search users by email', async () => {
      if (!elasticsearchConnection.isHealthy()) {
        console.log('Skipping test: Elasticsearch not available');
        return;
      }

      const result = await searchService.searchUsers('test@example.com');
      
      expect(result.hits).toBeDefined();
      expect(result.total).toBeDefined();
    });

    it('should perform advanced search with filters', async () => {
      if (!elasticsearchConnection.isHealthy()) {
        console.log('Skipping test: Elasticsearch not available');
        return;
      }

      const result = await searchService.advancedSearchUsers({
        query: 'Test',
        createdAfter: new Date('2023-12-31'),
      });
      
      expect(result.hits).toBeDefined();
      expect(result.total).toBeDefined();
    });

    it('should provide user suggestions', async () => {
      if (!elasticsearchConnection.isHealthy()) {
        console.log('Skipping test: Elasticsearch not available');
        return;
      }

      const suggestions = await searchService.suggestUsers('Te', 'name', 5);
      
      expect(Array.isArray(suggestions)).toBe(true);
    });
  });

  describe('Index Management', () => {
    it('should get index statistics', async () => {
      if (!elasticsearchConnection.isHealthy()) {
        console.log('Skipping test: Elasticsearch not available');
        return;
      }

      const stats = await searchService.getIndexStats();
      expect(stats).toBeDefined();
    });

    it('should refresh the index', async () => {
      if (!elasticsearchConnection.isHealthy()) {
        console.log('Skipping test: Elasticsearch not available');
        return;
      }

      await expect(searchService.refreshIndex()).resolves.not.toThrow();
    });
  });
});