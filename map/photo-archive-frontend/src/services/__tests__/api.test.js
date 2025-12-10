import { describe, it, expect, vi, beforeEach } from 'vitest';
import axios from 'axios';
import { searchSimilarRoutes, getRoute, healthCheck } from '../api';

// Mock axios module
vi.mock('axios', () => {
  return {
    default: {
      create: vi.fn(() => ({
        post: vi.fn(),
        get: vi.fn(),
      })),
    },
  };
});

describe('API Service', () => {
  let mockApi;

  beforeEach(() => {
    vi.clearAllMocks();
    mockApi = {
      post: vi.fn(),
      get: vi.fn(),
    };
    axios.create.mockReturnValue(mockApi);
  });

  describe('searchSimilarRoutes', () => {
    it('should send POST request with correct data', async () => {
      const mockResponse = {
        data: {
          query_route: {},
          results: [],
          processing_time_ms: 100,
          total_candidates: 0,
        },
      };

      mockApi.post.mockResolvedValue(mockResponse);

      const routeData = {
        coordinates: [[40.7128, -74.0060], [40.7138, -74.0060]],
      };

      const params = {
        topK: 10,
        minSimilarity: 0.6,
        scaleRange: [0.5, 2.0],
      };

      const result = await searchSimilarRoutes(routeData, params);

      expect(result).toEqual(mockResponse.data);
    });

    it('should handle errors properly', async () => {
      const mockError = new Error('Network error');
      mockApi.post.mockRejectedValue(mockError);

      const routeData = { coordinates: [] };
      const params = {};

      await expect(searchSimilarRoutes(routeData, params)).rejects.toThrow('Network error');
    });

    it('should use default parameters when not provided', async () => {
      mockApi.post.mockResolvedValue({ data: {} });

      const routeData = { coordinates: [[40.7128, -74.0060]] };

      await searchSimilarRoutes(routeData, {});

      expect(mockApi.post).toHaveBeenCalledWith(
        '/routes/search',
        expect.objectContaining({
          params: expect.objectContaining({
            top_k: 10,
            min_similarity: 0.6,
          }),
        })
      );
    });
  });

  describe('getRoute', () => {
    it('should fetch route by ID', async () => {
      const mockRoute = {
        data: {
          route_id: 'test_123',
          coordinates: [[40.7128, -74.0060]],
          signature: {},
          metadata: {},
        },
      };

      mockApi.get.mockResolvedValue(mockRoute);

      const result = await getRoute('test_123');

      expect(result).toEqual(mockRoute.data);
    });

    it('should handle 404 errors', async () => {
      const mockError = new Error('Route not found');
      mockError.response = { status: 404 };

      mockApi.get.mockRejectedValue(mockError);

      await expect(getRoute('nonexistent')).rejects.toThrow('Route not found');
    });
  });

  describe('healthCheck', () => {
    it('should return health status', async () => {
      const mockHealth = {
        data: {
          status: 'healthy',
          version: '1.0.0',
          database: 'connected',
        },
      };

      mockApi.get.mockResolvedValue(mockHealth);

      const result = await healthCheck();

      expect(result).toEqual(mockHealth.data);
      expect(result.status).toBe('healthy');
    });
  });
});
