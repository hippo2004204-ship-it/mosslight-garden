import Phaser from 'phaser';

const PLOTS = [
  { x: 0.2, y: 0.57 },
  { x: 0.4, y: 0.48 },
  { x: 0.63, y: 0.57 },
  { x: 0.81, y: 0.47 },
  { x: 0.49, y: 0.75 },
];

const SPECIES = {
  moss: { cap: 0x88a576, underside: 0xc2d0a3, spot: 0xe1e7c8, stem: 0xf0e8cb, leaf: 0x638969 },
  star: { cap: 0xe3b65f, underside: 0xf1d78c, spot: 0xfff0bb, stem: 0xf3e7c9, leaf: 0x708e77 },
  honey: { cap: 0xd98b72, underside: 0xf0bba0, spot: 0xffdebc, stem: 0xf1e2cd, leaf: 0x71886c },
};

export class GardenScene extends Phaser.Scene {
  constructor() {
    super('GardenScene');
    this.plotPoints = [];
    this.labelObjects = [];
    this.hoveredPlot = -1;
  }

  create() {
    this.backdrop = this.add.graphics();
    this.garden = this.add.graphics();
    this.drawBackdrop();
    this.input.on('pointerdown', (pointer) => {
      const index = this.findPlotAt(pointer.x, pointer.y);
      if (index !== -1) window.gardenActions?.onPlot?.(index);
    });
    this.input.on('pointermove', (pointer) => {
      const nextPlot = this.findPlotAt(pointer.x, pointer.y);
      if (nextPlot !== this.hoveredPlot) {
        this.hoveredPlot = nextPlot;
        this.input.setDefaultCursor(nextPlot === -1 ? 'default' : 'pointer');
        this.redrawGarden();
      }
    });
    this.input.on('pointerout', () => {
      this.hoveredPlot = -1;
      this.input.setDefaultCursor('default');
      this.redrawGarden();
    });
    this.scale.on('resize', () => {
      this.drawBackdrop();
      this.updatePlotPoints();
      this.redrawGarden();
    });
    window.__mosslightScene = this;
    this.game.events.emit('garden-ready', this);
  }

  get dimensions() {
    return { width: this.scale.width, height: this.scale.height };
  }

  drawBackdrop() {
    const { width: w, height: h } = this.dimensions;
    const g = this.backdrop;
    g.clear();

    // A pale morning sky with soft overlapping hills.
    g.fillStyle(0xcfe8dc, 1).fillRect(0, 0, w, h);
    g.fillStyle(0xdff0df, 0.82).fillEllipse(w * 0.16, h * 0.2, w * 0.5, h * 0.32);
    g.fillStyle(0xf3f0d6, 0.28).fillCircle(w * 0.82, h * 0.18, Math.min(w, h) * 0.14);
    g.fillStyle(0xf7f1d6, 0.48).fillCircle(w * 0.82, h * 0.18, Math.min(w, h) * 0.105);
    g.fillStyle(0xb8d9c2, 0.68).fillEllipse(w * 0.1, h * 0.51, w * 0.67, h * 0.43);
    g.fillStyle(0xaed2b6, 0.72).fillEllipse(w * 0.96, h * 0.48, w * 0.78, h * 0.49);
    g.fillStyle(0x9cc9a7, 0.6).fillEllipse(w * 0.52, h * 0.63, w * 1.15, h * 0.57);
    g.fillStyle(0xaed0a2, 0.42).fillEllipse(w * 0.44, h * 1.01, w * 1.36, h * 0.83);

    // Winding sandy footpath.
    g.fillStyle(0xe8dcb9, 0.65);
    g.beginPath();
    g.moveTo(w * 0.31, h * 1.06);
    g.lineTo(w * 0.43, h * 0.74);
    g.lineTo(w * 0.52, h * 0.65);
    g.lineTo(w * 0.61, h * 0.74);
    g.lineTo(w * 0.71, h * 1.06);
    g.closePath();
    g.fillPath();
    g.fillStyle(0xf0e5c9, 0.54).fillEllipse(w * 0.53, h * 0.73, w * 0.2, h * 0.045);

    // Soft grass tufts and tiny flowers along the garden edge.
    const seeds = [
      [0.08, 0.68, 0x668e72], [0.13, 0.37, 0x71987a], [0.28, 0.3, 0x7ea383],
      [0.91, 0.32, 0x799c79], [0.95, 0.66, 0x658b70], [0.72, 0.23, 0x85a887],
      [0.31, 0.85, 0x668f75], [0.9, 0.83, 0x6f9574], [0.57, 0.33, 0x73977b],
    ];
    seeds.forEach(([px, py, color], index) => {
      const x = w * px;
      const y = h * py;
      g.lineStyle(2, color, 0.58);
      g.beginPath().moveTo(x, y + 8).lineTo(x - 3, y - 3).strokePath();
      g.beginPath().moveTo(x + 1, y + 8).lineTo(x + 5, y - 1).strokePath();
      g.beginPath().moveTo(x + 2, y + 8).lineTo(x + 1, y - 7).strokePath();
      if (index % 3 === 0) {
        g.fillStyle(0xf4e5a7, 0.8).fillCircle(x + 7, y - 1, 2.5);
        g.fillStyle(0xfaf4d8, 0.85).fillCircle(x + 7, y - 1, 1);
      }
    });

    // Floating pollen dots.
    [[.28,.17],[.55,.23],[.67,.14],[.12,.49],[.88,.55],[.73,.84],[.37,.38]].forEach(([x,y], i) => {
      g.fillStyle(i % 2 ? 0xf6edbf : 0xffffff, 0.52).fillCircle(w * x, h * y, i % 3 === 0 ? 2.3 : 1.4);
    });

    this.plotPoints = PLOTS.map((plot) => ({ x: w * plot.x, y: h * plot.y }));
    this.updatePlotPoints();
  }

