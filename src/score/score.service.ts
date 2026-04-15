import { Injectable } from '@nestjs/common';
import { FetchRepositoryArgs, GitHubService, RepositoryMetadata, SearchRepositoriesArgs } from './gitHub.service';
import { PaginatedRepositoryScoreDto, RepositoryScoreDto } from './dto/repository-score.dto';

@Injectable()
export class ScoreService {
  constructor(private readonly gitHubService: GitHubService) {}

  ONE_DAY = 24 * 60 * 60 * 1000;

  daysSince(date: Date): number {
    return Math.round(Math.abs((date.valueOf() - new Date().valueOf()) / this.ONE_DAY));
  }

  weightedLinearRating({ watchers_count = 0, forks_count = 0, updated_at }: RepositoryMetadata): number {
    const daysSince = this.daysSince(updated_at);

    let recencyFactor: number;
    if (daysSince < 7) recencyFactor = 1;
    else if (daysSince < 30) recencyFactor = 0.9;
    else if (daysSince < 90) recencyFactor = 0.7;
    else if (daysSince < 180) recencyFactor = 0.5;
    else if (daysSince < 270) recencyFactor = 0.3;
    else recencyFactor = 0.1;

    return Math.round((watchers_count * 0.6 + forks_count * 0.2) * recencyFactor);
  }

  async scoreRepository(args: FetchRepositoryArgs): Promise<RepositoryScoreDto> {
    const repoMeta = await this.gitHubService.fetchRepository(args);
    return {
      ...repoMeta,
      score: this.weightedLinearRating(repoMeta),
    };
  }

  async searchAndScoreRepositories(args: SearchRepositoriesArgs): Promise<PaginatedRepositoryScoreDto> {
    const repoMetas = await this.gitHubService.searchRepositories(args);
    return {
      ...repoMetas,
      items: repoMetas.items.map((repo) => ({ ...repo, score: this.weightedLinearRating(repo) })),
    };
  }
}
