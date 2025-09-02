/**
 * Example usage of the search functionality
 * This file demonstrates how to use the Elasticsearch integration
 */

import { searchService } from '../services/searchService';
import { UserService } from '../services/userService';
import { logger } from '../utils/logger';

export class SearchUsageExample {
  /**
   * Example: Basic user search
   */
  static async basicUserSearch() {
    try {
      // Initialize search service
      await searchService.initialize();

      // Search for users with a simple text query
      const searchResults = await searchService.searchUsers('john', {
        from: 0,
        size: 10,
        highlight: true,
      });

      logger.info('Basic search results:', {
        totalHits: searchResults.total.value,
        maxScore: searchResults.maxScore,
        results: searchResults.hits.map(hit => ({
          id: hit._id,
          score: hit._score,
          name: hit._source.name,
          email: hit._source.email,
          highlights: hit.highlight,
        })),
      });

      return searchResults;
    } catch (error) {
      logger.error('Basic search failed:', error);
      throw error;
    }
  }

  /**
   * Example: Advanced search with filters
   */
  static async advancedUserSearch() {
    try {
      // Advanced search with multiple filters
      const searchResults = await searchService.advancedSearchUsers({
        query: 'developer',
        email: '@company.com',
        createdAfter: new Date('2024-01-01'),
        createdBefore: new Date('2024-12-31'),
      }, {
        from: 0,
        size: 20,
        sort: [
          { createdAt: { order: 'desc' } },
          { _score: { order: 'desc' } },
        ],
        highlight: true,
      });

      logger.info('Advanced search results:', {
        totalHits: searchResults.total.value,
        results: searchResults.hits.length,
      });

      return searchResults;
    } catch (error) {
      logger.error('Advanced search failed:', error);
      throw error;
    }
  }

  /**
   * Example: Get search suggestions for autocomplete
   */
  static async getUserSuggestions() {
    try {
      // Get name suggestions
      const nameSuggestions = await searchService.suggestUsers('jo', 'name', 5);
      
      // Get email suggestions
      const emailSuggestions = await searchService.suggestUsers('john', 'email', 5);

      logger.info('Search suggestions:', {
        nameSuggestions,
        emailSuggestions,
      });

      return {
        nameSuggestions,
        emailSuggestions,
      };
    } catch (error) {
      logger.error('Getting suggestions failed:', error);
      throw error;
    }
  }

  /**
   * Example: Index management operations
   */
  static async indexManagement() {
    try {
      // Get index statistics
      const stats = await searchService.getIndexStats();
      logger.info('Index statistics:', stats);

      // Refresh the index
      await searchService.refreshIndex();
      logger.info('Index refreshed successfully');

      // Check service health
      const isHealthy = await searchService.isHealthy();
      logger.info('Search service health:', { isHealthy });

      return {
        stats,
        isHealthy,
      };
    } catch (error) {
      logger.error('Index management failed:', error);
      throw error;
    }
  }

  /**
   * Example: Automatic indexing when users are created/updated
   */
  static async demonstrateAutoIndexing() {
    try {
      // Create a new user (this will automatically index the user)
      const newUser = await UserService.createUser({
        email: 'search-demo@example.com',
        name: 'Search Demo User',
      });

      logger.info('User created and automatically indexed:', {
        userId: newUser.id,
        email: newUser.email,
      });

      // Update the user (this will automatically update the search index)
      const updatedUser = await UserService.updateUser(newUser.id, {
        name: 'Updated Search Demo User',
      });

      logger.info('User updated and search index updated:', {
        userId: updatedUser.id,
        newName: updatedUser.name,
      });

      // Search for the user to verify indexing
      const searchResults = await searchService.searchUsers('Search Demo', {
        size: 5,
      });

      logger.info('Search verification:', {
        found: searchResults.hits.length > 0,
        results: searchResults.hits.map(hit => hit._source.name),
      });

      // Clean up - delete the user (this will automatically remove from search index)
      await UserService.deleteUser(newUser.id);
      logger.info('Demo user deleted and removed from search index');

      return {
        created: newUser,
        updated: updatedUser,
        searchResults,
      };
    } catch (error) {
      logger.error('Auto-indexing demonstration failed:', error);
      throw error;
    }
  }

  /**
   * Run all examples
   */
  static async runAllExamples() {
    try {
      logger.info('Starting search functionality examples...');

      await this.basicUserSearch();
      await this.advancedUserSearch();
      await this.getUserSuggestions();
      await this.indexManagement();
      await this.demonstrateAutoIndexing();

      logger.info('All search examples completed successfully');
    } catch (error) {
      logger.error('Search examples failed:', error);
      throw error;
    }
  }
}

// Export for use in other files
export default SearchUsageExample;