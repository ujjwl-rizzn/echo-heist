import { DEMO_REWARDED_BREAK_MS, SPONSOR_CACHE_COOLDOWN_MS, SPONSOR_CACHE_CREDITS } from "../constants";
import type { LevelResult, RewardClaimResult, RewardPanelData } from "../types";
import type { SaveManager } from "./SaveManager";
import type { UIManager }   from "./UIManager";

type Placement = "menu-drop" | "result-boost";
type Mode = "demo" | "google-gpt" | "off";

interface FlowResult { status: RewardClaimResult["status"]; message: string; providerLabel: string; }
interface Offer { placement: Placement; title: string; copy: string; credits: number; }
interface Provider { readonly label: string; present(offer: Offer): Promise<FlowResult>; }

class DemoProvider implements Provider {
  readonly label = "Demo sponsor clip";
  constructor(private readonly ui: UIManager) {}
  async present(o: Offer): Promise<FlowResult> {
    const granted = await this.ui.presentRewardedBreak({
      title: o.title, copy: o.copy,
      rewardLabel: `+${o.credits} credits`, providerLabel: this.label,
      countdownMs: DEMO_REWARDED_BREAK_MS
    });
    return granted
      ? { status:"granted",   message:`Sponsor clip done. +${o.credits} credits added.`, providerLabel:this.label }
      : { status:"cancelled", message:"Sponsor clip skipped. No credits added.",          providerLabel:this.label };
  }
}

class OffProvider implements Provider {
  readonly label = "Ads disabled";
  async present(): Promise<FlowResult> {
    return { status:"unavailable", message:"Rewarded ads are off for this build.", providerLabel:this.label };
  }
}

class GptProvider implements Provider {
  readonly label = "Google rewarded ad";
  private scriptP: Promise<void> | null = null;
  private servicesEnabled = false;

  constructor(private readonly adUnit: string) {}

  async present(): Promise<FlowResult> {
    try {
      await this.ensureScript();
      const gt = window.googletag;
      if (!gt?.cmd) return { status:"error", message:"Google ad services failed to init.", providerLabel:this.label };
      return await new Promise<FlowResult>(resolve => {
        gt.cmd.push(() => {
          const fmt  = gt.enums?.OutOfPageFormat?.REWARDED;
          const slot = fmt && typeof gt.defineOutOfPageSlot === "function" ? gt.defineOutOfPageSlot(this.adUnit, fmt) : null;
          if (!slot) { resolve({ status:"unavailable", message:"Rewarded ads not available on this browser.", providerLabel:this.label }); return; }
          const pa = gt.pubads?.();
          if (!pa)  { resolve({ status:"error", message:"Ad service could not start.", providerLabel:this.label }); return; }
          let granted = false, settled = false;
          const done = (r: FlowResult) => { if (settled) return; settled=true; typeof gt.destroySlots==="function" && gt.destroySlots([slot]); resolve(r); };
          pa.addEventListener("rewardedSlotReady", (e: unknown) => {
            const event = e as { slot?: unknown; makeRewardedVisible?: () => void };
            if (event.slot === slot) event.makeRewardedVisible?.();
          });
          pa.addEventListener("rewardedSlotGranted", (e: unknown) => {
            const event = e as { slot?: unknown };
            if (event.slot === slot) granted = true;
          });
          pa.addEventListener("rewardedSlotClosed", (e: unknown) => {
            const event = e as { slot?: unknown };
            if (event.slot !== slot) return;
            done(
              granted
                ? { status:"granted",message:"Reward granted.",providerLabel:this.label }
                : { status:"cancelled",message:"Ad closed early.",providerLabel:this.label }
            );
          });
          slot.addService(pa);
          if (!this.servicesEnabled && typeof gt.enableServices==="function") { gt.enableServices(); this.servicesEnabled=true; }
          if (typeof gt.display==="function") gt.display(slot);
          else done({ status:"error", message:"Ad could not display.", providerLabel:this.label });
        });
      });
    } catch { return { status:"error", message:"Ad script failed to load.", providerLabel:this.label }; }
  }

  private ensureScript(): Promise<void> {
    if (this.scriptP) return this.scriptP;
    this.scriptP = new Promise((res, rej) => {
      const ex = document.querySelector<HTMLScriptElement>('script[data-ehgpt]');
      if (ex) { ex.dataset.loaded==="true" ? res() : ex.addEventListener("load",()=>res(),{once:true}); return; }
      window.googletag = window.googletag ?? { cmd:[] };
      const s = document.createElement("script");
      s.async = true; s.src = "https://securepubads.g.doubleclick.net/tag/js/gpt.js"; s.dataset.ehgpt = "true";
      s.addEventListener("load",  () => { s.dataset.loaded="true"; res(); }, { once:true });
      s.addEventListener("error", () => rej(new Error("GPT load failed.")),   { once:true });
      document.head.appendChild(s);
    });
    return this.scriptP;
  }
}

const fmtDuration = (ms: number): string => {
  const m = Math.ceil(ms/60000), h = Math.floor(m/60), r = m%60;
  if (h<=0) return `${r}m`; if (r<=0) return `${h}h`; return `${h}h ${r}m`;
};

