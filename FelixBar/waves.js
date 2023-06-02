function getRandomFloat(min, max) {
  return Math.random() * (max - min) + min;
}
function getRandomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
function cycle(value, total) {
  return ((value % total) + total) % total;
}
class Entity {
  dpr = window.devicePixelRatio || 1;
  toValue = (value) => value * this.dpr;
  draw = () => {};
  update = () => {};
}
class Point {
  constructor(x, y) {
    this.x = x;
    this.y = y;
  }
  get position() {
    return [this.x, this.y];
  }
  clone() {
    return new Point(this.x, this.y);
  }
  delta(point) {
    return [this.x - point.x, this.y - point.y];
  }
  distance(point) {
    const dx = point.x - this.x;
    const dy = point.y - this.y;
    return Math.sqrt(dx * dx + dy * dy);
  }
  moveTo(x, y) {
    this.x = x;
    this.y = y;
    return this;
  }
  moveAtAngle(angle, distance) {
    this.x += Math.cos(angle) * distance;
    this.y += Math.sin(angle) * distance;
    return this;
  }
  applyVelocity(velocity) {
    this.x += velocity.vx;
    this.y += velocity.vy;
    return this;
  }
  angleRadians(point) {
    const y = point.y - this.y;
    const x = point.x - this.x;
    return Math.atan2(y, x);
  }
  angleDeg(point) {
    const y = point.y - this.y;
    const x = point.x - this.x;
    return Math.atan2(y, x) * (180 / Math.PI);
  }
  rotate(origin, radians) {
    const cos = Math.cos(radians);
    const sin = Math.sin(radians);
    this.x = cos * (this.x - origin.x) + sin * (this.y - origin.y) + origin.x;
    this.y = cos * (this.y - origin.y) - sin * (this.x - origin.x) + origin.y;
    return this;
  }
}
class Bounds {
  constructor(x, y, w, h) {
    this.x = x;
    this.y = y;
    this.w = w;
    this.h = h;
    const hw = w / 2;
    const hh = h / 2;
    this.center = new Point(hw, hh);
    this.position = new Point(x, y);
  }
  get params() {
    return [this.x, this.y, this.w, this.h];
  }
  offsetOuter(offset) {
    const [x, y, w, h] = this.params;
    return new Bounds(x - offset, y - offset, w + offset * 2, h + offset * 2);
  }
  offsetInner(offset) {
    const [x, y, w, h] = this.params;
    return new Bounds(x + offset, y + offset, w - offset * 2, h - offset * 2);
  }
}
class Background extends Entity {
  drawText({ ctx, canvas }) {
    const ms = Math.min(canvas.width, canvas.height);
    const size = ms / 15;
    const copy = "Waves";
    const x = canvas.width / 2;
    const y = canvas.height / 3 + size / 3;
    ctx.font = `700 italic ${size}px futura, sans-serif`;
    ctx.textAlign = "center";
    ctx.fillStyle = "#edb07b";
    ctx.fillText(copy, x, y);
  }
  drawGradient({ ctx, canvas, bounds }) {
    ctx.fillStyle = "#252f3d";
    ctx.fillRect(...bounds.params);
  }
  draw = (context) => {
    this.drawGradient(context);
  };
}
class Canvas {
  constructor({ canvas, entities = [], pointer }) {
    this.canvas = canvas;
    this.dpr = window.devicePixelRatio || 1;
    this.ctx = canvas.getContext("2d");
    this.ctx.scale(this.dpr, this.dpr);
    this.tick = 0;
    this.entities = entities;
    this.pointer = pointer || null;
    this.setCanvasSize();
    this.setupListeners();
    this.render();
    this.pointer.addPointerModifier((pointer, tick) => {
      const cx = (window.innerWidth / 2) * this.dpr;
      const cy = (window.innerHeight / 2) * this.dpr;
      const dy = (window.innerHeight / 4) * this.dpr;
      const offX = cx;
      const offY = cy + Math.cos(-tick / 20) * dy;
      pointer.lastPosition.moveTo(pointer.position.x, pointer.position.y);
      pointer.position.moveTo(offX, offY);
    });
  }
  setupListeners() {
    window.addEventListener("resize", this.setCanvasSize);
  }
  setCanvasSize = () => {
    const { innerWidth: w, innerHeight: h } = window;
    const w2 = w * this.dpr;
    const h2 = h * this.dpr;
    this.canvas.width = w2;
    this.canvas.height = h2;
    this.canvas.style.width = w + "px";
    this.canvas.style.height = h + "px";
    this.bounds = new Bounds(0, 0, w2, h2);
  };
  addEntity = (newEntity) => {
    this.entities = [...this.entities, newEntity];
    return this.entities.length - 1;
  };
  removeEntity(deleteIndex) {
    this.entities = this.entities.filter((el, i) => i !== deleteIndex);
    return this.entities;
  }
  removeDead() {
    this.entities = this.entities.filter(({ dead = false }) => !dead);
  }
  render = () => {
    this.entities.forEach(({ draw, update }) => {
      draw(this);
      update(this);
    });
    this.pointer.update(this);
    this.removeDead();
    ++this.tick;
    window.requestAnimationFrame(this.render);
  };
}
class Cursor extends Entity {
  constructor(radius) {
    super();
    this.radius = this.toValue(radius);
    this.pi2 = Math.PI * 2;
    this.lineWidth = this.toValue(2);
    this.strokeStyle = "#7bc4a2";
  }
  draw = ({ ctx, pointer }) => {
    ctx.strokeStyle = this.strokeStyle;
    ctx.lineWidth = this.lineWidth;
    ctx.beginPath();
    ctx.arc(
      pointer.position.x,
      pointer.position.y,
      this.radius,
      0,
      this.pi2,
      true
    );
    ctx.closePath();
    ctx.stroke();
  };
}
class Pointer {
  constructor() {
    this.dpr = window.devicePixelRatio || 1;
    this.delta;
    this.lastPosition = new Point(0, 0);
    this.position = new Point(0, 0);
    this.addListeners();
  }
  delta() {
    return this.position.delta(this.lastPosition);
  }
  addListeners() {
    ["mousemove", "touchmove"].forEach((event, touch) => {
      window.addEventListener(
        event,
        (e) => {
          const { x: px, y: py } = this.position;
          if (this.modifier) {
            this.modifier = null;
          }
          if (touch) {
            e.preventDefault();
            const x = e.targetTouches[0].clientX * this.dpr;
            const y = e.targetTouches[0].clientY * this.dpr;
            this.position.moveTo(x, y);
            this.lastPosition.moveTo(px, py);
          } else {
            const x = e.clientX * this.dpr;
            const y = e.clientY * this.dpr;
            this.position.moveTo(x, y);
            this.lastPosition.moveTo(px, py);
          }
        },
        false
      );
    });
  }
  addPointerModifier(modifier) {
    this.modifier = modifier;
  }
  update = ({ tick }) => {
    this.modifier && this.modifier(this, tick);
  };
}
class PolyWave extends Entity {
  constructor({ verts, color, elasticity, damping }) {
    super();
    this.verts = verts;
    this.color = color;
    this.points = [];
    this.resolution = 50;
    this.elasticity = elasticity;
    this.damping = damping;
    this.constructPolyWave();
    this.setAttractors();
  }
  constructPolyWave() {
    for (let i = 0; i < this.verts.length; i++) {
      const p1 = this.verts[i];
      const p2 = this.verts[i + 1];
      if (p1 && p2) {
        const [dx, dy] = p2.point.delta(p1.point);
        const distance = p2.point.distance(p1.point);
        const amount = distance / this.resolution;
        const pointAmt = Math.round(amount);
        const offX = dx / pointAmt;
        const offY = dy / pointAmt;
        if (p1.isSpring) {
          for (let k = 1; k <= pointAmt; k++) {
            const x = p1.point.x + offX * k;
            const y = p1.point.y + offY * k;
            const point = new Spring({
              x: x,
              y: y,
              elasticity: this.elasticity,
              damping: this.damping,
              isFixed: k === 0 || k === pointAmt,
            });
            this.points.push(point);
          }
        } else {
          this.points.push(
            new Spring({ x: p2.point.x, y: p2.point.y, isFixed: true })
          );
        }
      }
    }
  }
  setAttractors() {
    this.points.forEach((p, i) => {
      const isLast = i === this.points.length - 1;
      const isFirst = i === 0;
      if (isLast) {
        const prevPoint = this.points[i - 1];
        const nextPoint = this.points[0];
        !p.isFixed && p.addAttractor(prevPoint);
        !p.isFixed && p.addAttractor(nextPoint);
      } else if (isFirst) {
        const prevPoint = this.points[this.points.length - 1];
        const nextPoint = this.points[i + 1];
        !p.isFixed && p.addAttractor(prevPoint);
        !p.isFixed && p.addAttractor(nextPoint);
      } else {
        const prevPoint = this.points[i - 1];
        const nextPoint = this.points[i + 1];
        !p.isFixed && p.addAttractor(prevPoint);
        !p.isFixed && p.addAttractor(nextPoint);
      }
    });
  }
  draw = ({ ctx, bounds }) => {
    ctx.beginPath();
    this.points.forEach((point) => {
      ctx.lineTo(point.x, point.y);
    });
    ctx.closePath();
    ctx.fillStyle = this.color;
    ctx.lineWidth = this.toValue(2);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.globalCompositeOperation = "screen";
    ctx.globalAlpha = 0.9;
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = "source-over";
  };
  update = (context) => {
    this.points.forEach((point) => point.update(context));
  };
}
const ELASTICITY = 0.05;
const DAMPING = 0.4;
const MASS = 10;
const ADJACENT_SPRING_CONSTANT = 0.12;
const DPR = window.devicePixelRatio || 1;
class Spring extends Point {
  constructor({
    x,
    y,
    isFixed,
    mass = MASS,
    elasticity = ELASTICITY,
    damping = DAMPING,
  }) {
    super(x, y);
    this.ox = x;
    this.oy = y;
    this.vx = 0;
    this.vy = 0;
    this.fx = 0;
    this.fy = 0;
    this.isFixed = isFixed;
    this.mass = mass;
    this.elasticity = elasticity;
    this.damping = damping;
  }
  applyForce(x, y) {
    this.fx += x;
    this.fy += y;
  }
  attractors = [];
  addAttractor(point) {
    this.attractors = [...this.attractors, point];
  }
  setAdjacentForces() {
    this.attractors.forEach((point, i) => {
      const { x, y } = point;
      const force = { x: 0, y: 0 };
      const { x: x1, y: y1 } = point;
      const { x: x2, y: y2 } = this;
      force.x = x1 - x2;
      force.y = y1 - y2;
      this.applyForce(force.x, force.y);
    });
  }
  applyForceFromMouse(pointer) {
    const { x, y } = pointer.position;
    const distance = this.distance(pointer.position);
    if (distance < MOUSE_RADIUS) {
      const [dx, dy] = pointer.delta();
      const power = (1 - distance / MOUSE_RADIUS) * MOUSE_STRENGTH;
      this.applyForce(dx * power, dy * power);
    }
  }
  setSpringForce() {
    const fx = (this.ox - this.x) * this.elasticity;
    const fy = (this.oy - this.y) * this.elasticity;
    this.fx += fx;
    this.fy += fy;
  }
  solveVelocity() {
    if (this.fx === 0 && this.fy === 0) return;
    const ax = this.fx / this.mass;
    const ay = this.fy / this.mass;
    this.vx = this.damping * this.vx + ax;
    this.vy = this.damping * this.vy + ay;
    this.x += this.vx;
    this.y += this.vy;
    this.fx = 0;
    this.fy = 0;
  }
  update = ({ pointer }) => {
    if (this.isFixed) return;
    this.applyForceFromMouse(pointer);
    this.setSpringForce();
    this.setAdjacentForces();
    this.solveVelocity();
  };
  draw = ({ ctx }) => {
    const { x, y } = this;
    ctx.fillStyle = "white";
    ctx.lineWidth = 5;
    ctx.fillRect(x - 2, y - 2, 4, 4);
  };
}
const MOUSE_STRENGTH = 1;
const MOUSE_RADIUS = 200 * DPR;
const colors = [
  "#d16060",
  "#edb07b",
  "#7bc4a2",
  "#343a5b",
  "#9b7bad",
  "#a05065",
];
const center = new Point(
  (window.innerWidth / 2) * DPR,
  (window.innerHeight / 2) * DPR
);
const createWaves = (amount) =>
  Array(amount)
    .fill(null)
    .map((_, i) => {
      const size = 40 * (amount - i) * DPR;
      const points = 6 + (amount - i);
      const verts = [
        { point: new Point(0, (window.innerHeight * DPR) / 2), isSpring: true },
        {
          point: new Point(
            window.innerWidth * DPR,
            (window.innerHeight * DPR) / 2
          ),
        },
        { point: new Point(window.innerWidth * DPR, window.innerHeight * DPR) },
        { point: new Point(0, window.innerHeight * DPR) },
      ];
      const cdx = cycle(i, colors.length);
      return new PolyWave({
        verts: [...verts, verts[0]],
        elasticity: getRandomFloat(0.1, 0.2),
        damping: getRandomFloat(0.88, 0.9),
        color: colors[cdx],
      });
    });
const canvas = new Canvas({
  canvas: document.getElementById("canvas"),
  pointer: new Pointer(),
  entities: [new Background(), ...createWaves(4), new Cursor(10)],
});
