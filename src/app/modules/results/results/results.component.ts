import { Component, computed, inject, signal, OnInit, TemplateRef, ViewChild, ElementRef, AfterViewChecked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { Router } from '@angular/router';
import { TestService, TestResult } from '../../../shared/services/test.service';
import { AuthService } from '../../../shared/services/auth.service';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { FormsModule } from '@angular/forms';
import { MatDialog, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatBadgeModule } from '@angular/material/badge';
import { MatSortModule, Sort } from '@angular/material/sort';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { interval, Subscription } from 'rxjs';
import { switchMap } from 'rxjs/operators';

interface ChatMessage {
  _id: string;
  result: string;
  sender: {
    _id: string;
    fullName: string;
    email: string;
    role: string;
  };
  receiver: {
    _id: string;
    fullName: string;
    email: string;
    role: string;
  };
  message: string;
  isEdited: boolean;
  isRead: boolean;
  readAt: string;
  createdAt: string;
  updatedAt: string;
}

@Component({
  selector: 'app-results',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    FormsModule,
    MatBadgeModule,
    MatSortModule,
    MatPaginatorModule,
    // TruncatePipe
  ],
  templateUrl: './results.component.html',
  styleUrl: './results.component.css'
})
export class ResultsComponent implements OnInit, AfterViewChecked {
  @ViewChild('sendQueryDialog') sendQueryDialog!: TemplateRef<any>;
  @ViewChild('chatMessagesContainer') chatMessagesContainer!: ElementRef;

  private testService = inject(TestService);
  private authService = inject(AuthService);
  private router = inject(Router);
  private dialog = inject(MatDialog);

  results = signal<TestResult[]>([]);
  sortState = signal<Sort>({ active: 'submittedAt', direction: 'desc' });
  sortedResults = computed(() => {
    const results = this.results();
    const { active, direction } = this.sortState();

    if (!active || !direction) {
      return results;
    }

    return [...results].sort((a, b) => this.compareResults(a, b, active, direction));
  });
  searchTerm = signal('');
  pageIndex = signal(0);
  pageSize = signal(10);
  filteredResults = computed(() => {
    const query = this.searchTerm().trim().toLocaleLowerCase();
    const results = this.sortedResults();

    if (!query) return results;

    return results.filter(result => {
      const startTime = result.test.startTime;
      const submittedAt = result.submittedAt;
      const searchableValues = [
        result.test.title,
        startTime,
        startTime ? this.formatSearchDate(startTime) : '',
        `${result.score}/${result.totalMarks}`,
        `${result.percentage}%`,
        result.rank,
        result.rank ? `${result.rank}${this.getOrdinalSuffix(result.rank)}` : '',
        result.totalStudents,
        result.totalStudents ? `out of ${result.totalStudents}` : '',
        submittedAt,
        submittedAt ? this.formatSearchDate(submittedAt) : '',
        result.videoLink ? 'watch video' : 'no recording'
      ];

      return searchableValues.some(value =>
        String(value ?? '').toLocaleLowerCase().includes(query)
      );
    });
  });
  pagedResults = computed(() => {
    const results = this.filteredResults();
    const pageSize = Math.max(this.pageSize(), 1);
    const lastPage = Math.max(Math.ceil(results.length / pageSize) - 1, 0);
    const page = Math.min(this.pageIndex(), lastPage);

    return results.slice(page * pageSize, (page + 1) * pageSize);
  });
  chatMessages = signal<ChatMessage[]>([]);
  loading = signal(false);
  chatLoading = signal(false);
  displayedColumns: string[] = ['test', 'score', 'percentage', 'rank', 'submittedAt', 'actions'];

  newMessage: string = '';
  selectedResult: any = null;
  dialogRef!: MatDialogRef<any>;
  editingMessage: ChatMessage | null = null;
  currentUserId: string = '';
  currentUserRole: string = '';
  
  private chatPollingSubscription!: Subscription;

  ngOnInit() {
    this.loadResults();
    const currentUser = this.authService.currentUser();
    console.log(currentUser?.id);
    
    // this.currentUserId = currentUser?._id || '';
    this.currentUserRole = currentUser?.role || '';
  }

  ngAfterViewChecked() {
    this.scrollToBottom();
  }

  scrollToBottom() {
    if (this.chatMessagesContainer) {
      this.chatMessagesContainer.nativeElement.scrollTop = 
        this.chatMessagesContainer.nativeElement.scrollHeight;
    }
  }

  loadResults() {
    this.loading.set(true);
    this.testService.getStudentResults().subscribe({
      next: (results) => {
        this.results.set(results);
        // Calculate unread counts from results data if available
        this.loading.set(false);
      },
      error: (error) => {
        console.error('Error loading results:', error);
        this.loading.set(false);
      }
    });
  }

  onSortChange(sort: Sort) {
    this.sortState.set(sort);
  }

  selectSortColumn(active: string) {
    this.sortState.set({ active, direction: 'asc' });
  }

  toggleSortDirection() {
    const { active, direction } = this.sortState();
    if (!active) return;

    this.sortState.set({ active, direction: direction === 'asc' ? 'desc' : 'asc' });
  }

  onSearchChange(value: string) {
    this.searchTerm.set(value);
    this.pageIndex.set(0);
  }

  clearSearch() {
    this.onSearchChange('');
  }

  onPageChange(event: PageEvent) {
    this.pageIndex.set(event.pageIndex);
    this.pageSize.set(event.pageSize);
  }

