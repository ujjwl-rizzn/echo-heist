import { COSMETIC_THEMES } from "../data/cosmetics";
import type {
  HowToPlayHandlers,
  HudState,
  LevelCardData,
  LevelResult,
  MainMenuHandlers,
  NoticeData,
  PauseHandlers,
  RewardPanelData,
  ResultHandlers,
  SaveData,
  SettingsData,
  SettingsHandlers
} from "../types";

export class UIManager {
  private readonly screenRoot: HTMLElement;
  private readonly hudRoot: HTMLElement;
  private readonly appShell: HTMLElement;

  constructor() {
    const screenRoot = document.getElementById("ui-screen-layer");
    const hudRoot = document.getElementById("ui-hud-layer");
    const appShell = document.getElementById("app-shell");
    if (!screenRoot || !hudRoot || !appShell) {
      throw new Error("UI roots are missing.");
    }
    this.screenRoot = screenRoot;
    this.hudRoot = hudRoot;
    this.appShell = appShell;
  }

  clearScreen(): void {
    this.screenRoot.innerHTML = "";
  }

  clearHud(): void {
    this.hudRoot.innerHTML = "";
  }

  applySettings(settings: SettingsData): void {
    const theme = COSMETIC_THEMES.find((entry) => entry.id === settings.selectedTheme) ?? COSMETIC_THEMES[0];
    this.appShell.toggleAttribute("data-scanlines-off", !settings.showScanlines);
    this.appShell.style.setProperty("--primary", theme.accent);
    this.appShell.style.setProperty("--secondary", theme.secondary);
  }

  showMainMenu(
    saveData: SaveData,
    handlers: MainMenuHandlers,
    sponsorPanel?: RewardPanelData | null,
    notice?: NoticeData | null
  ): void {
    this.clearScreen();
    const card = this.makeScreenCard(
      "ECHO HEIST",
      "Helix Ark is scrubbing witness memory seeds from the city archive. Record a route, deploy the echo, steal the payload, and ghost out before the tower seals."
    );

    const menuGrid = document.createElement("div");
    menuGrid.className = "menu-grid";

    const buttonGrid = document.createElement("div");
    buttonGrid.className = "button-grid";
    buttonGrid.append(
      this.makeButton("Play", "button", handlers.onPlay),
      this.makeButton("Level Select", "secondary-button", handlers.onLevels),
      this.makeButton("How To Play", "secondary-button", handlers.onHow),
      this.makeButton("Settings", "ghost-button", handlers.onSettings)
    );

    const info = document.createElement("div");
    info.className = "info-grid";
    info.append(
      this.makeStatTile("Unlocked", `${saveData.unlockedLevelOrder + 1} rooms`),
      this.makeStatTile("Credits", `${saveData.totalCredits}`),
      this.makeStatTile("Sponsor Claims", `${saveData.rewardMeta.totalClaims}`),
      this.makeStatTile("Echo Loop", "4.2 seconds"),
      this.makeStatTile("Threat", "guards + optics"),
      this.makeStatTile("Target", "memory payloads"),
      this.makeStatTile("Style", "stealth + timing")
    );

    const sideStack = document.createElement("div");
    sideStack.className = "stack";
    if (notice) {
      sideStack.appendChild(this.makeNotice(notice));
    }
    sideStack.append(info);
    if (sponsorPanel && handlers.onSponsorDrop) {
      sideStack.appendChild(this.makeRewardCard(sponsorPanel, handlers.onSponsorDrop));
    }

    menuGrid.append(buttonGrid, sideStack);
    card.querySelector(".screen-card-inner")?.append(menuGrid);
    this.screenRoot.appendChild(card);
  }

  showHowToPlay(handlers: HowToPlayHandlers): void {
    this.clearScreen();
    const card = this.makeScreenCard(
      "How To Play",
      "Each room is a compact theft. Watch the route, print an echo, open a breach, steal the payload, and get it out before Helix Ark relocks the floor."
    );

    const stack = document.createElement("div");
    stack.className = "stack";
    stack.append(
      this.makeInfoTile("Move", "WASD / Arrow keys on desktop, joystick on mobile."),
      this.makeInfoTile("Stay Hidden", "Guards and optics build trace before they lock onto the real you. Sprinting, hacking, and loud breaches also create noise that can pull patrols toward you."),
      this.makeInfoTile("Use Time Echo", "Move to record a loop, then press Q or Echo to replay your last few seconds as a holographic clone."),
      this.makeInfoTile("Open The Breach", "Some relays only accept the echo. Print the route, leave your clone on the plate or terminal, and use its noise to bait security off your real route."),
      this.makeInfoTile("Steal The Payload", "Press E near the target to lift it, then race the relock timer back to the exit gate.")
    );

    const bar = document.createElement("div");
    bar.className = "button-row button-row--double";
    bar.append(
      this.makeButton("Back", "ghost-button", handlers.onBack),
      this.makeButton("Play Tutorial", "button", handlers.onTutorial)
    );

    card.querySelector(".screen-card-inner")?.append(stack, bar);
    this.screenRoot.appendChild(card);
  }

