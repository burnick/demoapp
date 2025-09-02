#!/usr/bin/env tsx

/**
 * Manual test script for Elasticsearch search functionality
 * Run with: npx tsx scripts/test-search.ts
 */

import { searchService } from '../src/services/searchService';
import { SearchIndexer } from '../src/utils/searchIndexer';
import { logger } from '../src/utils/logger';
import { connectDatabase } from '../src/prisma/client';

async function testSearchFunctionality() {
  try {
    logger.info('Starting search functionality test...');

    // Connect to database
    await connectDatabase();
    logger.info('Database connected');

    // Initialize search service
    await searchService.initialize();
    logger.info('Search service initialized');

    // Check if we need to index existing users
    const needsIndexing = await SearchIndexer.needsInitialIndexing();
    logger.info('Needs initial indexing:', { needsIndexing });

    if (needsIndexing) {
      logger.info('Performing initial indexing...');
      await SearchIndexer.indexAllUsers();
      logger.info('Initial indexing completed');
    }

    // Get index statistics
    const stats = await searchService.getIndexStats();
    logger.info('Index statistics:', {
      documentCount: stats?.docs?.count || 0,
      indexSize: stats?.store?.size_in_bytes || 0,
    });

    // Test basic search
    logger.info('Testing basic search...');
    const searchResults = await searchService.searchUsers('test', {
      size: 5,
      highlight: true,
    });

    logger.info('Search results:', {
      totalHits: searchResults.total.value,
      resultsReturned: searchResults.hits.length,
      maxScore: searchResults.maxScore,
    });

    // Display search results
    searchResults.hits.forEach((hit, index) => {
      logger.info(`Result ${index + 1}:`, {
        id: hit._id,
        score: hit._score,
        name: hit._source.name,
        email: hit._source.email,
        highlights: hit.highlight,
      });
    });

    // Test suggestions
    logger.info('Testing suggestions...');
    const suggestions = await searchService.suggestUsers('te', 'name', 5);
    logger.info('Name suggestions:', { suggestions });

    // Test health check
    const isHealthy = await searchService.isHealthy();
    logger.info('Search service health:', { isHealthy });

    logger.info('Search functionality test completed successfully');
  } catch (error) {
    logger.error('Search functionality test failed:', error);
    process.exit(1);
  }
}

// Run the test
testSearchFunctionality()
  .then(() => {
    logger.info('Test script completed');
    process.exit(0);
  })
  .catch((error) => {
    logger.error('Test script failed:', error);
    process.exit(1);
  });