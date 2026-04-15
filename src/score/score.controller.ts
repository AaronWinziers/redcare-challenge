import { Controller, Get, Param, Query } from '@nestjs/common';
import { ScoreService } from './score.service';
import { PaginatedRepositoryScoreDto, RepositoryScoreDto } from './dto/repository-score.dto';
import { ApiQuery } from '@nestjs/swagger';
import { SearchRepositoriesQuery } from './dto/repository-search.input';

@Controller('score')
export class ScoreController {
  constructor(private readonly scoreService: ScoreService) {}

  @Get(':owner/:repoName')
  async scoreRepository(
    @Param('owner') owner: string,
    @Param('repoName') repoName: string,
  ): Promise<RepositoryScoreDto> {
    return this.scoreService.scoreRepository({ owner, repoName });
  }

  @Get('/search')
  @ApiQuery({
    name: 'q',
    required: true,
    description:
      'Query string, using the same keyword and qualifier structure as in [GitHub queries](https://docs.github.com/en/search-github/searching-on-github/searching-for-repositories)',
  })
  @ApiQuery({
    name: 'sort',
    required: false,
    type: 'string',
    enum: ['stars', 'forks', 'help-wanted-issues', 'updated'],
  })
  @ApiQuery({ name: 'order', required: false, type: 'string', enum: ['asc', 'desc'] })
  @ApiQuery({ name: 'per_page', required: false })
  @ApiQuery({ name: 'page', required: false })
  async searchRepositories(@Query() query: SearchRepositoriesQuery): Promise<PaginatedRepositoryScoreDto> {
    return this.scoreService.searchAndScoreRepositories(query);
  }
}
