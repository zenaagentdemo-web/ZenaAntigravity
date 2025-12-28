import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { authService } from '../services/auth.service.js';

const prisma = new PrismaClient();

// Extend Express Request type to include user
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        userId: string;
        email: string;
      };
    }
  }
}

/**
 * Authentication middleware to protect routes
 * Verifies JWT token from Authorization header
 */
export const authenticate = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Get token from Authorization header
    const authHeader = req.headers.authorization;

    console.log('[Auth] Checking authorization for:', req.path);
    console.log('[Auth] Auth header present:', !!authHeader);

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log('[Auth] Missing or invalid auth header format');
      res.status(401).json({
        error: {
          code: 'AUTH_TOKEN_MISSING',
          message: 'Authorization token is required',
          retryable: false,
        },
      });
      return;
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix
    console.log('[Auth] Token length:', token.length);

    // Development mode: allow demo-token for testing
    if (token === 'demo-token' && process.env.NODE_ENV !== 'production') {
      console.log('[Auth] Using demo token bypass for development');

      // Try to find the demo user in the database
      try {
        const demoUser = await prisma.user.findUnique({
          where: { email: 'demo@zena.ai' }
        });

        if (demoUser) {
          req.user = {
            id: demoUser.id,
            userId: demoUser.id,
            email: demoUser.email,
          };
        } else {
          console.warn('[Auth] Demo user not found in DB, using fallback ID');
          req.user = {
            id: 'demo-user-id',
            userId: 'demo-user-id',
            email: 'demo@example.com',
          };
        }
      } catch (error) {
        console.error('[Auth] Failed to lookup demo user:', error);
        req.user = {
          id: 'demo-user-id',
          userId: 'demo-user-id',
          email: 'demo@example.com',
        };
      }

      next();
      return;
    }

    // Verify token
    const payload = authService.verifyToken(token);
    console.log('[Auth] Token verified for user:', payload.userId);

    // Attach user info to request
    req.user = {
      id: payload.userId,
      userId: payload.userId,
      email: payload.email,
    };

    next();
  } catch (error) {
    console.log('[Auth] Token verification failed:', error instanceof Error ? error.message : error);

    if (error instanceof Error && error.name === 'TokenExpiredError') {
      res.status(401).json({
        error: {
          code: 'AUTH_TOKEN_EXPIRED',
          message: 'Access token has expired',
          retryable: true,
        },
      });
      return;
    }

    res.status(401).json({
      error: {
        code: 'AUTH_INVALID_TOKEN',
        message: 'Invalid authorization token',
        retryable: false,
      },
    });
  }
};

// Aliases for backward compatibility
export const authenticateToken = authenticate;
export const authMiddleware = authenticate;
