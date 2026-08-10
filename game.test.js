import { describe, it, expect } from "vitest";
import {
  classify,
  compareHands,
  makeDeck,
  shuffle,
  sortCards,
  validateArrangement,
  scoreMatch,
  ShisanGame,
} from "./game.js";
import { chooseArrangement } from "./ai.js";

/** @param {number} rank @param {number} suit */
function card(rank, suit) {
  return { id: rank * 4 + suit, rank, suit };
}

describe("deck", () => {
  it("has 52 unique cards", () => {
    const d = makeDeck();
    expect(d.length).toBe(52);
    expect(new Set(d.map((c) => c.id)).size).toBe(52);
  });

  it("shuffle preserves all cards", () => {
    const d = makeDeck();
    const s = shuffle(d);
    expect(s.length).toBe(52);
    expect([...s].map((c) => c.id).sort((a, b) => a - b)).toEqual(
      [...d].map((c) => c.id).sort((a, b) => a - b),
    );
  });
});

describe("classify 3-card hands", () => {
  it("recognizes triple", () => {
    const c = classify([card(5, 0), card(5, 1), card(5, 2)]);
    expect(c.type).toBe("triple");
  });

  it("recognizes pair", () => {
    const c = classify([card(4, 0), card(4, 1), card(9, 2)]);
    expect(c.type).toBe("pair");
  });

  it("recognizes highcard", () => {
    const c = classify([card(0, 0), card(3, 1), card(7, 2)]);
    expect(c.type).toBe("highcard");
  });
});

describe("classify 5-card hands", () => {
  it("recognizes straight flush", () => {
    const c = classify([card(8, 0), card(9, 0), card(10, 0), card(11, 0), card(12, 0)]);
    expect(c.type).toBe("straightflush");
  });

  it("recognizes four of a kind", () => {
    const c = classify([card(6, 0), card(6, 1), card(6, 2), card(6, 3), card(9, 0)]);
    expect(c.type).toBe("four");
  });

  it("recognizes full house", () => {
    const c = classify([card(3, 0), card(3, 1), card(3, 2), card(8, 0), card(8, 1)]);
    expect(c.type).toBe("fullhouse");
  });

  it("recognizes flush", () => {
    const c = classify([card(0, 0), card(2, 0), card(5, 0), card(9, 0), card(11, 0)]);
    expect(c.type).toBe("flush");
  });

  it("recognizes straight", () => {
    const c = classify([card(0, 0), card(1, 1), card(2, 2), card(3, 0), card(4, 1)]);
    expect(c.type).toBe("straight");
  });

  it("recognizes two pair", () => {
    const c = classify([card(2, 0), card(2, 1), card(8, 0), card(8, 1), card(11, 0)]);
    expect(c.type).toBe("twopair");
  });

  it("recognizes pair", () => {
    const c = classify([card(2, 0), card(2, 1), card(5, 0), card(9, 1), card(11, 2)]);
    expect(c.type).toBe("pair");
  });

  it("recognizes highcard", () => {
    const c = classify([card(0, 0), card(2, 1), card(5, 2), card(9, 0), card(11, 3)]);
    expect(c.type).toBe("highcard");
  });

  it("treats A-2-3-4-5 as a low straight", () => {
    const c = classify([card(0, 0), card(1, 1), card(2, 2), card(3, 0), card(12, 0)]);
    expect(c.type).toBe("straight");
  });
});

describe("compareHands", () => {
  it("four beats full house", () => {
    const four = classify([card(6, 0), card(6, 1), card(6, 2), card(6, 3), card(9, 0)]);
    const fh = classify([card(3, 0), card(3, 1), card(3, 2), card(8, 0), card(8, 1)]);
    expect(compareHands(four, fh)).toBeGreaterThan(0);
  });

  it("same type resolves by rank", () => {
    const a = classify([card(8, 0), card(9, 0), card(10, 0), card(11, 0), card(12, 0)]); // T-J-Q-K-A
    const b = classify([card(5, 0), card(6, 0), card(7, 0), card(8, 0), card(9, 0)]); // 6-7-8-9-T
    expect(compareHands(a, b)).toBeGreaterThan(0);
  });

  it("straight flush beats four", () => {
    const sf = classify([card(8, 0), card(9, 0), card(10, 0), card(11, 0), card(12, 0)]);
    const four = classify([card(6, 0), card(6, 1), card(6, 2), card(6, 3), card(9, 0)]);
    expect(compareHands(sf, four)).toBeGreaterThan(0);
  });
});

