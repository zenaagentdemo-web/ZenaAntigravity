import { Request, Response } from 'express';
import { searchService } from '../services/search.service';

/**
 * Search controller for handling search requests across all entity types
 */
export class SearchController {
  /**
   * GET /api/search
   * Search across deals, contacts, properties, and threads
   */
  async search(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user?.id;
      
      if (!userId) {
        res.status(401).json({
          error: {
            code: 'AUTH_REQUIRED',
            message: 'Authentication required',
            retryable: false,
          },
        });
        return;
      }
      
      const { q, query, types, limit } = req.query;
      
      // Support both 'q' and 'query' parameters
      const searchQuery = (q || query) as string;
      
      if (!searchQuery || searchQuery.trim().length === 0) {
        res.status(400).json({
          error: {
            code: 'VALIDATION_FAILED',
            message: 'Search query is required',
            retryable: false,
          },
        });
        return;
      }
      
      // Parse types filter if provided
      let typeFilter: ('deal' | 'contact' | 'property' | 'thread')[] | undefined;
      if (types) {
        const typesStr = types as string;
        typeFilter = typesStr.split(',').map(t => t.trim()) as any[];
        
        // Validate types
        const validTypes = ['deal', 'contact', 'property', 'thread'];
        const invalidTypes = typeFilter.filter(t => !validTypes.includes(t));
        
        if (invalidTypes.length > 0) {
          res.status(400).json({
            error: {
              code: 'VALIDATION_FAILED',
              message: `Invalid types: ${invalidTypes.join(', ')}. Valid types are: ${validTypes.join(', ')}`,
              retryable: false,
            },
          });
          return;
        }
      }
      
      // Parse limit if provided
      let limitNum: number | undefined;
      if (limit) {
        limitNum = parseInt(limit as string, 10);
        if (isNaN(limitNum) || limitNum < 1 || limitNum > 100) {
          res.status(400).json({
            error: {
              code: 'VALIDATION_FAILED',
              message: 'Limit must be a number between 1 and 100',
              retryable: false,
            },
          });
          return;
        }
      }
      
      // Perform search
      const results = await searchService.search({
        query: searchQuery,
        userId,
        types: typeFilter,
        limit: limitNum,
      });
      
      res.json({
        query: searchQuery,
        results,
        count: results.length,
      });
    } catch (error) {
      console.error('Search error:', error);
      res.status(500).json({
        error: {
          code: 'SEARCH_FAILED',
          message: 'Failed to perform search',
          retryable: true,
        },
      });
    }
  }
}

export const searchController = new SearchController();
