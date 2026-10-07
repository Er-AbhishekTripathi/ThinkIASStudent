import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClient } from '@angular/common/http';
import { MatDialog } from '@angular/material/dialog';
import { Router } from '@angular/router';
import { of } from 'rxjs';

import { DashboardComponent, filterUpcomingTests } from './dashboard.component';
import { AuthService } from '../../shared/services/auth.service';
import { LiveTestService } from '../../shared/services/live-test.service';
import { PublicPlanService } from '../../shared/services/public-plan.service';
import { TestService } from '../../shared/services/test.service';
import { UserService } from '../../shared/services/user.service';

describe('DashboardComponent', () => {
  let component: DashboardComponent;
  let fixture: ComponentFixture<DashboardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DashboardComponent],
      providers: [
        { provide: AuthService, useValue: { currentUser: () => null } },
        { provide: TestService, useValue: {} },
        { provide: LiveTestService, useValue: {} },
        { provide: UserService, useValue: { getActivePlanIds: () => of({ planIds: [] }) } },
        { provide: PublicPlanService, useValue: { getPlans: () => of([]) } },
        { provide: HttpClient, useValue: {} },
        { provide: Router, useValue: {} },
        { provide: MatDialog, useValue: {} }
      ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DashboardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

describe('filterUpcomingTests', () => {
  const now = new Date('2026-10-08T00:00:00Z').getTime();

  it('keeps tests the student has not submitted that have not expired', () => {
    const tests = [
      { _id: 'future', title: 'Future', description: '', startTime: '', endTime: '2026-10-09T00:00:00Z', duration: 30, questions: [], submitted: false },
      { _id: 'active', title: 'Active', description: '', startTime: '', endTime: '2026-10-08T01:00:00Z', duration: 30, questions: [], submitted: false },
      { _id: 'submitted', title: 'Submitted', description: '', startTime: '', endTime: '2026-10-09T00:00:00Z', duration: 30, questions: [], submitted: true },
      { _id: 'expired', title: 'Expired', description: '', startTime: '', endTime: '2026-10-07T23:59:59Z', duration: 30, questions: [], submitted: false }
    ];

    expect(filterUpcomingTests(tests, now).map(test => test._id)).toEqual(['future', 'active']);
  });

  it('uses an active reopen deadline instead of the original expiry', () => {
    const tests = [
      { _id: 'reopened', title: 'Reopened', description: '', startTime: '', endTime: '2026-10-07T23:00:00Z', reopenUntil: '2026-10-08T01:00:00Z', duration: 30, questions: [], submitted: false }
    ];

    expect(filterUpcomingTests(tests, now).map(test => test._id)).toEqual(['reopened']);
  });
});
