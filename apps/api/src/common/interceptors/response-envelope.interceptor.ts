import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { map, Observable } from 'rxjs';
import { Page } from '../dto/pagination.dto.js';

/** Wraps successful responses as `{ data }`, or `{ data, meta }` for pages. */
@Injectable()
export class ResponseEnvelopeInterceptor implements NestInterceptor {
  intercept(_context: ExecutionContext, next: CallHandler): Observable<unknown> {
    return next.handle().pipe(
      map((result: unknown) => {
        if (result === undefined) return undefined;
        if (result instanceof Page) return { data: result.items, meta: result.meta };
        return { data: result };
      }),
    );
  }
}
