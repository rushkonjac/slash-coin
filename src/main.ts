import { Game } from "./game";

const canvas = document.getElementById("game") as HTMLCanvasElement | null;
if (!canvas) {
  document.body.innerHTML =
    '<p style="font-family:sans-serif;padding:1rem;color:#fff;background:#0a0a1a;min-height:100vh;">找不到 #game 画布，请用 index.html 打开。</p>';
} else {
  const game = new Game(canvas);
  game.start();
}
