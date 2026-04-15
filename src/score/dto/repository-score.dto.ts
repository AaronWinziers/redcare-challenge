import { IsDate, IsInt, IsNumber, IsString } from 'class-validator';

export class RepositoryScoreDto {
  @IsString()
  owner: string;

  @IsString()
  name: string;

  @IsInt()
  watchers_count: number;

  @IsInt()
  forks_count: number;

  @IsDate()
  updated_at: Date;

  @IsNumber({ maxDecimalPlaces: 1 })
  score: number;
}
