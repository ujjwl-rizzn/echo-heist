/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_REWARDED_AD_PROVIDER?: "demo" | "google-gpt" | "off";
  readonly VITE_GAM_REWARDED_AD_UNIT_PATH?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

interface GoogletagApi {
  cmd: Array<() => void>;
  enums?: {
    OutOfPageFormat?: {
      REWARDED: unknown;
    };
  };
  defineOutOfPageSlot?: (adUnitPath: string, format: unknown) => GoogletagSlot | null;
  pubads?: () => GoogletagPubAds;
  enableServices?: () => void;
  display?: (slot: GoogletagSlot) => void;
  destroySlots?: (slots?: GoogletagSlot[]) => boolean;
}

interface GoogletagSlot {
  addService(service: GoogletagPubAds): GoogletagSlot;
}

interface GoogletagPubAds {
  addEventListener(eventName: string, callback: (event: any) => void): void;
  removeEventListener?: (eventName: string, callback: (event: any) => void) => void;
}

interface Window {
  googletag?: GoogletagApi;
}
