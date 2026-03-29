import { ComponentFixture, TestBed } from '@angular/core/testing';

import { NasaPicture } from './nasa-picture';

describe('NasaPicture', () => {
  let component: NasaPicture;
  let fixture: ComponentFixture<NasaPicture>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NasaPicture]
    })
    .compileComponents();

    fixture = TestBed.createComponent(NasaPicture);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
