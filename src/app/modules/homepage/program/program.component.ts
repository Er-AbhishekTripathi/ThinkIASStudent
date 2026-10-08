import { TranslatePipe } from '../../../shared/i18n/translate.pipe';
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClientModule, HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { environment } from '../../../../environment/environment';

export interface Program {
  _id?: string;
  programName: string;
  programNameHindi?: string; descriptionHindi?: string; durationHindi?: string; featuresHindi?: string[]; displayImageHindi?: string;
  programCategory: string;
  examination?: string;
  programStage?: string;
  paperVariant?: string;
  year: string;
  price: number;
  displayImage: string;
  discountedPrice?: number;
  description?: string;
  features?: string[];
  duration?: string;
  isActive?: boolean;
  order?: number;
}

@Component({
  selector: 'app-program',
  standalone: true,
  imports: [TranslatePipe, CommonModule, HttpClientModule, FormsModule, RouterModule],
  templateUrl: './program.component.html',
  styleUrls: ['./program.component.css']
})
export class ProgramComponent implements OnInit {
  allPrograms: Program[] = [];
  filteredPrograms: Program[] = [];
  categories: string[] = ['All'];
  examinations: string[] = ['All'];
  stages: string[] = ['All'];
  years: string[] = [];
  plans: any[] = [];
  
  // Filter selections: examination, then program, then plan, then year
  selectedExamination: string = 'All';
  selectedStage: string = 'All';
  selectedCategory: string = 'All';
  selectedYear: string = 'All';
  
  isLoading = true;
  errorMessage = '';

  constructor(
    private http: HttpClient,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    this.route.queryParamMap.subscribe((params) => {
      this.selectedExamination = params.get('examination') || this.selectedExamination;
      this.selectedStage = params.get('stage') || this.selectedStage;
      this.selectedCategory = params.get('category') || this.selectedCategory;
      this.applyFilters();
    });
    this.http.get<any>(`${environment.apiUrl}/exams`).subscribe({
      next: (response) => {
        const names = (response?.data || []).map((exam: any) => exam.name).filter(Boolean);
        this.examinations = ['All', ...names];
      }
    });
    this.http.get<any>(`${environment.apiUrl}/program-stages`).subscribe({
      next: (response) => {
        const names = (response?.data || []).map((item: any) => item.name).filter(Boolean);
        this.stages = ['All', ...names];
      }
    });
    this.http.get<any>(`${environment.apiUrl}/plans`).subscribe({
      next: (response) => {
        this.plans = Array.isArray(response) ? response : (response?.data || []);
        this.refreshCategories();
      }
    });
    this.fetchPrograms();
  }

  private unique(values: string[]): string[] {
    return [...new Set(values.filter(Boolean))];
  }

  examName(program: Program): string {
    const mapped = (program as any).examId;
    if (mapped && typeof mapped === 'object' && mapped.name) return mapped.name;
    return program.examination || '';
  }

  idOf(value: any): string {
    if (!value) return '';
    return typeof value === 'string' ? value : (value._id || '');
  }

  refreshCategories(): void {
    this.categories = ['All', ...this.unique([
      ...this.plans.map((plan) => plan.name),
      ...this.allPrograms.map((program) => program.programCategory)
    ])];
  }

  // Fetch active programs from backend
  fetchPrograms(): void {
    this.isLoading = true;
    this.http.get<any>(`${environment.apiUrl}/programs?activeOnly=true`).subscribe({
      next: (response) => {
        if (response && response.success && response.data) {
          this.allPrograms = response.data;
        } else if (Array.isArray(response)) {
          this.allPrograms = response;
        } else {
          this.allPrograms = [];
        }
        this.extractYears();
        this.refreshCategories();
        const examNames = this.unique(this.allPrograms.map((program) => this.examName(program)));
        examNames.forEach((name) => { if (!this.examinations.includes(name)) this.examinations = [...this.examinations, name]; });
        const stageNames = this.unique(this.allPrograms.map((program) => program.programStage || ''));
        stageNames.forEach((name) => { if (name && !this.stages.includes(name)) this.stages = [...this.stages, name]; });
        this.applyFilters();
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error fetching programs:', error);
        this.errorMessage = 'Failed to load programs. Please try again later.';
        this.isLoading = false;
      }
    });
  }

