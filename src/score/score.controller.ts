import { Controller, Get, Param } from '@nestjs/common';
import { ScoreService } from './score.service';
import { RepositoryScoreDto } from './dto/repository-score.dto';

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
}
