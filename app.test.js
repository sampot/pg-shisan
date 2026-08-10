import { describe, it, expect, beforeAll, afterEach } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { JSDOM } from "jsdom";

let dom;
let win;

function buildDom() {
  const html = readFileSync(join(process.cwd(), "index.html"), "utf8");
  dom = new JSDOM(html, {
    url: "http://localhost/",
    pretendToBeVisual: true,
  });
  win = dom.window;
  win.HTMLElement.prototype.scrollIntoView = function () {};
  if (!win.AudioContext) {
    win.AudioContext = class {
      state = "running";
      currentTime = 0;
      destination = {};
      createOscillator() {
        return {
          type: "",
          frequency: { setValueAtTime() {} },
          connect() {},
          start() {},
          stop() {},
        };
      }
      createGain() {
        return {
          gain: { setValueAtTime() {}, exponentialRampToValueAtTime() {} },
          connect() {},
        };
      }
      resume() {
        return Promise.resolve();
      }
    };
  }
  return win;
}

function installGlobal() {
  win = buildDom();
  globalThis.window = win;
  globalThis.document = win.document;
  globalThis.navigator = win.navigator;
  globalThis.HTMLElement = win.HTMLElement;
  globalThis.Node = win.Node;
  globalThis.Event = win.Event;
  globalThis.CustomEvent = win.CustomEvent;
  globalThis.MouseEvent = win.MouseEvent;
  globalThis.getComputedStyle = win.getComputedStyle.bind(win);
}

beforeAll(installGlobal);

afterEach(() => {
  // Reset the global DOM to a fresh page between tests.
  installGlobal();
});

describe("UI wiring", () => {
  it("renders the shell and deal button works", async () => {
    await import("./app.js?ui-test-1");
    document.getElementById("btn-deal").dispatchEvent(new window.Event("click"));
    await new Promise((r) => setTimeout(r, 0));
    const hand = document.getElementById("hand");
    expect(hand.children.length).toBe(13);
    expect(document.getElementById("btn-arrange").disabled).toBe(true);
  });

  it("arranges cards and finishes a showdown", async () => {
    await import("./app.js?ui-test-2");
    document.getElementById("btn-deal").dispatchEvent(new window.Event("click"));
    await new Promise((r) => setTimeout(r, 0));

    // Use auto-arrange to fill all rows
    document.getElementById("btn-auto").dispatchEvent(new window.Event("click"));
    await new Promise((r) => setTimeout(r, 0));

    const front = document.getElementById("row-front");
    const middle = document.getElementById("row-middle");
    const back = document.getElementById("row-back");
    expect(front.children.length).toBe(3);
    expect(middle.children.length).toBe(5);
    expect(back.children.length).toBe(5);

    const btnArrange = document.getElementById("btn-arrange");
    expect(btnArrange.disabled).toBe(false);
    btnArrange.dispatchEvent(new window.Event("click"));
    await new Promise((r) => setTimeout(r, 0));

    expect(document.getElementById("turn-label").textContent).toBe("終局");
  });
});