import { TranslatePipe } from '../../../shared/i18n/translate.pipe';
// my-profile.component.ts
import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDividerModule } from '@angular/material/divider';
import { MatListModule } from '@angular/material/list';
import { MatChipsModule } from '@angular/material/chips';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { Router, RouterLink } from '@angular/router';
import { MatSpinner } from '@angular/material/progress-spinner';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { PaymentDialogComponent } from '../payment-dialog/payment-dialog.component';
import { Plan, PublicPlanService } from '../../../shared/services/public-plan.service';
import { AuthService } from '../../../shared/services/auth.service';
import { environment } from '../../../../environment/environment';

interface User {
  _id: string;
  fullName: string;
  email: string;
  phone: string;
  role: string;
  type: string;
  image?: string | null;
  profileImage?: string;
  address?: {
    pincode?: string;
    houseNo?: string;
    locality?: string;
    colony?: string;
    city?: string;
  };
  pincode?: string;
  houseNo?: string;
  locality?: string;
  colony?: string;
  city?: string;
  createdAt: string;
  updatedAt: string;
  purchasedPlanId?: string;
  planActivatedAt?: string;
  planExpiryAt?: string;
  __v: number;
}

@Component({
  selector: 'app-my-profile',
  standalone: true,
  imports: [TranslatePipe, 
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatDividerModule,
    MatListModule,
    MatChipsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSnackBarModule,
    MatSpinner,
    RouterLink
  ],
  templateUrl: './my-profile.component.html',
  styleUrl: './my-profile.component.css'
})
export class MyProfileComponent implements OnInit, OnDestroy {
  user: User | null = null;
  currentPlan: Plan | null = null;
  loading = true;
  updatingPassword = false;
  updatingProfile = false;
  passwordMessage = '';
  passwordError = '';
  profileMessage = '';
  profileError = '';
  passwordForm: FormGroup;
  profileForm: FormGroup;
  selectedProfileImage: File | null = null;
  imagePreview: string | null = null;

  constructor(
    private router: Router,
    private dialog: MatDialog,
    private planService: PublicPlanService,
    private authService: AuthService,
    private http: HttpClient,
    private fb: FormBuilder,
    private snackBar: MatSnackBar
  ) {
    this.passwordForm = this.fb.group({
      password: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', [Validators.required]]
    }, { validators: this.passwordsMatchValidator });

    this.profileForm = this.fb.group({
      fullName: ['', [Validators.required, Validators.minLength(2)]],
      phone: ['', [Validators.required, Validators.pattern(/^\+?[0-9]{10,15}$/)]],
      pincode: [''],
      houseNo: [''],
      locality: [''],
      colony: [''],
      city: ['']
    });
  }
  
  ngOnInit(): void {
    this.loadUserData();
    this.loadCurrentPlan();
    this.getUserInitials();
  }

  private loadCurrentPlan(): void {
    this.planService.getPlans().subscribe({
      next: plans => { this.currentPlan = plans.find(plan => plan.id === (this.user?.purchasedPlanId || this.user?.type)) || null; },
      error: error => console.error('Unable to load current plan:', error)
    });
  }
  
  private passwordsMatchValidator(group: FormGroup) {
    const password = group.get('password')?.value;
    const confirmPassword = group.get('confirmPassword')?.value;

    return password && confirmPassword && password !== confirmPassword ? { passwordMismatch: true } : null;
  }

  ngOnDestroy(): void {
    if (this.imagePreview?.startsWith('blob:')) {
      URL.revokeObjectURL(this.imagePreview);
    }
  }

  updatePassword(): void {
    this.passwordForm.markAllAsTouched();
    this.passwordError = '';
    this.passwordMessage = '';

    if (this.passwordForm.invalid) {
      return;
    }

    const { password, confirmPassword } = this.passwordForm.value;
    this.updatingPassword = true;

    this.http.patch(`${environment.apiUrl}/app/profile`, { password, confirmPassword }).subscribe({
      next: () => {
        this.updatingPassword = false;
        this.passwordForm.reset();
        this.passwordMessage = 'Password updated successfully.';
        this.snackBar.open('Password updated successfully.', 'Close', {
          duration: 3500,
          horizontalPosition: 'right',
          verticalPosition: 'top',
          panelClass: ['custom-snackbar', 'success-snackbar']
        });
      },
      error: (error) => {
        this.updatingPassword = false;
        this.passwordError = error?.error?.message || 'Unable to update password. Please try again.';
        this.snackBar.open(this.passwordError, 'Close', {
          duration: 4000,
          horizontalPosition: 'right',
          verticalPosition: 'top',
          panelClass: ['custom-snackbar', 'error-snackbar']
        });
      }
    });
  }

  onProfileImageSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];

    if (!file) {
      return;
    }

    const supportedImageTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!supportedImageTypes.includes(file.type) || file.size > 5 * 1024 * 1024) {
      this.snackBar.open('Choose a JPEG, PNG, WebP or GIF image up to 5 MB.', 'Close', {
        duration: 4000,
        horizontalPosition: 'right',
        verticalPosition: 'top',
        panelClass: ['custom-snackbar', 'error-snackbar']
      });
      input.value = '';
      return;
    }

    this.selectedProfileImage = file;
    if (this.imagePreview?.startsWith('blob:')) {
      URL.revokeObjectURL(this.imagePreview);
    }
    this.imagePreview = URL.createObjectURL(file);
  }

  saveProfile(): void {
    this.profileForm.markAllAsTouched();
    this.profileError = '';
    this.profileMessage = '';

    if (this.profileForm.invalid) {
      return;
    }

    const formData = new FormData();
    const fullName = this.profileForm.get('fullName')?.value?.trim();
    const phone = this.profileForm.get('phone')?.value?.trim();

    if (fullName) formData.append('fullName', fullName);
    if (phone) formData.append('phone', phone);
    formData.append('address', JSON.stringify({
      pincode: this.profileForm.get('pincode')?.value?.trim() || '',
      houseNo: this.profileForm.get('houseNo')?.value?.trim() || '',
      locality: this.profileForm.get('locality')?.value?.trim() || '',
      colony: this.profileForm.get('colony')?.value?.trim() || '',
      city: this.profileForm.get('city')?.value?.trim() || ''
    }));
    if (this.selectedProfileImage) {
      formData.append('image', this.selectedProfileImage);
    }

    this.updatingProfile = true;
    this.http.patch(`${environment.apiUrl}/app/profile`, formData).subscribe({
      next: (response: any) => {
        const updatedUser = response?.data?.user || response?.user || this.user;
        this.updatingProfile = false;
        if (updatedUser) {
          if (this.imagePreview?.startsWith('blob:')) {
            URL.revokeObjectURL(this.imagePreview);
          }
          this.user = updatedUser;
          localStorage.setItem('user', JSON.stringify(updatedUser));
          this.imagePreview = updatedUser.image || updatedUser.profileImage || this.imagePreview || null;
          this.selectedProfileImage = null;
          this.patchProfileForm(updatedUser);
        }
        this.profileMessage = 'Profile updated successfully.';
        this.snackBar.open('Profile updated successfully.', 'Close', {
          duration: 3500,
          horizontalPosition: 'right',
          verticalPosition: 'top',
          panelClass: ['custom-snackbar', 'success-snackbar']
        });
      },
      error: (error) => {
        this.updatingProfile = false;
        this.profileError = error?.error?.message || 'Unable to update profile. Please try again.';
        this.snackBar.open(this.profileError, 'Close', {
          duration: 4000,
          horizontalPosition: 'right',
          verticalPosition: 'top',
          panelClass: ['custom-snackbar', 'error-snackbar']
        });
      }
    });
  }
  
  private loadUserData(): void {
    try {
      const userStr = localStorage.getItem('user');
      if (userStr) {
        this.user = JSON.parse(userStr);
      }
      if (this.user) {
        this.patchProfileForm(this.user);
        this.imagePreview = this.user.image || this.user.profileImage || null;
      }
    } catch (error) {
      console.error('Error loading user data:', error);
    } finally {
      this.loading = false;
    }

    this.http.get<{ data?: { user?: User } }>(`${environment.apiUrl}/app/profile`).subscribe({
      next: response => {
        const user = response.data?.user;
        if (!user) {
          this.snackBar.open('Unable to load the latest profile details.', 'Close', {
            duration: 4000,
            horizontalPosition: 'right',
            verticalPosition: 'top',
            panelClass: ['custom-snackbar', 'error-snackbar']
          });
          return;
        }
        this.user = user;
        localStorage.setItem('user', JSON.stringify(user));
        this.imagePreview = user.image || user.profileImage || null;
        this.patchProfileForm(user);
      },
      error: error => {
        console.error('Unable to refresh profile details:', error);
        this.snackBar.open(error?.error?.message || 'Unable to load the latest profile details.', 'Close', {
          duration: 4000,
          horizontalPosition: 'right',
          verticalPosition: 'top',
          panelClass: ['custom-snackbar', 'error-snackbar']
        });
      }
    });
  }

  private patchProfileForm(user: User): void {
    const address = user.address || {};
    this.profileForm.patchValue({
      fullName: user.fullName || '',
      phone: user.phone || '',
      pincode: address.pincode ?? user.pincode ?? '',
      houseNo: address.houseNo ?? user.houseNo ?? '',
      locality: address.locality ?? user.locality ?? '',
      colony: address.colony ?? user.colony ?? '',
      city: address.city ?? user.city ?? ''
    });
  }

  onProfileImageError(): void {
    this.imagePreview = null;
    if (this.user) {
      this.user.image = null;
      this.user.profileImage = undefined;
    }
  }
  
  getUserInitials(): string {
    if (!this.user?.fullName) return 'U';
    
    const names = this.user.fullName.split(' ');
    if (names.length > 1) {
      return (names[0][0] + names[names.length - 1][0]).toUpperCase();
    }
    return this.user.fullName[0].toUpperCase();
  }
  
  formatDate(dateString: string): string {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }
  
  upgradePlan(): void {
    const selectedPlan = this.user?.type === 'pre' || this.user?.type === 'mains' ? 'combo' : 'pre';
    const dialogRef = this.dialog.open(PaymentDialogComponent, {
      width: '600px', maxWidth: '95vw', disableClose: true, data: { selectedPlan }
    });
    dialogRef.afterClosed().subscribe(result => {
      if (!result) return;
      this.authService.refreshUser().subscribe({ next: () => { this.loadUserData(); this.loadCurrentPlan(); } });
    });
  }
  
  isFreePlan(): boolean {
    return this.user?.type === 'free' || this.user?.type === 'fresh' || !this.user?.type;
  }
  
  getPlanColor(): string {
    const type = this.user?.type?.toLowerCase();
    switch(type) {
      case 'premium': return 'primary';
      case 'pro': return 'accent';
      case 'enterprise': return 'warn';
      default: return 'basic';
    }
  }
  
  getPlanDisplayName(): string {
    if (this.currentPlan?.name) return this.currentPlan.name;
    const type = this.user?.type;
    if (!type) return 'Free Plan';
    return type.charAt(0).toUpperCase() + type.slice(1) + ' Plan';
  }
}
