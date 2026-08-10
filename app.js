import { chooseArrangement } from "./ai.js";
import { ShisanAudio } from "./audio.js";
import {
  cardLabel,
  CATEGORY_LABEL,
  classify,
  isRed,
  RANKS,
  ShisanGame,
  SUITS,
  validateArrangement,
} from "./game.js";

const audio = new ShisanAudio();
const game = new ShisanGame();

const statusEl = document.getElementById("status");
const turnLabel = document.getElementById("turn-label");
const scoreLabel = document.getElementById("score-label");
const handEl = document.getElementById("hand");
const rowEls = {
  front: document.getElementById("row-front"),
  middle: document.getElementById("row-middle"),
  back: document.getElementById("row-back"),
};
const btnDeal = document.getElementById("btn-deal");
const btnReset = document.getElementById("btn-reset");
const btnArrange = document.getElementById("btn-arrange");
const btnAuto = document.getElementById("btn-auto");
const btnClear = document.getElementById("btn-clear");
const btnMute = document.getElementById("btn-mute");

/** @type {import('./game.js').Card[]} */
let pool = [];
/** current row being filled: 'front' | 'middle' | 'back' */
let currentRow = "back";
let busy = false;

function setStatus(msg, tone = "") {
  statusEl.textContent = msg;
  statusEl.dataset.tone = tone;
}

/**
 * @param {import('./game.js').Card} card
 * @param {{ static?: boolean }} [opts]
 */
function renderCardButton(card, opts = {}) {
  const el = document.createElement(opts.static ? "div" : "button");
  if (!opts.static) el.type = "button";
  el.className = `card${isRed(card) ? " red" : ""}`;
  el.dataset.id = String(card.id);
  el.innerHTML = `<span>${RANKS[card.rank]}</span><span class="suit">${SUITS[card.suit]}</span>`;
  el.setAttribute("aria-label", cardLabel(card));
  return el;
}

function currentArrangement() {
  return game.arrangements[game.human] ?? { front: [], middle: [], back: [] };
}

function arrangedCount() {
  const a = currentArrangement();
  return a.front.length + a.middle.length + a.back.length;
}

function rowLabel(row) {
  return row === "front" ? "前" : row === "middle" ? "中" : "後";
}

function interimHint() {
  const n = arrangedCount();
  return `已排 ${n}/13 張，目標 前3 / 中5 / 後5。`;
}

function renderPool() {
  handEl.innerHTML = "";
  for (const card of pool) {
    const el = renderCardButton(card);
    el.addEventListener("click", async () => {
      await audio.unlock();
      if (game.status !== "arranging" || busy) return;
      moveToRow(card, currentRow);
    });
    handEl.appendChild(el);
  }
}

function renderRow(name) {
  const wrap = rowEls[name];
  wrap.innerHTML = "";
  const cards = currentArrangement()[name];
  for (const card of cards) {
    const el = renderCardButton(card, { static: true });
    el.addEventListener("click", async () => {
      await audio.unlock();
      if (game.status !== "arranging" || busy) return;
      moveBackToPool(card, name);
    });
    wrap.appendChild(el);
  }
  wrap.closest(".row")?.classList.toggle("is-filled", cards.length > 0);
}

function moveToRow(card, row) {
  if (pool.indexOf(card) < 0) return;
  const a = currentArrangement();
  const max = row === "front" ? 3 : 5;
  if (a[row].length >= max) {
    audio.deny();
    setStatus(`${rowLabel(row)}墩已滿（最多 ${max} 張）`, "warn");
    return;
  }
  pool = pool.filter((c) => c.id !== card.id);
  a[row].push(card);
  audio.select();
  setStatus(interimHint());
  renderAll();
}

function moveBackToPool(card, row) {
  if (game.status !== "arranging") return;
  const a = currentArrangement();
  a[row] = a[row].filter((c) => c.id !== card.id);
  pool.push(card);
  audio.select();
  setStatus(interimHint());
  renderAll();
}

function renderOpponents() {
  for (const seat of [1, 2, 3]) {
    const avail = game.arrangements[seat];
    const rowsEl = document.getElementById(`rows-${seat}`);
    const scoreEl = document.getElementById(`score-${seat}`);
    const wrap = document.getElementById(`op-${seat}`);
    if (game.status === "over" && avail) {
      rowsEl.textContent = arrangeSummary(avail);
      scoreEl.textContent = `+${game.scores[seat]}`;
      wrap.innerHTML = "";
      rowSummaryCards(avail, wrap);
    } else if (game.status === "arranging") {
      rowsEl.textContent = "排列中…";
      scoreEl.textContent = "";
      wrap.innerHTML = "";
      const n = 13;
      for (let i = 0; i < Math.min(n, 10); i++) {
        const back = document.createElement("span");
        back.className = "card-back";
        wrap.appendChild(back);
      }
    } else {
      rowsEl.textContent = "—";
      scoreEl.textContent = "";
      wrap.innerHTML = "";
    }
  }
}

