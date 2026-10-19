import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { environment } from '../../../../environment/environment';
import { PaymentDialogComponent } from '../../dashboard/payment-dialog/payment-dialog.component';
import { AuthService } from '../../../shared/services/auth.service';

@Component({
  selector: 'app-exam-journey',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './exam-journey.component.html',
  styleUrls: ['./exam-journey.component.css']
})
export class ExamJourneyComponent implements OnInit {
  private http = inject(HttpClient);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private dialog = inject(MatDialog);
  private authService = inject(AuthService);

  exams: any[] = [];
  stages: any[] = [];
  programs: any[] = [];
  batches: any[] = [];
  exam: any = null;
  program: any = null;
  selectedYear = '';
  paperTab = '';
  selectedBatch: any = null;
  payMethod = 'upi';
  loading = true;
  error = '';
  view: 'home' | 'exam' | 'plan' | 'batches' | 'payment' = 'home';

  ngOnInit(): void {
    this.http.get<any>(`${environment.apiUrl}/exams`).subscribe({
      next: (response) => { this.exams = response?.data || []; this.syncRoute(); }
    });
    this.http.get<any>(`${environment.apiUrl}/program-stages`).subscribe({
      next: (response) => { this.stages = response?.data || []; }
    });
    this.http.get<any>(`${environment.apiUrl}/programs?activeOnly=true`).subscribe({
      next: (response) => {
        this.programs = Array.isArray(response) ? response : (response?.data || []);
        this.loading = false;
        this.syncRoute();
      },
      error: () => { this.error = 'Unable to load programs.'; this.loading = false; }
    });
    this.route.paramMap.subscribe(() => this.syncRoute());
    this.route.queryParamMap.subscribe(() => this.syncRoute());
  }

  idOf(value: any): string {
    if (!value) return '';
    return typeof value === 'string' ? value : (value._id || value.code || '');
  }

  examName(program: any): string {
    if (program?.examId && typeof program.examId === 'object') return program.examId.name || '';
    return program?.examination || '';
  }

  matchExam(program: any, exam: any): boolean {
    if (!exam) return false;
    const examId = this.idOf(exam);
    const mapped = this.idOf(program?.examId);
    return mapped === examId || program?.examination === exam.name || program?.examination === exam.code;
  }

  stageName(program: any): string {
    return program?.programStage || 'Program';
  }

  examPrograms(exam = this.exam): any[] {
    if (!exam) return [];
    return this.programs.filter((program) => this.matchExam(program, exam));
  }

  programsForStage(stageName: string, exam = this.exam): any[] {
    return this.examPrograms(exam).filter((program) => this.stageName(program) === stageName);
  }

