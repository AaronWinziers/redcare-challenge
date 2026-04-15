import { Module } from '@nestjs/common';
import { ScoreService } from './score.service';
import { ScoreController } from './score.controller';
import { GitHubService } from './gitHub.service';
import { HttpModule } from '@nestjs/axios';

@Module({
  imports: [HttpModule],
  controllers: [ScoreController],
  providers: [ScoreService, GitHubService],
})
export class ScoreModule {}