  private compareResults(a: TestResult, b: TestResult, column: string, direction: 'asc' | 'desc'): number {
    const aValue = this.getSortValue(a, column);
    const bValue = this.getSortValue(b, column);

    if (aValue === null) return bValue === null ? 0 : 1;
    if (bValue === null) return -1;

    const comparison = typeof aValue === 'string' && typeof bValue === 'string'
      ? aValue.localeCompare(bValue, undefined, { numeric: true, sensitivity: 'base' })
      : Number(aValue) - Number(bValue);

    return direction === 'asc' ? comparison : -comparison;
  }

  private getSortValue(result: TestResult, column: string): string | number | null {
    switch (column) {
      case 'test':
        return result.test.title.toLocaleLowerCase();
      case 'score':
        return Number.isFinite(result.score) ? result.score : null;
      case 'percentage':
        return Number.isFinite(result.percentage) ? result.percentage : null;
      case 'rank':
        return typeof result.rank === 'number' && Number.isFinite(result.rank) ? result.rank : null;
      case 'submittedAt': {
        const timestamp = Date.parse(result.submittedAt);
        return Number.isFinite(timestamp) ? timestamp : null;
      }
      default:
        return null;
    }
  }

  private formatSearchDate(value: string): string {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;

    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      second: '2-digit'
    });
  }

  // Calculate unread count from chat messages
  getUnreadCount(resultId: string): number {
    if (!this.chatMessages() || this.chatMessages().length === 0) return 0;
    
    return this.chatMessages().filter(msg => 
      msg.result === resultId && 
      !msg.isRead && 
      msg.receiver._id === this.currentUserId
    ).length;
  }

  viewDetailedResult(result: TestResult) {
    this.router.navigate(['/result-detail', result._id], {
      queryParams: { testId: result.test._id }
    });
  }

  getRankColor(rank: number): string {
    if (rank === 1) return 'gold';
    if (rank === 2) return 'silver';
    if (rank === 3) return '#cd7f32';
    return '';
  }

  getOrdinalSuffix(n: number): string {
    const s = ["th", "st", "nd", "rd"];
    const v = n % 100;
    return s[(v - 20) % 10] || s[v] || s[0];
  }

  openSendQuery(result: any) {
    this.selectedResult = result;
    this.newMessage = '';
    this.editingMessage = null;
    this.chatMessages.set([]);

    this.dialogRef = this.dialog.open(this.sendQueryDialog, {
      width: '600px',
      maxHeight: '90vh',
      disableClose: false
    });

    this.loadChatMessages(result._id);
    this.startChatPolling(result._id);
  }

  loadChatMessages(resultId: string) {
    this.chatLoading.set(true);
    this.testService.getChatMessages(resultId).subscribe({
      next: (messages: ChatMessage[]) => {
        this.chatMessages.set(messages);
        this.chatLoading.set(false);
        setTimeout(() => this.scrollToBottom(), 100);
      },
      error: (error) => {
        console.error('Error loading chat messages:', error);
        this.chatLoading.set(false);
      }
    });
  }

  startChatPolling(resultId: string) {
    // Stop any existing polling
    if (this.chatPollingSubscription) {
      this.chatPollingSubscription.unsubscribe();
    }

    // Poll every 10 seconds (less frequent)
    this.chatPollingSubscription = interval(10000).pipe(
      switchMap(() => this.testService.getChatMessages(resultId))
    ).subscribe({
      next: (messages: ChatMessage[]) => {
        this.chatMessages.set(messages);
        setTimeout(() => this.scrollToBottom(), 100);
      },
      error: (error) => {
        console.error('Error polling chat messages:', error);
      }
    });
  }

  sendMessage() {
    if (!this.newMessage.trim() || !this.selectedResult) return;

    if (this.editingMessage) {
      this.updateMessage();
    } else {
      const messageData = {
        result: this.selectedResult._id,
        message: this.newMessage.trim()
      };

      this.testService.sendMessage(messageData).subscribe({
        next: (message: ChatMessage) => {
          this.chatMessages.update(messages => [...messages, message]);
          this.newMessage = '';
          setTimeout(() => this.scrollToBottom(), 100);
        },
        error: (error) => {
          console.error('Error sending message:', error);
        }
      });
    }
  }

  updateMessage() {
    if (!this.editingMessage || !this.newMessage.trim()) return;

    this.testService.updateMessage(this.editingMessage._id, this.newMessage.trim()).subscribe({
      next: (updatedMessage: ChatMessage) => {
        this.chatMessages.update(messages => 
          messages.map(msg => msg._id === updatedMessage._id ? updatedMessage : msg)
        );
        this.cancelEdit();
        setTimeout(() => this.scrollToBottom(), 100);
      },
      error: (error) => {
        console.error('Error updating message:', error);
      }
    });
  }

  deleteMessage(message: ChatMessage) {
    if (confirm('Are you sure you want to delete this message?')) {
      this.testService.deleteMessage(message._id).subscribe({
        next: () => {
          this.chatMessages.update(messages => 
            messages.filter(msg => msg._id !== message._id)
          );
        },
        error: (error) => {
          console.error('Error deleting message:', error);
        }
      });
    }
  }

  editMessage(message: ChatMessage) {
    this.editingMessage = message;
    this.newMessage = message.message;
  }

  cancelEdit() {
    this.editingMessage = null;
    this.newMessage = '';
  }

  onEnterKey(event: Event) {
    const keyboardEvent = event as KeyboardEvent;
    if (keyboardEvent.key === 'Enter' && !keyboardEvent.shiftKey) {
      keyboardEvent.preventDefault();
      this.sendMessage();
    }
  }

  closeQueryDialog() {
    if (this.chatPollingSubscription) {
      this.chatPollingSubscription.unsubscribe();
    }
    
    if (this.dialogRef) {
      this.dialogRef.close();
    }
  }

  // Helper method to check if user can delete message
  canDeleteMessage(message: ChatMessage): boolean {
    return message.sender._id === this.currentUserId || this.currentUserRole === 'admin';
  }
}