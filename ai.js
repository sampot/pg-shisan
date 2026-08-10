/**
 * 十三支 arranging AI — picks a valid front(3)/middle(5)/back(5) split
 * that respects front < middle < back and favours strong rows.
 *
 * Heuristic: choose the strongest 5-card back hand, then the strongest
 * 5-card middle that is weaker than back, and put the leftover 3 in front.
 * If the leftover front is not weaker than middle, relax by trying the
 * next-best back candidate.
 */

import { classify, compareHands, sortCards } from "./game.js";

/** @param {import('./game.js').Card[]} cards */
function combos(cards, size) {
  const out = [];
  const n = cards.length;
  const idx = Array.from({ length: size }, (_, i) => i);
  const push = () => out.push(idx.map((i) => cards[i]));
  // iterative combinations
  function gen(start, depth) {
    if (depth === size) {
      push();
      return;
    }
    for (let i = start; i <= n - (size - depth); i++) {
      idx[depth] = i;
      gen(i + 1, depth + 1);
    }
  }
  gen(0, 0);
  return out;
}

/** @param {import('./game.js').Card[]} array */
function without(cards, chosen) {
  const ids = new Set(chosen.map((c) => c.id));
  return cards.filter((c) => !ids.has(c.id));
}

/**
 * Choose an arrangement for a seat's 13 cards.
 * @param {import('./game.js').Card[]} hand
 * @returns {{ front: import('./game.js').Card[], middle: import('./game.js').Card[], back: import('./game.js').Card[] }}
 */
export function chooseArrangement(hand) {
  const sorted = sortCards(hand);
  // All 5-card combos ranked by classify power.
  const fives = combos(sorted, 5)
    .map((cards) => ({ cards, cls: classify(cards) }))
    .filter((x) => x.cls)
    .sort((a, b) => compareHands(b.cls, a.cls));

  // Try strongest back first, then strongest middle weaker than back.
  for (const back of fives) {
    const rest = without(sorted, back.cards);
    const midCombos = combos(rest, 5)
      .map((cards) => ({ cards, cls: classify(cards) }))
      .filter((x) => x.cls && compareHands(x.cls, back.cls) < 0)
      .sort((a, b) => compareHands(b.cls, a.cls));
    for (const mid of midCombos) {
      const front = without(rest, mid.cards);
      const frontCls = classify(front);
      if (frontCls && compareHands(frontCls, mid.cls) < 0) {
        return { front, middle: mid.cards, back: back.cards };
      }
    }
  }

  // Fallback: build a valid arrangement any way possible breakdown.
  const back = fives[0]?.cards ?? sorted.slice(8);
  const rest = without(sorted, back);
  const mid = combos(rest, 5)
    .map((cards) => ({ cards, cls: classify(cards) }))
    .sort((a, b) => compareHands(b.cls, a.cls))[0];
  const midCards = mid?.cards ?? rest.slice(0, 5);
  const front = without(rest, midCards);
  return { front, middle: midCards, back };
}