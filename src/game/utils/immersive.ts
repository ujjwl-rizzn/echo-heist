const COMPACT_TOUCH_WIDTH = 760;

type FullscreenShell = HTMLElement & {
  webkitRequestFullscreen?: () => Promise<void> | void;
};

type WebkitFullscreenDocument = Document & {
  webkitFullscreenElement?: Element | null;
  webkitFullscreenEnabled?: boolean;
};

const getViewportSize = () => {
  const visualViewport = window.visualViewport;
  return {
    width: Math.max(1, visualViewport?.width ?? window.innerWidth),
    height: Math.max(1, visualViewport?.height ?? window.innerHeight)
  };
};

const getShell = (shell?: HTMLElement | null): HTMLElement | null =>
  shell ?? document.getElementById("app-shell");

export const isCompactTouchViewport = (): boolean => {
  const { width, height } = getViewportSize();
  const coarsePointer = window.matchMedia?.("(pointer: coarse)").matches ?? false;
  const touchCapable = coarsePointer || navigator.maxTouchPoints > 0;
  const compactShape = width <= COMPACT_TOUCH_WIDTH || width / height < 0.95;
  return touchCapable && compactShape;
};

export const markViewportMode = (shell?: HTMLElement | null): void => {
  const appShell = getShell(shell);
  if (!appShell) return;

  const compactTouch = isCompactTouchViewport();
  const webkitDocument = document as WebkitFullscreenDocument;
  const fullscreenActive = Boolean(
    document.fullscreenElement || webkitDocument.webkitFullscreenElement
  );
  const canRequestFullscreen =
    document.fullscreenEnabled && typeof appShell.requestFullscreen === "function";
  const canRequestWebkitFullscreen =
    webkitDocument.webkitFullscreenEnabled !== false &&
    typeof (appShell as FullscreenShell).webkitRequestFullscreen === "function";

  appShell.toggleAttribute("data-compact-touch", compactTouch);
  appShell.toggleAttribute("data-immersive", compactTouch && fullscreenActive);
  appShell.toggleAttribute(
    "data-immersive-fallback",
    compactTouch && !fullscreenActive
  );
  appShell.toggleAttribute(
    "data-fullscreen-unavailable",
    compactTouch && !canRequestFullscreen && !canRequestWebkitFullscreen
  );
};

export const requestImmersiveMode = async (): Promise<void> => {
  const appShell = getShell() as FullscreenShell | null;
  markViewportMode(appShell);

  const webkitDocument = document as WebkitFullscreenDocument;
  const fullscreenActive = Boolean(
    document.fullscreenElement || webkitDocument.webkitFullscreenElement
  );

  if (!appShell || !isCompactTouchViewport() || fullscreenActive) {
    return;
  }

  try {
    if (document.fullscreenEnabled && typeof appShell.requestFullscreen === "function") {
      await appShell.requestFullscreen({ navigationUI: "hide" });
      return;
    }

    await appShell.webkitRequestFullscreen?.();
  } catch {
    // Browser support varies; mobile fallback styling still improves the view.
  } finally {
    markViewportMode(appShell);
    window.setTimeout(() => markViewportMode(appShell), 250);
  }
};
