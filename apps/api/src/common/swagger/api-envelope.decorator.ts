import { applyDecorators, Type } from '@nestjs/common';
import { ApiExtraModels, ApiResponse, getSchemaPath } from '@nestjs/swagger';
import { PageMetaDto } from '../dto/pagination.dto.js';

/** Documents a `{ data: Model }` response. */
export function ApiData(model: Type<unknown>, status = 200) {
  return applyDecorators(
    ApiExtraModels(model),
    ApiResponse({
      status,
      schema: {
        type: 'object',
        required: ['data'],
        properties: { data: { $ref: getSchemaPath(model) } },
      },
    }),
  );
}

/** Documents a `{ data: Model[], meta }` response. */
export function ApiPage(model: Type<unknown>) {
  return applyDecorators(
    ApiExtraModels(model, PageMetaDto),
    ApiResponse({
      status: 200,
      schema: {
        type: 'object',
        required: ['data', 'meta'],
        properties: {
          data: { type: 'array', items: { $ref: getSchemaPath(model) } },
          meta: { $ref: getSchemaPath(PageMetaDto) },
        },
      },
    }),
  );
}
