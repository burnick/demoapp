import { Client } from '@elastic/elasticsearch';
import { elasticsearchConnection } from '../utils/elasticsearch';
import { logger } from '../utils/logger';
import { User } from '@prisma/client';

export interface SearchOptions {
  from?: number | undefined;
  size?: number | undefined;
  sort?: Array<{ [key: string]: { order: 'asc' | 'desc' } }> | undefined;
  highlight?: boolean | undefined;
}

export interface SearchResult<T> {
  hits: Array<{
    _id: string;
    _score: number;
    _source: T;
    highlight?: Record<string, string[]> | undefined;
  }>;
  total: {
    value: number;
    relation: 'eq' | 'gte';
  };
  maxScore: number | null | undefined;
}

export interface UserSearchDocument {
  id: string;
  email: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

class SearchService {
  private client: Client | null = null;
  private readonly userIndex = 'users';

  async initialize(): Promise<void> {
    try {
      this.client = await elasticsearchConnection.connect();
      await this.createUserIndex();
      logger.info('Search service initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize search service:', error);
      throw error;
    }
  }

  private ensureClient(): Client {
    if (!this.client) {
      throw new Error('Search service not initialized. Call initialize() first.');
    }
    return this.client;
  }

  /**
   * Create user index with proper mapping
   */
  private async createUserIndex(): Promise<void> {
    try {
      const client = this.ensureClient();
      
      // Check if index already exists
      const indexExists = await client.indices.exists({
        index: this.userIndex,
      });

      if (indexExists) {
        logger.info(`Index ${this.userIndex} already exists`);
        return;
      }

      // Create index with mapping
      await client.indices.create({
        index: this.userIndex,
        body: {
          settings: {
            number_of_shards: 1,
            number_of_replicas: 0,
            analysis: {
              analyzer: {
                email_analyzer: {
                  type: 'custom',
                  tokenizer: 'keyword',
                  filter: ['lowercase'],
                },
                name_analyzer: {
                  type: 'custom',
                  tokenizer: 'standard',
                  filter: ['lowercase', 'asciifolding'],
                },
              },
            },
          },
          mappings: {
            properties: {
              id: {
                type: 'keyword',
              },
              email: {
                type: 'text',
                analyzer: 'email_analyzer',
                fields: {
                  keyword: {
                    type: 'keyword',
                  },
                  suggest: {
                    type: 'completion',
                  },
                },
              },
              name: {
                type: 'text',
                analyzer: 'name_analyzer',
                fields: {
                  keyword: {
                    type: 'keyword',
                  },
                  suggest: {
                    type: 'completion',
                  },
                },
              },
              createdAt: {
                type: 'date',
              },
              updatedAt: {
                type: 'date',
              },
            },
          },
        },
      });

      logger.info(`Index ${this.userIndex} created successfully`);
    } catch (error) {
      logger.error(`Failed to create index ${this.userIndex}:`, error);
      throw error;
    }
  }

  /**
   * Index a single user document
   */
  async indexUser(user: User): Promise<void> {
    try {
      const client = this.ensureClient();
      
      const document: UserSearchDocument = {
        id: user.id,
        email: user.email,
        name: user.name,
        createdAt: user.createdAt.toISOString(),
        updatedAt: user.updatedAt.toISOString(),
      };

      await client.index({
        index: this.userIndex,
        id: user.id,
        body: document,
        refresh: 'wait_for',
      });

      logger.debug('User indexed successfully', { userId: user.id });
    } catch (error) {
      logger.error('Failed to index user:', error, { userId: user.id });
      throw error;
    }
  }

