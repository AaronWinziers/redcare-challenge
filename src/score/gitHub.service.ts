import {
  ForbiddenException,
  HttpException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { AxiosError } from 'axios';
import { ConfigSchemaType } from '../config/config';

export type SearchRepositoriesArgs = {
  q: string;
  sort?: string;
  order?: string;
  per_page?: number;
  page?: number;
};

export type SearchRepositoriesResponse = {
  total_count: number;
  incomplete_results: boolean;
  items: FetchedRepository[];
};

export type FetchRepositoryArgs = {
  owner: string;
  repoName: string;
};

type BaseMetaData = {
  name: string;
  watchers_count: number;
  forks_count: number;
  updated_at: Date;
};

type FetchedRepository = BaseMetaData & {
  owner: {
    login: string;
  };
};

export type RepositoryMetadata = BaseMetaData & {
  owner: string;
};

export type PaginatedRepositoryMetadata = {
  total_count: number;
  incomplete_results: boolean;
  items: RepositoryMetadata[];
};

@Injectable()
export class GitHubService {
  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService<ConfigSchemaType, true>,
  ) {
    this.GITHUB_API_VERSION = this.configService.get<string>('GITHUB_API_VERSION');
    this.GITHUB_API = this.configService.get<string>('GITHUB_API_URL');
  }

  GITHUB_API: string;
  GITHUB_API_VERSION: string;

  async fetchRepository({ owner, repoName }: FetchRepositoryArgs): Promise<RepositoryMetadata> {
    try {
      const { data } = await firstValueFrom(
        this.httpService.get<FetchedRepository>(`${this.GITHUB_API}/repos/${owner}/${repoName}`, {
          responseType: 'json',
          headers: {
            'X-GitHub-Api-Version': this.GITHUB_API_VERSION,
          },
        }),
      );

      return {
        owner: data.owner.login,
        name: data.name,
        watchers_count: data.watchers_count,
        forks_count: data.forks_count,
        updated_at: data.updated_at,
      };
    } catch (e) {
      if (e instanceof AxiosError) {
        this.githubErrorHandler(e);
      }
      throw e;
    }
  }

  async searchRepositories(args: SearchRepositoriesArgs): Promise<PaginatedRepositoryMetadata> {
    try {
      const res = await firstValueFrom(
        this.httpService.get<SearchRepositoriesResponse>(`${this.GITHUB_API}/search/repositories`, {
          params: args,
          responseType: 'json',
          headers: {
            'X-GitHub-Api-Version': this.GITHUB_API_VERSION,
          },
        }),
      );

      return {
        total_count: res.data.total_count,
        incomplete_results: res.data.incomplete_results,
        items: res.data.items.map((repo) => ({
          owner: repo.owner.login,
          name: repo.name,
          watchers_count: repo.watchers_count,
          forks_count: repo.forks_count,
          updated_at: repo.updated_at,
        })),
      };
    } catch (e) {
      if (e instanceof AxiosError) {
        this.githubErrorHandler(e);
      }
      throw e;
    }
  }

  githubErrorHandler(e: AxiosError) {
    if (e.status === 401) {
      throw new UnauthorizedException();
    }
    if (e.status === 403) {
      throw new ForbiddenException();
    }
    if (e.status === 404) {
      throw new NotFoundException('Repository not found');
    }
    if (e.status === 422) {
      throw new HttpException('Validation failed', 422);
    }
    throw new InternalServerErrorException();
  }
}
