import { HttpErrorResponse } from '@angular/common/http';

import { httpStatusOf } from './http-status';

describe('httpStatusOf', () => {
  it('reads the status of an HTTP error, 0 when the server did not answer', () => {
    expect(httpStatusOf(new HttpErrorResponse({ status: 404 }))).toBe(404);
    expect(httpStatusOf(new HttpErrorResponse({ status: 0 }))).toBe(0);
  });

  it('has no status for any other error', () => {
    expect(httpStatusOf(new Error('boom'))).toBeUndefined();
    expect(httpStatusOf(undefined)).toBeUndefined();
  });
});
