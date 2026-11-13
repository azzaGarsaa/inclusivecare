import { Page } from './pagination.dto.js';

describe('Page', () => {
  it('computes the number of pages', () => {
    expect(new Page([], 41, { page: 2, pageSize: 20 }).meta).toEqual({
      page: 2,
      pageSize: 20,
      total: 41,
      totalPages: 3,
    });
  });

  it('reports one page when there is nothing to show', () => {
    expect(new Page([], 0, { page: 1, pageSize: 20 }).meta.totalPages).toBe(1);
  });
});