  /**
   * Index multiple users in bulk
   */
  async bulkIndexUsers(users: User[]): Promise<void> {
    try {
      if (users.length === 0) {
        return;
      }

      const client = this.ensureClient();
      const body: any[] = [];

      users.forEach(user => {
        // Add index operation
        body.push({
          index: {
            _index: this.userIndex,
            _id: user.id,
          },
        });

        // Add document
        body.push({
          id: user.id,
          email: user.email,
          name: user.name,
          createdAt: user.createdAt.toISOString(),
          updatedAt: user.updatedAt.toISOString(),
        });
      });

      const response = await client.bulk({
        body,
        refresh: 'wait_for',
      });

      if (response.errors) {
        const errorItems = response.items?.filter(item => 
          item.index?.error || item.create?.error || item.update?.error || item.delete?.error
        );
        logger.error('Bulk indexing had errors:', errorItems);
      }

      logger.info('Bulk user indexing completed', { 
        total: users.length,
        errors: response.errors ? 'yes' : 'no',
      });
    } catch (error) {
      logger.error('Failed to bulk index users:', error);
      throw error;
    }
  }

  /**
   * Update a user document
   */
  async updateUser(user: User): Promise<void> {
    try {
      const client = this.ensureClient();
      
      const document: Partial<UserSearchDocument> = {
        email: user.email,
        name: user.name,
        updatedAt: user.updatedAt.toISOString(),
      };

      await client.update({
        index: this.userIndex,
        id: user.id,
        body: {
          doc: document,
        },
        refresh: 'wait_for',
      });

      logger.debug('User document updated successfully', { userId: user.id });
    } catch (error) {
      logger.error('Failed to update user document:', error, { userId: user.id });
      throw error;
    }
  }

  /**
   * Delete a user document
   */
  async deleteUser(userId: string): Promise<void> {
    try {
      const client = this.ensureClient();
      
      await client.delete({
        index: this.userIndex,
        id: userId,
        refresh: 'wait_for',
      });

      logger.debug('User document deleted successfully', { userId });
    } catch (error: any) {
      if (error.meta?.statusCode === 404) {
        logger.debug('User document not found for deletion', { userId });
        return;
      }
      
      logger.error('Failed to delete user document:', error, { userId });
      throw error;
    }
  }

  /**
   * Search users with text query
   */
  async searchUsers(
    query: string,
    options: SearchOptions = {}
  ): Promise<SearchResult<UserSearchDocument>> {
    try {
      const client = this.ensureClient();
      const { from = 0, size = 10, sort, highlight = true } = options;

      const searchBody: any = {
        from,
        size,
        query: {
          multi_match: {
            query,
            fields: ['name^2', 'email'],
            type: 'best_fields',
            fuzziness: 'AUTO',
            operator: 'or',
          },
        },
      };

      // Add sorting
      if (sort) {
        searchBody.sort = sort;
      } else {
        searchBody.sort = [
          { _score: { order: 'desc' } },
          { createdAt: { order: 'desc' } },
        ];
      }

      // Add highlighting
      if (highlight) {
        searchBody.highlight = {
          fields: {
            name: {},
            email: {},
          },
          pre_tags: ['<mark>'],
          post_tags: ['</mark>'],
        };
      }

      const response = await client.search({
        index: this.userIndex,
        body: searchBody,
      });

      return {
        hits: response.hits.hits.map(hit => ({
          _id: hit._id!,
          _score: hit._score!,
          _source: hit._source as UserSearchDocument,
          highlight: hit.highlight,
        })),
        total: {
          value: typeof response.hits.total === 'number' 
            ? response.hits.total 
            : response.hits.total!.value,
          relation: typeof response.hits.total === 'number' 
            ? 'eq' 
            : response.hits.total!.relation,
        },
        maxScore: response.hits.max_score ?? null,
      };
    } catch (error) {
      logger.error('Failed to search users:', error, { query, options });
      throw error;
    }
  }

  /**
   * Get user suggestions for autocomplete
   */
  async suggestUsers(
    query: string,
    field: 'name' | 'email' = 'name',
    size: number = 5
  ): Promise<string[]> {
    try {
      const client = this.ensureClient();

      const response = await client.search({
        index: this.userIndex,
        body: {
          suggest: {
            user_suggest: {
              prefix: query,
              completion: {
                field: `${field}.suggest`,
                size,
              },
            },
          },
        },
      });

      const suggestions = response.suggest?.user_suggest?.[0]?.options || [];
      return Array.isArray(suggestions) ? suggestions.map((option: any) => option.text) : [];
    } catch (error) {
      logger.error('Failed to get user suggestions:', error, { query, field });
      throw error;
    }
  }

