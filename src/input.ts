import { SlashPoint } from "./types";

export class InputManager {
  private canvas: HTMLCanvasElement;
  private _points: SlashPoint[] = [];
  private _isDown = false;
  private _lastX = 0;
  private _lastY = 0;
  private _lastTime = 0;
  private _segments: { p1: SlashPoint; p2: SlashPoint }[] = [];

  private _holdStartTime = 0;
  private _holdX = 0;
  private _holdY = 0;
  private _holdMoved = false;
  private _holdTriggered = false;
  holdProgress = 0;
  holdActive = false;
  holdX = 0;
  holdY = 0;
  private _pendingHold: { x: number; y: number } | null = null;

  readonly MAX_TRAIL_POINTS = 30;
  readonly TRAIL_LIFETIME = 200;
  readonly HOLD_DURATION = 800;
  readonly HOLD_MOVE_THRESHOLD = 15;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.bindEvents();
  }

  private bindEvents() {
    const opts: AddEventListenerOptions = { passive: false };

    this.canvas.addEventListener("mousedown", (e) => this.onDown(e.clientX, e.clientY), opts);
    this.canvas.addEventListener("mousemove", (e) => { if (this._isDown) this.onMove(e.clientX, e.clientY); }, opts);
    this.canvas.addEventListener("mouseup", () => this.onUp(), opts);

    this.canvas.addEventListener("touchstart", (e) => {
      e.preventDefault();
      const t = e.touches[0];
      this.onDown(t.clientX, t.clientY);
    }, opts);
    this.canvas.addEventListener("touchmove", (e) => {
      e.preventDefault();
      const t = e.touches[0];
      this.onMove(t.clientX, t.clientY);
    }, opts);
    this.canvas.addEventListener("touchend", (e) => {
      e.preventDefault();
      this.onUp();
    }, opts);
  }

  private onDown(cx: number, cy: number) {
    this._isDown = true;
    this._lastX = cx;
    this._lastY = cy;
    this._lastTime = performance.now();
    this._points = [];
    this._segments = [];
    const pt: SlashPoint = { x: cx, y: cy, time: this._lastTime, speed: 0 };
    this._points.push(pt);

    this._holdStartTime = performance.now();
    this._holdX = cx;
    this._holdY = cy;
    this._holdMoved = false;
    this._holdTriggered = false;
  }

  private onMove(cx: number, cy: number) {
    const now = performance.now();
    const dx = cx - this._lastX;
    const dy = cy - this._lastY;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const dt = Math.max(now - this._lastTime, 1);
    const speed = dist / dt * 1000;

    const pt: SlashPoint = { x: cx, y: cy, time: now, speed };
    this._points.push(pt);

    if (this._points.length > 1) {
      const prev = this._points[this._points.length - 2];
      this._segments.push({ p1: prev, p2: pt });
    }

    if (this._points.length > this.MAX_TRAIL_POINTS) {
      this._points.shift();
    }

    this._lastX = cx;
    this._lastY = cy;
    this._lastTime = now;

    const holdDx = cx - this._holdX;
    const holdDy = cy - this._holdY;
    if (Math.sqrt(holdDx * holdDx + holdDy * holdDy) > this.HOLD_MOVE_THRESHOLD) {
      this._holdMoved = true;
    }
  }

  private onUp() {
    this._isDown = false;
    this.holdActive = false;
    this.holdProgress = 0;
  }

  get isSlashing(): boolean {
    return this._isDown;
  }

  get trailPoints(): SlashPoint[] {
    return this._points;
  }

  consumeSegments(): { p1: SlashPoint; p2: SlashPoint }[] {
    const segs = this._segments;
    this._segments = [];
    return segs;
  }

  pruneTrail(now: number) {
    while (this._points.length > 0 && now - this._points[0].time > this.TRAIL_LIFETIME) {
      this._points.shift();
    }
  }

  updateHold() {
    if (!this._isDown || this._holdMoved || this._holdTriggered) {
      this.holdActive = false;
      this.holdProgress = 0;
      return;
    }
    const elapsed = performance.now() - this._holdStartTime;
    this.holdProgress = Math.min(elapsed / this.HOLD_DURATION, 1);
    this.holdX = this._holdX;
    this.holdY = this._holdY;
    this.holdActive = true;
    if (this.holdProgress >= 1) {
      this._holdTriggered = true;
      this._pendingHold = { x: this._holdX, y: this._holdY };
      this.holdActive = false;
      this.holdProgress = 0;
    }
  }

  consumeHold(): { x: number; y: number } | null {
    const h = this._pendingHold;
    this._pendingHold = null;
    return h;
  }
}
