import { User, Prisma } from '@prisma/client';
import { prisma, withTransaction } from '../prisma/client';
import { 
  CreateUser, 
  UpdateUser, 
  UserQuery, 
  UserListQuery,
  BulkDeleteUsers,
  BulkUpdateUsers 
} from '../schemas/user';
import { 
  NotFoundError, 
  ConflictError, 
  DatabaseError,
  ValidationError 
} from '../utils/errors';
import { logger } from '../utils/logger';

export class UserService {
  /**
   * Create a new user
   */
  static async createUser(userData: CreateUser): Promise<User> {
    try {
      // Check if user with email already exists
      const existingUser = await prisma.user.findUnique({
        where: { email: userData.email }
      });

      if (existingUser) {
        throw new ConflictError('User with this email already exists', {
          email: userData.email
        });
      }

      const user = await prisma.user.create({
        data: {
          email: userData.email,
          name: userData.name,
          password: '', // Password will be set by auth service
        }
      });

      logger.info('User created successfully', { userId: user.id, email: user.email });
      return user;
    } catch (error) {
      if (error instanceof ConflictError) {
        throw error;
      }
      
      logger.error('Failed to create user', { error, userData: { email: userData.email, name: userData.name } });
      throw new DatabaseError('Failed to create user');
    }
  }

  /**
   * Get user by ID
   */
  static async getUserById(id: string): Promise<User> {
    try {
      const user = await prisma.user.findUnique({
        where: { id }
      });

      if (!user) {
        throw new NotFoundError('User', { userId: id });
      }

      return user;
    } catch (error) {
      if (error instanceof NotFoundError) {
        throw error;
      }
      
      logger.error('Failed to get user by ID', { error, userId: id });
      throw new DatabaseError('Failed to retrieve user');
    }
  }

  /**
   * Get user by email
   */
  static async getUserByEmail(email: string): Promise<User | null> {
    try {
      const user = await prisma.user.findUnique({
        where: { email }
      });

      return user;
    } catch (error) {
      logger.error('Failed to get user by email', { error, email });
      throw new DatabaseError('Failed to retrieve user');
    }
  }

  /**
   * Update user by ID
   */
  static async updateUser(id: string, updateData: UpdateUser): Promise<User> {
    try {
      // Check if user exists
      const existingUser = await this.getUserById(id);

      // If email is being updated, check for conflicts
      if (updateData.email && updateData.email !== existingUser.email) {
        const emailExists = await prisma.user.findUnique({
          where: { email: updateData.email }
        });

        if (emailExists) {
          throw new ConflictError('User with this email already exists', {
            email: updateData.email
          });
        }
      }

      const updatedUser = await prisma.user.update({
        where: { id },
        data: {
          ...(updateData.email && { email: updateData.email }),
          ...(updateData.name && { name: updateData.name }),
        }
      });

      logger.info('User updated successfully', { userId: id, updatedFields: Object.keys(updateData) });
      return updatedUser;
    } catch (error) {
      if (error instanceof NotFoundError || error instanceof ConflictError) {
        throw error;
      }
      
      logger.error('Failed to update user', { error, userId: id, updateData });
      throw new DatabaseError('Failed to update user');
    }
  }

  /**
   * Delete user by ID
   */
  static async deleteUser(id: string): Promise<void> {
    try {
      // Check if user exists
      await this.getUserById(id);

      await prisma.user.delete({
        where: { id }
      });

      logger.info('User deleted successfully', { userId: id });
    } catch (error) {
      if (error instanceof NotFoundError) {
        throw error;
      }
      
      logger.error('Failed to delete user', { error, userId: id });
      throw new DatabaseError('Failed to delete user');
    }
  }

  /**
   * List users with filtering, pagination, and sorting
   */
  static async listUsers(query: UserListQuery) {
    try {
      const {
        page = 1,
        limit = 10,
        email,
        name,
        search,
        createdAfter,
        createdBefore,
        sortBy = 'createdAt',
        order = 'desc'
      } = query;

      // Build where clause
      const where: Prisma.UserWhereInput = {};

      if (email) {
        where.email = { contains: email, mode: 'insensitive' };
      }

      if (name) {
        where.name = { contains: name, mode: 'insensitive' };
      }

      if (search) {
        where.OR = [
          { email: { contains: search, mode: 'insensitive' } },
          { name: { contains: search, mode: 'insensitive' } }
        ];
      }

      if (createdAfter || createdBefore) {
        where.createdAt = {};
        if (createdAfter) {
          where.createdAt.gte = new Date(createdAfter);
        }
        if (createdBefore) {
          where.createdAt.lte = new Date(createdBefore);
        }
      }

      // Calculate pagination
      const skip = (page - 1) * limit;

      // Execute queries in parallel
      const [users, total] = await Promise.all([
        prisma.user.findMany({
          where,
          skip,
          take: limit,
          orderBy: { [sortBy]: order }
        }),
        prisma.user.count({ where })
      ]);

      const hasNext = skip + limit < total;
      const hasPrev = page > 1;

      return {
        users,
        total,
        page,
        limit,
        hasNext,
        hasPrev
      };
    } catch (error) {
      logger.error('Failed to list users', { error, query });
      throw new DatabaseError('Failed to retrieve users');
    }
  }

