import { Test, TestingModule } from '@nestjs/testing';
import { ScoreController } from './score.controller';
import { ScoreService } from './score.service';
import { GitHubService } from './gitHub.service';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';

describe('ScoreController', () => {
  let controller: ScoreController;

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
      controllers: [ScoreController],
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
        ConfigService,
      ],
    }).compile();

    controller = module.get<ScoreController>(ScoreController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
