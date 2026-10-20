# 苔光小徑

一款以 Phaser.js 製作的放置型療癒蘑菇花園。玩家可以挑選種子、安排花圃、等待蘑菇長大，再採收露珠並完成每日小願望。花園會在離線時繼續生長，進度保存在瀏覽器的本機儲存空間。

## 開始遊玩

需要 Node.js 20.19 或更新版本。

```sh
npm install
npm run dev
```

接著用瀏覽器開啟 Vite 顯示的本機網址。正式建置可執行 `npm run build`。

推送至 GitHub 的 `main` 分支後，GitHub Actions 會自動建置並發佈到 GitHub Pages。網站會使用 `mosslight-garden` repo 對應的子路徑。

- **遊戲網站：** https://hippo2004204-ship-it.github.io/mosslight-garden/
- **遊戲式學習網站：** https://hippo2004204-ship-it.github.io/mosslight-garden/game-based-learning/
- **GitHub 原始碼：** https://github.com/hippo2004204-ship-it/mosslight-garden

## 操作方式

- 點選底部種子卡，再點花園中的空花圃即可播種。
- 點成熟的蘑菇採收露珠；成熟蘑菇會隨時間累積額外露珠。
- 點選右側「今日小願望」的領取按鈕取得獎勵。
- 右上角的音符按鈕可切換種植與採收提示音。
- 右側「更多」可重新開始；重新開始會清除目前瀏覽器保存的進度。
