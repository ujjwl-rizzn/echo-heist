/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_REWARDED_AD_PROVIDER?:    "demo" | "google-gpt" | "off";
  readonly VITE_GAM_REWARDED_AD_UNIT_PATH?: string;
}
interface ImportMeta { readonly env: ImportMetaEnv; }

interface GoogletagApi {
  cmd: Array<() => void>;
  enums?: { OutOfPageFormat?: { REWARDED: unknown } };
  defineOutOfPageSlot?: (path: string, fmt: unknown) => GoogletagSlot | null;
  pubads?: () => GoogletagPubAds;
  enableServices?: () => void;
  display?: (slot: GoogletagSlot) => void;
  destroySlots?: (slots?: GoogletagSlot[]) => boolean;
}
interface GoogletagSlot { addService(s: GoogletagPubAds): GoogletagSlot; }
interface GoogletagPubAds {
  addEventListener(n: string, cb: (e: unknown) => void): void;
  removeEventListener?(n: string, cb: (e: unknown) => void): void;
}
interface Window { googletag?: GoogletagApi; }
