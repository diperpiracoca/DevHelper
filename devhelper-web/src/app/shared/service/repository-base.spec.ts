import { TestBed } from '@angular/core/testing';

import { RepositoryBase } from './repository-base';

describe('RepositoryBase', () => {
  let service: RepositoryBase;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(RepositoryBase);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
