import { Component, inject, signal, OnInit, computed, AfterViewInit, OnDestroy, SecurityContext } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatListModule } from '@angular/material/list';
import { MatDividerModule } from '@angular/material/divider';
import { MatRadioModule } from '@angular/material/radio';
import { MatTabsModule } from '@angular/material/tabs';
import { MatChipsModule } from '@angular/material/chips';
import { MatTooltipModule } from '@angular/material/tooltip';
import { FormsModule } from '@angular/forms';
import { TestService, DetailedResult, Question } from '../../../shared/services/test.service';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatMenuModule } from '@angular/material/menu';

// Import Chart.js
import { Chart, registerables } from 'chart.js';
import { SafeHtmlPipe } from '../../../shared/pipes/safe-html.pipe';
import { DemoDetailedResult, DemoTestService } from '../../../shared/services/demo-test.service';
import { DomSanitizer } from '@angular/platform-browser';
Chart.register(...registerables);

interface CategoryPerformance {
  category: string;
  correct: number;
  incorrect: number;
  notAttempted: number;
  total: number;
  accuracy: number;
  subCategories: {
    [subCategory: string]: {
      correct: number;
      incorrect: number;
      notAttempted: number;
      total: number;
      accuracy: number;
      topics: {
        [topic: string]: {
          correct: number;
          incorrect: number;
          notAttempted: number;
          total: number;
          accuracy: number;
        }
      }
    }
  }
}

interface PerformanceData {
  [category: string]: CategoryPerformance;
}

// Flexible result type that can handle both regular and demo tests
interface NormalizedResult {
  _id: string;
  test: {
    _id: string;
    title: string;
    description?: string;
    introPage?: string | { english?: string; hindi?: string };
    duration: number;
    marksPerQuestion: number;
    negativeMarks: number;
    questions: any[];
  };
  score: number;
  totalMarks: number;
  percentage: number | string; // Can be either number or string
  timeTaken: number;
  submittedAt: string;
  answers: any[]; // Flexible answers array
  rank?: number; // Optional for demo tests
  totalStudents?: number; // Optional for demo tests
}

@Component({
  selector: 'app-result-detail',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    MatListModule,
    MatDividerModule,
    MatRadioModule,
    MatTabsModule,
    MatChipsModule,
    MatTooltipModule,
    MatButtonToggleModule,
    MatMenuModule,
    SafeHtmlPipe
    
  ],
  templateUrl: './result-detail.component.html',
  styleUrl: './result-detail.component.css'
})
export class ResultDetailComponent implements OnInit, AfterViewInit, OnDestroy {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private testService = inject(TestService);
  private demoTestService = inject(DemoTestService);
  private snackBar = inject(MatSnackBar);
  private sanitizer = inject(DomSanitizer);
  
  result = signal<NormalizedResult | null>(null);
  loading = signal(true);
  selectedLanguage: 'english' | 'hindi' = 'english';
  performanceData = signal<PerformanceData>({});
  selectedCategory = signal<string | null>(null);
  selectedSubCategory = signal<string | null>(null);
  
  private performanceChart: Chart | null = null;
  private categoryChart: Chart | null = null;
  private subCategoryChart: Chart | null = null;
  private topicChart: Chart | null = null;

  isDemoTest = signal(false);

  // Computed properties
  correctAnswersCount = computed(() => {
    const res = this.result();
    if (!res) return 0;
    return res.test.questions.filter((q: any) => q.isCorrect).length;
  });

  incorrectAnswersCount = computed(() => {
    const res = this.result();
    if (!res) return 0;
    return res.test.questions.filter((q: any) => !q.isCorrect && (q.studentAnswer !== -1 && q.studentAnswer !== null && q.studentAnswer !== undefined)).length;
  });

  notAttemptedCount = computed(() => {
    const res = this.result();
    if (!res) return 0;
    return res.test.questions.filter((q: any) => q.studentAnswer === -1 || q.studentAnswer === null || q.studentAnswer === undefined).length;
  });

  totalQuestionsCount = computed(() => {
    const res = this.result();
    if (!res) return 0;
    return res.test.questions.length;
  });

  correctPercentage = computed(() => {
    const total = this.totalQuestionsCount();
    return total > 0 ? Math.round((this.correctAnswersCount() / total) * 100) : 0;
  });

  incorrectPercentage = computed(() => {
    const total = this.totalQuestionsCount();
    return total > 0 ? Math.round((this.incorrectAnswersCount() / total) * 100) : 0;
  });

  notAttemptedPercentage = computed(() => {
    const total = this.totalQuestionsCount();
    return total > 0 ? Math.round((this.notAttemptedCount() / total) * 100) : 0;
  });