  /**
   * Advanced search with filters
   */
  async advancedSearchUsers(filters: {
    query?: string;
    email?: string;
    name?: string;
    createdAfter?: Date;
    createdBefore?: Date;
  }, options: SearchOptions = {}): Promise<SearchResult<UserSearchDocument>> {
    try {
      const client = this.ensureClient();
      const { from = 0, size = 10, sort, highlight = true } = options;

      const must: any[] = [];
      const filter: any[] = [];

      // Text search
      if (filters.query) {
        must.push({
          multi_match: {
            query: filters.query,
            fields: ['name^2', 'email'],
            type: 'best_fields',
            fuzziness: 'AUTO',
          },
        });
      }

      // Exact email filter
      if (filters.email) {
        filter.push({
          term: {
            'email.keyword': filters.email,
          },
        });
      }

      // Name filter
      if (filters.name) {
        filter.push({
          match: {
            name: {
              query: filters.name,
              operator: 'and',
            },
          },
        });
      }

      // Date range filter
      if (filters.createdAfter || filters.createdBefore) {
        const range: any = {};
        if (filters.createdAfter) {
          range.gte = filters.createdAfter.toISOString();
        }
        if (filters.createdBefore) {
          range.lte = filters.createdBefore.toISOString();
        }
        filter.push({
          range: {
            createdAt: range,
          },
        });
      }

      const searchBody: any = {
        from,
        size,
        query: {
          bool: {
            must: must.length > 0 ? must : [{ match_all: {} }],
            filter,
          },
        },
      };

      // Add sorting
      if (sort) {
        searchBody.sort = sort;
      } else {
        searchBody.sort = [
          ...(filters.query ? [{ _score: { order: 'desc' } }] : []),
          { createdAt: { order: 'desc' } },
        ];
      }

      // Add highlighting
      if (highlight && filters.query) {
        searchBody.highlight = {
          fields: {
            name: {},
            email: {},
          },
          pre_tags: ['<mark>'],
          post_tags: ['</mark>'],
        };
      }

      const response = await client.search({
        index: this.userIndex,
        body: searchBody,
      });

      return {
        hits: response.hits.hits.map(hit => ({
          _id: hit._id!,
          _score: hit._score!,
          _source: hit._source as UserSearchDocument,
          highlight: hit.highlight,
        })),
        total: {
          value: typeof response.hits.total === 'number' 
            ? response.hits.total 
            : response.hits.total!.value,
          relation: typeof response.hits.total === 'number' 
            ? 'eq' 
            : response.hits.total!.relation,
        },
        maxScore: response.hits.max_score ?? null,
      };
    } catch (error) {
      logger.error('Failed to perform advanced search:', error, { filters, options });
      throw error;
    }
  }

  /**
   * Get search statistics
   */
  async getIndexStats(): Promise<any> {
    try {
      const client = this.ensureClient();
      
      const response = await client.indices.stats({
        index: this.userIndex,
      });

      return response.indices?.[this.userIndex];
    } catch (error) {
      logger.error('Failed to get index stats:', error);
      throw error;
    }
  }

  /**
   * Check if search service is healthy
   */
  async isHealthy(): Promise<boolean> {
    try {
      return await elasticsearchConnection.ping();
    } catch (error) {
      logger.error('Search service health check failed:', error);
      return false;
    }
  }

  /**
   * Refresh the index
   */
  async refreshIndex(): Promise<void> {
    try {
      const client = this.ensureClient();
      await client.indices.refresh({
        index: this.userIndex,
      });
    } catch (error) {
      logger.error('Failed to refresh index:', error);
      throw error;
    }
  }
}

// Create singleton instance
export const searchService = new SearchService();