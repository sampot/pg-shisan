# pg-shisan

瀏覽器**十三支**：四人比牌、手牌排列成前中後三墩、自製音效。純前端，無建置步驟；**mobile-first**，桌面加寬。

名稱與介面為原創小品，致敬「十三支／十三張」玩法類型，非任一商業作品復刻。

也可當作 [Playgrounds（遊樂場）](https://play.samkuo.me/) 的 **SAM**（`index.html` 入口）。

## 一鍵開 SAM 小

**[一鍵開 SAM 小](https://play.samkuo.me/?open=sampot%2Fpg-shisan&name=%E5%8D%81%E4%B8%89%E6%94%AF)**

```
https://play.samkuo.me/?open=sampot/pg-shisan&name=十三支
```

同源會重用本機已匯入的沙盒；要強制新建可加 `&fresh=1`。

## 試玩（本機）

```bash
npx --yes serve .
# 或
python3 -m http.server 8080
```

點一下頁面後音效才會出聲。

## 操作

| 操作 | 說明 |
| --- | --- |
| **開局** | 發牌；點下方手牌填入前／中／後三墩 |
| 點手牌 | 填入目前選定的墩（預設「後」） |
| 點墩內牌 | 移回手牌池 |
| **自動排列** | 讓 AI 幫你把 13 張排好 |
| **確認排列** | 提交排列並比牌 |
| **清空** | 清空三墩回復手牌池 |
| **音效開／關** | 靜音 |
| **重來** | 回待機 |

## 規則摘要

- 每人 13 張，排成 前墩 3 張、中墩 5 張、後墩 5 張
- 牌力：2 最小 → A 最大；花色 ♦ &lt; ♣ &lt; ♥ &lt; ♠
- 牌型：散牌 &lt; 對子 &lt; 兩對 &lt; 三條 &lt; 順子 &lt; 同花 &lt; 葫蘆 &lt; 鐵支 &lt; 同花順
- 三墩須「前 &lt; 中 &lt; 後」，否則算「倒墩」
- 逐墩與其他三人比大小，每贏一墩 +1 分

## 檔案

| 檔案 | 說明 |
| --- | --- |
| `index.html` | 結構 |
| `styles.css` | 手機優先／桌面遞增 |
| `app.js` | UI、排列、AI 節奏 |
| `game.js` | 規則、牌型、墩勝負與計分 |
| `ai.js` | 簡易人機（自動排列） |
| `audio.js` | Web Audio 合成音效 |
| `functions.js` | Playgrounds 可選 stub |

## License

MIT