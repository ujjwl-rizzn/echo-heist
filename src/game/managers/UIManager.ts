import { COSMETIC_THEMES } from "../data/cosmetics";
import type {
  HowToPlayHandlers, HudState, LevelCardData, LevelResult,
  MainMenuHandlers, NoticeData, PauseHandlers, RewardPanelData,
  ResultHandlers, SaveData, SettingsData, SettingsHandlers
} from "../types";
import { markViewportMode } from "../utils/immersive";

export class UIManager {
  private readonly screenRoot: HTMLElement;
  private readonly hudRoot:    HTMLElement;
  private readonly appShell:   HTMLElement;
  private bannerTimer = 0;
  private bannerFadeTimer = 0;

  constructor() {
    const s = document.getElementById("ui-screen-layer");
    const h = document.getElementById("ui-hud-layer");
    const a = document.getElementById("app-shell");
    if (!s || !h || !a) throw new Error("UI roots missing.");
    this.screenRoot = s;
    this.hudRoot    = h;
    this.appShell   = a;
  }

  clearScreen(): void { this.screenRoot.innerHTML = ""; }
  clearHud():    void {
    window.clearTimeout(this.bannerTimer);
    window.clearTimeout(this.bannerFadeTimer);
    this.bannerTimer = 0;
    this.bannerFadeTimer = 0;
    this.hudRoot.innerHTML = "";
  }

  applySettings(settings: SettingsData): void {
    const theme = COSMETIC_THEMES.find(t => t.id === settings.selectedTheme) ?? COSMETIC_THEMES[0]!;
    this.appShell.toggleAttribute("data-scanlines-off", !settings.showScanlines);
    this.appShell.toggleAttribute("data-reduced-motion", settings.reducedMotion);
    markViewportMode(this.appShell);
    this.appShell.style.setProperty("--primary",   theme.accent);
    this.appShell.style.setProperty("--secondary", theme.secondary);
  }

  showMainMenu(
    save: SaveData,
    handlers: MainMenuHandlers,
    sponsorPanel?: RewardPanelData | null,
    notice?: NoticeData | null
  ): void {
    this.clearScreen();
    const card = this.makeScreenCard(
      "ECHO HEIST",
      "Helix Ark is wiping witness seeds from the city archive. Record a loop, deploy the echo, steal the payload, and ghost out before the facility relocks."
    );
    const inner = card.querySelector(".screen-card-inner")!;

    const grid = el("div", "menu-grid");

    const btns = el("div", "button-grid");
    btns.append(
      this.btn("Play", "button",           handlers.onPlay),
      this.btn("Level Select", "secondary-button", handlers.onLevels),
      this.btn("How To Play", "secondary-button",  handlers.onHow),
      this.btn("Settings", "ghost-button",         handlers.onSettings)
    );

    const side = el("div", "stack");
    if (notice) side.appendChild(this.makeNotice(notice));

    const info = el("div", "info-grid");
    const runs  = Object.values(save.levels).filter(l => l.completed).length;
    const sRank = Object.values(save.levels).filter(l => l.bestRank === "S").length;
    info.append(
      this.statTile("Rooms cleared",  `${runs} / 8`),
      this.statTile("Credits",        `${save.totalCredits}`),
      this.statTile("S ranks",        `${sRank}`),
      this.statTile("Echo window",    "4.2 sec"),
    );
    side.appendChild(info);

    if (sponsorPanel && handlers.onSponsorDrop)
      side.appendChild(this.makeRewardCard(sponsorPanel, handlers.onSponsorDrop));

    grid.append(btns, side);
    inner.appendChild(grid);
    this.screenRoot.appendChild(card);
  }

  showHowToPlay(handlers: HowToPlayHandlers): void {
    this.clearScreen();
    const card = this.makeScreenCard(
      "How To Play",
      "Each room is a compact theft. Scout the route, print an echo, open a breach, steal the payload, and get out before the floor relocks."
    );
    const inner = card.querySelector(".screen-card-inner")!;
    const stack = el("div", "stack");
    stack.append(
      this.infoTile("Move",           "WASD or arrow keys on desktop. Left joystick on mobile."),
      this.infoTile("Stay hidden",    "Guards and cameras build trace on you. Stealth walk (Shift / Stealth button) cuts your footprint. Sprinting pulls patrols."),
      this.infoTile("Time Echo",      "Move to record a loop, then press Q or the Echo button to replay it as a holographic clone. The clone can hold plates, trigger systems, and draw guard attention."),
      this.infoTile("Open the breach","Some relays only accept the echo. Leave your clone on the plate, cross while the door is open, and beat the timer."),
      this.infoTile("Steal the payload","Press E near the glowing core to grab it. Then race to the exit gate before the facility seals."),
    );
    const bar = el("div", "button-row button-row--double");
    bar.append(
      this.btn("Back",         "ghost-button", handlers.onBack),
      this.btn("Play Tutorial","button",       handlers.onTutorial)
    );
    inner.append(stack, bar);
    this.screenRoot.appendChild(card);
  }