function arrangeSummary(arr) {
  const parts = [];
  for (const row of ["front", "middle", "back"]) {
    const cls = classify(arr[row]);
    parts.push(cls ? CATEGORY_LABEL[cls.type] : "?");
  }
  return parts.join(" · ");
}

function rowSummaryCards(arr, wrap) {
  // Show each row's top card as a compact hint.
  for (const row of ["front", "middle", "back"]) {
    const cards = arr[row];
    if (!cards.length) continue;
    wrap.appendChild(renderCardButton(cards[cards.length - 1], { static: true }));
  }
}

function renderHuman() {
  renderPool();
  renderRow("front");
  renderRow("middle");
  renderRow("back");
  const n = arrangedCount();
  const full = n === 13;
  btnArrange.disabled = game.status !== "arranging" || !full || busy;
  btnAuto.disabled = game.status !== "arranging" || busy;
  btnClear.disabled = game.status !== "arranging" || n === 0;
  btnDeal.disabled = busy || game.status === "arranging";
  turnLabel.textContent =
    game.status === "idle"
      ? "—"
      : game.status === "over"
        ? "終局"
        : "排列中";
  scoreLabel.textContent =
    game.status === "over" ? `+${game.scores[game.human]}` : "—";
}

function renderAll() {
  renderOpponents();
  renderHuman();
  setStatus(
    game.message,
    game.status === "over"
      ? "win"
      : game.status === "arranging"
        ? "turn"
        : "",
  );
}

function currentArrFromState() {
  const a = currentArrangement();
  return { front: a.front, middle: a.middle, back: a.back };
}

function arrangeAIs() {
  for (const seat of [1, 2, 3]) {
    if (game.arrangements[seat]) continue;
    const arr = chooseArrangement(game.hands[seat]);
    game.setAiArrangement(seat, arr);
  }
}

async function finishIfReady() {
  if (game.status !== "arranging") return;
  arrangeAIs();
  game.showdown();
  audio.win();
  renderAll();
  if (game.winner === game.human) {
    setStatus(`你贏了！得分 +${game.scores[game.human]}`, "win");
  } else {
    setStatus(`${game.names[game.winner]} 獲勝，你 +${game.scores[game.human]}`, "win");
  }
}

btnDeal.addEventListener("click", async () => {
  await audio.unlock();
  game.deal();
  pool = game.hands[game.human].slice();
  currentRow = "back";
  audio.deal();
  renderAll();
});

btnReset.addEventListener("click", async () => {
  await audio.unlock();
  busy = false;
  pool = [];
  game.reset();
  renderAll();
});

btnAuto.addEventListener("click", async () => {
  await audio.unlock();
  if (game.status !== "arranging" || busy) return;
  busy = true;
  const arr = chooseArrangement(game.hands[game.human]);
  const r = game.setHumanArrangement(arr);
  if (!r.ok) {
    busy = false;
    audio.deny();
    setStatus(r.reason || "自動排列失敗", "warn");
    renderAll();
    return;
  }
  pool = [];
  audio.row();
  busy = false;
  renderAll();
  setStatus("自動排列完成，可再微調後按「確認排列」。", "turn");
});

btnClear.addEventListener("click", async () => {
  await audio.unlock();
  if (game.status !== "arranging") return;
  const a = currentArrangement();
  pool = [...a.front, ...a.middle, ...a.back];
  a.front = [];
  a.middle = [];
  a.back = [];
  audio.select();
  renderAll();
});

btnArrange.addEventListener("click", async () => {
  await audio.unlock();
  if (game.status !== "arranging" || busy) return;
  const arr = currentArrFromState();
  const r = game.setHumanArrangement(arr);
  if (!r.ok) {
    audio.deny();
    setStatus(r.reason || "排列不合法", "warn");
    return;
  }
  pool = [];
  busy = true;
  audio.row();
  renderAll();
  void finishIfReady();
});

btnMute.addEventListener("click", async () => {
  await audio.unlock();
  audio.setEnabled(!audio.enabled);
  btnMute.textContent = audio.enabled ? "音效開" : "音效關";
  btnMute.setAttribute("aria-pressed", audio.enabled ? "true" : "false");
});

document.body.addEventListener(
  "pointerdown",
  () => {
    void audio.unlock();
  },
  { once: true },
);

renderAll();