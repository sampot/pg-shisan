/**
 * 十三支 (Chinese 13 Cards) rules engine.
 * Four players arrange 13 cards into front(3) / middle(5) / back(5).
 * Constraint: front < middle < back. Compare row-by-row; win = +1 point.
 *
 * Suit: ♦ < ♣ < ♥ < ♠. Rank: 2 < 3 < … < 10 < J < Q < K < A.
 * (In Chinese poker the 2 is the LOWEST rank, unlike Big Two.)
 */

export const SUITS = ["♦", "♣", "♥", "♠"];
export const SUIT_NAMES = ["方塊", "梅花", "紅心", "黑桃"];
export const RANKS = ["2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K", "A"];

/** Hand category rank (low → high). */
export const HAND_RANK = {
  highcard: 0,
  pair: 1,
  twopair: 2,
  triple: 3,
  straight: 4,
  flush: 5,
  fullhouse: 6,
  four: 7,
  straightflush: 8,
};

/** Category labels (rows). */
export const CATEGORY_LABEL = {
  highcard: "散牌",
  pair: "對子",
  twopair: "兩對",
  triple: "三條",
  straight: "順子",
  flush: "同花",
  fullhouse: "葫蘆",
  four: "鐵支",
  straightflush: "同花順",
};

/**
 * @typedef {{ id: number, rank: number, suit: number }} Card
 */

/** @param {Card} c */
export function cardPower(c) {
  return c.rank * 4 + c.suit;
}

/** @param {Card} c */
export function cardLabel(c) {
  return `${SUITS[c.suit]}${RANKS[c.rank]}`;
}

/** @param {Card} c */
export function isRed(c) {
  return c.suit === 0 || c.suit === 2;
}

/** @returns {Card[]} */
export function makeDeck() {
  /** @type {Card[]} */
  const d = [];
  for (let rank = 0; rank < 13; rank++) {
    for (let suit = 0; suit < 4; suit++) {
      d.push({ id: rank * 4 + suit, rank, suit });
    }
  }
  return d;
}

