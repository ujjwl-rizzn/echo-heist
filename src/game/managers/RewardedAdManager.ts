import {
  DEMO_REWARDED_BREAK_MS,
  SPONSOR_CACHE_COOLDOWN_MS,
  SPONSOR_CACHE_CREDITS
} from "../constants";
import type {
  LevelResult,
  RewardClaimResult,
  RewardPanelData
} from "../types";
import { SaveManager } from "./SaveManager";
import { UIManager } from "./UIManager";

type RewardPlacement = "menu-drop" | "result-boost";
type RewardProviderMode = "demo" | "google-gpt" | "off";

interface RewardOffer {
  placement: RewardPlacement;
  title: string;
  copy: string;
  credits: number;
}

interface RewardFlowResult {
  status: RewardClaimResult["status"];
  message: string;
  providerLabel: string;
}

interface RewardProvider {
  readonly label: string;
  present(offer: RewardOffer): Promise<RewardFlowResult>;
}

class DemoRewardProvider implements RewardProvider {
  readonly label = "Demo sponsor clip";

  constructor(private readonly uiManager: UIManager) {}

  async present(offer: RewardOffer): Promise<RewardFlowResult> {
    const granted = await this.uiManager.presentRewardedBreak({
      title: offer.title,
      copy: offer.copy,
      rewardLabel: `+${offer.credits} credits`,
      providerLabel: this.label,
      countdownMs: DEMO_REWARDED_BREAK_MS
    });

    return granted
      ? {
          status: "granted",
          message: `Sponsor clip finished. ${offer.credits} credits banked.`,
          providerLabel: this.label
        }
      : {
          status: "cancelled",
          message: "Sponsor clip skipped. No extra credits were added.",
          providerLabel: this.label
        };
  }
}

class DisabledRewardProvider implements RewardProvider {
  readonly label = "Rewarded ads disabled";

  async present(): Promise<RewardFlowResult> {
    return {
      status: "unavailable",
      message: "Rewarded ads are disabled for this build.",
      providerLabel: this.label
    };
  }
}

class GoogleGptRewardProvider implements RewardProvider {
  readonly label = "Google rewarded ad";
  private scriptPromise: Promise<void> | null = null;
  private servicesEnabled = false;

  constructor(private readonly adUnitPath: string) {}

  async present(): Promise<RewardFlowResult> {
    try {
      await this.ensureScript();
      const googletag = window.googletag;
      if (!googletag?.cmd) {
        return {
          status: "error",
          message: "Google ad services did not initialize in time.",
          providerLabel: this.label
        };
      }

      return await new Promise<RewardFlowResult>((resolve) => {
        googletag.cmd.push(() => {
          const format = googletag.enums?.OutOfPageFormat?.REWARDED;
          const slot =
            format && typeof googletag.defineOutOfPageSlot === "function"
              ? googletag.defineOutOfPageSlot(this.adUnitPath, format)
              : null;

          if (!slot) {
            resolve({
              status: "unavailable",
              message: "Rewarded ads are not available on this browser or page yet.",
              providerLabel: this.label
            });
            return;
          }

          const pubads = googletag.pubads?.();
          if (!pubads) {
            resolve({
              status: "error",
              message: "The rewarded ad service could not start.",
              providerLabel: this.label
            });
            return;
          }

          let granted = false;
          let settled = false;

          const finalize = (result: RewardFlowResult): void => {
            if (settled) {
              return;
            }
            settled = true;
            if (typeof pubads.removeEventListener === "function") {
              pubads.removeEventListener("rewardedSlotReady", onReady);
              pubads.removeEventListener("rewardedSlotGranted", onGranted);
              pubads.removeEventListener("rewardedSlotClosed", onClosed);
            }
            if (typeof googletag.destroySlots === "function") {
              googletag.destroySlots([slot]);
            }
            resolve(result);
          };

          const onReady = (event: { slot: unknown; makeRewardedVisible?: () => void }): void => {
            if (event.slot !== slot) {
              return;
            }
            event.makeRewardedVisible?.();
          };

          const onGranted = (event: { slot: unknown }): void => {
            if (event.slot !== slot) {
              return;
            }
            granted = true;
          };

          const onClosed = (event: { slot: unknown }): void => {
            if (event.slot !== slot) {
              return;
            }
            finalize(
              granted
                ? {
                    status: "granted",
                    message: "Reward granted from the live ad slot.",
                    providerLabel: this.label
                  }
                : {
                    status: "cancelled",
                    message: "The rewarded ad closed before completion.",
                    providerLabel: this.label
                  }
            );
          };

          slot.addService(pubads);
          pubads.addEventListener("rewardedSlotReady", onReady);
          pubads.addEventListener("rewardedSlotGranted", onGranted);
          pubads.addEventListener("rewardedSlotClosed", onClosed);

          if (!this.servicesEnabled && typeof googletag.enableServices === "function") {
            googletag.enableServices();
            this.servicesEnabled = true;
          }

          if (typeof googletag.display === "function") {
            googletag.display(slot);
          } else {
            finalize({
              status: "error",
              message: "The rewarded ad could not be displayed.",
              providerLabel: this.label
            });
          }
        });
      });
    } catch {
      return {
        status: "error",
        message: "The rewarded ad script failed to load.",
        providerLabel: this.label
      };
    }
  }

