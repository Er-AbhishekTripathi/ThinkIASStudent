import { Component, Input, OnDestroy, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environment/environment';
import { TranslatePipe } from '../../i18n/translate.pipe';
import { LanguageService } from '../../i18n/language.service';

@Component({
  selector: 'app-test-series-schedule',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslatePipe],
  templateUrl: './test-series-schedule.component.html',
  styleUrl: './test-series-schedule.component.css'
})
export class TestSeriesScheduleComponent implements OnInit, OnDestroy {
  @Input() kind: 'pre'|'mains' = 'pre';
  readonly language = inject(LanguageService);
  private http = inject(HttpClient);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  series: any[] = []; error = '';
  search='';status='all';loading=true;
  private timer: ReturnType<typeof setInterval> | null = null;
  now = Date.now();
  state(item:any){
    const now = new Date(this.now);
    const startDate = new Date(item.startDate);
    const endDate = new Date(item.endDate);
    const isBefore = (date: Date) => date.getFullYear() < now.getFullYear() ||
      (date.getFullYear() === now.getFullYear() && date.getMonth() < now.getMonth()) ||
      (date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth() && date.getDate() < now.getDate());
    const isAfter = (date: Date) => date.getFullYear() > now.getFullYear() ||
      (date.getFullYear() === now.getFullYear() && date.getMonth() > now.getMonth()) ||
      (date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth() && date.getDate() > now.getDate());
    return isAfter(startDate) ? 'upcoming' : isBefore(endDate) ? 'completed' : 'available';
  }
  get filtered(){return this.series.filter(item=>(this.status==='all'||this.state(item)===this.status)&&[item.name,item.nameHi,item.nameHindi,item.description,item.descriptionHi,item.descriptionHindi].join(' ').toLowerCase().includes(this.search.toLowerCase()));}
  seriesText(item:any, field:'name'|'description'|'intro'):string {
    const hindi = item?.[`${field}Hi`] ?? item?.[`${field}Hindi`];
    return this.language.content(item?.[field], hindi);
  }
  testTitle(test:any):string {
    return this.language.content(test?.exam?.title, test?.exam?.titleHi ?? test?.exam?.titleHindi);
  }
  countdown(start:string){const ms=Math.max(0,+new Date(start)-this.now);const s=Math.floor(ms/1000);const d=Math.floor(s/86400),h=Math.floor((s%86400)/3600),m=Math.floor((s%3600)/60),sec=s%60;return d?`${d}d ${h}h ${m}m`:`${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}`;}
  slotStart(test:any){ if (test.exam?.startTime) return test.exam.startTime; const date=new Date(test.date); const [h,m]=String(test.time||'09:00').split(':').map(Number); date.setHours(h||0,m||0,0,0); return date.toISOString(); }
  hasQuestions(test:any){ return !!(test.exam?.questionUids?.length); }
  waiting(test:any){ return !!(test.window?.waiting || (!test.result && +new Date(this.slotStart(test)) > this.now)); }
  isToday(test:any){ const d=new Date(test.date); const n=new Date(this.now); return d.getFullYear()===n.getFullYear() && d.getMonth()===n.getMonth() && d.getDate()===n.getDate(); }
  canStart(test:any){return !!(test.exam && this.hasQuestions(test) && !test.result && test.window?.canTake);}
  startExam(test:any){ if (!test.exam?._id) return; this.router.navigate(['/take-test', test.exam._id]); }
  viewResult(test:any){ this.router.navigate(['/result-detail', test.result._id], { queryParams: { testId: test.exam._id } }); }
  ngOnInit() {
    this.kind=this.route.snapshot.data['kind'] || this.kind;
    this.timer = setInterval(() => this.now = Date.now(), 1000);
    this.http.get<any>(`${environment.apiUrl}/${this.kind === 'pre' ? 'prelims' : 'mains'}-ts/student/all`).subscribe({next: r => {this.series = r.data;this.loading=false;}, error: e => { this.loading=false; if (e.status === 403) this.error=e.error?.message || "Plan access required."; else this.error = this.language.hindi ? 'टेस्ट का कार्यक्रम लोड नहीं हुआ।' : 'Unable to load the test schedule.'; }});
  }
  ngOnDestroy() { if (this.timer) clearInterval(this.timer); }
}