export class RewardedAdManager {
  private readonly provider: Provider;
  private readonly mode: Mode;

  constructor(private readonly save: SaveManager, private readonly ui: UIManager) {
    this.mode     = this.resolveMode();
    this.provider = this.makeProvider();
  }

  getMainMenuPanel(now = Date.now()): RewardPanelData {
    const meta    = this.save.getRewardMeta();
    const readyAt = meta.lastSponsorDropAt ? meta.lastSponsorDropAt + SPONSOR_CACHE_COOLDOWN_MS : 0;
    const avail   = !meta.lastSponsorDropAt || now >= readyAt;
    return {
      eyebrow: "Sponsor Relay",
      title:   avail ? "Claim sponsor cache" : "Cache cooling down",
      copy:    avail
        ? "Watch a short sponsor break before your next run and take a credit injection."
        : "Sponsor relay is on cooldown to prevent unlimited free farming.",
      buttonLabel: avail ? this.ctaLabel("menu-drop") : `Ready in ${fmtDuration(readyAt - now)}`,
      note:    this.providerNote(avail),
      disabled: !avail || this.mode === "off"
    };
  }

  async claimMainMenuDrop(): Promise<RewardClaimResult> {
    const panel = this.getMainMenuPanel();
    if (panel.disabled) return { status:"unavailable", creditsGranted:0, totalCredits:this.save.getData().totalCredits, message:this.mode==="off"?"Rewarded ads are off.":"Cache still cooling down.", providerLabel:this.provider.label };
    const flow = await this.provider.present({ placement:"menu-drop", title:"Sponsor cache uplink", copy:"Watch a short break to add credits to your bankroll before the next run.", credits:SPONSOR_CACHE_CREDITS });
    if (flow.status !== "granted") return { status:flow.status, creditsGranted:0, totalCredits:this.save.getData().totalCredits, message:flow.message, providerLabel:flow.providerLabel };
    const total = this.save.grantRewardedCredits(SPONSOR_CACHE_CREDITS, "menu-drop");
    return { status:"granted", creditsGranted:SPONSOR_CACHE_CREDITS, totalCredits:total, message:`+${SPONSOR_CACHE_CREDITS} credits added.`, providerLabel:flow.providerLabel };
  }

  getResultPanel(result: LevelResult, claimed: boolean): RewardPanelData {
    const credits = this.boostCredits(result);
    return {
      eyebrow: "Optional reward",
      title:   claimed ? "Boost already collected" : `Boost this extraction`,
      copy:    claimed ? "This run already paid out its bonus." : "Watch one optional break after the run to boost your payout.",
      buttonLabel: claimed ? "Collected" : `${this.ctaLabel("result-boost")} +${credits}`,
      note:    claimed ? "Next room ready whenever you are." : this.providerNote(true),
      disabled: claimed || this.mode === "off"
    };
  }

  async claimResultBoost(result: LevelResult): Promise<RewardClaimResult> {
    const credits = this.boostCredits(result);
    const flow    = await this.provider.present({ placement:"result-boost", title:"Post-run sponsor break", copy:`Watch a short clip to boost your payout for recovering ${result.payloadName}.`, credits });
    if (flow.status !== "granted") return { status:flow.status, creditsGranted:0, totalCredits:this.save.getData().totalCredits, message:flow.message, providerLabel:flow.providerLabel };
    const total = this.save.grantRewardedCredits(credits, "result-boost");
    return { status:"granted", creditsGranted:credits, totalCredits:total, message:`+${credits} credits from post-run boost.`, providerLabel:flow.providerLabel };
  }

  private boostCredits(r: LevelResult): number { return Math.max(140, Math.round(r.credits * 1.5 + 90)); }

  private ctaLabel(p: Placement): string {
    if (this.mode === "google-gpt") return p==="menu-drop" ? "Watch ad" : "Watch bonus ad";
    if (this.mode === "demo")       return p==="menu-drop" ? "Preview sponsor clip" : "Preview reward clip";
    return "Ads disabled";
  }

  private providerNote(avail: boolean): string {
    if (this.mode === "google-gpt") return avail ? "Live rewarded ad — optional, never a paywall." : "Cooldown keeps it from feeling like grinding.";
    if (this.mode === "demo")       return avail ? "Demo mode active. Connect a live ad unit on Vercel to earn real revenue." : "Demo cooldown applies even in test mode.";
    return "Ad system is off in this build.";
  }

  private resolveMode(): Mode {
    const raw = import.meta.env.VITE_REWARDED_AD_PROVIDER?.trim().toLowerCase();
    if (raw === "google-gpt" && import.meta.env.VITE_GAM_REWARDED_AD_UNIT_PATH) return "google-gpt";
    if (raw === "off") return "off";
    return "demo";
  }

  private makeProvider(): Provider {
    const path = import.meta.env.VITE_GAM_REWARDED_AD_UNIT_PATH;
    if (this.mode === "google-gpt" && path) return new GptProvider(path);
    if (this.mode === "off")                return new OffProvider();
    return new DemoProvider(this.ui);
  }
}