  plansForStage(stageName: string, exam = this.exam): any[] {
    const seen = new Set<string>();
    return this.programsForStage(stageName, exam).filter((program) => {
      const key = program.programCategory || program.programName;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  isCombo(program: any = this.program): boolean {
    const stage = this.stageName(program);
    const name = `${stage} ${program?.programCategory || ''} ${program?.programName || ''}`;
    return /combo|integrated/i.test(name);
  }

  comboIncludes(program: any): Array<{ title: string; detail: string }> {
    if (program?.features?.length) {
      return program.features.map((feature: string) => ({ title: feature, detail: `Included with ${program.programName}.` }));
    }
    return this.examPrograms()
      .filter((item) => !this.isCombo(item))
      .reduce((rows: Array<{ title: string; detail: string }>, item) => {
        const title = `${this.stageName(item)} ${item.programCategory}`;
        if (!rows.some((row) => row.title === title)) rows.push({ title, detail: item.description || item.programName });
        return rows;
      }, []);
  }

  yearsFor(program: any): string[] {
    if (!program || !this.exam) return ['2027', '2028', '2029'];
    const related = this.examPrograms().filter((item) =>
      this.stageName(item) === this.stageName(program) && item.programCategory === program.programCategory
    );
    const years = [...new Set(related.map((item) => item.year).filter(Boolean))].sort();
    return years.length ? years : ['2027', '2028', '2029'];
  }

  paperTabs(program: any): string[] {
    if (!program || !this.exam) return [];
    const related = this.examPrograms().filter((item) =>
      this.stageName(item) === this.stageName(program) &&
      item.programCategory === program.programCategory &&
      (!this.selectedYear || item.year === this.selectedYear)
    );
    return [...new Set(related.map((item) => item.paperVariant).filter(Boolean))];
  }

  paperLabel(tab: string): string {
    if (tab === 'GS') return 'GS-only';
    if (tab === 'GS+CSAT') return 'GS + CSAT';
    return tab;
  }

  displayedProgram(): any {
    if (!this.program) return null;
    const tabs = this.paperTabs(this.program);
    const year = this.selectedYear || this.program.year;
    return this.examPrograms().find((item) =>
      this.stageName(item) === this.stageName(this.program) &&
      item.programCategory === this.program.programCategory &&
      (!year || item.year === year) &&
      (!this.paperTab || item.paperVariant === this.paperTab || (!item.paperVariant && !tabs.length))
    ) || this.program;
  }

  price(program: any): number {
    if (!program) return 0;
    return program.discountedPrice != null ? program.discountedPrice : program.price;
  }

  findExam(id: string): any {
    return this.exams.find((exam) => exam._id === id || exam.code === id || exam.name === id);
  }

  private syncRoute(): void {
    const examId = this.route.snapshot.paramMap.get('examId');
    const programId = this.route.snapshot.paramMap.get('programId');
    const step = this.route.snapshot.paramMap.get('step');
    const year = this.route.snapshot.queryParamMap.get('year') || '';
    const batchId = this.route.snapshot.queryParamMap.get('batch') || '';
    this.exam = examId ? this.findExam(examId) : null;
    this.program = programId ? this.programs.find((item) => item._id === programId) : null;
    if (this.program && this.exam && !this.matchExam(this.program, this.exam)) this.program = null;
    if (this.program) {
      this.selectedYear = year || this.selectedYear || this.program.year || this.yearsFor(this.program)[0] || '';
      this.paperTab = this.paperTab || this.program.paperVariant || '';
    }
    if ((step === 'batches' || step === 'payment') && this.program) {
      this.loadBatches(this.program._id, batchId);
      this.view = step === 'payment' ? 'payment' : 'batches';
    } else if (this.program) this.view = 'plan';
    else if (this.exam) this.view = 'exam';
    else this.view = 'home';
  }

  openExam(exam: any): void {
    this.router.navigate(['/programs', exam._id || exam.code]);
  }

  openPlan(program: any): void {
    const exam = this.exam || this.findExam(this.idOf(program.examId) || program.examination);
    if (!exam) return;
    this.router.navigate(['/programs', exam._id || exam.code, program._id]);
  }

  selectYear(year: string): void {
    this.selectedYear = year;
  }

  selectPaper(tab: string): void {
    this.paperTab = tab;
  }

  goToBatches(): void {
    const current = this.displayedProgram();
    if (!current || !this.exam) return;
    this.router.navigate(['/programs', this.exam._id || this.exam.code, current._id, 'batches'], {
      queryParams: { year: this.selectedYear || current.year }
    });
  }

  loadBatches(programId: string, batchId = ''): void {
    this.http.get<any>(`${environment.apiUrl}/programs/${programId}/batches`).subscribe({
      next: (response) => {
        this.batches = Array.isArray(response) ? response : (response?.data || []);
        this.selectedBatch = this.batches.find((batch) => batch._id === batchId) || this.selectedBatch;
      },
      error: () => { this.batches = []; }
    });
  }

  seatsLeft(batch: any): number | null {
    if (batch?.totalSeats == null) return null;
    return Math.max(0, Number(batch.totalSeats) - Number(batch.filledSeats || 0));
  }

  enroll(batch: any): void {
    const current = this.displayedProgram();
    if (!current || !this.exam) return;
    this.selectedBatch = batch;
    this.router.navigate(['/programs', this.exam._id || this.exam.code, current._id, 'payment'], {
      queryParams: { year: this.selectedYear || current.year, batch: batch._id }
    });
  }

  batchFee(batch: any = this.selectedBatch): number {
    const current = this.displayedProgram();
    const extra = Number(batch?.feeAdjustment || 0);
    return this.price(current) + extra;
  }

  gstAmount(batch: any = this.selectedBatch): number {
    return Math.round(this.batchFee(batch) * 0.18);
  }

  payableTotal(batch: any = this.selectedBatch): number {
    return this.batchFee(batch) + this.gstAmount(batch);
  }

  payNow(): void {
    const current = this.displayedProgram();
    const batch = this.selectedBatch;
    if (!current || !batch) return;
    if (!this.authService.getToken()) {
      this.router.navigate(['/login'], { queryParams: { returnUrl: this.router.url } });
      return;
    }
    this.dialog.open(PaymentDialogComponent, {
      width: '600px',
      maxWidth: '95vw',
      data: { programId: current._id, batchId: batch._id }
    });
  }
}