  private ensureScript(): Promise<void> {
    if (this.scriptPromise) {
      return this.scriptPromise;
    }

    if (typeof document === "undefined") {
      this.scriptPromise = Promise.reject(new Error("Document is unavailable."));
      return this.scriptPromise;
    }

    this.scriptPromise = new Promise<void>((resolve, reject) => {
      const existing = document.querySelector<HTMLScriptElement>('script[data-echo-heist-gpt="true"]');
      if (existing) {
        if (existing.dataset.loaded === "true") {
          resolve();
          return;
        }
        existing.addEventListener("load", () => resolve(), { once: true });
        existing.addEventListener("error", () => reject(new Error("GPT failed to load.")), { once: true });
        return;
      }

      window.googletag = window.googletag ?? { cmd: [] };

      const script = document.createElement("script");
      script.async = true;
      script.src = "https://securepubads.g.doubleclick.net/tag/js/gpt.js";
      script.dataset.echoHeistGpt = "true";
      script.addEventListener(
        "load",
        () => {
          script.dataset.loaded = "true";
          resolve();
        },
        { once: true }
      );
      script.addEventListener("error", () => reject(new Error("GPT failed to load.")), { once: true });
      document.head.appendChild(script);
    });

    return this.scriptPromise;
  }
}

const formatDurationLabel = (remainingMs: number): string => {
  const totalMinutes = Math.ceil(remainingMs / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours <= 0) {
    return `${minutes}m`;
  }
  if (minutes <= 0) {
    return `${hours}h`;
  }
  return `${hours}h ${minutes}m`;
};

export class RewardedAdManager {
  private readonly provider: RewardProvider;
  private readonly providerMode: RewardProviderMode;

  constructor(
    private readonly saveManager: SaveManager,
    private readonly uiManager: UIManager
  ) {
    this.providerMode = this.resolveProviderMode();
    this.provider = this.createProvider();
  }

  getMainMenuPanel(now = Date.now()): RewardPanelData {
    const rewardMeta = this.saveManager.getRewardMeta();
    const readyAt = rewardMeta.lastSponsorDropAt ? rewardMeta.lastSponsorDropAt + SPONSOR_CACHE_COOLDOWN_MS : 0;
    const available = !rewardMeta.lastSponsorDropAt || now >= readyAt;

    return {
      eyebrow: "Sponsor Relay",
      title: available ? "Claim a sponsor cache" : "Sponsor cache cooling down",
      copy: available
        ? "Offer a rewarded clip between missions and take a clean credit injection without touching the room balance."
        : "The sponsor relay is on cooldown so players cannot farm unlimited free currency from the menu.",
      buttonLabel: available ? this.getCtaLabel("menu-drop") : `Ready in ${formatDurationLabel(readyAt - now)}`,
      note: this.getProviderNote(available),
      disabled: !available || this.providerMode === "off"
    };
  }

