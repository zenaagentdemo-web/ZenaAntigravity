import { Request, Response } from 'express';
import { authService } from '../services/auth.service.js';
import { fileLogger } from '../utils/fileLogger.js';

export class AuthController {
  /**
   * POST /api/auth/register
   * Register a new user
   */
  async register(req: Request, res: Response): Promise<void> {
    try {
      const { email, password, name } = req.body;

      // Validate input
      if (!email || !password || !name) {
        res.status(400).json({
          error: {
            code: 'VALIDATION_FAILED',
            message: 'Email, password, and name are required',
            retryable: false,
          },
        });
        return;
      }

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        res.status(400).json({
          error: {
            code: 'VALIDATION_FAILED',
            message: 'Invalid email format',
            retryable: false,
          },
        });
        return;
      }

      // Validate password strength (minimum 8 characters)
      if (password.length < 8) {
        res.status(400).json({
          error: {
            code: 'VALIDATION_FAILED',
            message: 'Password must be at least 8 characters long',
            retryable: false,
          },
        });
        return;
      }

      const result = await authService.register({ email, password, name });

      res.status(201).json({
        user: result.user,
        accessToken: result.tokens.accessToken,
        refreshToken: result.tokens.refreshToken,
      });
    } catch (error) {
      if (error instanceof Error && error.message.includes('already exists')) {
        res.status(409).json({
          error: {
            code: 'CONFLICT',
            message: error.message,
            retryable: false,
          },
        });
        return;
      }

      console.error('Registration error:', error);
      fileLogger.log(`[AuthController] Registration error for email ${req.body.email}: ${error instanceof Error ? error.message : String(error)}`);
      if (error instanceof Error) fileLogger.log(error.stack || 'No stack');
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An error occurred during registration',
          retryable: true,
        },
      });
    }
  }

  /**
   * POST /api/auth/login
   * Login a user
   */
  async login(req: Request, res: Response): Promise<void> {
    try {
      const { email, password } = req.body;

      // Validate input
      if (!email || !password) {
        res.status(400).json({
          error: {
            code: 'VALIDATION_FAILED',
            message: 'Email and password are required',
            retryable: false,
          },
        });
        return;
      }

      console.log(`[AuthController] Login attempt for: ${email} `);

      // REMOVED: Demo bypass logic. We now use the real seeded user in the database.
      // This ensures the token contains the correct User ID matching the seeded data.

      const result = await authService.login({ email, password });

      res.status(200).json({
        user: result.user,
        accessToken: result.tokens.accessToken,
        refreshToken: result.tokens.refreshToken,
      });
    } catch (error) {
      if (error instanceof Error && error.message.includes('Invalid')) {
        res.status(401).json({
          error: {
            code: 'AUTH_INVALID_CREDENTIALS',
            message: 'Invalid email or password',
            retryable: false,
          },
        });
        return;
      }


      console.error('Login error - full details:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        email: req.body.email
      });
      res.status(500).json({
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'An internal server error occurred during login. Please contact support.',
          details: process.env.NODE_ENV === 'development' && error instanceof Error ? error.stack : undefined
        },
      });
    }
  }

  /**
   * POST /api/auth/refresh
   * Refresh access token
   */
  async refresh(req: Request, res: Response): Promise<void> {
    try {
      const { refreshToken } = req.body;

      if (!refreshToken) {
        res.status(400).json({
          error: {
            code: 'VALIDATION_FAILED',
            message: 'Refresh token is required',
            retryable: false,
          },
        });
        return;
      }

      const tokens = await authService.refreshToken(refreshToken);

      res.status(200).json({
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
      });
    } catch (error) {
      res.status(401).json({
        error: {
          code: 'AUTH_TOKEN_EXPIRED',
          message: 'Invalid or expired refresh token',
          retryable: false,
        },
      });
    }
  }

  /**
   * POST /api/auth/logout
   * Logout a user (client-side token removal)
   */
  async logout(req: Request, res: Response): Promise<void> {
    // In a JWT-based system, logout is primarily handled client-side
    // by removing the tokens from storage. This endpoint confirms the action.
    res.status(200).json({
      message: 'Logged out successfully',
    });
  }

  /**
   * GET /api/auth/me
   * Get current user information
   */
  async me(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          error: {
            code: 'AUTH_TOKEN_MISSING',
            message: 'Authentication required',
            retryable: false,
          },
        });
        return;
      }

      const user = await authService.getUserById(req.user.userId);

      res.status(200).json({ user });
    } catch (error) {
      console.error('Auth check error:', error);
      fileLogger.log(`[AuthController] me error: ${error instanceof Error ? error.message : String(error)}`);
      if (error instanceof Error) fileLogger.log(error.stack || 'No stack');
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An error occurred while fetching user information',
          retryable: true,
        },
      });
    }
  }
}

export const authController = new AuthController();
