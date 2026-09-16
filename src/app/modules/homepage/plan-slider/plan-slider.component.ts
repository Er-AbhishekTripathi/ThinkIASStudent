import { CommonModule } from '@angular/common';
import { AfterViewInit, Component, ElementRef, HostListener, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { RouterLink } from '@angular/router';
import Swiper from 'swiper';
import { Autoplay, Navigation, Pagination } from 'swiper/modules';
import { SupportFeature, SupportFeatureService } from '../../../shared/services/support-feature.service';
import { Plan, PublicPlanService } from '../../../shared/services/public-plan.service';
import { TranslatePipe } from '../../../shared/i18n/translate.pipe';

@Component({
  selector: 'app-plan-slider',
  standalone: true,
  imports: [CommonModule, RouterLink, TranslatePipe],
  templateUrl: './plan-slider.component.html',
  styleUrls: ['./plan-slider.component.css']
})
export class PlanSliderComponent implements OnInit, AfterViewInit, OnDestroy {
  features: SupportFeature[] = [];
  plans: Plan[] = [];
  loading = true;
  currentLanguage: 'en' | 'hi' = 'en';
  private viewReady = false;
  private swiper?: Swiper;
  private slider?: ElementRef<HTMLElement>;

  constructor(private supportFeatureService: SupportFeatureService, private planService: PublicPlanService) {}

  @ViewChild('planSlider')
  set sliderElement(element: ElementRef<HTMLElement> | undefined) {
    this.slider = element;
    if (element) this.initializeWhenReady();
  }

  ngOnInit(): void {
    this.planService.getPlans().subscribe({next: plans => this.plans = plans, error: () => this.plans = []});
    this.setLanguage(localStorage.getItem('preferredLanguage'));
    this.supportFeatureService.getPublic().subscribe({
      next: response => {
        this.features = response.data || [];
        this.loading = false;
        this.initializeWhenReady();
      },
      error: error => {
        console.error('Unable to load support features:', error);
        this.features = [];
        this.loading = false;
      }
    });
  }

  ngAfterViewInit(): void {
    this.viewReady = true;
    this.initializeWhenReady();
  }

  ngOnDestroy(): void { this.swiper?.destroy(); }

  @HostListener('window:preferredLanguageChanged', ['$event'])
  onPreferredLanguageChanged(event: Event): void {
    this.setLanguage((event as CustomEvent<string>).detail);
  }

  private setLanguage(language: string | null): void {
    this.currentLanguage = language === 'hi' ? 'hi' : 'en';
  }

  private initializeWhenReady(): void {
    if (!this.viewReady || !this.slider || !this.features.length || this.swiper) return;
    requestAnimationFrame(() => {
      const element = this.slider?.nativeElement;
      if (!element || this.swiper) return;
      this.swiper = new Swiper(element, {
        modules: [Autoplay, Navigation, Pagination],
        spaceBetween: 24,
        slidesPerView: 1,
        loop: this.features.length > 2,
        autoplay: this.features.length > 1 ? { delay: 3500, disableOnInteraction: false } : false,
        pagination: { el: element.querySelector<HTMLElement>('.swiper-pagination'), clickable: true },
        navigation: {
          nextEl: element.querySelector<HTMLElement>('.swiper-button-next'),
          prevEl: element.querySelector<HTMLElement>('.swiper-button-prev')
        },
        breakpoints: {
          576: { slidesPerView: 1.15, spaceBetween: 16 },
          768: { slidesPerView: 2, spaceBetween: 20 },
          1200: { slidesPerView: 3, spaceBetween: 24 }
        },
        observer: true,
        observeParents: true
      });
    });
  }
}
