<!-- Generated from src/template templates by npm run build. Edit the templates instead. -->
# 📌 YouTube Comment Blocker — v1.5.4

[English (US)](README.md) | [한국어](README.ko.md) | [日本語](README.ja-jp.md) | [Deutsch](README.de-de.md) | [简体中文](README.zh-cn.md) | [繁體中文](README.zh-tw.md) | [Français](README.fr-fr.md) | [Português (Brasil)](README.pt-br.md) | [Русский](README.ru-ru.md) | [Bahasa Indonesia](README.id-id.md)

在YouTube觀看頁面和Shorts中依頻道身分隱藏留言的Tampermonkey使用者腳本。支援帳號代碼、UCID和正規表示式規則，以及可設定的自動化和本機儲存。

## 安裝與使用

1. 安裝[Tampermonkey](https://www.tampermonkey.net/)。
2. 開啟下方原始腳本連結，或將`ytblockhandlecomments.js`貼到新的使用者腳本中。
3. 在YouTube影片或Shorts頁面右鍵點擊留言作者的帳號代碼，或使用留言`⋯`選單封鎖/解除封鎖頻道。
4. 透過腳本的Tampermonkey選單開啟封鎖清單、設定或介面語言。

<https://raw.githubusercontent.com/Mango-Clark/ytblockhandlecomments/refs/heads/master/ytblockhandlecomments.js>

## 功能

- **封鎖：** 預設帳號代碼規則、可選UCID配對規則、獨立正規表示式規則及帳號代碼大小寫比對。僅擴充留言作者相關操作。
- **留言與自動化：** 隱藏、灰色替代或點擊展開；可選自動不喜歡、正規表示式自動新增，以及文字、帳號代碼或置頂標籤的關鍵字檢查及指定操作。重用留言節點也會重新處理。
- **封鎖清單：** 搜尋、類型/標籤篩選、選取、批次操作，以及JSON/文字匯入匯出和下載。正規表示式符合計數、選取、展開和分頁無須重建整份清單。
- **設定：** 八個統一的直向選項區段：比對、留言、自動化、配對、API金鑰、顯示/主題、記錄/診斷、重設。窄螢幕時側邊導覽改為上方選單。自動儲存並標示預設值。
- **外觀：** 五段文字/介面大小，淺色、深色、系統、反轉系統、YouTube、反轉YouTube或自訂主題。使用YouTube原生深色狀態同步，僅改變腳本介面色彩。
- **效能：** 快取比對並限制留言宿主查找。每頁100項。低效能模式使用50項、小批次、延遲搜尋及逐一手動配對；略過的自動查詢不會補做。
- **記錄：** 獨立本機/主控台輸出，可設定等級、保留筆數、前綴、時區和ISO/自訂時間格式，支援測試輸出、下載、確認清除及V0–V5詳情。敏感值會隱藏，不記錄逐則留言比對。
- **狀態：** 頁面和語言切換時保留草稿、清單搜尋、篩選、選取、分頁和捲動位置。SPA導覽重設暫時觀察器，對話框管理鍵盤焦點。

## UCID配對

1. 封鎖帳號代碼立即生效。預設啟用即時配對並非同步執行；失敗保留現有封鎖和連結。
2. 建立解析**handle → UCID**並儲存配對及`id`規則。更新解析**UCID → 最新handle**，保留UCID並替換舊帳號代碼。缺少UCID時使用建立流程。
3. 分別設定建立、更新和即時配對的查詢方式：僅頻道頁面、僅官方API或頁面優先失敗後API。頁面查詢無須金鑰，API請求需要已儲存金鑰。
4. UCID比對需開啟UCID偵測並選擇配對規則。在所需UCID規則建立前使用帳號代碼模式。關鍵字配對使用建立策略；低效能模式暫停自動查詢，但允許手動操作。
5. 選擇更新間隔或自訂秒數（至少1秒）。預設頁面查詢10分鐘，API查詢1週。完整更新遵循間隔；更新所選帳號代碼會強制查詢。
6. 在封鎖清單執行配對操作，查看狀態、逐帳號結果、篩選排序、失敗帳號複製匯出、進度和觀看頁提示。API金鑰測試提供重複配額錯誤指引。
7. 頁面查詢讀取頻道本身中繼資料；API更新要求UCID一致且自訂URL為`@handle`格式。資料缺少、衝突、取消和查詢失敗均保留現有連結。

## 語言

介面和README支援`en-us`, `ko-kr`, `ja-jp`, `de-de`, `zh-cn`, `zh-tw`, `fr-fr`, `pt-br`, `ru-ru`, `id-id`。在設定 → 顯示/主題或Tampermonkey語言選單選擇。已儲存選擇優先；自動模式檢查瀏覽器語言，不支援則使用`en-us`。

地區變體對應到同一支援語言（`en-GB` → `en-us`, `pt-PT` → `pt-br`）。中文依文字/地區區分：Hans/CN/SG → `zh-cn`，Hant/TW/HK/MO → `zh-tw`，單獨`zh`使用簡體。舊`en`/`ko`選擇仍有效。Wiki和更新記錄保留英韓兩版，其他指南保留原語言。

## 儲存與隱私

- `blocked_v2`：`handle`、`id`（UCID）、`regex`規則。JSON/文字匯入匯出保留原格式及`/pattern/flags`正規表示式字面值。
- `pair_meta_v1`儲存UCID連結與驗證資訊，`app_settings_v1`儲存設定，`youtube_data_api_v3_config`儲存API金鑰及測試/配額資訊，`lang`儲存語言選擇。
- 配對資訊和API金鑰不包含在封鎖清單匯入匯出中。金鑰儲存在本機，僅在官方API請求時傳送。下載記錄使用UTC ISO時間戳記，儲存位置由瀏覽器控制。
- 跨分頁同步透過修訂和刪除標記合併新增，防止已刪除規則/記錄恢復。讀取失敗會阻止不安全寫入；拒絕寫入會保留舊資料。
- 僅當不存在有效目前資料時移轉舊清單。UID欄位轉換為UCID，保留儲存鍵、修訂、刪除標記和時間。更新後請重新載入執行舊腳本的分頁。
- 詳細資料結構、主控台時間標記和實作行為見下方Wiki。

## 預設值

- 帳號代碼比對、完全隱藏、自動不喜歡關閉、即時配對開啟。新安裝的三種查詢策略均為頻道頁面。
- 文字/介面為等級3，等級2對應舊大小。診斷為V3；V0/V1省略資料，V2保留1欄位，V3為3，V4為6，V5為10。
- 低效能模式和記錄關閉。關鍵字不區分大小寫，預設檢查留言文字，啟用前不執行操作。
- 更新保留現有設定和自訂間隔。查詢和介面語言切換不會重設規則或草稿。

## 限制與說明

- 頁面查詢未公開說明，YouTube HTML變更後可能失敗。官方API消耗配額，規則建立後UCID比對在本機進行。金鑰測試使用固定公開頻道。
- 舊帳號代碼可能以小寫儲存，重新儲存或新增後才保證精確大小寫比對。正規表示式針對帳號代碼，關鍵字僅檢查所選欄位。
- 正規表示式驗證長度、旗標和保守結構複雜度，比對對象限128字元。留言處理僅在支援的影片/Shorts區域，配對提示僅在觀看頁面顯示。
- YouTube/API回應原文、使用者儲存內容、頻道識別碼、通訊協定欄位和機器記錄不翻譯。排除嵌入播放器，僅使用列明的Tampermonkey權限。

## 文件

- Wiki: [English](docs/WIKI.md) / [한국어](docs/WIKI.ko.md)
- Changelog: [English](docs/CHANGELOG.md) / [한국어](docs/CHANGELOG.ko.md)
- 貢獻指南: [English](CONTRIBUTING.md) / [한국어](CONTRIBUTING.ko.md)
- [TODO](docs/TODO.md) / [審查助手](docs/ABOUT.md)

## 開發與驗證

- 在`dev`編輯`src/`的TypeScript模組。編號是閱讀順序，ES匯入決定執行順序。共用儲存位於`03a-gm-backed-store.ts`，管理器模組為`12a`–`12e`。
- 編輯`src/template/`範本而非產生的README/docs。`npm run build`以交易方式重新產生所有翻譯README和壓縮`ytblockhandlecomments.js`；Tampermonkey只載入根腳本。
- 保持十種UI和README翻譯一致。`en.ts`定義訊息契約，`locales.ts`管理語言名稱、路徑和貢獻者，`i18n-mason.toml`記錄範圍。保留預留位置和機器文字。
- `npm run verify`執行lint、Markdown lint、型別檢查、確定性`node:test`、建置和產生物檢查。各命令可單獨執行；回報明確略過的檢查。
- 使用Conventional Commits同時提交來源與產生物，並進行獨立審查。未經明確授權不修改版本或推送。發布使用`npm run bump:version -- <MAJOR.MINOR.PATCH>`。

```sh
npm run lint
npm run lint:markdown
npm run typecheck
npm run build
npm run check:build
npm run verify
```

未來可選瀏覽器檢查與無額外依賴驗證分離；自動測試不需要真實YouTube工作階段。

## 翻譯貢獻者

- 한국어 - Mango-Clark
- 日本語 - GPT-6.1 Sol
- Deutsch - GPT-6.1 Sol
- 简体中文 - GPT-6.1 Sol
- 繁體中文 - GPT-6.1 Sol
- Français - GPT-6.1 Sol
- Português (Brasil) - GPT-6.1 Sol
- Русский - GPT-6.1 Sol
- Bahasa Indonesia - GPT-6.1 Sol

## 作者

- **Mango_Clark**
- 授權: MIT