/** @param {Card[]} deck */
export function shuffle(deck) {
  const a = deck.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** @param {Card[]} cards */
export function sortCards(cards) {
  // Sort by rank then suit, ASC.
  return cards.slice().sort((a, b) => cardPower(a) - cardPower(b));
}

/** @param {Card[]} cards */
function rankCounts(cards) {
  /** @type {Record<number, number>} */
  const m = {};
  for (const c of cards) m[c.rank] = (m[c.rank] || 0) + 1;
  return m;
}

/** @param {number[]} ranks sorted ascending */
function isStraightRanks(ranks) {
  // Straight: A is high (rank 12). Special A-2-3-4-5 counts as 5-high straight.
  if (ranks.length !== 5) return false;
  // A-2-3-4-5
  if (ranks[0] === 0 && ranks[1] === 1 && ranks[2] === 2 && ranks[3] === 3 && ranks[4] === 12) {
    return true;
  }
  for (let i = 1; i < ranks.length; i++) {
    if (ranks[i] !== ranks[i - 1] + 1) return false;
  }
  return true;
}

/**
 * Classify a 3- or 5-card hand.
 * @param {Card[]} cards
 * @returns {{ type: string, power: number } | null}
 *
 * power packs: category rank in high bits, then tiebreak keys (rank, suit).
 */
export function classify(cards) {
  const n = cards.length;
  if (n !== 3 && n !== 5) return null;
  const sorted = sortCards(cards);

  if (n === 3) {
    const counts = rankCounts(sorted);
    const parts = Object.entries(counts)
      .map(([r, k]) => ({ rank: Number(r), n: k }))
      .sort((a, b) => b.n - a.n || a.rank - b.rank);
    if (parts.length === 1) {
      // triple
      return { type: "triple", power: HAND_RANK.triple * 1e6 + parts[0].rank * 4 + Math.max(...sorted.map((c) => c.suit)) };
    }
    if (parts.length === 2) {
      // pair + kicker
      return { type: "pair", power: HAND_RANK.pair * 1e6 + parts[0].rank * 4 + Math.max(...sorted.filter((c) => c.rank === parts[0].rank).map((c) => c.suit)) };
    }
    // high card (3 distinct)
    return { type: "highcard", power: HAND_RANK.highcard * 1e6 + sorted.map((c) => cardPower(c)).reduce((acc, p) => acc * 4 + p, 0) };
  }

  // n === 5
  const ranks = sorted.map((c) => c.rank);
  const suits = sorted.map((c) => c.suit);
  const flush = suits.every((s) => s === suits[0]);
  const straight = isStraightRanks(ranks);
  const counts = rankCounts(sorted);
  const parts = Object.entries(counts)
    .map(([r, k]) => ({ rank: Number(r), n: k }))
    .sort((a, b) => b.n - a.n || a.rank - b.rank);

  if (straight && flush) {
    const top = straightLowAce(ranks) ? 3 : sorted[4].rank;
    return { type: "straightflush", power: HAND_RANK.straightflush * 1e6 + top * 4 + Math.max(...sorted.map((c) => c.suit)) };
  }
  if (parts[0]?.n === 4) {
    return { type: "four", power: HAND_RANK.four * 1e6 + parts[0].rank * 4 };
  }
  if (parts[0]?.n === 3 && parts[1]?.n === 2) {
    return { type: "fullhouse", power: HAND_RANK.fullhouse * 1e6 + parts[0].rank * 4 };
  }
  if (flush) {
    const top = sorted[sorted.length - 1];
    return { type: "flush", power: HAND_RANK.flush * 1e6 + sorted.map((c) => cardPower(c)).reduce((acc, p) => acc * 4 + p, 0) };
  }
  if (straight) {
    const top = straightLowAce(ranks) ? 3 : sorted[4].rank;
    return { type: "straight", power: HAND_RANK.straight * 1e6 + top * 4 + Math.max(...sorted.map((c) => c.suit)) };
  }
  if (parts[0]?.n === 3) {
    return { type: "triple", power: HAND_RANK.triple * 1e6 + parts[0].rank * 4 };
  }
  if (parts[0]?.n === 2 && parts[1]?.n === 2) {
    return { type: "twopair", power: HAND_RANK.twopair * 1e6 + parts[1].rank * 4 + parts[0].rank };
  }
  if (parts[0]?.n === 2) {
    return { type: "pair", power: HAND_RANK.pair * 1e6 + parts[0].rank * 4 + cardPower(sorted[4]) };
  }
  return { type: "highcard", power: HAND_RANK.highcard * 1e6 + sorted.map((c) => cardPower(c)).reduce((acc, p) => acc * 4 + p, 0) };
}

/** @param {number[]} ranks */
function straightLowAce(ranks) {
  return ranks[0] === 0 && ranks[1] === 1 && ranks[2] === 2 && ranks[3] === 3 && ranks[4] === 12;
}

/**
 * Compare two classified hands. Returns >0 if a beats b, <0 if b beats a, 0 if tie.
 * @param {{ type: string, power: number }} a
 * @param {{ type: string, power: number }} b
 */
export function compareHands(a, b) {
  if (a.type !== b.type) return HAND_RANK[a.type] - HAND_RANK[b.type];
  return a.power - b.power;
}

/**
 * A full arrangement: { front: Card[], middle: Card[], back: Card[] }.
 * @typedef {{ front: Card[], middle: Card[], back: Card[] }} Arrangement
 */

/**
 * Validate an arrangement: 3+5+5, all distinct, and front < middle < back.
 * @param {Card[]} dealt
 * @param {Arrangement} arr
 */
export function validateArrangement(dealt, arr) {
  const all = [...arr.front, ...arr.middle, ...arr.back];
  if (arr.front.length !== 3 || arr.middle.length !== 5 || arr.back.length !== 5) {
    return { ok: false, reason: "手牌排列須為 3 張 + 5 張 + 5 張" };
  }
  const dealtIds = new Set(dealt.map((c) => c.id));
  const ids = new Set(all.map((c) => c.id));
  if (ids.size !== all.length) return { ok: false, reason: "手牌不可重複" };
  if (![...all].every((c) => dealtIds.has(c.id))) return { ok: false, reason: "使用非手牌" };

  const f = classify(arr.front);
  const m = classify(arr.middle);
  const b = classify(arr.back);
  if (!f || !m || !b) return { ok: false, reason: "手牌分類錯誤" };
  if (compareHands(f, m) >= 0 || compareHands(m, b) >= 0) {
    return { ok: false, reason: "須前 < 中 < 後（前墩最弱）" };
  }
  return { ok: true, front: f, middle: m, back: b };
}

/**
 * Score a showdown between this player's arrangement and an opponent's.
 * Rows win +1 each; special-arrangement bonuses add extra.
 * Returns the net points for `mine` (positive = win).
 * @param {Arrangement} mine
 * @param {Arrangement} theirs
 * @param {{front:any,middle:any,back:any}} mineClass
 * @param {{front:any,middle:any,back:any}} theirClass
 */
export function scoreMatch(mine, theirs, mineClass, theirClass) {
  let points = 0;
  const rows = ["front", "middle", "back"];
  for (const row of rows) {
    const c = compareHands(mineClass[row], theirClass[row]);
    if (c > 0) points += 1;
    else if (c < 0) points -= 1;
  }
  // Ordering bonus: if the whole arrangement is valid (front<middle<back) it's a "順墩".
  // In many variants a player who wins all 3 rows gets a bonus, but we keep it simple:
  // A "全壘打" (win all three rows against a specific opponent) is worth +3 already counted.
  return points;
}

/** Bonus points for a special arrangement (倒蹬 / specific row patterns). */
export function arrangementBonus(rowType) {
  // No extra bonus in the base variant; reserved for future.
  return 0;
}

export class ShisanGame {
  constructor() {
    /** @type {Card[][]} */
    this.hands = [[], [], [], []];
    /** @type {string[]} */
    this.names = ["你", "小梅", "阿心", "黑哥"];
    this.human = 0;
    /** @type {Arrangement[]} */
    this.arrangements = [null, null, null, null];
    /** @type {{front:any,middle:any,back:any}[]} */
    this.classified = [null, null, null, null];
    /** @type {('idle'|'dealing'|'arranging'|'comparing'|'over')} */
    this.status = "idle";
    /** @type {number[]} scores */
    this.scores = [0, 0, 0, 0];
    this.winner = null;
    this.message = "點「開局」發牌";
  }

  deal() {
    const deck = shuffle(makeDeck());
    this.hands = [[], [], [], []];
    for (let i = 0; i < 52; i++) this.hands[i % 4].push(deck[i]);
    this.hands = this.hands.map(sortCards);
    this.arrangements = [null, null, null, null];
    this.classified = [null, null, null, null];
    this.status = "arranging";
    this.message = "將 13 手牌排成 前 3 / 中 5 / 後 5 三墩";
  }

  reset() {
    this.hands = [[], [], [], []];
    this.arrangements = [null, null, null, null];
    this.classified = [null, null, null, null];
    this.status = "idle";
    this.winner = null;
    this.message = "點「開局」發牌";
  }

  /**
   * Set the human's arrangement.
   * @param {Arrangement} arr
   */
  setHumanArrangement(arr) {
    const r = validateArrangement(this.hands[this.human], arr);
    if (!r.ok) return r;
    this.arrangements[this.human] = arr;
    this.classified[this.human] = { front: r.front, middle: r.middle, back: r.back };
    return r;
  }

  /** @param {number} seat @param {Arrangement} arr */
  setAiArrangement(seat, arr) {
    const r = validateArrangement(this.hands[seat], arr);
    if (!r.ok) return r;
    this.arrangements[seat] = arr;
    this.classified[seat] = { front: r.front, middle: r.middle, back: r.back };
    return r;
  }

  allArranged() {
    return this.arrangements.every((a) => a != null);
  }

  showdown() {
    let worstValid = false;
    // Compute headline: did the human set a valid ordering?
    for (let seat = 0; seat < 4; seat++) {
      const f = this.classified[seat].front;
      const m = this.classified[seat].middle;
      const b = this.classified[seat].back;
      if (compareHands(f, m) >= 0 || compareHands(m, b) >= 0) worstValid = true;
    }

    const scores = [0, 0, 0, 0];
    for (let a = 0; a < 4; a++) {
      for (let b = a + 1; b < 4; b++) {
        const net = scoreMatch(this.arrangements[a], this.arrangements[b], this.classified[a], this.classified[b]);
        scores[a] += net;
        scores[b] -= net;
      }
    }
    this.scores = scores;
    this.status = "over";
    const max = Math.max(...scores);
    this.winner = scores.indexOf(max);
    this.message = worstValid
      ? "有玩家倒了墩（未遵守前<中<後），計分仍依名次"
      : `${this.names[this.winner]} 獲勝`;
    return this.scores;
  }
}