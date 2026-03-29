import { TestBed } from '@angular/core/testing';

import { NasaPictureResource } from './nasa-picture';

describe('NasaPictureResource', () => {
  let service: NasaPictureResource;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(NasaPictureResource);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