  // Performance summary by category
  categoryPerformanceSummary = computed(() => {
    const data = this.performanceData();
    const summary = [];
    for (const [category, catData] of Object.entries(data)) {
      summary.push({
        category,
        correct: catData.correct,
        incorrect: catData.incorrect,
        notAttempted: catData.notAttempted,
        total: catData.total,
        accuracy: catData.accuracy,
        color: this.getCategoryColor(category)
      });
    }
    // Sort by accuracy (descending)
    return summary.sort((a, b) => b.accuracy - a.accuracy);
  });

  // Weakest category
  weakestCategory = computed(() => {
    const summary = this.categoryPerformanceSummary();
    if (summary.length === 0) return null;
    // Find category with questions attempted but lowest accuracy
    const attemptedCategories = summary.filter(cat => (cat.correct + cat.incorrect) > 0);
    if (attemptedCategories.length === 0) return null;
    return attemptedCategories.reduce((prev, current) => 
      prev.accuracy < current.accuracy ? prev : current
    );
  });

  // Strongest category
  strongestCategory = computed(() => {
    const summary = this.categoryPerformanceSummary();
    if (summary.length === 0) return null;
    // Find category with questions attempted but highest accuracy
    const attemptedCategories = summary.filter(cat => (cat.correct + cat.incorrect) > 0);
    if (attemptedCategories.length === 0) return null;
    return attemptedCategories.reduce((prev, current) => 
      prev.accuracy > current.accuracy ? prev : current
    );
  });

  // Sub-categories for selected category
  subCategoryPerformance = computed(() => {
    const category = this.selectedCategory();
    const data = this.performanceData();
    
    if (!category || !data[category]) return [];
    
    const subCategories = data[category].subCategories;
    const result = [];
    
    for (const [subCat, subCatData] of Object.entries(subCategories)) {
      result.push({
        subCategory: subCat,
        correct: subCatData.correct,
        incorrect: subCatData.incorrect,
        notAttempted: subCatData.notAttempted,
        total: subCatData.total,
        accuracy: subCatData.accuracy,
        color: this.getSubCategoryColor(category, subCat)
      });
    }
    
    return result.sort((a, b) => b.accuracy - a.accuracy);
  });

  // Topics for selected sub-category
  topicPerformance = computed(() => {
    const category = this.selectedCategory();
    const subCategory = this.selectedSubCategory();
    const data = this.performanceData();
    
    if (!category || !subCategory || !data[category]?.subCategories[subCategory]) return [];
    
    const topics = data[category].subCategories[subCategory].topics;
    const result = [];
    
    for (const [topic, topicData] of Object.entries(topics)) {
      result.push({
        topic,
        correct: topicData.correct,
        incorrect: topicData.incorrect,
        notAttempted: topicData.notAttempted,
        total: topicData.total,
        accuracy: topicData.accuracy,
        color: this.getTopicColor(category, subCategory, topic)
      });
    }
    
    return result.sort((a, b) => b.accuracy - a.accuracy);
  });

  ngOnInit() {
    const resultId = this.route.snapshot.paramMap.get('id');
    const isDemoTest = this.route.snapshot.queryParamMap.get('isDemoTest') === 'true';
    
    this.isDemoTest.set(isDemoTest);
    console.log('Result detail - isDemoTest:', isDemoTest);
    
    if (resultId) {
      this.loadResultDetail(resultId);
    } else {
      this.snackBar.open('Invalid result ID', 'Close', { duration: 3000 });
      this.router.navigate([isDemoTest ? '/demo-tests' : '/results']);
    }
  }

  ngAfterViewInit() {
    // Chart will be initialized after data is loaded
  }

  ngOnDestroy() {
    // Clean up charts to prevent memory leaks
    [this.performanceChart, this.categoryChart, this.subCategoryChart, this.topicChart].forEach(chart => {
      if (chart) chart.destroy();
    });
  }

