import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { ActivatedRoute } from '@angular/router';
import { environment } from '../../../environment/environment';
import { AuthService } from '../../shared/services/auth.service';

@Component({
  selector: 'app-support-tickets',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `<section class="wrap"><header><div><p>HELP DESK</p><h1>Support Tickets</h1><span>Raise a complaint, attach files and track admin replies.</span></div><button *ngIf="!isAdmin" type="button" (click)="showCreate=true">New ticket</button></header>
  <div class="filters"><select [(ngModel)]="status" (change)="load()"><option value="">All statuses</option><option value="open">Open</option><option value="in_progress">In progress</option><option value="closed">Closed</option></select></div>
  <p *ngIf="error" class="error">{{error}}</p>
  <div class="layout"><ul><li *ngFor="let ticket of tickets" (click)="open(ticket._id)" [class.active]="selected?._id===ticket._id"><strong>{{ticket.subject}}</strong><small>{{ticket.createdBy?.fullName || ticket.createdBy?.email}} · {{ticket.status}}</small></li></ul>
  <article *ngIf="selected"><h2>{{selected.subject}}</h2><p class="status">{{selected.status}}</p>
    <div class="messages"><div *ngFor="let message of selected.messages" [class.admin]="message.role==='admin'"><b>{{message.role}}</b><p>{{message.body}}</p><a *ngFor="let file of message.attachments" [href]="file.url" target="_blank" rel="noopener">{{file.name}}</a></div></div>
    <form *ngIf="selected.status!=='closed' || isAdmin" (submit)="reply($event)"><textarea [(ngModel)]="replyBody" name="reply" placeholder="Write a reply"></textarea><input type="file" multiple (change)="onFiles($event)" accept="image/*,.pdf"><button type="submit">Send reply</button></form>
    <div *ngIf="isAdmin" class="status-row"><button type="button" (click)="setStatus('open')">Open</button><button type="button" (click)="setStatus('in_progress')">In progress</button><button type="button" (click)="setStatus('closed')">Close</button></div>
  </article></div>
  <div class="modal" *ngIf="showCreate"><form (submit)="create($event)"><h3>Create ticket</h3><input [(ngModel)]="subject" name="subject" placeholder="Subject" required><textarea [(ngModel)]="body" name="body" placeholder="Describe your issue" required></textarea><input type="file" multiple (change)="onFiles($event)" accept="image/*,.pdf"><div><button type="submit">Submit</button><button type="button" (click)="showCreate=false">Cancel</button></div></form></div></section>`,
  styles: [`:host{display:block;background:#f6f8fb;min-height:100vh}.wrap{max-width:1100px;margin:0 auto;padding:24px}header{display:flex;justify-content:space-between;align-items:flex-end;background:#102a43;color:#fff;padding:28px;border-radius:16px}header p{margin:0;letter-spacing:.12em;font-size:11px}header h1{margin:8px 0}button{background:#198754;color:#fff;border:0;border-radius:8px;padding:10px 14px;cursor:pointer}.filters{margin:16px 0}.layout{display:grid;grid-template-columns:280px 1fr;gap:16px}ul{list-style:none;margin:0;padding:0;background:#fff;border-radius:12px}li{padding:14px;border-bottom:1px solid #eef2f6;cursor:pointer}li.active{background:#e8f6ee}article{background:#fff;border-radius:12px;padding:20px}.messages{display:flex;flex-direction:column;gap:10px;margin:16px 0}.messages div{padding:12px;border-radius:10px;background:#f1f5f9}.messages .admin{background:#e8f6ee}form{display:flex;flex-direction:column;gap:8px}textarea,input,select{padding:10px;border:1px solid #d6e0e8;border-radius:8px}.modal{position:fixed;inset:0;background:rgba(0,0,0,.4);display:grid;place-items:center}form{background:#fff;padding:20px;border-radius:12px;min-width:320px}.error{color:#be123c}.status-row{display:flex;gap:8px;margin-top:12px}.status-row button{background:#1d5374}`]
})
export class SupportTicketsComponent implements OnInit {
  private http = inject(HttpClient);
  private auth = inject(AuthService);
  private route = inject(ActivatedRoute);
  tickets: any[] = []; selected: any = null; status = ''; error = '';
  showCreate = false; subject = ''; body = ''; replyBody = ''; files: File[] = [];
  get isAdmin() { return this.auth.currentUser()?.role === 'admin'; }
  ngOnInit() { this.load(); const id = this.route.snapshot.queryParamMap.get('id'); if (id) this.open(id); }
  load() {
    const params: any = {}; if (this.status) params.status = this.status;
    this.http.get<any>(`${environment.apiUrl}/support-tickets`, { params }).subscribe({
      next: r => this.tickets = r.data || [],
      error: e => this.error = e.error?.message || 'Unable to load tickets.'
    });
  }
  open(id: string) {
    this.http.get<any>(`${environment.apiUrl}/support-tickets/${id}`).subscribe({ next: r => this.selected = r.data });
  }
  onFiles(event: Event) { this.files = Array.from((event.target as HTMLInputElement).files || []); }
  formData(extra: Record<string, string>) {
    const data = new FormData();
    Object.entries(extra).forEach(([key, value]) => data.append(key, value));
    this.files.forEach(file => data.append('attachments', file));
    return data;
  }
  create(event: Event) {
    event.preventDefault();
    this.http.post<any>(`${environment.apiUrl}/support-tickets`, this.formData({ subject: this.subject, body: this.body })).subscribe({
      next: r => { this.showCreate = false; this.subject = ''; this.body = ''; this.files = []; this.load(); this.selected = r.data; },
      error: e => this.error = e.error?.message || 'Unable to create ticket.'
    });
  }
  reply(event: Event) {
    event.preventDefault();
    this.http.post<any>(`${environment.apiUrl}/support-tickets/${this.selected._id}/replies`, this.formData({ body: this.replyBody })).subscribe({
      next: r => { this.selected = r.data; this.replyBody = ''; this.files = []; this.load(); },
      error: e => this.error = e.error?.message || 'Unable to send reply.'
    });
  }
  setStatus(status: string) {
    this.http.patch<any>(`${environment.apiUrl}/support-tickets/${this.selected._id}/status`, { status }).subscribe({ next: r => { this.selected = r.data; this.load(); } });
  }
}
