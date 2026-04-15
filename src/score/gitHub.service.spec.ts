import { Test, TestingModule } from '@nestjs/testing';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { of, throwError } from 'rxjs';
import { AxiosError, AxiosResponse } from 'axios';
import { ForbiddenException, HttpException, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { FetchedRepository, GitHubService, SearchRepositoriesResponse } from './gitHub.service';
import { ScoreService } from './score.service';

describe('GitHubService', () => {
  let service: GitHubService;

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
        GitHubService,
        ScoreService,
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

    service = module.get<GitHubService>(GitHubService);

    // Clear all mocks before each test
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('fetchRepository', () => {
    const mockFetchArgs = {
      owner: 'facebook',
      repoName: 'react',
    };

    const mockApiResponse: AxiosResponse<FetchedRepository> = {
      data: {
        owner: { login: 'facebook' },
        name: 'react',
        watchers_count: 100000,
        forks_count: 50000,
        updated_at: new Date('2024-01-01'),
      },
      status: 200,
      statusText: 'OK',
      headers: {},
      config: {},
    };

    const expectedRepositoryMetadata = {
      owner: 'facebook',
      name: 'react',
      watchers_count: 100000,
      forks_count: 50000,
      updated_at: mockApiResponse.data.updated_at,
    };

    it('should successfully fetch a repository', async () => {
      mockHttpService.get.mockReturnValueOnce(of(mockApiResponse));

      const result = await service.fetchRepository(mockFetchArgs);

      expect(result).toEqual(expectedRepositoryMetadata);
      expect(mockHttpService.get).toHaveBeenCalledWith(
        'https://api.github.com/repos/facebook/react',
        expect.objectContaining({
          responseType: 'json',
          headers: {
            'X-GitHub-Api-Version': '2026-03-10',
          },
        }),
      );
    });

    it('should throw UnauthorizedException when GitHub returns 401', async () => {
      const axiosError = new AxiosError();
      axiosError.status = 401;
      mockHttpService.get.mockReturnValueOnce(throwError(() => axiosError));

      await expect(service.fetchRepository(mockFetchArgs)).rejects.toThrow(UnauthorizedException);
    });

    it('should throw ForbiddenException when GitHub returns 403', async () => {
      const axiosError = new AxiosError();
      axiosError.status = 403;
      mockHttpService.get.mockReturnValueOnce(throwError(() => axiosError));

      await expect(service.fetchRepository(mockFetchArgs)).rejects.toThrow(ForbiddenException);
    });

    it('should throw NotFoundException when GitHub returns 404', async () => {
      const axiosError = new AxiosError();
      axiosError.status = 404;
      mockHttpService.get.mockReturnValueOnce(throwError(() => axiosError));

      await expect(service.fetchRepository(mockFetchArgs)).rejects.toThrow(NotFoundException);
    });

    it('should re-throw non-Axios errors', async () => {
      const genericError = new Error('Something went wrong');
      mockHttpService.get.mockReturnValueOnce(throwError(() => genericError));

      await expect(service.fetchRepository(mockFetchArgs)).rejects.toThrow('Something went wrong');
    });
  });

  describe('searchRepositories', () => {
    const mockSearchArgs = {
      q: 'nestjs',
      sort: 'stars',
      order: 'desc',
      per_page: 10,
      page: 1,
    };

    const mockApiResponse: AxiosResponse<SearchRepositoriesResponse> = {
      data: {
        total_count: 100,
        incomplete_results: false,
        items: [
          {
            owner: { login: 'nestjs' },
            name: 'nest',
            watchers_count: 50000,
            forks_count: 10000,
            updated_at: new Date('2024-01-01'),
          },
          {
            owner: { login: 'nestjs' },
            name: 'awesome-nestjs',
            watchers_count: 5000,
            forks_count: 1000,
            updated_at: new Date('2024-01-02'),
          },
        ],
      },
      status: 200,
      statusText: 'OK',
      headers: {},
      config: { headers: {} as any },
    };

    const expectedPaginatedMetadata = {
      total_count: 100,
      incomplete_results: false,
      items: [
        {
          owner: 'nestjs',
          name: 'nest',
          watchers_count: 50000,
          forks_count: 10000,
          updated_at: mockApiResponse.data.items[0].updated_at,
        },
        {
          owner: 'nestjs',
          name: 'awesome-nestjs',
          watchers_count: 5000,
          forks_count: 1000,
          updated_at: mockApiResponse.data.items[1].updated_at,
        },
      ],
    };

    it('should successfully search repositories with all parameters', async () => {
      mockHttpService.get.mockReturnValueOnce(of(mockApiResponse));

      const result = await service.searchRepositories(mockSearchArgs);

      expect(result).toEqual(expectedPaginatedMetadata);
      expect(mockHttpService.get).toHaveBeenCalledWith(
        'https://api.github.com/search/repositories',
        expect.objectContaining({
          params: mockSearchArgs,
          responseType: 'json',
          headers: {
            'X-GitHub-Api-Version': '2026-03-10',
          },
        }),
      );
    });

    it('should successfully search repositories with minimal parameters', async () => {
      const minimalArgs = { q: 'typescript' };
      const minimalApiResponse: AxiosResponse = {
        ...mockApiResponse,
        data: {
          total_count: 1,
          incomplete_results: false,
          items: [mockApiResponse.data.items[0]],
        },
      };
      mockHttpService.get.mockReturnValueOnce(of(minimalApiResponse));

      const result = await service.searchRepositories(minimalArgs);

      expect(result.total_count).toBe(1);
      expect(result.items).toHaveLength(1);
      expect(mockHttpService.get).toHaveBeenCalledWith(
        'https://api.github.com/search/repositories',
        expect.objectContaining({
          params: minimalArgs,
        }),
      );
    });

    it('should handle empty search results', async () => {
      const emptyResponse: AxiosResponse = {
        data: {
          total_count: 0,
          incomplete_results: false,
          items: [],
        },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: { headers: {} as any },
      };
      mockHttpService.get.mockReturnValueOnce(of(emptyResponse));

      const result = await service.searchRepositories({ q: 'nonexistent-repo-xyz' });

      expect(result.total_count).toBe(0);
      expect(result.items).toHaveLength(0);
      expect(result.incomplete_results).toBe(false);
    });

    it('should throw UnauthorizedException when GitHub returns 401', async () => {
      const axiosError = new AxiosError();
      axiosError.status = 401;
      mockHttpService.get.mockReturnValueOnce(throwError(() => axiosError));

      await expect(service.searchRepositories(mockSearchArgs)).rejects.toThrow(UnauthorizedException);
    });

    it('should throw ForbiddenException when GitHub returns 403', async () => {
      const axiosError = new AxiosError();
      axiosError.status = 403;
      mockHttpService.get.mockReturnValueOnce(throwError(() => axiosError));

      await expect(service.searchRepositories(mockSearchArgs)).rejects.toThrow(ForbiddenException);
    });

    it('should throw NotFoundException when GitHub returns 404', async () => {
      const axiosError = new AxiosError();
      axiosError.status = 404;
      mockHttpService.get.mockReturnValueOnce(throwError(() => axiosError));

      await expect(service.searchRepositories(mockSearchArgs)).rejects.toThrow(NotFoundException);
    });

    it('should throw HttpException with status 422 when GitHub returns 422', async () => {
      const axiosError = new AxiosError();
      axiosError.status = 422;
      mockHttpService.get.mockReturnValueOnce(throwError(() => axiosError));

      await expect(service.searchRepositories(mockSearchArgs)).rejects.toThrow(HttpException);
    });

    it('should re-throw non-Axios errors', async () => {
      const genericError = new Error('Network failure');
      mockHttpService.get.mockReturnValueOnce(throwError(() => genericError));

      await expect(service.searchRepositories(mockSearchArgs)).rejects.toThrow('Network failure');
    });

    it('should re-throw AxiosError without matching status code', async () => {
      const axiosError = new AxiosError();
      axiosError.status = 502;
      axiosError.message = 'Bad Gateway';
      mockHttpService.get.mockReturnValueOnce(throwError(() => axiosError));

      await expect(service.searchRepositories(mockSearchArgs)).rejects.toThrow(axiosError);
    });

    it('should handle pagination parameters correctly', async () => {
      const paginationArgs = {
        q: 'nestjs',
        per_page: 5,
        page: 2,
      };
      mockHttpService.get.mockReturnValueOnce(of(mockApiResponse));

      await service.searchRepositories(paginationArgs);

      expect(mockHttpService.get).toHaveBeenCalledWith(
        'https://api.github.com/search/repositories',
        expect.objectContaining({
          params: paginationArgs,
        }),
      );
    });

    it('should handle sort and order parameters correctly', async () => {
      const sortArgs = {
        q: 'nestjs',
        sort: 'updated',
        order: 'asc',
      };
      mockHttpService.get.mockReturnValueOnce(of(mockApiResponse));

      await service.searchRepositories(sortArgs);

      expect(mockHttpService.get).toHaveBeenCalledWith(
        'https://api.github.com/search/repositories',
        expect.objectContaining({
          params: sortArgs,
        }),
      );
    });
  });

  describe('Configuration', () => {
    it('should use the correct GitHub API URL from config', async () => {
      const mockApiResponse: AxiosResponse = {
        data: {
          owner: { login: 'test' },
          name: 'test-repo',
          watchers_count: 100,
          forks_count: 50,
          updated_at: new Date(),
        },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: { headers: {} as any },
      };
      mockHttpService.get.mockReturnValueOnce(of(mockApiResponse));

      await service.fetchRepository({ owner: 'test', repoName: 'test-repo' });

      expect(mockHttpService.get).toHaveBeenCalledWith(
        expect.stringContaining('https://api.github.com'),
        expect.any(Object),
      );
    });

    it('should use the correct GitHub API version from config', async () => {
      const mockApiResponse: AxiosResponse = {
        data: {
          owner: { login: 'test' },
          name: 'test-repo',
          watchers_count: 100,
          forks_count: 50,
          updated_at: new Date(),
        },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: { headers: {} as any },
      };
      mockHttpService.get.mockReturnValueOnce(of(mockApiResponse));

      await service.fetchRepository({ owner: 'test', repoName: 'test-repo' });

      expect(mockHttpService.get).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: {
            'X-GitHub-Api-Version': '2026-03-10',
          },
        }),
      );
    });
  });
});