  loadResultDetail(resultId: string) {
    this.loading.set(true);
    const testId = this.route.snapshot.queryParamMap.get('testId');
    const isDemoTest = this.isDemoTest();
    
    if (!testId) {
      this.snackBar.open('Test ID not found', 'Close', { duration: 3000 });
      this.loading.set(false);
      this.router.navigate([isDemoTest ? '/demo-tests' : '/results']);
      return;
    }
    
    // Choose the appropriate service based on test type
    if (isDemoTest) {
      this.demoTestService.getStudentDemoTestResult(testId).subscribe({
        next: (result: any) => {
          console.log('Demo result loaded:', result);
          this.processDemoResult(result);
          const finishLoading = () => {
            this.loading.set(false);
            setTimeout(() => this.initializePerformanceChart(), 100);
          };

          if (result.test?.introPage) {
            finishLoading();
            return;
          }

          this.demoTestService.getDemoTestById(testId).subscribe({
            next: (test: any) => {
              this.result.update(current => current
                ? { ...current, test: { ...current.test, introPage: test?.introPage || '' } }
                : current);
              finishLoading();
            },
            error: (error: any) => {
              console.error('Error loading demo test introduction:', error);
              finishLoading();
            }
          });
        },
        error: (error: any) => {
          console.error('Error loading demo result detail:', error);
          this.snackBar.open('Error loading result details', 'Close', { duration: 3000 });
          this.loading.set(false);
          this.router.navigate(['/demo-tests']);
        }
      });
    } else {
      this.testService.getStudentTestResult(testId).subscribe({
        next: (result: DetailedResult) => {
          console.log('Regular result loaded:', result);
          this.processRegularResult(result);
          const finishLoading = () => {
            this.loading.set(false);
            setTimeout(() => {
              this.initializePerformanceChart();
              this.initializeCategoryChart();
            }, 100);
          };

          if (result.test.introPage) {
            finishLoading();
            return;
          }

          this.testService.getUpcomingTests().subscribe({
            next: tests => {
              const test = tests.find(item => item._id === result.test._id);
              this.result.update(current => current
                ? { ...current, test: { ...current.test, introPage: test?.introPage || '' } }
                : current);
              finishLoading();
            },
            error: (error: any) => {
              console.error('Error loading test introduction:', error);
              finishLoading();
            }
          });
        },
        error: (error: any) => {
          console.error('Error loading result detail:', error);
          this.snackBar.open('Error loading result details', 'Close', { duration: 3000 });
          this.loading.set(false);
          this.router.navigate(['/results']);
        }
      });
    }
  }

  processRegularResult(result: DetailedResult) {
    // Parse percentage if it's a string
    const percentage = typeof result.percentage === 'string' 
      ? parseFloat(result.percentage) 
      : result.percentage;
    
    // Transform answers to match the expected format
    const answers = result.answers?.map(answer => ({
      questionId: answer.questionUid, // Map questionUid to questionId
      selectedOption: answer.selectedOption,
      isCorrect: answer.isCorrect
    })) || [];
    
    // Create normalized result
    const normalizedResult: NormalizedResult = {
      _id: result._id,
      test: {
        _id: result.test._id,
        title: result.test.title,
        description: result.test.description,
        introPage: result.test.introPage,
        duration: result.test.duration,
        marksPerQuestion: result.test.marksPerQuestion,
        negativeMarks: result.test.negativeMarks,
        questions: result.test.questions || []
      },
      score: result.score,
      totalMarks: result.totalMarks,
      percentage: percentage,
      timeTaken: result.timeTaken,
      submittedAt: result.submittedAt,
      answers: answers,
      rank: result.rank,
      totalStudents: result.totalStudents
    };
    
    this.result.set(normalizedResult);
    this.analyzePerformanceData(normalizedResult);
  }

  processDemoResult(result: any) {
    // Parse percentage if it's a string
    const percentage = typeof result.percentage === 'string' 
      ? parseFloat(result.percentage) 
      : result.percentage || 0;
    
    // For demo test, we need to create questions from questionUids if they don't exist
    let questions = [];
    
    if (result.test.questions && result.test.questions.length > 0) {
      // If questions exist directly, use them
      questions = result.test.questions;
    } else if (result.test.questionUids && result.test.questionUids.length > 0) {
      // Create placeholder questions from questionUids
      questions = result.test.questionUids.map((uid: string, index: number) => {
        // Find answer for this question if available
        const answer = result.answers?.find((a: any) => 
          a.questionUid === uid || a.questionIndex === index
        );
        
        return {
          uid: uid,
          question: { english: `Question ${index + 1}`, hindi: `प्रश्न ${index + 1}` },
          studentAnswer: answer?.selectedOption ?? -1,
          isCorrect: answer?.isCorrect ?? false,
          correctAnswer: answer?.correctAnswer ?? 0,
          options: []
        };
      });
    }
    
    // Transform answers to match the expected format
    const answers = result.answers?.map((answer: any) => ({
      questionId: answer.questionUid || answer.questionId,
      selectedOption: answer.selectedOption,
      isCorrect: answer.isCorrect
    })) || [];
    
    // Create normalized result
    const normalizedResult: NormalizedResult = {
      _id: result._id,
      test: {
        _id: result.test._id,
        title: result.test.title,
        description: result.test.description,
        introPage: result.test.introPage,
        duration: result.test.duration,
        marksPerQuestion: result.test.marksPerQuestion,
        negativeMarks: result.test.negativeMarks,
        questions: questions
      },
      score: result.score || 0,
      totalMarks: result.totalMarks || 0,
      percentage: percentage,
      timeTaken: result.timeTaken || 0,
      submittedAt: result.submittedAt || new Date().toISOString(),
      answers: answers,
      // Demo tests might not have rank and totalStudents
      rank: result.rank,
      totalStudents: result.totalStudents
    };

    this.result.set(normalizedResult);
    // Create simplified performance data for demo tests
    this.analyzeDemoPerformanceData(normalizedResult);
  }

