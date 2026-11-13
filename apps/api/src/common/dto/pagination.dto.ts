import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';

export class PageQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize: number = 20;

  get skip(): number {
    return (this.page - 1) * this.pageSize;
  }
}

export class PageMetaDto {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

/** Returned by services; the response interceptor splits it into `data` and `meta`. */
export class Page<T> {
  readonly meta: PageMetaDto;

  constructor(
    readonly items: T[],
    total: number,
    query: Pick<PageQueryDto, 'page' | 'pageSize'>,
  ) {
    this.meta = {
      page: query.page,
      pageSize: query.pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / query.pageSize)),
    };
  }
}