  /**
   * Bulk delete users
   */
  static async bulkDeleteUsers(data: BulkDeleteUsers): Promise<{ count: number }> {
    try {
      return await withTransaction(async (tx) => {
        // Verify all users exist
        const existingUsers = await tx.user.findMany({
          where: { id: { in: data.userIds } },
          select: { id: true }
        });

        const existingIds = existingUsers.map(user => user.id);
        const missingIds = data.userIds.filter(id => !existingIds.includes(id));

        if (missingIds.length > 0) {
          throw new NotFoundError('Users', { missingIds });
        }

        // Delete users
        const result = await tx.user.deleteMany({
          where: { id: { in: data.userIds } }
        });

        logger.info('Bulk delete completed', { deletedCount: result.count, userIds: data.userIds });
        return { count: result.count };
      });
    } catch (error) {
      if (error instanceof NotFoundError) {
        throw error;
      }
      
      logger.error('Failed to bulk delete users', { error, userIds: data.userIds });
      throw new DatabaseError('Failed to delete users');
    }
  }

  /**
   * Bulk update users
   */
  static async bulkUpdateUsers(data: BulkUpdateUsers): Promise<{ count: number }> {
    try {
      return await withTransaction(async (tx) => {
        // Verify all users exist
        const existingUsers = await tx.user.findMany({
          where: { id: { in: data.userIds } },
          select: { id: true, email: true }
        });

        const existingIds = existingUsers.map(user => user.id);
        const missingIds = data.userIds.filter(id => !existingIds.includes(id));

        if (missingIds.length > 0) {
          throw new NotFoundError('Users', { missingIds });
        }

        // If email is being updated, check for conflicts
        if (data.updates.email) {
          const emailConflict = await tx.user.findFirst({
            where: {
              email: data.updates.email,
              id: { notIn: data.userIds }
            }
          });

          if (emailConflict) {
            throw new ConflictError('Email already exists for another user', {
              email: data.updates.email,
              conflictUserId: emailConflict.id
            });
          }
        }

        // Update users
        const result = await tx.user.updateMany({
          where: { id: { in: data.userIds } },
          data: {
            ...(data.updates.email && { email: data.updates.email }),
            ...(data.updates.name && { name: data.updates.name }),
          }
        });

        logger.info('Bulk update completed', { 
          updatedCount: result.count, 
          userIds: data.userIds,
          updates: data.updates 
        });
        return { count: result.count };
      });
    } catch (error) {
      if (error instanceof NotFoundError || error instanceof ConflictError) {
        throw error;
      }
      
      logger.error('Failed to bulk update users', { error, data });
      throw new DatabaseError('Failed to update users');
    }
  }

  /**
   * Check if user exists by ID
   */
  static async userExists(id: string): Promise<boolean> {
    try {
      const user = await prisma.user.findUnique({
        where: { id },
        select: { id: true }
      });

      return !!user;
    } catch (error) {
      logger.error('Failed to check user existence', { error, userId: id });
      throw new DatabaseError('Failed to check user existence');
    }
  }

  /**
   * Get user count
   */
  static async getUserCount(): Promise<number> {
    try {
      return await prisma.user.count();
    } catch (error) {
      logger.error('Failed to get user count', { error });
      throw new DatabaseError('Failed to get user count');
    }
  }

  /**
   * Search users by text
   */
  static async searchUsers(searchTerm: string, limit: number = 10): Promise<User[]> {
    try {
      if (!searchTerm.trim()) {
        throw new ValidationError('Search term cannot be empty');
      }

      const users = await prisma.user.findMany({
        where: {
          OR: [
            { email: { contains: searchTerm, mode: 'insensitive' } },
            { name: { contains: searchTerm, mode: 'insensitive' } }
          ]
        },
        take: limit,
        orderBy: { createdAt: 'desc' }
      });

      return users;
    } catch (error) {
      if (error instanceof ValidationError) {
        throw error;
      }
      
      logger.error('Failed to search users', { error, searchTerm });
      throw new DatabaseError('Failed to search users');
    }
  }
}