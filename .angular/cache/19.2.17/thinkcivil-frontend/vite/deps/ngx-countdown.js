import {
  NgTemplateOutlet,
  formatDate
} from "./chunk-IFBJS527.js";
import "./chunk-WMKVNYDR.js";
import {
  ChangeDetectionStrategy,
  Component,
  Injectable,
  InjectionToken,
  Input,
  LOCALE_ID,
  Output,
  ViewEncapsulation,
  afterNextRender,
  effect,
  inject,
  input,
  makeEnvironmentProviders,
  output,
  setClassMetadata,
  signal,
  ɵɵProvidersFeature,
  ɵɵconditional,
  ɵɵdefineComponent,
  ɵɵdefineInjectable,
  ɵɵelement,
  ɵɵelementContainer,
  ɵɵnextContext,
  ɵɵproperty,
  ɵɵpureFunction1,
  ɵɵsanitizeHtml,
  ɵɵtemplate
} from "./chunk-PHAA2FKV.js";
import "./chunk-WMWTRTCA.js";
import "./chunk-QO67QQ3F.js";
import "./chunk-PADBOZH3.js";
import {
  __spreadProps,
  __spreadValues
} from "./chunk-3OV72XIM.js";

// node_modules/ngx-countdown/fesm2022/ngx-countdown.mjs
var _c0 = (a0) => ({
  $implicit: a0
});
function CountdownComponent_Conditional_0_ng_container_0_Template(rf, ctx) {
  if (rf & 1) {
    ɵɵelementContainer(0);
  }
}
function CountdownComponent_Conditional_0_Template(rf, ctx) {
  if (rf & 1) {
    ɵɵtemplate(0, CountdownComponent_Conditional_0_ng_container_0_Template, 1, 0, "ng-container", 1);
  }
  if (rf & 2) {
    const ctx_r0 = ɵɵnextContext();
    ɵɵproperty("ngTemplateOutlet", ctx_r0.render())("ngTemplateOutletContext", ɵɵpureFunction1(2, _c0, ctx_r0.i()));
  }
}
function CountdownComponent_Conditional_1_Template(rf, ctx) {
  if (rf & 1) {
    ɵɵelement(0, "span", 0);
  }
  if (rf & 2) {
    const ctx_r0 = ɵɵnextContext();
    ɵɵproperty("innerHTML", ctx_r0.i().text, ɵɵsanitizeHtml);
  }
}
var CountdownStatus;
(function(CountdownStatus2) {
  CountdownStatus2[CountdownStatus2["ing"] = 0] = "ing";
  CountdownStatus2[CountdownStatus2["pause"] = 1] = "pause";
  CountdownStatus2[CountdownStatus2["stop"] = 2] = "stop";
  CountdownStatus2[CountdownStatus2["done"] = 3] = "done";
})(CountdownStatus || (CountdownStatus = {}));
var CountdownTimer = class _CountdownTimer {
  fns = [];
  commands = [];
  nextTime = 0;
  ing = false;
  start() {
    if (this.ing === true) {
      return;
    }
    this.ing = true;
    this.nextTime = +/* @__PURE__ */ new Date();
    this.process();
  }
  process() {
    while (this.commands.length) {
      this.commands.shift()();
    }
    let diff = +/* @__PURE__ */ new Date() - this.nextTime;
    const count = 1 + Math.floor(diff / 100);
    diff = 100 - diff % 100;
    this.nextTime += 100 * count;
    for (let i = 0, len = this.fns.length; i < len; i += 2) {
      let frequency = this.fns[i + 1];
      if (0 === frequency) {
        this.fns[i](count);
      } else {
        frequency += 2 * count - 1;
        const step = Math.floor(frequency / 20);
        if (step > 0) {
          this.fns[i](step);
        }
        this.fns[i + 1] = frequency % 20 + 1;
      }
    }
    if (!this.ing) {
      return;
    }
    setTimeout(() => this.process(), diff);
  }
  add(fn, frequency) {
    this.commands.push(() => {
      this.fns.push(fn);
      this.fns.push(frequency === 1e3 ? 1 : 0);
      this.ing = true;
    });
    return this;
  }
  remove(fn) {
    this.commands.push(() => {
      const i = this.fns.indexOf(fn);
      if (i !== -1) {
        this.fns.splice(i, 2);
      }
      this.ing = this.fns.length > 0;
    });
    return this;
  }
  static ɵfac = function CountdownTimer_Factory(__ngFactoryType__) {
    return new (__ngFactoryType__ || _CountdownTimer)();
  };
  static ɵprov = ɵɵdefineInjectable({
    token: _CountdownTimer,
    factory: _CountdownTimer.ɵfac
  });
};
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && setClassMetadata(CountdownTimer, [{
    type: Injectable
  }], null, null);
})();
var COUNTDOWN_CONFIG = new InjectionToken("COUNTDOWN_CONFIG");
function provideCountdown(config) {
  return makeEnvironmentProviders([{
    provide: COUNTDOWN_CONFIG,
    useValue: config
  }]);
}
var CountdownComponent = class _CountdownComponent {
  locale = inject(LOCALE_ID);
  timer = inject(CountdownTimer);
  defCog = inject(COUNTDOWN_CONFIG, {
    optional: true
  });
  frequency = 1e3;
  _notify = {};
  status = CountdownStatus.ing;
  isDestroy = false;
  _config;
  left = 0;
  i = signal({}, __spreadValues({}, ngDevMode ? {
    debugName: "i"
  } : {}));
  config = input.required(__spreadProps(__spreadValues({}, ngDevMode ? {
    debugName: "config"
  } : {}), {
    transform: (i) => {
      if (i.notify != null && !Array.isArray(i.notify) && i.notify > 0) {
        i.notify = [i.notify];
      }
      return i;
    }
  }));
  render = input(void 0, __spreadValues({}, ngDevMode ? {
    debugName: "render"
  } : {}));
  event = output();
  constructor() {
    afterNextRender(() => {
      this.init();
      if (!this._config?.demand) {
        this.begin();
      }
    });
    let cfgFirst = true;
    effect(() => {
      this.config();
      if (cfgFirst) {
        cfgFirst = false;
        return;
      }
      this.restart();
    });
  }
  /**
   * Start countdown, you must manually call when `demand: false`
   */
  begin() {
    this.status = CountdownStatus.ing;
    this.callEvent("start");
  }
  /**
   * Restart countdown
   */
  restart() {
    if (this.status !== CountdownStatus.stop) {
      this.destroy();
    }
    this.init();
    this.callEvent("restart");
  }
  /**
   * Stop countdown, must call `restart` when stopped, it's different from pause, unable to recover
   */
  stop() {
    if (this.status === CountdownStatus.stop) {
      return;
    }
    this.status = CountdownStatus.stop;
    this.destroy();
    this.callEvent("stop");
  }
  /**
   * Pause countdown, you can use `resume` to recover again
   */
  pause() {
    if (this.status === CountdownStatus.stop || this.status === CountdownStatus.pause) {
      return;
    }
    this.status = CountdownStatus.pause;
    this.callEvent("pause");
  }
  /**
   * Resume countdown
   */
  resume() {
    if (this.status === CountdownStatus.stop || this.status !== CountdownStatus.pause) {
      return;
    }
    this.status = CountdownStatus.ing;
    this.callEvent("resume");
  }
  callEvent(action) {
    this.event.emit({
      action,
      left: this.left,
      status: this.status,
      text: this.i().text
    });
  }
  init() {
    const config = __spreadValues(__spreadValues({
      demand: false,
      leftTime: 0,
      format: "HH:mm:ss",
      timezone: "+0000",
      formatDate: ({
        date,
        formatStr,
        timezone
      }) => {
        return formatDate(new Date(date), formatStr, this.locale, timezone || "+0000");
      }
    }, this.defCog), this.config());
    this._config = config;
    const frq = this.frequency = ~config.format.indexOf("S") ? 100 : 1e3;
    this.status = config.demand ? CountdownStatus.pause : CountdownStatus.ing;
    this.getLeft();
    const _reflow = this.reflow;
    this.reflow = (count = 0, force = false) => _reflow.apply(this, [count, force]);
    if (Array.isArray(config.notify)) {
      config.notify.forEach((time) => {
        if (time < 1) {
          throw new Error(`The notify config must be a positive integer.`);
        }
        time = time * 1e3;
        time = time - time % frq;
        this._notify[time] = true;
      });
    }
    this.timer.add(this.reflow, frq).start();
    this.reflow(0, true);
  }
  destroy() {
    this.timer.remove(this.reflow);
    return this;
  }
  /**
   * 更新时钟
   */
  reflow(count = 0, force = false) {
    if (this.isDestroy || this._config == null) {
      return;
    }
    const {
      status,
      _notify
    } = this;
    if (!force && status !== CountdownStatus.ing) {
      return;
    }
    let value = this.left = this.left - this.frequency * count;
    if (value < 1) {
      value = 0;
    }
    const {
      formatDate: formatDate2,
      format,
      timezone,
      prettyText,
      notify
    } = this._config;
    const item = {
      value,
      text: formatDate2({
        date: value,
        formatStr: format,
        timezone
      })
    };
    if (typeof prettyText === "function") {
      item.text = prettyText(item.text);
    }
    this.i.set(item);
    if (notify === 0 || _notify[value]) {
      this.callEvent("notify");
    }
    if (value === 0) {
      this.status = CountdownStatus.done;
      this.destroy();
      this.callEvent("done");
    }
  }
  /**
   * 获取倒计时剩余帧数
   */
  getLeft() {
    const {
      frequency
    } = this;
    const {
      leftTime,
      stopTime
    } = this._config;
    let left = leftTime * 1e3;
    const end = stopTime;
    if (!left && end) {
      left = end - (/* @__PURE__ */ new Date()).getTime();
    }
    this.left = left - left % frequency;
  }
  ngOnDestroy() {
    this.isDestroy = true;
    this.destroy();
  }
  static ɵfac = function CountdownComponent_Factory(__ngFactoryType__) {
    return new (__ngFactoryType__ || _CountdownComponent)();
  };
  static ɵcmp = ɵɵdefineComponent({
    type: _CountdownComponent,
    selectors: [["countdown"]],
    hostAttrs: [1, "count-down"],
    inputs: {
      config: [1, "config"],
      render: [1, "render"]
    },
    outputs: {
      event: "event"
    },
    features: [ɵɵProvidersFeature([CountdownTimer])],
    decls: 2,
    vars: 1,
    consts: [[3, "innerHTML"], [4, "ngTemplateOutlet", "ngTemplateOutletContext"]],
    template: function CountdownComponent_Template(rf, ctx) {
      if (rf & 1) {
        ɵɵtemplate(0, CountdownComponent_Conditional_0_Template, 1, 4, "ng-container")(1, CountdownComponent_Conditional_1_Template, 1, 1, "span", 0);
      }
      if (rf & 2) {
        ɵɵconditional(ctx.render() ? 0 : 1);
      }
    },
    dependencies: [NgTemplateOutlet],
    styles: [".count-down{font-variant-numeric:tabular-nums}\n"],
    encapsulation: 2,
    changeDetection: 0
  });
};
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && setClassMetadata(CountdownComponent, [{
    type: Component,
    args: [{
      selector: "countdown",
      template: `
    @if (render()) {
      <ng-container *ngTemplateOutlet="render(); context: { $implicit: i() }" />
    } @else {
      <span [innerHTML]="i().text"></span>
    }
  `,
      host: {
        class: "count-down"
      },
      encapsulation: ViewEncapsulation.None,
      changeDetection: ChangeDetectionStrategy.OnPush,
      imports: [NgTemplateOutlet],
      providers: [CountdownTimer],
      styles: [".count-down{font-variant-numeric:tabular-nums}\n"]
    }]
  }], () => [], {
    config: [{
      type: Input,
      args: [{
        isSignal: true,
        alias: "config",
        required: true
      }]
    }],
    render: [{
      type: Input,
      args: [{
        isSignal: true,
        alias: "render",
        required: false
      }]
    }],
    event: [{
      type: Output,
      args: ["event"]
    }]
  });
})();
export {
  COUNTDOWN_CONFIG,
  CountdownComponent,
  CountdownStatus,
  CountdownTimer,
  provideCountdown
};
//# sourceMappingURL=ngx-countdown.js.map
