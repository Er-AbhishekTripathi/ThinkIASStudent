import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Router } from '@angular/router';
import { of } from 'rxjs';
import { AuthService } from '../../../shared/services/auth.service';
import { TestService } from '../../../shared/services/test.service';

import { isTestExpired, LiveTestsComponent } from './live-tests.component';

describe('LiveTestsComponent', () => {
  let component: LiveTestsComponent;
  let fixture: ComponentFixture<LiveTestsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LiveTestsComponent],
      providers: [
        { provide: AuthService, useValue: { currentUser: () => ({ role: 'student' }) } },
        { provide: TestService, useValue: { getUpcomingTests: () => of([]) } },
        { provide: MatDialog, useValue: {} },
        { provide: MatSnackBar, useValue: {} },
        { provide: Router, useValue: {} }
      ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(LiveTestsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('does not return expired exams from search results', () => {
    component.tests.set([
      { title: 'Closed test', description: '', endTime: new Date(Date.now() - 1000).toISOString() },
      { title: 'Open test', description: '', endTime: new Date(Date.now() + 60_000).toISOString() }
    ]);
    component.search = 'test';

    expect(component.filteredTests.map(test => test.title)).toEqual(['Open test']);
  });

  it('keeps expired exams in the unsearched list so their closed status can be shown', () => {
    const expiredTest = { title: 'Closed test', description: '', endTime: new Date(Date.now() - 1000).toISOString() };
    component.tests.set([expiredTest]);

    expect(component.filteredTests).toEqual([expiredTest]);
    expect(component.isTestExpired(expiredTest)).toBeTrue();
  });

  it('does not treat a stale available status as startable after expiry', () => {
    const expiredTest = {
      title: 'Closed test',
      startTime: new Date(Date.now() - 60_000).toISOString(),
      endTime: new Date(Date.now() - 1000).toISOString(),
      canTake: true
    };

    expect(component.canStartTest(expiredTest)).toBeFalse();
  });
});

describe('isTestExpired', () => {
  const now = new Date('2026-10-08T00:00:00Z').getTime();

  it('detects an expired test', () => {
    expect(isTestExpired({ endTime: '2026-10-07T23:59:59Z' }, now)).toBeTrue();
  });

  it('honors an active reopen deadline', () => {
    expect(isTestExpired({
      endTime: '2026-10-07T23:59:59Z',
      reopenUntil: '2026-10-08T01:00:00Z'
    }, now)).toBeFalse();
  });
});
