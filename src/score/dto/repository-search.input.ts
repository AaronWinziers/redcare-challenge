import { IsIn, IsInt, IsOptional, IsPositive, IsString } from 'class-validator';

const sorts = ['asc', 'desc'];

export class SearchRepositoriesQuery {
  @IsString()
  q: string;

  @IsString()
  @IsOptional()
  sort: string;

  @IsString()
  @IsIn(sorts)
  @IsOptional()
  order: string;

  @IsInt()
  @IsPositive()
  @IsOptional()
  per_page: number;

  @IsInt()
  @IsPositive()
  @IsOptional()
  page: number;
}
