import {
  MAT_SELECT_CONFIG,
  MAT_SELECT_SCROLL_STRATEGY,
  MAT_SELECT_SCROLL_STRATEGY_PROVIDER,
  MAT_SELECT_SCROLL_STRATEGY_PROVIDER_FACTORY,
  MAT_SELECT_TRIGGER,
  MatSelect,
  MatSelectChange,
  MatSelectModule,
  MatSelectTrigger
} from "./chunk-PHDEZWYH.js";
import "./chunk-MME4TA6I.js";
import {
  MatOptgroup,
  MatOption
} from "./chunk-4V5CJ4IE.js";
import "./chunk-MC26V3YR.js";
import "./chunk-HAGFGYV6.js";
import "./chunk-3LRVLCZG.js";
import "./chunk-R4QB32YE.js";
import "./chunk-QNNCSYIE.js";
import {
  MatError,
  MatFormField,
  MatHint,
  MatLabel,
  MatPrefix,
  MatSuffix
} from "./chunk-NQDLPWHY.js";
import "./chunk-APORKUJ5.js";
import "./chunk-GZDEY6TV.js";
import "./chunk-GDCFXQT3.js";
import "./chunk-TXEFZBJN.js";
import "./chunk-6DPAHEZK.js";
import "./chunk-Q7UVACK5.js";
import "./chunk-AGZFHLKA.js";
import "./chunk-O25QD2X7.js";
import "./chunk-WFH4YVF4.js";
import "./chunk-42FJBLFI.js";
import "./chunk-GV5LUSDY.js";
import "./chunk-UK46QBII.js";
import "./chunk-CNXFWQY6.js";
import "./chunk-DG6N4IH3.js";
import "./chunk-PI3XDM6F.js";
import "./chunk-EMVDPC3H.js";
import "./chunk-2O4WY5GE.js";
import "./chunk-ZZRY6M7F.js";
import "./chunk-O2FTVVHZ.js";
import "./chunk-NNA7RKVG.js";
import "./chunk-WLZVAFJV.js";
import "./chunk-JTQNEUZT.js";
import "./chunk-IFBJS527.js";
import "./chunk-WMKVNYDR.js";
import "./chunk-PHAA2FKV.js";
import "./chunk-QO67QQ3F.js";
import "./chunk-WMWTRTCA.js";
import "./chunk-PADBOZH3.js";
import "./chunk-3OV72XIM.js";

// node_modules/@angular/material/fesm2022/select.mjs
var matSelectAnimations = {
  // Represents
  // trigger('transformPanelWrap', [
  //   transition('* => void', query('@transformPanel', [animateChild()], {optional: true})),
  // ])
  /**
   * This animation ensures the select's overlay panel animation (transformPanel) is called when
   * closing the select.
   * This is needed due to https://github.com/angular/angular/issues/23302
   */
  transformPanelWrap: {
    type: 7,
    name: "transformPanelWrap",
    definitions: [{
      type: 1,
      expr: "* => void",
      animation: {
        type: 11,
        selector: "@transformPanel",
        animation: [{
          type: 9,
          options: null
        }],
        options: {
          optional: true
        }
      },
      options: null
    }],
    options: {}
  },
  // Represents
  // trigger('transformPanel', [
  //   state(
  //     'void',
  //     style({
  //       opacity: 0,
  //       transform: 'scale(1, 0.8)',
  //     }),
  //   ),
  //   transition(
  //     'void => showing',
  //     animate(
  //       '120ms cubic-bezier(0, 0, 0.2, 1)',
  //       style({
  //         opacity: 1,
  //         transform: 'scale(1, 1)',
  //       }),
  //     ),
  //   ),
  //   transition('* => void', animate('100ms linear', style({opacity: 0}))),
  // ])
  /** This animation transforms the select's overlay panel on and off the page. */
  transformPanel: {
    type: 7,
    name: "transformPanel",
    definitions: [{
      type: 0,
      name: "void",
      styles: {
        type: 6,
        styles: {
          opacity: 0,
          transform: "scale(1, 0.8)"
        },
        offset: null
      }
    }, {
      type: 1,
      expr: "void => showing",
      animation: {
        type: 4,
        styles: {
          type: 6,
          styles: {
            opacity: 1,
            transform: "scale(1, 1)"
          },
          offset: null
        },
        timings: "120ms cubic-bezier(0, 0, 0.2, 1)"
      },
      options: null
    }, {
      type: 1,
      expr: "* => void",
      animation: {
        type: 4,
        styles: {
          type: 6,
          styles: {
            opacity: 0
          },
          offset: null
        },
        timings: "100ms linear"
      },
      options: null
    }],
    options: {}
  }
};
export {
  MAT_SELECT_CONFIG,
  MAT_SELECT_SCROLL_STRATEGY,
  MAT_SELECT_SCROLL_STRATEGY_PROVIDER,
  MAT_SELECT_SCROLL_STRATEGY_PROVIDER_FACTORY,
  MAT_SELECT_TRIGGER,
  MatError,
  MatFormField,
  MatHint,
  MatLabel,
  MatOptgroup,
  MatOption,
  MatPrefix,
  MatSelect,
  MatSelectChange,
  MatSelectModule,
  MatSelectTrigger,
  MatSuffix,
  matSelectAnimations
};
//# sourceMappingURL=@angular_material_select.js.map