  showLevelSelect(levels: LevelCardData[], onSelect: (id: string) => void, onBack: () => void): void {
    this.clearScreen();
    const card = this.makeScreenCard("Level Select", "Short runs, instant retries, and clean score chasing.");
    const inner = card.querySelector(".screen-card-inner")!;
    const grid  = el("div", "level-select-grid");
    levels.forEach(lv => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = `level-card${lv.locked ? " locked" : ""}`;
      b.disabled  = lv.locked;
      b.innerHTML = `
        <h3 class="level-card-title">${lv.name}</h3>
        <p class="mini-note">${lv.brief}</p>
        <div class="pill-row">
          <span class="pill">${lv.locked ? "Locked" : "Unlocked"}</span>
          <span class="pill">Best: ${lv.bestRank ?? "—"}</span>
          <span class="pill">${lv.bestTimeMs ? `${(lv.bestTimeMs/1000).toFixed(1)}s` : "No clear"}</span>
        </div>`;
      b.addEventListener("click", () => onSelect(lv.id));
      grid.appendChild(b);
    });
    inner.append(grid, this.btn("Back", "ghost-button", onBack));
    this.screenRoot.appendChild(card);
  }

  renderHud(state: HudState, onPause: () => void): void {
    this.hudRoot.innerHTML = `
<div class="hud-shell">
  <div class="hud-topbar">
    <div class="hud-chip hud-chip--mission">
      <div class="hud-chipline">
        <small class="hud-level">${state.levelLabel}</small>
        <strong class="hud-time">${state.timeLabel}</strong>
      </div>
      <div class="hud-objective">${state.objective}</div>
      ${state.traceLabel ? `<div class="hud-trace">${state.traceLabel}</div>` : ""}
    </div>
    <div class="hud-chip hud-chip--status">
      <div class="hud-status-head">
        <div class="hud-stats-inline">
          <div class="hud-stat-pill"><small>Alerts</small><strong>${state.detections}</strong></div>
          <div class="hud-stat-pill"><small>Credits</small><strong>${state.credits}</strong></div>
        </div>
        <button class="secondary-button hud-pause-button" id="hud-pause" type="button" aria-label="Pause">II</button>
      </div>
      <div class="hud-charge-row">
        <small>Echo</small>
        <div class="hud-meter"><div class="hud-meter-fill" style="width:${Math.round(state.echoCharge*100)}%"></div></div>
      </div>
      ${state.breachLabel ? `<div class="hud-breach">${state.breachLabel}</div>` : ""}
    </div>
  </div>
</div>
<div class="field-banner" data-field-banner hidden></div>
<div class="field-hint" data-field-hint hidden></div>
<div class="field-flash" data-field-flash></div>`;
    document.getElementById("hud-pause")?.addEventListener("click", onPause);
    this.updateFieldHint(state.interactionHint);
  }

  updateHud(state: HudState): void {
    const obj    = this.hudRoot.querySelector<HTMLElement>(".hud-objective");
    const time   = this.hudRoot.querySelector<HTMLElement>(".hud-time");
    const alerts = this.hudRoot.querySelector<HTMLElement>(".hud-stat-pill:first-child strong");
    const creds  = this.hudRoot.querySelector<HTMLElement>(".hud-stat-pill:last-child strong");
    const fill   = this.hudRoot.querySelector<HTMLElement>(".hud-meter-fill");
    const mission = this.hudRoot.querySelector<HTMLElement>(".hud-chip--mission");
    const status  = this.hudRoot.querySelector<HTMLElement>(".hud-chip--status");
    let breach = this.hudRoot.querySelector<HTMLElement>(".hud-breach");
    let trace  = this.hudRoot.querySelector<HTMLElement>(".hud-trace");
    if (obj)    obj.textContent    = state.objective;
    if (time)   time.textContent   = state.timeLabel;
    if (alerts) alerts.textContent = String(state.detections);
    if (creds)  creds.textContent  = String(state.credits);
    if (fill)   fill.style.width   = `${Math.round(state.echoCharge*100)}%`;
    this.updateFieldHint(state.interactionHint);

    if (state.traceLabel) {
      if (!trace && mission) {
        trace = el("div", "hud-trace");
        mission.appendChild(trace);
      }
      if (trace) trace.textContent = state.traceLabel;
    } else {
      trace?.remove();
    }

    if (state.breachLabel) {
      if (!breach && status) {
        breach = el("div", "hud-breach");
        status.appendChild(breach);
      }
      if (breach) breach.textContent = state.breachLabel;
    } else {
      breach?.remove();
    }
  }

  updateFieldHint(text: string): void {
    const hint = this.hudRoot.querySelector<HTMLElement>("[data-field-hint]");
    if (!hint) return;
    if (!text) {
      hint.hidden = true;
      hint.textContent = "";
      return;
    }
    hint.textContent = text;
    hint.hidden = false;
  }

  showFieldBanner(text: string, ms: number, reducedMotion: boolean): void {
    const banner = this.hudRoot.querySelector<HTMLElement>("[data-field-banner]");
    if (!banner) return;
    window.clearTimeout(this.bannerTimer);
    window.clearTimeout(this.bannerFadeTimer);
    banner.textContent = text;
    banner.hidden = false;
    banner.classList.add("is-visible");
    this.bannerTimer = window.setTimeout(() => {
      if (reducedMotion) {
        banner.hidden = true;
        banner.classList.remove("is-visible");
        return;
      }
      banner.classList.remove("is-visible");
      this.bannerFadeTimer = window.setTimeout(() => { banner.hidden = true; }, 220);
    }, ms);
  }

  setFieldAlarm(active: boolean): void {
    this.hudRoot
      .querySelector<HTMLElement>("[data-field-flash]")
      ?.classList.toggle("active", active);
  }

  showPause(handlers: PauseHandlers): void {
    this.clearScreen();
    const card = this.makeScreenCard("Paused", "Room is frozen. Take a breath.");
    const inner = card.querySelector(".screen-card-inner")!;
    const row = el("div", "button-row");
    row.append(
      this.btn("Resume",       "button",           handlers.onResume),
      this.btn("Retry Room",   "secondary-button", handlers.onRetry),
      this.btn("Settings",     "secondary-button", handlers.onSettings),
      this.btn("Main Menu",    "ghost-button",     handlers.onMenu)
    );
    inner.appendChild(row);
    this.screenRoot.appendChild(card);
  }

  showResults(
    result: LevelResult,
    handlers: ResultHandlers,
    sponsorPanel?: RewardPanelData | null,
    notice?: NoticeData | null
  ): void {
    this.clearScreen();
    const card = this.makeScreenCard(
      "Extraction Complete",
      `${result.payloadName} — ${result.payloadDescription}`
    );
    const inner = card.querySelector(".screen-card-inner")!;
    const grid  = el("div", "menu-grid");

    /* left — rank + stats */
    const left = el("div", "stack");
    left.innerHTML = `
      <div class="rank-emblem">${result.rank}</div>
      <div class="info-tile">
        <div class="tile-label">Payload recovered</div>
        <div class="tile-value">${result.payloadName}</div>
        <p class="mini-note">${result.payloadDescription}</p>
      </div>
      <div class="info-grid">
        <div class="stat-tile"><div class="tile-label">Score</div><div class="tile-value">${result.score}</div></div>
        <div class="stat-tile"><div class="tile-label">Time</div><div class="tile-value">${(result.timeMs/1000).toFixed(1)}s</div></div>
        <div class="stat-tile"><div class="tile-label">Alerts</div><div class="tile-value">${result.detections}</div></div>
        <div class="stat-tile"><div class="tile-label">Credits</div><div class="tile-value">${result.credits}</div></div>
      </div>`;

    /* right — breakdown + actions */
    const right = el("div", "button-grid");
    if (notice)         right.appendChild(this.makeNotice(notice));
    if (sponsorPanel && handlers.onSponsorBoost)
      right.appendChild(this.makeRewardCard(sponsorPanel, handlers.onSponsorBoost));

    const breakdown = el("div", "results-list");
    result.scoreBreakdown.forEach(item => {
      const row = el("div", "results-item");
      row.innerHTML = `<span class="results-item__label">${item.label}</span><span class="results-item__value">${item.value >= 0 ? "+" : ""}${item.value}</span>`;
      breakdown.appendChild(row);
    });
    right.appendChild(breakdown);
    right.append(
      this.btn("Retry",        "button",           handlers.onRetry),
      this.btn(handlers.onNext ? "Next Level" : "All Cleared ✓", "secondary-button", () => handlers.onNext?.(), !handlers.onNext),
      this.btn("Level Select", "ghost-button",     handlers.onLevels),
      this.btn("Main Menu",    "ghost-button",     handlers.onMenu)
    );

    grid.append(left, right);
    inner.appendChild(grid);
    this.screenRoot.appendChild(card);
  }

  showSettings(settings: SettingsData, handlers: SettingsHandlers): void {
    this.clearScreen();
    const card = this.makeScreenCard("Settings", "Adjust, then press Save Changes.");
    const inner = card.querySelector(".screen-card-inner")!;

    const form = el("div", "form-grid");
    const themeOpts = COSMETIC_THEMES.map(t =>
      `<option value="${t.id}"${t.id === settings.selectedTheme ? " selected" : ""}>${t.name}</option>`
    ).join("");
    form.innerHTML = `
      <div class="form-card"><label>Master Volume<input id="s-master" type="range" min="0" max="1" step="0.05" value="${settings.masterVolume}"/></label></div>
      <div class="form-card"><label>Music Volume<input id="s-music"  type="range" min="0" max="1" step="0.05" value="${settings.musicVolume}"/></label></div>
      <div class="form-card"><label>Effects Volume<input id="s-sfx"  type="range" min="0" max="1" step="0.05" value="${settings.sfxVolume}"/></label></div>
      <div class="form-card"><label>Touch Controls<select id="s-touch">
        <option value="auto"${settings.touchControls==="auto"?" selected":""}>Auto-detect</option>
        <option value="on"  ${settings.touchControls==="on" ?" selected":""}>Always on</option>
        <option value="off" ${settings.touchControls==="off"?" selected":""}>Always off</option>
      </select></label></div>
      <div class="form-card"><label>Colour Theme<select id="s-theme">${themeOpts}</select></label></div>`;

    const rmBtn = this.toggleBtn("Reduced Motion", settings.reducedMotion);
    const slBtn = this.toggleBtn("Scanlines",      settings.showScanlines);

    const collect = (): SettingsData => ({
      ...settings,
      masterVolume: Number((document.getElementById("s-master") as HTMLInputElement).value),
      musicVolume:  Number((document.getElementById("s-music")  as HTMLInputElement).value),
      sfxVolume:    Number((document.getElementById("s-sfx")    as HTMLInputElement).value),
      touchControls:(document.getElementById("s-touch") as HTMLSelectElement).value as SettingsData["touchControls"],
      selectedTheme:(document.getElementById("s-theme") as HTMLSelectElement).value,
      reducedMotion: rmBtn.dataset.state === "on",
      showScanlines: slBtn.dataset.state === "on"
    });

    const actions = el("div", "button-row button-row--double");
    actions.append(
      this.btn("Back",         "ghost-button", handlers.onBack),
      this.btn("Save Changes", "button",       () => { const s = collect(); this.applySettings(s); handlers.onSave(s); })
    );

    inner.append(form, rmBtn, slBtn, actions);
    this.screenRoot.appendChild(card);
  }

  async presentRewardedBreak(cfg: {
    title: string; copy: string; rewardLabel: string;
    providerLabel: string; countdownMs: number;
  }): Promise<boolean> {
    const overlay = el("div", "reward-modal-backdrop");
    overlay.innerHTML = `
      <section class="reward-modal">
        <div class="eyebrow">Sponsor break</div>
        <h2 class="reward-modal__title">${cfg.title}</h2>
        <p class="reward-modal__copy">${cfg.copy}</p>
        <div class="reward-modal__meta">
          <span class="pill">${cfg.rewardLabel}</span>
          <span class="pill">${cfg.providerLabel}</span>
        </div>
        <div class="reward-modal__meter"><div class="reward-modal__fill"></div></div>
        <p class="reward-modal__timer">Finishing soon...</p>
        <div class="button-row button-row--double">
          <button class="ghost-button" type="button" data-role="cancel">Skip</button>
          <button class="button" type="button" data-role="claim" disabled>Collect</button>
        </div>
      </section>`;
    this.screenRoot.appendChild(overlay);

    const fill      = overlay.querySelector<HTMLElement>(".reward-modal__fill")!;
    const timerLbl  = overlay.querySelector<HTMLElement>(".reward-modal__timer")!;
    const cancelBtn = overlay.querySelector<HTMLButtonElement>('[data-role="cancel"]')!;
    const claimBtn  = overlay.querySelector<HTMLButtonElement>('[data-role="claim"]')!;

    return new Promise<boolean>(resolve => {
      const start = performance.now();
      let done = false;
      const cleanup = (granted: boolean) => {
        if (done) return; done = true;
        clearInterval(timer); overlay.remove(); resolve(granted);
      };
      const update = () => {
        const elapsed  = performance.now() - start;
        const progress = Math.min(1, elapsed / cfg.countdownMs);
        const rem      = Math.max(0, cfg.countdownMs - elapsed);
        fill.style.width       = `${Math.round(progress * 100)}%`;
        timerLbl.textContent   = rem > 0 ? `Ends in ${(rem/1000).toFixed(1)}s` : "Done. Collect your reward.";
        claimBtn.disabled      = rem > 0;
      };
      const timer = window.setInterval(update, 100);
      update();
      cancelBtn.addEventListener("click", () => cleanup(false));
      claimBtn.addEventListener("click",  () => cleanup(true));
    });
  }

  flashAlarm(): void {
    const el = document.querySelector<HTMLElement>(".flash-alarm");
    if (!el) return;
    el.classList.remove("active");
    void el.offsetWidth;
    el.classList.add("active");
  }

  /* ── private helpers ──────────────────────────────────────────────────── */
  private makeScreenCard(title: string, subtitle: string): HTMLElement {
    const wrap = el("div", "screen-wrap");
    wrap.innerHTML = `
      <section class="screen-card">
        <div class="screen-card-inner">
          <div class="title-stack">
            <div class="eyebrow">Echo Heist</div>
            <h1 class="game-title">${title}</h1>
            <p class="subtitle">${subtitle}</p>
          </div>
        </div>
      </section>`;
    return wrap;
  }

  private btn(label: string, cls: string, onClick: () => void, disabled = false): HTMLButtonElement {
    const b = document.createElement("button");
    b.type = "button"; b.className = cls;
    b.textContent = label; b.disabled = disabled;
    b.addEventListener("click", onClick);
    return b;
  }

  private statTile(label: string, value: string): HTMLElement {
    const d = el("div", "stat-tile");
    d.innerHTML = `<div class="tile-label">${label}</div><div class="tile-value">${value}</div>`;
    return d;
  }

  private infoTile(label: string, value: string): HTMLElement {
    const d = el("div", "info-tile");
    d.innerHTML = `<div class="tile-label">${label}</div><div class="tile-value" style="font-size:0.94rem;font-weight:400;margin-top:6px">${value}</div>`;
    return d;
  }

  private toggleBtn(label: string, initial: boolean): HTMLButtonElement {
    const b = document.createElement("button");
    b.type = "button"; b.className = "secondary-button";
    b.dataset.state = initial ? "on" : "off";
    const render = () => { b.textContent = `${label}: ${b.dataset.state === "on" ? "On" : "Off"}`; };
    render();
    b.addEventListener("click", () => { b.dataset.state = b.dataset.state === "on" ? "off" : "on"; render(); });
    return b;
  }

  private makeRewardCard(panel: RewardPanelData, onClick: () => void): HTMLElement {
    const d = el("div", "reward-card");
    d.innerHTML = `
      <div class="reward-card__eyebrow">${panel.eyebrow}</div>
      <h3 class="reward-card__title">${panel.title}</h3>
      <p class="reward-card__copy">${panel.copy}</p>
      <p class="reward-card__note">${panel.note}</p>`;
    d.appendChild(this.btn(panel.buttonLabel, "button", onClick, panel.disabled));
    return d;
  }

  private makeNotice(n: NoticeData): HTMLElement {
    const d = el("div", `notice-banner notice-banner--${n.tone}`);
    d.textContent = n.text;
    return d;
  }
}

function el(tag: string, cls: string): HTMLElement {
  const e = document.createElement(tag);
  e.className = cls;
  return e;
}
