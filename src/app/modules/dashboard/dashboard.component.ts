import { TranslatePipe } from '../../shared/i18n/translate.pipe';
import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { Router, RouterLink } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { AuthService } from '../../shared/services/auth.service';
import { TestService } from '../../shared/services/test.service';
import { PaymentDialogComponent } from './payment-dialog/payment-dialog.component';
import { UserService } from '../../shared/services/user.service';

import { Plan, PublicPlanService } from '../../shared/services/public-plan.service';
import { Testimonial, TestimonialService } from '../../shared/services/testimonial.service';
import { ReviewSliderComponent } from '../homepage/review-slider/review-slider.component';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [TranslatePipe, 
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    RouterLink,
    ReviewSliderComponent
  ],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css'
})
export class DashboardComponent implements OnInit {
  private authService = inject(AuthService);
  private testService = inject(TestService);
  private userService = inject(UserService);
  private planService = inject(PublicPlanService);

  private router = inject(Router);
  private dialog = inject(MatDialog);

  currentUser = this.authService.currentUser;
  upcomingTests = signal<any[]>([]);
  recentResults = signal<any[]>([]);
  activePlanIds = signal<string[]>([]);
  completedTestsCount = signal<number>(0);
  totalTestsCount = signal<number>(0);
  totalStudentsCount = signal<number>(0);
  totalResultsCount = signal<number>(0);
  
  loading = signal<boolean>(true);
  plans = signal<Plan[]>([]);

  ngOnInit() {
    this.planService.getPlans().subscribe({ next: plans => this.plans.set(plans), error: error => console.error('Error loading plans:', error) });
    this.userService.getActivePlanIds().subscribe({
      next: response => this.activePlanIds.set(response.planIds || []),
      error: error => console.error('Error loading active plans:', error)
    });
    const user = this.currentUser();
    
    if (user?.role === 'student') {
      if (user.type === 'fresh') {
        this.loadFreshStudentData();
      } else if (user.type === 'pre' || user.type === 'combo') {
        this.loadPreStudentData();
      } else {
        this.loading.set(false);
      }
    } else if (user?.role === 'admin') {
      this.loadAdminData();
    }
  }

  // Open payment dialog
  openPaymentDialog(plan: string) {
    const dialogRef = this.dialog.open(PaymentDialogComponent, {
      width: '600px',
      maxWidth: '95vw',
      data: { selectedPlan: plan },
      disableClose: true
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        this.ngOnInit();
        // Payment was successful, reload user data
        console.log('Payment completed successfully');
        // You can add logic here to refresh the user data if needed
      } else {
        console.log('Payment cancelled');
      }
    });
  }

  loadFreshStudentData() {
    this.loading.set(true);
    
    setTimeout(() => {
      this.loading.set(false);
    }, 1000);

    // this.testService.getUpcomingTests().subscribe({
    //   next: (tests) => {
    //     this.upcomingTests.set(tests.slice(0, 2));
    //   },
    //   error: (error) => {
    //     console.error('Error loading upcoming tests:', error);
    //   }
    // });
  }

  loadPreStudentData() {
    this.loading.set(true);
    
    this.testService.getUpcomingTests().subscribe({
      next: (tests) => {
        this.upcomingTests.set(tests.slice(0, 3));
      },
      error: (error) => {
        console.error('Error loading upcoming tests:', error);
      }
    });

    this.testService.getStudentResults().subscribe({
      next: (results) => {
        this.recentResults.set(results.slice(0, 5));
        this.completedTestsCount.set(results.length);
        this.loading.set(false);
      },
      error: (error) => {
        console.error('Error loading student results:', error);
        this.loading.set(false);
      }
    });
  }

  loadAdminData() {
    this.loading.set(true);
    
    this.testService.getPlatformStatistics().subscribe({
      next: (stats) => {
        this.totalStudentsCount.set(stats.totalStudents);
        this.totalResultsCount.set(stats.totalResults);
        this.totalTestsCount.set(stats.totalTests);
        this.loading.set(false);
      },
      error: (error) => {
        console.error('Error loading platform statistics:', error);
        this.loadFallbackAdminData();
      }
    });
  }

  loadFallbackAdminData() {
    this.testService.getAllResults().subscribe({
      next: (results) => {
        this.totalResultsCount.set(results.length);
        this.loading.set(false);
      },
      error: (error) => {
        console.error('Error loading results:', error);
        this.loading.set(false);
      }
    });
  }

  getRecentPerformance(): string {
    const results = this.recentResults();
    if (results.length === 0) return 'No tests taken yet';
    
    const avgPercentage = results.reduce((sum, result) => sum + parseFloat(result.percentage), 0) / results.length;
    return `Average: ${avgPercentage.toFixed(1)}%`;
  }

  getUserTypeLabel(): string {
    const type = this.currentUser()?.type;
    return type === 'pre' ? 'Prelims' : type === 'mains' ? 'Mains' : type === 'combo' ? 'Prelims + Mains' : 'Fresh Student';
  }

  getPurchasedPlanNames(): string[] {
    const activeIds = this.activePlanIds();
    return this.plans()
      .filter(plan => activeIds.includes(plan.id))
      .sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0))
      .map(plan => plan.name);
  }

  navigateToStudentsList() {
    this.router.navigate(['/students-list']);
  }
  // getMe(){
  //   this.userService.getMe().subscribe({
  //     next: (results:any) => {
  //       console.log(results)
  //     },
  //     error: (error:any) => {
  //       // console.error('Error loading results:', error);
  //       // this.loading.set(false);
  //     }
  //   });
  // }
}