  analyzeDemoPerformanceData(result: NormalizedResult) {
    // Simplified performance analysis for demo tests
    const performance: PerformanceData = {};
    
    if (!result?.test?.questions) return;
    
    // Create a default category for demo tests
    performance['Demo Test'] = {
      category: 'Demo Test',
      correct: this.correctAnswersCount(),
      incorrect: this.incorrectAnswersCount(),
      notAttempted: this.notAttemptedCount(),
      total: this.totalQuestionsCount(),
      accuracy: this.correctPercentage(),
      subCategories: {}
    };
    
    this.performanceData.set(performance);
  }

  analyzePerformanceData(result: NormalizedResult) {
    const performance: PerformanceData = {};
    
    if (!result?.test?.questions || !result.answers) return;
    
    result.test.questions.forEach((question: any, index: number) => {
      // Get the answer status from answers array
      const answer = result.answers[index];
      const isCorrect = answer?.isCorrect || question.isCorrect;
      const studentAnswer = answer?.selectedOption ?? question.studentAnswer;
      const isAttempted = studentAnswer !== -1 && studentAnswer !== null && studentAnswer !== undefined;
      
      // Extract category, sub-category, and topic from tags
      let category = 'Uncategorized';
      let subCategory = 'General';
      let topic = 'General';
      
      if (question.tags && question.tags.length > 0) {
        const tag = question.tags[0].tag;
        const parts = tag.split('/');
        category = parts[0] || 'Uncategorized';
        subCategory = parts[1] || 'General';
        topic = parts[2] || 'General';
      }
      
      // Initialize category if not exists
      if (!performance[category]) {
        performance[category] = {
          category,
          correct: 0,
          incorrect: 0,
          notAttempted: 0,
          total: 0,
          accuracy: 0,
          subCategories: {}
        };
      }
      
      // Initialize sub-category if not exists
      if (!performance[category].subCategories[subCategory]) {
        performance[category].subCategories[subCategory] = {
          correct: 0,
          incorrect: 0,
          notAttempted: 0,
          total: 0,
          accuracy: 0,
          topics: {}
        };
      }
      
      // Initialize topic if not exists
      if (!performance[category].subCategories[subCategory].topics[topic]) {
        performance[category].subCategories[subCategory].topics[topic] = {
          correct: 0,
          incorrect: 0,
          notAttempted: 0,
          total: 0,
          accuracy: 0
        };
      }
      
      // Update counts
      performance[category].total++;
      performance[category].subCategories[subCategory].total++;
      performance[category].subCategories[subCategory].topics[topic].total++;
      
      if (isAttempted) {
        if (isCorrect) {
          performance[category].correct++;
          performance[category].subCategories[subCategory].correct++;
          performance[category].subCategories[subCategory].topics[topic].correct++;
        } else {
          performance[category].incorrect++;
          performance[category].subCategories[subCategory].incorrect++;
          performance[category].subCategories[subCategory].topics[topic].incorrect++;
        }
      } else {
        performance[category].notAttempted++;
        performance[category].subCategories[subCategory].notAttempted++;
        performance[category].subCategories[subCategory].topics[topic].notAttempted++;
      }
    });
    
    // Calculate accuracies
    for (const category in performance) {
      const catData = performance[category];
      const attempted = catData.correct + catData.incorrect;
      catData.accuracy = attempted > 0 ? Math.round((catData.correct / attempted) * 100) : 0;
      
      for (const subCategory in catData.subCategories) {
        const subCatData = catData.subCategories[subCategory];
        const subAttempted = subCatData.correct + subCatData.incorrect;
        subCatData.accuracy = subAttempted > 0 ? Math.round((subCatData.correct / subAttempted) * 100) : 0;
        
        for (const topic in subCatData.topics) {
          const topicData = subCatData.topics[topic];
          const topicAttempted = topicData.correct + topicData.incorrect;
          topicData.accuracy = topicAttempted > 0 ? Math.round((topicData.correct / topicAttempted) * 100) : 0;
        }
      }
    }
    
    this.performanceData.set(performance);
  }

