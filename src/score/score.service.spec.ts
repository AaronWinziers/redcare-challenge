import { Test, TestingModule } from '@nestjs/testing';
import { ScoreService } from './score.service';
import { GitHubService, RepositoryMetadata } from './gitHub.service';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';

describe('ScoreService', () => {
  let service: ScoreService;

  const mockGitHubService = {
    fetchRepository: jest.fn(),
    searchRepositories: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn((key: string) => {
      if (key === 'GITHUB_API_URL') return 'https://api.github.com';
      if (key === 'GITHUB_API_VERSION') return '2026-03-10';
      return null;
    }),
  };

  const mockHttpService = {
    get: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ScoreService,
        {
          provide: GitHubService,
          useValue: mockGitHubService,
        },
        {
          provide: HttpService,
          useValue: mockHttpService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<ScoreService>(ScoreService);

    // Clear all mocks before each test
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('daysSince', () => {
    it("should return 0 for today's date", () => {
      const today = new Date();
      const result = service.daysSince(today);
      expect(result).toBe(0);
    });

    it('should return correct number of days for past date', () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 5);
      const result = service.daysSince(pastDate);
      expect(result).toBe(5);
    });

    it('should handle dates from different years', () => {
      const lastYear = new Date('2023-01-01');
      const mockNow = new Date('2024-01-01');
      jest.spyOn(global, 'Date').mockImplementation(() => mockNow);

      const result = service.daysSince(lastYear);
      expect(result).toBe(365); // Approximately

      jest.restoreAllMocks();
    });
  });

  describe('weightedLinearRating', () => {
    // Helper to create a repository with specific days since update
    const createRepo = (watchers: number, forks: number, daysAgo: number): RepositoryMetadata => {
      const date = new Date();
      date.setDate(date.getDate() - daysAgo);
      return {
        owner: 'test',
        name: 'test-repo',
        watchers_count: watchers,
        forks_count: forks,
        updated_at: date,
      };
    };

    describe('recency factor calculations', () => {
      it('should apply factor 1.0 for repos updated less than 7 days ago', () => {
        const repo = createRepo(100, 50, 5);
        const expectedScore = Math.round(100 * 0.6 + 50 * 0.2);
        expect(service.weightedLinearRating(repo)).toBe(expectedScore);
      });

      it('should apply factor 0.9 for repos updated between 7-29 days ago', () => {
        const repo = createRepo(100, 50, 14);
        const expectedScore = Math.round((100 * 0.6 + 50 * 0.2) * 0.9);
        expect(service.weightedLinearRating(repo)).toBe(expectedScore);
      });

      it('should apply factor 0.7 for repos updated between 30-89 days ago', () => {
        const repo = createRepo(100, 50, 60);
        const expectedScore = Math.round((100 * 0.6 + 50 * 0.2) * 0.7);
        expect(service.weightedLinearRating(repo)).toBe(expectedScore);
      });

      it('should apply factor 0.5 for repos updated between 90-179 days ago', () => {
        const repo = createRepo(100, 50, 120);
        const expectedScore = Math.round((100 * 0.6 + 50 * 0.2) * 0.5);
        expect(service.weightedLinearRating(repo)).toBe(expectedScore);
      });

      it('should apply factor 0.3 for repos updated between 180-269 days ago', () => {
        const repo = createRepo(100, 50, 200);
        const expectedScore = Math.round((100 * 0.6 + 50 * 0.2) * 0.3);
        expect(service.weightedLinearRating(repo)).toBe(expectedScore);
      });

      it('should apply factor 0.1 for repos updated 270+ days ago', () => {
        const repo = createRepo(100, 50, 300);
        const expectedScore = Math.round((100 * 0.6 + 50 * 0.2) * 0.1);
        expect(service.weightedLinearRating(repo)).toBe(expectedScore);
      });

      it('should handle exactly at boundary days correctly', () => {
        // Test exactly at 7 days (should be <7, so factor 1.0)
        const repoAt7Days = createRepo(100, 50, 7);
        const expectedAt7Days = Math.round((100 * 0.6 + 50 * 0.2) * 0.9); // 7 days falls into 7-29 range
        expect(service.weightedLinearRating(repoAt7Days)).toBe(expectedAt7Days);

        // Test exactly at 30 days (should be <30, so factor 0.9)
        const repoAt30Days = createRepo(100, 50, 30);
        const expectedAt30Days = Math.round((100 * 0.6 + 50 * 0.2) * 0.7); // 30 days falls into 30-89 range
        expect(service.weightedLinearRating(repoAt30Days)).toBe(expectedAt30Days);
      });
    });

    describe('score calculations with different weights', () => {
      it('should give more weight to watchers than forks (60% vs 20%)', () => {
        const highWatchersRepo = createRepo(100, 0, 5);
        const highForksRepo = createRepo(0, 100, 5);

        const highWatchersScore = service.weightedLinearRating(highWatchersRepo);
        const highForksScore = service.weightedLinearRating(highForksRepo);

        expect(highWatchersScore).toBeGreaterThan(highForksScore);
      });

      it('should return 0 for repository with no watchers or forks', () => {
        const repo = createRepo(0, 0, 5);
        expect(service.weightedLinearRating(repo)).toBe(0);
      });

      it('should round the final score to nearest integer', () => {
        // Create scenario where score would be fractional
        const repo = createRepo(10, 3, 5); // (10*0.6 + 3*0.2) = 6.6 * 1.0 = 6.6
        const result = service.weightedLinearRating(repo);
        expect(result).toBe(7); // Rounded to 7
        expect(Number.isInteger(result)).toBe(true);
      });

      it('should handle very large numbers', () => {
        const repo = createRepo(1000000, 500000, 5);
        const expectedScore = Math.round(1000000 * 0.6 + 500000 * 0.2);
        expect(service.weightedLinearRating(repo)).toBe(expectedScore);
      });
    });
  });

  describe('scoreRepository', () => {
    const mockFetchArgs = {
      owner: 'facebook',
      repoName: 'react',
    };

    const mockRepositoryMetadata: RepositoryMetadata = {
      owner: 'facebook',
      name: 'react',
      watchers_count: 100000,
      forks_count: 50000,
      updated_at: new Date('2024-01-01'),
    };

    it('should fetch a repository and add a score', async () => {
      mockGitHubService.fetchRepository.mockResolvedValue(mockRepositoryMetadata);

      // Mock daysSince to return predictable value
      jest.spyOn(service, 'daysSince').mockReturnValue(10);
      jest.spyOn(service, 'weightedLinearRating').mockReturnValue(12345);

      const result = await service.scoreRepository(mockFetchArgs);

      expect(mockGitHubService.fetchRepository).toHaveBeenCalledWith(mockFetchArgs);
      expect(result).toEqual({
        ...mockRepositoryMetadata,
        score: 12345,
      });
      expect(service.weightedLinearRating).toHaveBeenCalledWith(mockRepositoryMetadata);
    });

    it('should propagate errors from GitHubService', async () => {
      const error = new Error('GitHub API error');
      mockGitHubService.fetchRepository.mockRejectedValue(error);

      await expect(service.scoreRepository(mockFetchArgs)).rejects.toThrow('GitHub API error');
      expect(mockGitHubService.fetchRepository).toHaveBeenCalledWith(mockFetchArgs);
    });

    it('should calculate score correctly end-to-end', async () => {
      const recentDate = new Date();
      recentDate.setDate(recentDate.getDate() - 3); // 3 days ago

      const repoMetadata: RepositoryMetadata = {
        owner: 'nestjs',
        name: 'nest',
        watchers_count: 50000,
        forks_count: 10000,
        updated_at: recentDate,
      };

      mockGitHubService.fetchRepository.mockResolvedValue(repoMetadata);

      const result = await service.scoreRepository({ owner: 'nestjs', repoName: 'nest' });

      // Calculate expected score
      const daysSince = service.daysSince(recentDate);
      let recencyFactor = 1.0;
      if (daysSince >= 7) recencyFactor = 0.9;
      if (daysSince >= 30) recencyFactor = 0.7;
      if (daysSince >= 90) recencyFactor = 0.5;
      if (daysSince >= 180) recencyFactor = 0.3;
      if (daysSince >= 270) recencyFactor = 0.1;

      const expectedScore = Math.round((50000 * 0.6 + 10000 * 0.2) * recencyFactor);

      expect(result.score).toBe(expectedScore);
      expect(result.owner).toBe('nestjs');
      expect(result.name).toBe('nest');
    });
  });

  describe('searchAndScoreRepositories', () => {
    const mockSearchArgs = {
      q: 'nestjs',
      sort: 'stars',
      order: 'desc',
      per_page: 10,
      page: 1,
    };

    const mockSearchResponse = {
      total_count: 100,
      incomplete_results: false,
      items: [
        {
          owner: 'nestjs',
          name: 'nest',
          watchers_count: 50000,
          forks_count: 10000,
          updated_at: new Date('2024-01-01'),
        },
        {
          owner: 'nestjs',
          name: 'awesome-nestjs',
          watchers_count: 5000,
          forks_count: 1000,
          updated_at: new Date('2024-01-02'),
        },
      ],
    };

    it('should search repositories and add scores to all items', async () => {
      mockGitHubService.searchRepositories.mockResolvedValue(mockSearchResponse);

      // Mock weightedLinearRating to return predictable values
      jest.spyOn(service, 'weightedLinearRating').mockReturnValueOnce(12345).mockReturnValueOnce(6789);

      const result = await service.searchAndScoreRepositories(mockSearchArgs);

      expect(mockGitHubService.searchRepositories).toHaveBeenCalledWith(mockSearchArgs);
      expect(result).toEqual({
        total_count: 100,
        incomplete_results: false,
        items: [
          { ...mockSearchResponse.items[0], score: 12345 },
          { ...mockSearchResponse.items[1], score: 6789 },
        ],
      });
      expect(service.weightedLinearRating).toHaveBeenCalledTimes(2);
      expect(service.weightedLinearRating).toHaveBeenCalledWith(mockSearchResponse.items[0]);
      expect(service.weightedLinearRating).toHaveBeenCalledWith(mockSearchResponse.items[1]);
    });

    it('should preserve pagination metadata', async () => {
      const paginatedResponse = {
        total_count: 500,
        incomplete_results: true,
        items: [
          {
            owner: 'test',
            name: 'repo1',
            watchers_count: 100,
            forks_count: 50,
            updated_at: new Date(),
          },
        ],
      };
      mockGitHubService.searchRepositories.mockResolvedValue(paginatedResponse);
      jest.spyOn(service, 'weightedLinearRating').mockReturnValue(100);

      const result = await service.searchAndScoreRepositories({
        q: 'test',
        per_page: 5,
        page: 2,
      });

      expect(result.total_count).toBe(500);
      expect(result.incomplete_results).toBe(true);
    });

    it('should calculate scores correctly for multiple repositories', async () => {
      const recentDate = new Date();
      recentDate.setDate(recentDate.getDate() - 10);

      const oldDate = new Date();
      oldDate.setDate(oldDate.getDate() - 100);

      const searchResponse = {
        total_count: 2,
        incomplete_results: false,
        items: [
          {
            owner: 'repo1',
            name: 'popular-recent',
            watchers_count: 1000,
            forks_count: 200,
            updated_at: recentDate,
          },
          {
            owner: 'repo2',
            name: 'popular-old',
            watchers_count: 1000,
            forks_count: 200,
            updated_at: oldDate,
          },
        ],
      };

      mockGitHubService.searchRepositories.mockResolvedValue(searchResponse);

      const result = await service.searchAndScoreRepositories(mockSearchArgs);

      // Recent repo should have higher score due to recency factor
      expect(result.items[0].score).toBeGreaterThan(result.items[1].score);
    });

    it('should propagate errors from GitHubService', async () => {
      const error = new Error('Search API failed');
      mockGitHubService.searchRepositories.mockRejectedValue(error);

      await expect(service.searchAndScoreRepositories(mockSearchArgs)).rejects.toThrow('Search API failed');
      expect(mockGitHubService.searchRepositories).toHaveBeenCalledWith(mockSearchArgs);
    });

    it('should handle repositories with zero watchers and forks', async () => {
      const searchResponse = {
        total_count: 1,
        incomplete_results: false,
        items: [
          {
            owner: 'empty',
            name: 'empty-repo',
            watchers_count: 0,
            forks_count: 0,
            updated_at: new Date(),
          },
        ],
      };
      mockGitHubService.searchRepositories.mockResolvedValue(searchResponse);
      jest.spyOn(service, 'weightedLinearRating').mockReturnValue(0);

      const result = await service.searchAndScoreRepositories({ q: 'empty' });

      expect(result.items[0].score).toBe(0);
    });
  });

  describe('Integration of scoring logic', () => {
    it('should apply correct recency factor based on days since update', () => {
      const baseRepo = {
        owner: 'test',
        name: 'test',
        watchers_count: 100,
        forks_count: 50,
        updated_at: new Date(),
      };

      // Test each recency bracket
      const testCases = [
        { daysAgo: 5, expectedFactor: 1.0 },
        { daysAgo: 14, expectedFactor: 0.9 },
        { daysAgo: 60, expectedFactor: 0.7 },
        { daysAgo: 120, expectedFactor: 0.5 },
        { daysAgo: 200, expectedFactor: 0.3 },
        { daysAgo: 365, expectedFactor: 0.1 },
      ];

      testCases.forEach(({ daysAgo, expectedFactor }) => {
        const date = new Date();
        date.setDate(date.getDate() - daysAgo);
        const repo = { ...baseRepo, updated_at: date };

        const expectedScore = Math.round((100 * 0.6 + 50 * 0.2) * expectedFactor);
        expect(service.weightedLinearRating(repo)).toBe(expectedScore);
      });
    });

    it('should prioritize recent high-watcher repos over older ones with similar metrics', () => {
      const recentHighWatchers = {
        owner: 'recent',
        name: 'recent',
        watchers_count: 1000,
        forks_count: 100,
        updated_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // 5 days ago
      };

      const oldHighWatchers = {
        owner: 'old',
        name: 'old',
        watchers_count: 1000,
        forks_count: 100,
        updated_at: new Date(Date.now() - 300 * 24 * 60 * 60 * 1000), // 300 days ago
      };

      const recentScore = service.weightedLinearRating(recentHighWatchers);
      const oldScore = service.weightedLinearRating(oldHighWatchers);

      expect(recentScore).toBeGreaterThan(oldScore);
    });
  });
});
