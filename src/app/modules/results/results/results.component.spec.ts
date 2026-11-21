import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';
import { Router } from '@angular/router';
import { of } from 'rxjs';
import { AuthService } from '../../../shared/services/auth.service';
import { TestResult, TestService } from '../../../shared/services/test.service';

import { ResultsComponent } from './results.component';

describe('ResultsComponent', () => {
  let component: ResultsComponent;
  let fixture: ComponentFixture<ResultsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ResultsComponent],
      providers: [
        { provide: TestService, useValue: { getStudentResults: () => of([]) } },
        { provide: AuthService, useValue: { currentUser: () => null } },
        { provide: Router, useValue: { navigate: () => Promise.resolve(true) } },
        { provide: MatDialog, useValue: {} }
      ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ResultsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('sorts each result column in both directions and keeps missing ranks last', () => {
    const makeResult = (
      id: string,
      title: string,
      score: number,
      percentage: number,
      rank: number | undefined,
      submittedAt: string
    ): TestResult => ({
      _id: id,
      test: { _id: `test-${id}`, title, startTime: submittedAt, duration: 60 },
      score,
      totalMarks: 100,
      percentage,
      rank,
      totalStudents: 3,
      submittedAt,
      timeTaken: 120,
      videoLink: ''
    });

    component.results.set([
      makeResult('alpha', 'Alpha', 50, 70, 2, '2026-02-01T10:00:00Z'),
      makeResult('beta', 'Beta', 30, 90, undefined, '2026-01-03T10:00:00Z'),
      makeResult('gamma', 'Gamma', 40, 60, 1, '2026-01-04T10:00:00Z')
    ]);

    const cases = [
      { active: 'test', direction: 'asc' as const, first: 'alpha' },
      { active: 'test', direction: 'desc' as const, first: 'gamma' },
      { active: 'score', direction: 'asc' as const, first: 'beta' },
      { active: 'score', direction: 'desc' as const, first: 'alpha' },
      { active: 'percentage', direction: 'asc' as const, first: 'gamma' },
      { active: 'percentage', direction: 'desc' as const, first: 'beta' },
      { active: 'rank', direction: 'asc' as const, first: 'gamma' },
      { active: 'submittedAt', direction: 'asc' as const, first: 'beta' },
      { active: 'submittedAt', direction: 'desc' as const, first: 'alpha' }
    ];

    cases.forEach(({ active, direction, first }) => {
      component.onSortChange({ active, direction });
      expect(component.sortedResults()[0]._id).withContext(`${active} ${direction}`).toBe(first);
    });

    component.onSortChange({ active: 'rank', direction: 'desc' });
    expect(component.sortedResults()[component.sortedResults().length - 1]._id).toBe('beta');
  });

  it('toggles the mobile sort direction for the selected column', () => {
    component.selectSortColumn('score');
    expect(component.sortState()).toEqual({ active: 'score', direction: 'asc' });

    component.toggleSortDirection();
    expect(component.sortState()).toEqual({ active: 'score', direction: 'desc' });
  });

  it('searches result values and resets pagination when the filter changes', () => {
    const makeResult = (id: string, title: string, score: number, submittedAt: string): TestResult => ({
      _id: id,
      test: { _id: `test-${id}`, title, startTime: submittedAt, duration: 60 },
      score,
      totalMarks: 60,
      percentage: score / 60 * 100,
      rank: 1,
      totalStudents: 2,
      submittedAt,
      timeTaken: 120,
      videoLink: ''
    });

    component.results.set([
      makeResult('alpha', 'Alpha Practice', 20, '2026-01-01T10:00:00Z'),
      makeResult('beta', 'Beta Practice', 30, '2026-01-02T10:00:00Z')
    ]);
    component.pageSize.set(1);
    component.onPageChange({ pageIndex: 1, pageSize: 1, length: 2 });
    expect(component.pagedResults()[0]._id).toBe('alpha');

    component.onSearchChange('30/60');
    expect(component.pageIndex()).toBe(0);
    expect(component.filteredResults().map(result => result._id)).toEqual(['beta']);
    expect(component.pagedResults()[0]._id).toBe('beta');

    component.onSearchChange('1st');
    expect(component.filteredResults().length).toBe(2);

    component.onSearchChange('no matching result');
    expect(component.filteredResults()).toEqual([]);
  });
});