describe("validateArrangement", () => {
  it("accepts a valid front<middle<back", () => {
    const dealt = [
      // front: 2,3,4 (weakest)
      card(0, 0), card(1, 0), card(2, 0),
      // middle: pair 5s + 3 kickers
      card(4, 0), card(4, 1), card(6, 0), card(7, 0), card(8, 0),
      // back: straight 9-K
      card(8, 1), card(8, 2), card(8, 3), card(9, 0), card(10, 0),
    ];
    const arr = {
      front: dealt.slice(0, 3),
      middle: dealt.slice(3, 8),
      back: dealt.slice(8, 13),
    };
    const r = validateArrangement(dealt, arr);
    expect(r.ok).toBe(true);
  });

  it("rejects inverted ordering", () => {
    const dealt = [
      card(0, 0), card(1, 0), card(2, 0),
      card(4, 0), card(4, 1), card(6, 0), card(7, 0), card(8, 0),
      card(8, 1), card(8, 2), card(8, 3), card(9, 0), card(10, 0),
    ];
    // Put strong cards in front -> invalid
    const arr = {
      front: dealt.slice(8, 11),
      middle: dealt.slice(3, 8),
      back: dealt.slice(0, 5),
    };
    const r = validateArrangement(dealt, arr);
    expect(r.ok).toBe(false);
  });
});

describe("scoreMatch", () => {
  it("a full sweep wins 3 rows", () => {
    // a: front = triple 5 (strongest front), middle = 9-K straight, back = A-high straight flush
    const aFront = classify([card(4, 0), card(4, 1), card(4, 2)]);
    const aMid = classify([card(8, 0), card(9, 0), card(10, 0), card(11, 0), card(12, 1)]);
    const aBack = classify([card(8, 1), card(9, 1), card(10, 1), card(11, 1), card(12, 1)]);
    // b: front = 2,3,4 high card, middle = pair 2s, back = 5-high straight
    const bFront = classify([card(0, 1), card(1, 1), card(3, 0)]);
    const bMid = classify([card(0, 2), card(0, 3), card(5, 0), card(7, 1), card(9, 2)]);
    const bBack = classify([card(0, 0), card(1, 2), card(2, 2), card(3, 1), card(4, 0)]);
    const net = scoreMatch(
      { front: [], middle: [], back: [] },
      { front: [], middle: [], back: [] },
      { front: aFront, middle: aMid, back: aBack },
      { front: bFront, middle: bMid, back: bBack },
    );
    // a should win all 3 rows
    expect(net).toBe(3);
  });
});

describe("ShisanGame flow", () => {
  it("deals 13 to each and enters arranging", () => {
    const g = new ShisanGame();
    g.deal();
    expect(g.hands.every((h) => h.length === 13)).toBe(true);
    expect(g.status).toBe("arranging");
  });

  it("accomplishes a full showdown", () => {
    const g = new ShisanGame();
    g.deal();
    for (let seat = 0; seat < 4; seat++) {
      const arr = chooseArrangement(g.hands[seat]);
      const r = g.setAiArrangement(seat, arr);
      expect(r.ok).toBe(true);
    }
    expect(g.allArranged()).toBe(true);
    const scores = g.showdown();
    expect(scores.length).toBe(4);
    expect(scores.reduce((a, b) => a + b, 0)).toBe(0); // zero-sum
  });
});

describe("chooseArrangement", () => {
  it("returns a valid arrangement", () => {
    const d = shuffle(makeDeck()).slice(0, 13);
    const arr = chooseArrangement(d);
    const r = validateArrangement(d, arr);
    expect(r.ok).toBe(true);
    expect(arr.front.length).toBe(3);
    expect(arr.middle.length).toBe(5);
    expect(arr.back.length).toBe(5);
  });

  it("produces valid arrangements for many random hands", () => {
    for (let i = 0; i < 200; i++) {
      const d = shuffle(makeDeck()).slice(0, 13);
      const arr = chooseArrangement(d);
      const r = validateArrangement(d, arr);
      expect(r.ok).toBe(true);
    }
  });

  it("sorts cards deterministically", () => {
    const cards = [card(9, 2), card(0, 3), card(5, 0)];
    const sorted = sortCards(cards).map((c) => c.id);
    expect(sorted).toEqual([card(0, 3).id, card(5, 0).id, card(9, 2).id]);
  });
});