  // Chart initialization methods
  initializePerformanceChart() {
    const canvas = document.getElementById('performancePieChart') as HTMLCanvasElement;
    if (!canvas) return;

    if (this.performanceChart) {
      this.performanceChart.destroy();
    }

    const data = {
      labels: ['Correct', 'Incorrect', 'Not Attempted'],
      datasets: [{
        data: [this.correctAnswersCount(), this.incorrectAnswersCount(), this.notAttemptedCount()],
        backgroundColor: [
          '#4CAF50', // Green for correct
          '#F44336', // Red for incorrect
          '#FF9800'  // Orange for not attempted
        ],
        borderColor: [
          '#388E3C',
          '#D32F2F', 
          '#F57C00'
        ],
        borderWidth: 2,
        hoverOffset: 8
      }]
    };

    const options = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: false
        },
        tooltip: {
          callbacks: {
            label: (context: any) => {
              const label = context.label || '';
              const value = context.parsed;
              const total = context.dataset.data.reduce((a: number, b: number) => a + b, 0);
              const percentage = total > 0 ? Math.round((value / total) * 100) : 0;
              return `${label}: ${value} (${percentage}%)`;
            }
          }
        }
      },
      cutout: '50%',
    };

    this.performanceChart = new Chart(canvas, {
      type: 'doughnut',
      data: data,
      options: options
    });
  }

  initializeCategoryChart() {
    const canvas = document.getElementById('categoryChart') as HTMLCanvasElement;
    if (!canvas) return;

    if (this.categoryChart) {
      this.categoryChart.destroy();
    }

    const summary = this.categoryPerformanceSummary();
    const labels = summary.map(item => item.category);
    const accuracyData = summary.map(item => item.accuracy);
    const colors = summary.map(item => item.color);

    const data = {
      labels: labels,
      datasets: [{
        label: 'Accuracy %',
        data: accuracyData,
        backgroundColor: colors,
        borderColor: colors.map(color => this.darkenColor(color, 20)),
        borderWidth: 1
      }]
    };

    const options = {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        y: {
          beginAtZero: true,
          max: 100,
          title: {
            display: true,
            text: 'Accuracy %'
          }
        }
      },
      plugins: {
        legend: {
          position: 'top' as const,
        },
        tooltip: {
          callbacks: {
            label: (context: any) => {
              const category = summary[context.dataIndex];
              return [
                `Accuracy: ${category.accuracy}%`,
                `Correct: ${category.correct}`,
                `Incorrect: ${category.incorrect}`,
                `Not Attempted: ${category.notAttempted}`,
                `Total: ${category.total}`
              ];
            }
          }
        }
      }
    };

    this.categoryChart = new Chart(canvas, {
      type: 'bar',
      data: data,
      options: options
    });
  }

  initializeSubCategoryChart(subCategories: any[]) {
    const canvas = document.getElementById('subCategoryChart') as HTMLCanvasElement;
    if (!canvas) return;

    if (this.subCategoryChart) {
      this.subCategoryChart.destroy();
    }

    const labels = subCategories.map(item => item.subCategory);
    const accuracyData = subCategories.map(item => item.accuracy);
    const colors = subCategories.map(item => item.color);

    const data = {
      labels: labels,
      datasets: [{
        label: 'Accuracy %',
        data: accuracyData,
        backgroundColor: colors,
        borderColor: colors.map(color => this.darkenColor(color, 20)),
        borderWidth: 1
      }]
    };

    const options = {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        y: {
          beginAtZero: true,
          max: 100,
          title: {
            display: true,
            text: 'Accuracy %'
          }
        }
      },
      plugins: {
        legend: {
          position: 'top' as const,
        },
        tooltip: {
          callbacks: {
            label: (context: any) => {
              const subCategory = subCategories[context.dataIndex];
              return [
                `Accuracy: ${subCategory.accuracy}%`,
                `Correct: ${subCategory.correct}`,
                `Incorrect: ${subCategory.incorrect}`,
                `Not Attempted: ${subCategory.notAttempted}`,
                `Total: ${subCategory.total}`
              ];
            }
          }
        }
      }
    };

    this.subCategoryChart = new Chart(canvas, {
      type: 'bar',
      data: data,
      options: options
    });
  }

  initializeTopicChart(topics: any[]) {
    const canvas = document.getElementById('topicChart') as HTMLCanvasElement;
    if (!canvas) return;

    if (this.topicChart) {
      this.topicChart.destroy();
    }

    const labels = topics.map(item => item.topic);
    const accuracyData = topics.map(item => item.accuracy);
    const colors = topics.map(item => item.color);

    const data = {
      labels: labels,
      datasets: [{
        label: 'Accuracy %',
        data: accuracyData,
        backgroundColor: colors,
        borderColor: colors.map(color => this.darkenColor(color, 20)),
        borderWidth: 1
      }]
    };

    const options = {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        y: {
          beginAtZero: true,
          max: 100,
          title: {
            display: true,
            text: 'Accuracy %'
          }
        }
      },
      plugins: {
        legend: {
          position: 'top' as const,
        },
        tooltip: {
          callbacks: {
            label: (context: any) => {
              const topic = topics[context.dataIndex];
              return [
                `Accuracy: ${topic.accuracy}%`,
                `Correct: ${topic.correct}`,
                `Incorrect: ${topic.incorrect}`,
                `Not Attempted: ${topic.notAttempted}`,
                `Total: ${topic.total}`
              ];
            }
          }
        }
      }
    };

    this.topicChart = new Chart(canvas, {
      type: 'bar',
      data: data,
      options: options
    });
  }

  // Helper methods for colors
  getCategoryColor(category: string): string {
    const colors: { [key: string]: string } = {
      'history': '#FF6B6B',
      'polity': '#4ECDC4',
      'geography': '#45B7D1',
      'economy': '#96CEB4',
      'science': '#FFEAA7',
      'currentaffairs': '#DDA0DD',
      'current': '#DDA0DD',
      'Uncategorized': '#95A5A6',
      'Demo Test': '#9C27B0'
    };
    return colors[category.toLowerCase()] || this.stringToColor(category);
  }

  private getSubCategoryColor(category: string, subCategory: string): string {
    const baseColor = this.getCategoryColor(category);
    return this.lightenColor(baseColor, 20);
  }

  private getTopicColor(category: string, subCategory: string, topic: string): string {
    const baseColor = this.getCategoryColor(category);
    return this.lightenColor(baseColor, 40);
  }

  private stringToColor(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    const hue = hash % 360;
    return `hsl(${hue}, 70%, 65%)`;
  }

  private lightenColor(color: string, percent: number): string {
    return color;
  }

  private darkenColor(color: string, percent: number): string {
    return color;
  }

  // Language-specific text getters
  getQuestionText(question: any): string {
    if (!question || !question.question) return '';
    return question.question[this.selectedLanguage] || question.question.english || '';
  }

  getOptionText(option: any): string {
    if (!option) return '';
    return option[this.selectedLanguage] || option.english || '';
  }

  getDescriptionText(question: any): string {
    if (!question || !question.description) return '';
    return question.description[this.selectedLanguage] || question.description.english || '';
  }

  hasDescription(question: any): boolean {
    return !!(question?.description && 
             (question.description[this.selectedLanguage] || question.description.english));
  }

  // Selection handlers
  selectCategory(category: string | null) {
    this.selectedSubCategory.set(null);
    this.selectedCategory.set(category);
    if (category) {
      const data = this.performanceData();
      const subCategories = Object.keys(data[category]?.subCategories || {});
      if (subCategories.length > 0) {
        setTimeout(() => {
          this.initializeSubCategoryChart(this.subCategoryPerformance());
        }, 100);
      }
    } else {
      this.selectedSubCategory.set(null);
    }
  }

  selectSubCategory(subCategory: string | null) {
    this.selectedSubCategory.set(subCategory);
    if (subCategory) {
      setTimeout(() => {
        this.initializeTopicChart(this.topicPerformance());
      }, 100);
    }
  }

  isCategorySelected(category: string): boolean {
    return this.selectedCategory() === category;
  }

  isSubCategorySelected(subCategory: string): boolean {
    return this.selectedSubCategory() === subCategory;
  }

  getOptionLetter(index: number): string {
    if (index < 0 || index > 3) return '';
    return String.fromCharCode(65 + index);
  }

  getAnswerStatus(question: any): string {
    if (question.isCorrect) {
      return 'correct';
    } else if (question.studentAnswer === -1 || question.studentAnswer === null || question.studentAnswer === undefined) {
      return 'not-attempted';
    } else {
      return 'incorrect';
    }
  }

  getAnswerStatusText(question: any): string {
    if (question.isCorrect) {
      return 'Correct';
    } else if (question.studentAnswer === -1 || question.studentAnswer === null || question.studentAnswer === undefined) {
      return 'Not Attempted';
    } else {
      return 'Incorrect';
    }
  }

  goBack() {
    const isDemoTest = this.isDemoTest();
    this.router.navigate([isDemoTest ? '/demo-tests' : '/prelims-results']);
  }

  downloadQuestionPaper(language: 'english' | 'hindi') {
    const res = this.result();
    if (!res?.test?.questions?.length) {
      this.snackBar.open('Question paper is not available yet', 'Close', { duration: 3000 });
      return;
    }
    const printWindow = window.open('', '_blank', 'width=900,height=700');
    if (!printWindow) {
      this.snackBar.open('Please allow pop-ups to save the question paper as a PDF', 'Close', { duration: 4000 });
      return;
    }

    const isHindi = language === 'hindi';
    const languageName = isHindi ? 'Hindi' : 'English';
    const selectedLanguage = isHindi ? 'hindi' : 'english';
    const title = res.test.title || 'Question Paper';
    const sanitizeHtml = (value: unknown): string => {
      if (typeof value !== 'string') return '';
      return this.sanitizer.sanitize(SecurityContext.HTML, value) || '';
    };
    const questionHtml = res.test.questions.map((question: any, index: number) => {
      const text = sanitizeHtml(question.question?.[selectedLanguage] ?? question.question);
      const options = (question.options || []).map((option: any, optionIndex: number) => {
        const optionText = sanitizeHtml(option?.[selectedLanguage] ?? option);
        return `<div class="opt"><b>${String.fromCharCode(65 + optionIndex)}.</b><span>${optionText}</span></div>`;
      }).join('');
      return `<article class="q"><b class="no">${index + 1}.</b><div class="body">${text}<div class="options">${options}</div></div></article>`;
    }).join('');
    const rawIntroduction = res.test.introPage;
    const languageIntroduction = typeof rawIntroduction === 'string'
      ? (isHindi ? rawIntroduction : '')
      : rawIntroduction?.[selectedLanguage] || '';
    const introduction = sanitizeHtml(languageIntroduction);
    const safeTitle = title.replace(/[<>:"/\\|?*\u0000-\u001F]/g, '-').trim() || 'Question-Paper';
    const escapedTitle = safeTitle.replace(/[&<>"']/g, character => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    })[character] || character);
    const html = `<!doctype html>
<html lang="${isHindi ? 'hi' : 'en'}">
<head>
  <meta charset="utf-8">
  <title>${escapedTitle}-${languageName}-Question-Paper</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Noto+Serif+Devanagari:wght@400;700&display=swap" rel="stylesheet">
  <style>
    @page { size: A4; margin: 12mm; }
    body { margin: 0; color: #111; font-family: ${isHindi ? "'Noto Serif Devanagari', serif" : "'Times New Roman', serif"}; }
    .page { box-sizing: border-box; min-height: 270mm; padding: 6mm 8mm; font-size: 13px; line-height: 1.5; }
    .intro-page { box-sizing: border-box; width: 100%; height: 273mm; min-height: 273mm; max-height: 273mm; overflow: hidden; padding: 0; break-after: page; page-break-after: always; }
    .intro-viewport { width: 100%; height: 100%; overflow: hidden; }
    .intro-content { width: 100%; font-size: 12px; line-height: 1.25; overflow-wrap: anywhere; }
    .intro-content p { margin: 0 0 4px; }
    .intro-content img { max-width: 100%; max-height: 245mm; object-fit: contain; }
    .intro-content table { max-width: 100%; }
    .questions { margin-top: 18px; column-count: 2; column-gap: 28px; column-rule: 1px solid #111; }
    .q { display: flex; break-inside: avoid; margin: 0 0 14px; text-align: justify; }
    .no { min-width: 30px; }
    .body { flex: 1; min-width: 0; }
    .opt { display: flex; gap: 8px; margin: 4px 0; }
    .opt>b { min-width: 22px; }
    @media print { .page { padding: 0; } }
  </style>
</head>
<body>
  <main class="intro-page">
    <div class="intro-viewport">
      <section id="intro-content" class="intro-content">${introduction || '&nbsp;'}</section>
    </div>
  </main>
  <main class="page">
    <section class="questions">${questionHtml}</section>
  </main>
</body>
</html>`;

    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
    void printWindow.document.fonts.ready.then(() => {
      const content = printWindow.document.getElementById('intro-content');
      const viewport = printWindow.document.querySelector('.intro-viewport');
      if (content && viewport) {
        let fontSize = 12;
        while (content.scrollHeight > viewport.clientHeight && fontSize > 7) {
          fontSize -= 0.5;
          content.style.fontSize = `${fontSize}px`;
        }

        if (content.scrollHeight > viewport.clientHeight) {
          const scale = viewport.clientHeight / content.scrollHeight;
          content.style.width = `${100 / scale}%`;
          content.style.transform = `scale(${scale})`;
          content.style.transformOrigin = 'top left';
        }
      }
      printWindow.focus();
      printWindow.print();
    });
  }

  // Get questions by category
  getQuestionsByCategory(category: string): any[] {
    const res = this.result();
    if (!res) return [];
    return res.test.questions.filter((question: any) => {
      if (!question.tags || question.tags.length === 0) return false;
      return question.tags.some((tag: any) => tag.tag.startsWith(category + '/'));
    });
  }

  // Get questions by category and sub-category
  getQuestionsBySubCategory(category: string, subCategory: string): any[] {
    const res = this.result();
    if (!res) return [];
    return res.test.questions.filter((question: any) => {
      if (!question.tags || question.tags.length === 0) return false;
      return question.tags.some((tag: any) => {
        const parts = tag.tag.split('/');
        return parts.length >= 2 && parts[0] === category && parts[1] === subCategory;
      });
    });
  }

  // Get category total questions
  getCategoryTotal(category: string): number {
    return this.getQuestionsByCategory(category).length;
  }

  // Get category accuracy
  getCategoryAccuracy(category: string): number {
    const questions = this.getQuestionsByCategory(category);
    if (questions.length === 0) return 0;
    
    const correct = questions.filter((q: any) => q.isCorrect).length;
    const attempted = questions.filter((q: any) => q.studentAnswer !== -1).length;
    
    return attempted > 0 ? Math.round((correct / attempted) * 100) : 0;
  }

  // Get category score
  getCategoryScore(category: string): number {
    const questions = this.getQuestionsByCategory(category);
    const marksPerQuestion = this.result()?.test.marksPerQuestion || 1;
    const negativeMarks = this.result()?.test.negativeMarks || 0;
    
    let score = 0;
    questions.forEach((question: any) => {
      if (question.isCorrect) {
        score += marksPerQuestion;
      } else if (question.studentAnswer !== -1) {
        score -= negativeMarks;
      }
    });
    
    return Math.max(0, score);
  }

  // Get category total marks
  getCategoryTotalMarks(category: string): number {
    const questions = this.getQuestionsByCategory(category);
    const marksPerQuestion = this.result()?.test.marksPerQuestion || 1;
    return questions.length * marksPerQuestion;
  }

  // Get sub-category total
  getSubCategoryTotal(category: string, subCategory: string): number {
    return this.getQuestionsBySubCategory(category, subCategory).length;
  }

  // Get sub-category accuracy
  getSubCategoryAccuracy(category: string, subCategory: string): number {
    const questions = this.getQuestionsBySubCategory(category, subCategory);
    if (questions.length === 0) return 0;
    
    const correct = questions.filter((q: any) => q.isCorrect).length;
    const attempted = questions.filter((q: any) => q.studentAnswer !== -1).length;
    
    return attempted > 0 ? Math.round((correct / attempted) * 100) : 0;
  }

  // Get question number (index + 1)
  getQuestionNumber(question: any): number {
    const res = this.result();
    if (!res) return 0;
    const index = res.test.questions.findIndex((q: any) => q === question);
    return index !== -1 ? index + 1 : 0;
  }

  // Get question main tag (first part)
  getQuestionMainTag(question: any): string {
    if (!question.tags || question.tags.length === 0) return 'General';
    const parts = question.tags[0].tag.split('/');
    return parts.length > 1 ? parts[1] : parts[0];
  }

  // Get question topic (third part or general)
  getQuestionTopic(question: any): string {
    if (!question.tags || question.tags.length === 0) return 'General';
    const parts = question.tags[0].tag.split('/');
    return parts.length > 2 ? parts[2] : 'General';
  }

  // Get question preview text (truncated)
  getQuestionPreview(question: any): string {
    const text = this.getQuestionText(question);
    // Remove HTML tags and truncate
    const plainText = text.replace(/<[^>]*>/g, '');
    return plainText.length > 50 ? plainText.substring(0, 50) + '...' : plainText;
  }

  // Scroll to question
  scrollToQuestion(question: any): void {
    const res = this.result();
    if (!res) return;
    const index = res.test.questions.findIndex((q: any) => q === question);
    if (index !== -1) {
      const element = document.getElementById(`question-${index + 1}`);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        // Add highlight animation
        element.classList.add('highlighted');
        setTimeout(() => element.classList.remove('highlighted'), 1500);
      }
    }
  }

  // Select category from tag
  selectCategoryFromTag(tag: string): void {
    const parts = tag.split('/');
    if (parts.length > 0) {
      this.selectCategory(parts[0]);
      if (parts.length > 1) {
        this.selectSubCategory(parts[1]);
      }
    }
  }

  formatTime(totalSeconds: number): string {
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes} m ${seconds} s`;
  }

  // Add this signal to track which status questions are being shown
  showQuestionsForStatus = signal<'correct' | 'incorrect' | 'not-attempted' | null>(null);

  // Add this method to get questions by status
  getQuestionsByStatus(status: 'correct' | 'incorrect' | 'not-attempted'): any[] {
    const res = this.result();
    if (!res) return [];
    
    switch(status) {
      case 'correct':
        return res.test.questions.filter((q: any) => q.isCorrect);
      case 'incorrect':
        return res.test.questions.filter((q: any) => !q.isCorrect && q.studentAnswer !== -1);
      case 'not-attempted':
        return res.test.questions.filter((q: any) => q.studentAnswer === -1);
      default:
        return [];
    }
  }

  // Add this method to toggle questions view
  toggleQuestionsByStatus(status: 'correct' | 'incorrect' | 'not-attempted'): void {
    if (this.showQuestionsForStatus() === status) {
      this.showQuestionsForStatus.set(null);
    } else {
      this.showQuestionsForStatus.set(status);
    }
  }

  // Add this method to clear the questions view
  clearQuestionsStatus(): void {
    this.showQuestionsForStatus.set(null);
  }
}