  showLevelSelect(levels: LevelCardData[], onSelect: (levelId: string) => void, onBack: () => void): void {
    this.clearScreen();
    const card = this.makeScreenCard("Level Select", "Short runs, instant retries, and clean score chasing.");
    const grid = document.createElement("div");
    grid.className = "level-select-grid";

    levels.forEach((level) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = `level-card ${level.locked ? "locked" : ""}`.trim();
      button.disabled = level.locked;
      button.innerHTML = `
        <h3 class="level-card-title">${level.name}</h3>
        <p class="mini-note">${level.brief}</p>
        <div class="pill-row">
          <span class="pill">${level.locked ? "Locked" : "Unlocked"}</span>
          <span class="pill">Best: ${level.bestRank ?? "--"}</span>
          <span class="pill">${level.bestTimeMs ? `${(level.bestTimeMs / 1000).toFixed(1)}s` : "No clear"}</span>
        </div>
      `;
      button.addEventListener("click", () => onSelect(level.id));
      grid.appendChild(button);
    });

    card.querySelector(".screen-card-inner")?.append(grid, this.makeButton("Back", "ghost-button", onBack));
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
                <div class="hud-stat-pill">
                  <small>Alerts</small>
                  <strong>${state.detections}</strong>
                </div>
                <div class="hud-stat-pill">
                  <small>Credits</small>
                  <strong>${state.credits}</strong>
                </div>
              </div>
              <button class="secondary-button hud-pause-button" id="hud-pause-button" type="button" aria-label="Pause">
                II
              </button>
            </div>
            <div class="hud-charge-row">
              <small>Echo Charge</small>
              <div class="hud-meter"><div class="hud-meter-fill" style="width:${Math.round(state.echoCharge * 100)}%"></div></div>
            </div>
            ${state.breachLabel ? `<div class="hud-breach">${state.breachLabel}</div>` : ""}
          </div>
        </div>
      </div>
    `;

    const pauseButton = document.getElementById("hud-pause-button");
    pauseButton?.addEventListener("click", onPause);
  }

  showPause(handlers: PauseHandlers): void {
    this.clearScreen();
    const card = this.makeScreenCard("Paused", "Take a breath. Your room state is frozen until you resume.");
    const row = document.createElement("div");
    row.className = "button-row";
    row.append(
      this.makeButton("Resume", "button", handlers.onResume),
      this.makeButton("Retry Room", "secondary-button", handlers.onRetry),
      this.makeButton("Settings", "secondary-button", handlers.onSettings),
      this.makeButton("Back To Menu", "ghost-button", handlers.onMenu)
    );
    card.querySelector(".screen-card-inner")?.append(row);
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
      `${result.payloadName} is out. ${result.payloadDescription}`
    );
    const content = document.createElement("div");
    content.className = "menu-grid";

    const rankBlock = document.createElement("div");
    rankBlock.className = "stack";
    rankBlock.innerHTML = `
      <div class="rank-emblem">${result.rank}</div>
      <div class="info-tile">
        <div class="tile-label">Recovered Payload</div>
        <div class="tile-value">${result.payloadName}</div>
        <p class="mini-note">${result.payloadDescription}</p>
      </div>
      <div class="info-grid">
        <div class="stat-tile"><div class="tile-label">Score</div><div class="tile-value">${result.score}</div></div>
        <div class="stat-tile"><div class="tile-label">Time</div><div class="tile-value">${(result.timeMs / 1000).toFixed(1)}s</div></div>
        <div class="stat-tile"><div class="tile-label">Alerts</div><div class="tile-value">${result.detections}</div></div>
        <div class="stat-tile"><div class="tile-label">Credits</div><div class="tile-value">${result.credits}</div></div>
        <div class="stat-tile"><div class="tile-label">Echoes</div><div class="tile-value">${result.echoesUsed}</div></div>
      </div>
    `;

    const actions = document.createElement("div");
    actions.className = "button-grid";
    if (notice) {
      actions.appendChild(this.makeNotice(notice));
    }
    if (sponsorPanel && handlers.onSponsorBoost) {
      actions.appendChild(this.makeRewardCard(sponsorPanel, handlers.onSponsorBoost));
    }
    const breakdown = document.createElement("div");
    breakdown.className = "results-list";
    result.scoreBreakdown.forEach((item) => {
      const row = document.createElement("div");
      row.className = "results-item";
      row.innerHTML = `<span class="results-item__label">${item.label}</span><span class="results-item__value">${item.value >= 0 ? "+" : ""}${item.value}</span>`;
      breakdown.appendChild(row);
    });
    actions.append(
      this.makeButton("Retry", "button", handlers.onRetry),
      this.makeButton("Next Level", "secondary-button", () => handlers.onNext?.(), !handlers.onNext),
      this.makeButton("Level Select", "ghost-button", handlers.onLevels),
      this.makeButton("Back To Menu", "ghost-button", handlers.onMenu)
    );

    actions.prepend(breakdown);
    content.append(rankBlock, actions);
    card.querySelector(".screen-card-inner")?.append(content);
    this.screenRoot.appendChild(card);
  }

  showSettings(settings: SettingsData, handlers: SettingsHandlers): void {
    this.clearScreen();
    const card = this.makeScreenCard("Settings", "Tune the experience, then press Save to apply the changes.");
    const form = document.createElement("div");
    form.className = "form-grid";

    const themeOptions = COSMETIC_THEMES.map(
      (theme) => `<option value="${theme.id}" ${theme.id === settings.selectedTheme ? "selected" : ""}>${theme.name}</option>`
    ).join("");

    form.innerHTML = `
      <div class="form-card">
        <label>Master Volume
          <input id="settings-master" type="range" min="0" max="1" step="0.05" value="${settings.masterVolume}" />
        </label>
      </div>
      <div class="form-card">
        <label>Music Volume
          <input id="settings-music" type="range" min="0" max="1" step="0.05" value="${settings.musicVolume}" />
        </label>
      </div>
      <div class="form-card">
        <label>Effects Volume
          <input id="settings-sfx" type="range" min="0" max="1" step="0.05" value="${settings.sfxVolume}" />
        </label>
      </div>
      <div class="form-card">
        <label>Touch Controls
          <select id="settings-touch">
            <option value="auto" ${settings.touchControls === "auto" ? "selected" : ""}>Auto</option>
            <option value="on" ${settings.touchControls === "on" ? "selected" : ""}>Always On</option>
            <option value="off" ${settings.touchControls === "off" ? "selected" : ""}>Always Off</option>
          </select>
        </label>
      </div>
      <div class="form-card">
        <label>Theme
          <select id="settings-theme">${themeOptions}</select>
        </label>
      </div>
    `;

    const reducedMotion = this.makeToggleRow("Reduced Motion", settings.reducedMotion);
    const scanlines = this.makeToggleRow("Scanline Overlay", settings.showScanlines);
    const collectSettings = (): SettingsData => ({
      ...settings,
      masterVolume: Number((document.getElementById("settings-master") as HTMLInputElement).value),
      musicVolume: Number((document.getElementById("settings-music") as HTMLInputElement).value),
      sfxVolume: Number((document.getElementById("settings-sfx") as HTMLInputElement).value),
      touchControls: (document.getElementById("settings-touch") as HTMLSelectElement).value as SettingsData["touchControls"],
      selectedTheme: (document.getElementById("settings-theme") as HTMLSelectElement).value,
      reducedMotion: reducedMotion.dataset.state === "on",
      showScanlines: scanlines.dataset.state === "on"
    });

    const actions = document.createElement("div");
    actions.className = "button-row button-row--double";
    actions.append(
      this.makeButton("Back", "ghost-button", handlers.onBack),
      this.makeButton("Save Changes", "button", () => {
        const next = collectSettings();
        this.applySettings(next);
        handlers.onSave(next);
      })
    );

    card.querySelector(".screen-card-inner")?.append(
      form,
      reducedMotion,
      scanlines,
      actions
    );
    this.screenRoot.appendChild(card);
  }

  async presentRewardedBreak(config: {
    title: string;
    copy: string;
    rewardLabel: string;
    providerLabel: string;
    countdownMs: number;
  }): Promise<boolean> {
    const overlay = document.createElement("div");
    overlay.className = "reward-modal-backdrop ui-overlay-enter";
    overlay.innerHTML = `
      <section class="reward-modal">
        <div class="eyebrow">Rewarded Break</div>
        <h2 class="reward-modal__title">${config.title}</h2>
        <p class="reward-modal__copy">${config.copy}</p>
        <div class="reward-modal__meta">
          <span class="pill">${config.rewardLabel}</span>
          <span class="pill">${config.providerLabel}</span>
        </div>
        <div class="reward-modal__meter">
          <div class="reward-modal__fill"></div>
        </div>
        <p class="reward-modal__timer">Sponsor break ending soon...</p>
        <div class="button-row button-row--double">
          <button class="ghost-button" type="button" data-role="cancel">Skip</button>
          <button class="button" type="button" data-role="claim" disabled>Collect Reward</button>
        </div>
      </section>
    `;

    this.screenRoot.appendChild(overlay);

    const fill = overlay.querySelector<HTMLElement>(".reward-modal__fill");
    const timerLabel = overlay.querySelector<HTMLElement>(".reward-modal__timer");
    const cancelButton = overlay.querySelector<HTMLButtonElement>('[data-role="cancel"]');
    const claimButton = overlay.querySelector<HTMLButtonElement>('[data-role="claim"]');

    return await new Promise<boolean>((resolve) => {
      const startedAt = performance.now();
      let done = false;

      const cleanup = (granted: boolean): void => {
        if (done) {
          return;
        }
        done = true;
        window.clearInterval(timer);
        overlay.remove();
        resolve(granted);
      };

      const update = (): void => {
        const elapsed = performance.now() - startedAt;
        const progress = Math.min(1, elapsed / config.countdownMs);
        const remaining = Math.max(0, config.countdownMs - elapsed);
        if (fill) {
          fill.style.width = `${Math.round(progress * 100)}%`;
        }
        if (timerLabel) {
          timerLabel.textContent =
            remaining > 0
              ? `Sponsor break ends in ${(remaining / 1000).toFixed(1)}s`
              : "Sponsor break complete. Collect the reward.";
        }
        if (claimButton) {
          claimButton.disabled = remaining > 0;
        }
      };

      const timer = window.setInterval(update, 100);
      update();

      cancelButton?.addEventListener("click", () => cleanup(false));
      claimButton?.addEventListener("click", () => cleanup(true));
    });
  }

  private makeScreenCard(title: string, subtitle: string): HTMLElement {
    const wrap = document.createElement("div");
    wrap.className = "screen-wrap";
    wrap.innerHTML = `
      <section class="screen-card ui-overlay-enter">
        <div class="screen-card-inner">
          <div class="title-stack">
            <div class="eyebrow">Neon Heist</div>
            <h1 class="game-title">${title}</h1>
            <p class="subtitle">${subtitle}</p>
          </div>
        </div>
      </section>
    `;
    return wrap;
  }

  private makeButton(label: string, className: string, onClick: () => void, disabled = false): HTMLButtonElement {
    const button = document.createElement("button");
    button.type = "button";
    button.className = className;
    button.textContent = label;
    button.disabled = disabled;
    button.addEventListener("click", onClick);
    return button;
  }

  private makeStatTile(label: string, value: string): HTMLElement {
    const tile = document.createElement("div");
    tile.className = "stat-tile";
    tile.innerHTML = `<div class="tile-label">${label}</div><div class="tile-value">${value}</div>`;
    return tile;
  }

  private makeInfoTile(label: string, value: string): HTMLElement {
    const tile = document.createElement("div");
    tile.className = "info-tile";
    tile.innerHTML = `<div class="tile-label">${label}</div><div class="tile-value">${value}</div>`;
    return tile;
  }

  private makeToggleRow(label: string, initial: boolean): HTMLButtonElement {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "secondary-button";
    button.dataset.state = initial ? "on" : "off";
    const render = () => {
      button.textContent = `${label}: ${button.dataset.state === "on" ? "On" : "Off"}`;
    };
    render();
    button.addEventListener("click", () => {
      button.dataset.state = button.dataset.state === "on" ? "off" : "on";
      render();
    });
    return button;
  }

  private makeRewardCard(panel: RewardPanelData, onClick: () => void): HTMLElement {
    const card = document.createElement("div");
    card.className = "reward-card";
    card.innerHTML = `
      <div class="reward-card__eyebrow">${panel.eyebrow}</div>
      <h3 class="reward-card__title">${panel.title}</h3>
      <p class="reward-card__copy">${panel.copy}</p>
      <p class="reward-card__note">${panel.note}</p>
    `;

    card.appendChild(this.makeButton(panel.buttonLabel, "button", onClick, panel.disabled));
    return card;
  }

  private makeNotice(notice: NoticeData): HTMLElement {
    const banner = document.createElement("div");
    banner.className = `notice-banner notice-banner--${notice.tone}`;
    banner.textContent = notice.text;
    return banner;
  }
}