  updatePlotPoints() {
    const { width: w, height: h } = this.dimensions;
    this.plotPoints = PLOTS.map((plot) => ({ x: w * plot.x, y: h * plot.y }));
  }

  findPlotAt(x, y) {
    const { width: w, height: h } = this.dimensions;
    let nearest = -1;
    let nearestDistance = Infinity;
    this.plotPoints.forEach((point, index) => {
      const dx = (x - point.x) / Math.max(39, w * 0.075);
      const dy = (y - point.y) / Math.max(42, h * 0.11);
      const distance = dx * dx + dy * dy;
      if (distance < nearestDistance) {
        nearestDistance = distance;
        nearest = index;
      }
    });
    return nearestDistance <= 1 ? nearest : -1;
  }

  sync(state, seeds) {
    this.state = state;
    this.seeds = seeds;
    this.redrawGarden();
  }

  redrawGarden() {
    if (!this.garden || !this.plotPoints.length) return;
    const { width: w, height: h } = this.dimensions;
    const g = this.garden;
    g.clear();
    this.labelObjects.forEach((item) => item.destroy());
    this.labelObjects = [];
    if (!this.state) return;

    this.plotPoints.forEach((point, index) => {
      const plant = this.state.plants[index];
      const rx = Math.max(31, w * 0.055);
      const ry = Math.max(14, h * 0.034);
      const hover = this.hoveredPlot === index;

      // Mossy planting mound and its softly lit rim.
      g.fillStyle(0x668b69, 0.12).fillEllipse(point.x, point.y + 9, rx * 2.8, ry * 2.1);
      g.fillStyle(hover ? 0x7eaa78 : 0x81a77a, 0.82).fillEllipse(point.x, point.y, rx * 2.5, ry * 1.7);
      g.fillStyle(0xa9c08a, 0.48).fillEllipse(point.x, point.y - 3, rx * 2.15, ry * 1.28);
      g.lineStyle(1.3, hover ? 0xf2e9bd : 0xdce6bd, hover ? 0.7 : 0.4).strokeEllipse(point.x, point.y, rx * 2.22, ry * 1.28);

      // A couple of tiny leaves make each bed feel planted into the landscape.
      g.fillStyle(0x628c69, 0.8).fillEllipse(point.x - rx * 0.75, point.y - 3, 10, 5);
      g.fillStyle(0x72986d, 0.85).fillEllipse(point.x + rx * 0.77, point.y + 1, 9, 5);

      if (!plant) {
        const plusY = point.y - 12;
        g.fillStyle(0xf8f5df, hover ? 0.92 : 0.72).fillCircle(point.x, plusY, 11);
        g.lineStyle(1.5, 0x769676, hover ? 0.9 : 0.65);
        g.beginPath().moveTo(point.x - 4, plusY).lineTo(point.x + 4, plusY).strokePath();
        g.beginPath().moveTo(point.x, plusY - 4).lineTo(point.x, plusY + 4).strokePath();
        continue;
      }

      const seed = this.seeds?.find((item) => item.id === plant.type);
      const colors = SPECIES[plant.type] || SPECIES.moss;
      const now = Date.now();
      const grow = Math.max(0, Math.min(1, (now - plant.plantedAt) / (plant.readyAt - plant.plantedAt)));
      const mature = now >= plant.readyAt;
      const s = 0.48 + grow * 0.52;
      const baseY = point.y - 13;
      const stemW = 22 * s;
      const stemH = 29 * s;
      const capW = 59 * s;
      const capH = 36 * s;

      // Growth glow and small surrounding leaves.
      if (mature) {
        g.fillStyle(colors.cap, 0.09).fillCircle(point.x, baseY - 31 * s, 39 * s);
        g.fillStyle(0xf2d98d, 0.86).fillCircle(point.x + capW * 0.44, baseY - 42 * s, 2.3);
      }
      g.fillStyle(colors.leaf, 0.9).fillEllipse(point.x - 19 * s, baseY - 1, 14 * s, 7 * s);
      g.fillStyle(colors.leaf, 0.8).fillEllipse(point.x + 20 * s, baseY + 2, 12 * s, 6 * s);
      g.fillStyle(colors.stem, 1).fillRoundedRect(point.x - stemW / 2, baseY - stemH * 0.61, stemW, stemH, 8 * s);
      g.fillStyle(0xffffff, 0.26).fillRoundedRect(point.x - stemW * 0.27, baseY - stemH * 0.53, stemW * 0.23, stemH * 0.55, 4 * s);
      g.fillStyle(colors.underside, 1).fillEllipse(point.x, baseY - stemH * 0.61, capW, capH * 0.47);
      g.fillStyle(colors.cap, 1).fillEllipse(point.x, baseY - stemH * 0.77, capW, capH);
      g.fillStyle(0xffffff, 0.17).fillEllipse(point.x - capW * 0.22, baseY - stemH * 0.98, capW * 0.34, capH * 0.26);
      g.fillStyle(colors.spot, 0.9).fillCircle(point.x - capW * 0.23, baseY - stemH * 0.8, 2.3 * s);
      g.fillStyle(colors.spot, 0.82).fillCircle(point.x + capW * 0.17, baseY - stemH * 0.91, 1.7 * s);
      g.fillStyle(colors.spot, 0.78).fillCircle(point.x + capW * 0.35, baseY - stemH * 0.69, 1.4 * s);

      // A tiny seedling is tucked beside mushrooms still growing.
      if (!mature && grow < 0.48) {
        const sproutX = point.x + 17;
        g.lineStyle(1.7, 0x668b69, 0.85).beginPath().moveTo(sproutX, point.y + 1).lineTo(sproutX + 1, point.y - 12 * s).strokePath();
        g.fillStyle(0x7aa27a, 0.9).fillEllipse(sproutX - 4, point.y - 8 * s, 9, 5);
        g.fillStyle(0x8bb181, 0.9).fillEllipse(sproutX + 5, point.y - 11 * s, 9, 5);
      }

      const label = mature ? '可以採收' : `${this.formatTime(plant.readyAt - now)} 後長好`;
      const labelY = point.y - 63 * s;
      const labelBg = this.add.graphics();
      labelBg.fillStyle(mature ? 0xf7f2d8 : 0xf5f6e8, mature ? 0.94 : 0.8).fillRoundedRect(point.x - 38, labelY - 10, 76, 19, 9);
      labelBg.fillStyle(mature ? 0xd4b967 : 0x8da68b, 0.9).fillCircle(point.x - 28, labelY, 2);
      const labelText = this.add.text(point.x - 21, labelY - 6, label, {
        fontFamily: 'Noto Sans TC, sans-serif', fontSize: '8px', color: mature ? '#8c7942' : '#7b8f7b',
      }).setOrigin(0, 0);
      this.labelObjects.push(labelBg, labelText);
      if (seed && mature) {
        const name = this.add.text(point.x, point.y + 19, seed.shortName, { fontFamily: 'Noto Sans TC, sans-serif', fontSize: '8px', color: '#f8f7e9', stroke: '#58765b', strokeThickness: 2 }).setOrigin(0.5);
        this.labelObjects.push(name);
      }
    });
  }

  formatTime(ms) {
    const seconds = Math.max(0, Math.ceil(ms / 1000));
    if (seconds >= 60) return `${Math.floor(seconds / 60)}分${String(seconds % 60).padStart(2, '0')}秒`;
    return `${seconds}秒`;
  }
}