  // Load demo data for testing
  loadDemoData(): void {
    this.allPrograms = [
      {
        _id: '1',
        programName: 'Public Administration Mentorship Program',
        programCategory: 'Mentorship Course',
        year: '2027',
        price: 17999,
        discountedPrice: 26999,
        displayImage: 'https://via.placeholder.com/400x250/4F46E5/ffffff?text=PUBLIC+ADMIN',
        description: 'Complete mentorship program for UPSC CSE 2027 with Public Administration optional.',
        features: ['Weekly mentorship sessions', 'Personalized study plan', 'Doubt clearing sessions'],
        duration: '12 months',
        isActive: true
      },
      {
        _id: '2',
        programName: 'Psychology Optional Mentorship Program',
        programCategory: 'Mentorship Course',
        year: '2027',
        price: 17999,
        discountedPrice: 26999,
        displayImage: 'https://via.placeholder.com/400x250/EC4899/ffffff?text=PSYCHOLOGY',
        description: 'Comprehensive psychology optional mentorship for UPSC CSE 2027.',
        features: ['Expert faculty', 'Test series included', 'Answer writing practice'],
        duration: '12 months',
        isActive: true
      }
    ];
    this.extractYears();
    this.applyFilters();
    this.isLoading = false;
  }

  // Extract unique years from programs
  extractYears(): void {
    const yearSet = new Set<string>();
    this.allPrograms.forEach(program => {
      if (program.year) {
        yearSet.add(program.year);
      }
    });
    this.years = Array.from(yearSet).sort().reverse();
  }

  // Apply category and year filters
  applyFilters(): void {
    this.filteredPrograms = this.allPrograms.filter(program => {
      const examination = this.examName(program) || 'UPSC';
      const examinationMatch = this.selectedExamination === 'All' || examination === this.selectedExamination;
      const stageMatch = this.selectedStage === 'All' || program.programStage === this.selectedStage;
      const categoryMatch = this.selectedCategory === 'All' || this.matchesPlan(program);
      const yearMatch = this.selectedYear === 'All' || program.year === this.selectedYear;
      return examinationMatch && stageMatch && categoryMatch && yearMatch;
    });
  }

  // Handle category filter change
  onCategoryChange(): void {
    this.applyFilters();
  }

  // Handle year filter change
  onYearChange(): void {
    this.applyFilters();
  }

  // Reset all filters
  resetFilters(): void {
    this.selectedExamination = 'All';
    this.selectedStage = 'All';
    this.selectedCategory = 'All';
    this.selectedYear = 'All';
    this.applyFilters();
  }

  matchesPlan(program: Program): boolean {
    if (this.selectedCategory === 'All') return true;
    const plan = this.plans.find((item) => item.name === this.selectedCategory || item.id === this.selectedCategory);
    const ids = (plan?.programIds || []).map((id: any) => this.idOf(id)).filter(Boolean);
    if (ids.length) return ids.includes(program._id);
    return program.programCategory === this.selectedCategory;
  }

  getExaminationCount(examination: string): number {
    if (examination === 'All') return this.allPrograms.length;
    return this.allPrograms.filter(program => this.examName(program) === examination).length;
  }

  getStageCount(stage: string): number {
    if (stage === 'All') return this.allPrograms.length;
    return this.allPrograms.filter(program => program.programStage === stage).length;
  }

  // Get count for category
  getCategoryCount(category: string): number {
    if (category === 'All') {
      return this.allPrograms.length;
    }
    return this.allPrograms.filter(p => p.programCategory === category).length;
  }

  // Get count for year
  getYearCount(year: string): number {
    return this.allPrograms.filter(p => p.year === year).length;
  }

  // Handle image error
  handleImageError(event: any): void {
    event.target.src = 'assets/images/logo.png';
  }

  programImage(program: Program): string {
    if (document.body.classList.contains('hindi') && program.displayImageHindi) {
      return program.displayImageHindi;
    }
    return program.displayImage;
  }

  // Navigate to program details/batches page
  viewProgramBatches(program: Program): void {
    this.router.navigate(['/program', program._id]);
  }

  // Handle enroll button click
  enrollProgram(program: Program): void {
    this.router.navigate(['/program', program._id, 'enroll']);
  }

  // View program details
  viewProgramDetails(program: Program): void {
    this.router.navigate(['/program', program._id]);
  }

  trackProgram(_index: number, program: Program): string { return program._id || program.programName; }
}
