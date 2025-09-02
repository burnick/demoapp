import { BaseController } from './baseController';
import {
  CreateUserSchema,
  UpdateUserSchema,
  UserListQuerySchema,
  UserResponseSchema,
  UserListResponseSchema,
  BulkDeleteUsersSchema,
  BulkUpdateUsersSchema,
  type UserResponse,
  type UserListResponse,
} from '../schemas/user';
import { UserService } from '../services/userService';
import { NotFoundError, ConflictError, ValidationError } from '../utils/errors';

/**
 * User Controller
 * Handles all user-related operations including CRUD operations
 */
export class UserController extends BaseController {
  /**
   * Create a new user
   * @param input - User creation data
   * @returns Created user data
   */
  async createUser(input: unknown): Promise<UserResponse> {
    const validatedInput = this.validateInput(input, CreateUserSchema);
    
    this.logAction('createUser', undefined, { email: validatedInput.email });

    return this.handleAsync(async () => {
      const user = await UserService.createUser(validatedInput);

      // Validate response against schema
      return this.validateInput(user, UserResponseSchema);
    }, 'createUser');
  }

  /**
   * Get user by ID
   * @param userId - User ID
   * @param requestingUserId - ID of user making the request
   * @returns User data
   */
  async getUserById(userId: string, requestingUserId?: string): Promise<UserResponse> {
    const validatedUserId = this.validateId(userId, 'User');
    
    this.logAction('getUserById', requestingUserId, { targetUserId: validatedUserId });

    return this.handleAsync(async () => {
      const user = await UserService.getUserById(validatedUserId);

      // Check if user can access this resource
      if (requestingUserId && !this.checkResourceAccess(requestingUserId, user.id)) {
        throw new NotFoundError('User'); // Return not found instead of forbidden for security
      }

      return this.validateInput(user, UserResponseSchema);
    }, 'getUserById');
  }

  /**
   * Update user by ID
   * @param userId - User ID
   * @param input - Update data
   * @param requestingUserId - ID of user making the request
   * @returns Updated user data
   */
  async updateUser(
    userId: string,
    input: unknown,
    requestingUserId?: string
  ): Promise<UserResponse> {
    const validatedUserId = this.validateId(userId, 'User');
    const validatedInput = this.validateInput(input, UpdateUserSchema);
    
    this.logAction('updateUser', requestingUserId, { 
      targetUserId: validatedUserId,
      updateFields: Object.keys(validatedInput),
    });

    return this.handleAsync(async () => {
      // Check permissions first
      if (requestingUserId && !this.checkResourceAccess(requestingUserId, validatedUserId)) {
        throw new NotFoundError('User');
      }

      const updatedUser = await UserService.updateUser(validatedUserId, validatedInput);

      return this.validateInput(updatedUser, UserResponseSchema);
    }, 'updateUser');
  }

  /**
   * Delete user by ID
   * @param userId - User ID
   * @param requestingUserId - ID of user making the request
   * @returns Success message
   */
  async deleteUser(userId: string, requestingUserId?: string): Promise<{ message: string }> {
    const validatedUserId = this.validateId(userId, 'User');
    
    this.logAction('deleteUser', requestingUserId, { targetUserId: validatedUserId });

    return this.handleAsync(async () => {
      // Check permissions first
      if (requestingUserId && !this.checkResourceAccess(requestingUserId, validatedUserId)) {
        throw new NotFoundError('User');
      }

      await UserService.deleteUser(validatedUserId);

      return { message: 'User deleted successfully' };
    }, 'deleteUser');
  }

  /**
   * List users with filtering and pagination
   * @param input - Query parameters
   * @returns Paginated list of users
   */
  async listUsers(input: unknown): Promise<UserListResponse> {
    const validatedInput = this.validateInput(input, UserListQuerySchema);
    
    this.logAction('listUsers', undefined, {
      filters: this.sanitizeData(validatedInput, ['page', 'limit']),
      pagination: { page: validatedInput.page, limit: validatedInput.limit },
    });

    return this.handleAsync(async () => {
      // Ensure required fields have defaults
      const queryWithDefaults = {
        ...validatedInput,
        page: validatedInput.page ?? 1,
        limit: validatedInput.limit ?? 10,
        sortBy: validatedInput.sortBy ?? ('createdAt' as const),
        order: validatedInput.order ?? ('desc' as const),
      };

      const result = await UserService.listUsers(queryWithDefaults);

      return this.validateInput(result, UserListResponseSchema);
    }, 'listUsers');
  }

  /**
   * Get user by email
   * @param email - User email
   * @returns User data or null if not found
   */
  async getUserByEmail(email: string): Promise<UserResponse | null> {
    this.logAction('getUserByEmail', undefined, { email });

    return this.handleAsync(async () => {
      const user = await UserService.getUserByEmail(email);

      if (!user) {
        return null;
      }

      return this.validateInput(user, UserResponseSchema);
    }, 'getUserByEmail');
  }

  /**
   * Bulk delete users
   * @param input - Array of user IDs to delete
   * @param requestingUserId - ID of user making the request
   * @returns Success message with count
   */
  async bulkDeleteUsers(
    input: unknown,
    requestingUserId?: string
  ): Promise<{ message: string; deletedCount: number }> {
    const validatedInput = this.validateInput(input, BulkDeleteUsersSchema);
    
    this.logAction('bulkDeleteUsers', requestingUserId, {
      userIds: validatedInput.userIds,
      count: validatedInput.userIds.length,
    });

    return this.handleAsync(async () => {
      // For security, only allow users to delete their own account in bulk operations
      // In a real application, you might want admin-level permissions for bulk operations
      if (requestingUserId) {
        const unauthorizedIds = validatedInput.userIds.filter(id => id !== requestingUserId);
        if (unauthorizedIds.length > 0) {
          throw new ValidationError('Can only delete your own account', {
            unauthorizedIds,
          });
        }
      }

      const result = await UserService.bulkDeleteUsers(validatedInput);

      return {
        message: `Successfully deleted ${result.count} user(s)`,
        deletedCount: result.count,
      };
    }, 'bulkDeleteUsers');
  }

  /**
   * Bulk update users
   * @param input - User IDs and update data
   * @param requestingUserId - ID of user making the request
   * @returns Success message with count
   */
  async bulkUpdateUsers(
    input: unknown,
    requestingUserId?: string
  ): Promise<{ message: string; updatedCount: number }> {
    const validatedInput = this.validateInput(input, BulkUpdateUsersSchema);
    
    this.logAction('bulkUpdateUsers', requestingUserId, {
      userIds: validatedInput.userIds,
      count: validatedInput.userIds.length,
      updateFields: Object.keys(validatedInput.updates),
    });

    return this.handleAsync(async () => {
      // For security, only allow users to update their own account in bulk operations
      if (requestingUserId) {
        const unauthorizedIds = validatedInput.userIds.filter(id => id !== requestingUserId);
        if (unauthorizedIds.length > 0) {
          throw new ValidationError('Can only update your own account', {
            unauthorizedIds,
          });
        }
      }

      const result = await UserService.bulkUpdateUsers(validatedInput);

      return {
        message: `Successfully updated ${result.count} user(s)`,
        updatedCount: result.count,
      };
    }, 'bulkUpdateUsers');
  }
}