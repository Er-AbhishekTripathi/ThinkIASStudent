import {
  MatPseudoCheckbox
} from "./chunk-3LRVLCZG.js";
import {
  MatCommonModule
} from "./chunk-O25QD2X7.js";
import {
  NgModule,
  setClassMetadata,
  ɵɵdefineInjector,
  ɵɵdefineNgModule
} from "./chunk-PHAA2FKV.js";

// node_modules/@angular/material/fesm2022/pseudo-checkbox-module-CAX2sutq.mjs
var MatPseudoCheckboxModule = class _MatPseudoCheckboxModule {
  static ɵfac = function MatPseudoCheckboxModule_Factory(__ngFactoryType__) {
    return new (__ngFactoryType__ || _MatPseudoCheckboxModule)();
  };
  static ɵmod = ɵɵdefineNgModule({
    type: _MatPseudoCheckboxModule,
    imports: [MatCommonModule, MatPseudoCheckbox],
    exports: [MatPseudoCheckbox]
  });
  static ɵinj = ɵɵdefineInjector({
    imports: [MatCommonModule]
  });
};
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && setClassMetadata(MatPseudoCheckboxModule, [{
    type: NgModule,
    args: [{
      imports: [MatCommonModule, MatPseudoCheckbox],
      exports: [MatPseudoCheckbox]
    }]
  }], null, null);
})();

export {
  MatPseudoCheckboxModule
};
//# sourceMappingURL=chunk-MC26V3YR.js.map