  async claimMainMenuDrop(): Promise<RewardClaimResult> {
    const panel = this.getMainMenuPanel();
    if (panel.disabled) {
      return {
        status: "unavailable",
        creditsGranted: 0,
        totalCredits: this.saveManager.getData().totalCredits,
        message:
          this.providerMode === "off"
            ? "Rewarded ads are turned off for this build."
            : "The sponsor cache is still cooling down.",
        providerLabel: this.provider.label
      };
    }

    const flow = await this.provider.present({
      placement: "menu-drop",
      title: "Sponsor cache uplink",
      copy: "Watch a short sponsor break to inject extra credits into your safehouse bankroll before the next heist.",
      credits: SPONSOR_CACHE_CREDITS
    });

    if (flow.status !== "granted") {
      return {
        status: flow.status,
        creditsGranted: 0,
        totalCredits: this.saveManager.getData().totalCredits,
        message: flow.message,
        providerLabel: flow.providerLabel
      };
    }

    const totalCredits = this.saveManager.grantRewardedCredits(SPONSOR_CACHE_CREDITS, "menu-drop");
    return {
      status: "granted",
      creditsGranted: SPONSOR_CACHE_CREDITS,
      totalCredits,
      message: `Sponsor cache delivered. +${SPONSOR_CACHE_CREDITS} credits added to your bankroll.`,
      providerLabel: flow.providerLabel
    };
  }

  getResultPanel(result: LevelResult, claimed: boolean): RewardPanelData {
    const credits = this.getResultBoostCredits(result);
    return {
      eyebrow: "Optional Reward",
      title: claimed ? "Run boost already collected" : `Boost ${result.payloadName}`,
      copy: claimed
        ? "This run already paid out its sponsor bonus."
        : "Offer one rewarded break after extraction to pad the bankroll without interrupting the room itself.",
      buttonLabel: claimed ? "Boost collected" : `${this.getCtaLabel("result-boost")} +${credits}`,
      note: claimed
        ? "The next room can still be played immediately. No extra friction."
        : this.getProviderNote(true),
      disabled: claimed || this.providerMode === "off"
    };
  }

  async claimResultBoost(result: LevelResult): Promise<RewardClaimResult> {
    const credits = this.getResultBoostCredits(result);
    const flow = await this.provider.present({
      placement: "result-boost",
      title: "Post-run sponsor break",
      copy: `Watch a short rewarded clip to convert this extraction into a stronger bankroll payout for ${result.payloadName}.`,
      credits
    });

    if (flow.status !== "granted") {
      return {
        status: flow.status,
        creditsGranted: 0,
        totalCredits: this.saveManager.getData().totalCredits,
        message: flow.message,
        providerLabel: flow.providerLabel
      };
    }

    const totalCredits = this.saveManager.grantRewardedCredits(credits, "result-boost");
    return {
      status: "granted",
      creditsGranted: credits,
      totalCredits,
      message: `Sponsor payout cleared. +${credits} credits added from the post-run boost.`,
      providerLabel: flow.providerLabel
    };
  }

  private getResultBoostCredits(result: LevelResult): number {
    return Math.max(140, Math.round(result.credits * 1.5 + 90));
  }

  private getCtaLabel(placement: RewardPlacement): string {
    if (this.providerMode === "google-gpt") {
      return placement === "menu-drop" ? "Watch rewarded ad" : "Watch bonus ad";
    }
    if (this.providerMode === "demo") {
      return placement === "menu-drop" ? "Preview sponsor clip" : "Preview reward clip";
    }
    return "Rewarded ads disabled";
  }

  private getProviderNote(available: boolean): string {
    if (this.providerMode === "google-gpt") {
      return available
        ? "Live Google rewarded ads can pay out real credits without adding a paywall."
        : "Live rewarded ads stay optional and cooldown-limited.";
    }
    if (this.providerMode === "demo") {
      return available
        ? "Demo mode is active right now. It behaves like a rewarded break until you connect a live ad unit on Vercel."
        : "Demo reward mode is active, but the cooldown still applies.";
    }
    return "This build keeps the reward UI visible, but the actual ad claim flow is turned off.";
  }

  private resolveProviderMode(): RewardProviderMode {
    const raw = import.meta.env.VITE_REWARDED_AD_PROVIDER?.trim().toLowerCase();
    if (raw === "google-gpt" && import.meta.env.VITE_GAM_REWARDED_AD_UNIT_PATH) {
      return "google-gpt";
    }
    if (raw === "off") {
      return "off";
    }
    return "demo";
  }

  private createProvider(): RewardProvider {
    const adUnitPath = import.meta.env.VITE_GAM_REWARDED_AD_UNIT_PATH;
    if (this.providerMode === "google-gpt" && adUnitPath) {
      return new GoogleGptRewardProvider(adUnitPath);
    }
    if (this.providerMode === "off") {
      return new DisabledRewardProvider();
    }
    return new DemoRewardProvider(this.uiManager);
  }
}
