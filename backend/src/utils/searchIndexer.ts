import { prisma } from '../prisma/client';
import { searchService } from '../services/searchService';
import { logger } from './logger';

/**
 * Utility for managing search index operations
 */
export class SearchIndexer {
  /**
   * Index all existing users in the database
   * This should be called when setting up the search service for the first time
   */
  static async indexAllUsers(): Promise<void> {
    try {
      logger.info('Starting bulk indexing of all users');
      
      const batchSize = 100;
      let offset = 0;
      let totalIndexed = 0;

      while (true) {
        // Fetch users in batches
        const users = await prisma.user.findMany({
          skip: offset,
          take: batchSize,
          orderBy: { createdAt: 'asc' },
        });

        if (users.length === 0) {
          break;
        }

        // Index the batch
        await searchService.bulkIndexUsers(users);
        totalIndexed += users.length;
        offset += batchSize;

        logger.info(`Indexed ${users.length} users (total: ${totalIndexed})`);
      }

      logger.info(`Bulk indexing completed. Total users indexed: ${totalIndexed}`);
    } catch (error) {
      logger.error('Failed to bulk index users:', error);
      throw error;
    }
  }

  /**
   * Re-index all users (useful for schema changes or data corruption recovery)
   */
  static async reindexAllUsers(): Promise<void> {
    try {
      logger.info('Starting re-indexing of all users');
      
      // First, refresh the index to ensure we're working with the latest data
      await searchService.refreshIndex();
      
      // Then index all users
      await this.indexAllUsers();
      
      logger.info('Re-indexing completed successfully');
    } catch (error) {
      logger.error('Failed to re-index users:', error);
      throw error;
    }
  }

  /**
   * Check if the search index is empty and needs initial population
   */
  static async needsInitialIndexing(): Promise<boolean> {
    try {
      // Get the total number of users in the database
      const dbUserCount = await prisma.user.count();
      
      if (dbUserCount === 0) {
        return false; // No users to index
      }

      // Get the number of documents in the search index
      const indexStats = await searchService.getIndexStats();
      const indexedCount = indexStats?.docs?.count || 0;

      // If there are users in the database but none in the index, we need initial indexing
      return indexedCount === 0;
    } catch (error) {
      logger.error('Failed to check if initial indexing is needed:', error);
      // If we can't check, assume we need indexing to be safe
      return true;
    }
  }

  /**
   * Perform initial setup of the search index if needed
   */
  static async initializeSearchIndex(): Promise<void> {
    try {
      const needsIndexing = await this.needsInitialIndexing();
      
      if (needsIndexing) {
        logger.info('Search index appears to be empty, performing initial indexing');
        await this.indexAllUsers();
      } else {
        logger.info('Search index already contains data, skipping initial indexing');
      }
    } catch (error) {
      logger.error('Failed to initialize search index:', error);
      throw error;
    }
  }
}