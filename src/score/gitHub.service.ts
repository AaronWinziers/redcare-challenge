import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';

type FetchRepositoryArgs = {
  owner: string;
  repoName: string;
};

type FetchedRepository = {
  owner: {
    login: string;
  };
  name: string;
  watchers_count: number;
  forks_count: number;
  subscribers_count: number;
  updated_at: Date;
};

export type RepoMetadata = {
  owner: string;
  name: string;
  watchers_count: number;
  forks_count: number;
  subscribers_count: number;
  updated_at: Date;
};

@Injectable()
export class GitHubService {
  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    this.GITHUB_API_VERSION = this.configService.get<string>('GITHUB_API_VERSION')!;
    this.GITHUB_API = this.configService.get<string>('GITHUB_API_URL')!;
  }

  GITHUB_API: string;
  GITHUB_API_VERSION: string;

  async fetchRepository({ owner, repoName }: FetchRepositoryArgs): Promise<RepoMetadata> {
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
      subscribers_count: data.subscribers_count,
      updated_at: data.updated_at,
    };
  }
}
