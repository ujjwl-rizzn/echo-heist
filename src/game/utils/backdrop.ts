import Phaser from "phaser";

export const createMenuBackdrop = (scene: Phaser.Scene, reducedMotion: boolean): void => {
  const graphics = scene.add.graphics();
  graphics.fillGradientStyle(0x071120, 0x071120, 0x050611, 0x050611, 1);
  graphics.fillRect(0, 0, scene.scale.width, scene.scale.height);
  graphics.lineStyle(1, 0x183049, 0.5);

  for (let x = 0; x <= scene.scale.width; x += 64) {
    graphics.lineBetween(x, 0, x, scene.scale.height);
  }

  for (let y = 0; y <= scene.scale.height; y += 64) {
    graphics.lineBetween(0, y, scene.scale.width, y);
  }

  const bars = [0, 1, 2].map((index) =>
    scene.add.rectangle(
      240 + index * 360,
      160 + index * 120,
      220,
      10,
      index === 1 ? 0xff3a88 : 0x7ef6ff,
      0.14
    )
  );

  if (!reducedMotion) {
    bars.forEach((bar, index) => {
      scene.tweens.add({
        targets: bar,
        x: bar.x + 60,
        alpha: { from: 0.08, to: 0.22 },
        duration: 1800 + index * 240,
        yoyo: true,
        repeat: -1,
        ease: "Sine.easeInOut"
      });
    });

    scene.add.particles(scene.scale.width / 2, scene.scale.height / 2, "particle", {
      speed: { min: 6, max: 18 },
      angle: { min: 0, max: 360 },
      scale: { start: 0.3, end: 0 },
      lifespan: 4200,
      quantity: 1,
      frequency: 120,
      tint: [0x7ef6ff, 0xff3a88, 0xffd76f],
      alpha: { start: 0.4, end: 0 }
    });
  }
};

export const createRoomBackdrop = (
  scene: Phaser.Scene,
  width: number,
  height: number,
  reducedMotion: boolean
): void => {
  const graphics = scene.add.graphics();
  graphics.fillStyle(0x050611, 1);
  graphics.fillRect(0, 0, width, height);
  graphics.fillStyle(0x091625, 1);
  graphics.fillRoundedRect(22, 22, width - 44, height - 44, 28);
  graphics.lineStyle(2, 0x183049, 0.7);
  graphics.strokeRoundedRect(22, 22, width - 44, height - 44, 28);
  graphics.lineStyle(1, 0x112335, 0.55);

  for (let x = 64; x < width; x += 64) {
    graphics.lineBetween(x, 32, x, height - 32);
  }
  for (let y = 64; y < height; y += 64) {
    graphics.lineBetween(32, y, width - 32, y);
  }

  const accents = [
    scene.add.rectangle(160, 54, 160, 6, 0x7ef6ff, 0.16),
    scene.add.rectangle(width - 180, height - 54, 200, 6, 0xff3a88, 0.16)
  ];

  if (!reducedMotion) {
    accents.forEach((accent, index) => {
      scene.tweens.add({
        targets: accent,
        alpha: { from: 0.08, to: 0.22 },
        duration: 1400 + index * 180,
        yoyo: true,
        repeat: -1
      });
    });

    scene.add.particles(width / 2, height / 2, "particle", {
      speed: { min: 4, max: 14 },
      angle: { min: 0, max: 360 },
      scale: { start: 0.18, end: 0 },
      lifespan: 5200,
      quantity: 1,
      frequency: 180,
      tint: [0x7ef6ff, 0xff3a88],
      alpha: { start: 0.24, end: 0 }
    });
  }
};
