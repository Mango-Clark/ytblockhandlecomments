<!-- Generated from src/template templates by npm run build. Edit the templates instead. -->
# 📌 YouTube Comment Blocker — v1.5.4

[English (US)](../../README.md) | [한국어](../ko-kr/README.md) | [日本語](../ja-jp/README.md) | [Deutsch](../de-de/README.md) | [简体中文](README.md) | [繁體中文](../zh-tw/README.md) | [Français](../fr-fr/README.md) | [Português (Brasil)](../pt-br/README.md) | [Русский](../ru-ru/README.md) | [Bahasa Indonesia](../id-id/README.md)

在YouTube观看页面和Shorts中按频道身份隐藏评论的Tampermonkey用户脚本。支持账号名、UCID和正则规则，以及可配置自动化和本地存储。

## 安装与使用

1. 安装[Tampermonkey](https://www.tampermonkey.net/)。
2. 打开下方原始脚本链接，或将`ytblockhandlecomments.js`粘贴到新用户脚本中。
3. 在YouTube视频或Shorts页面右键点击评论作者的账号名，或使用评论`⋯`菜单屏蔽/取消屏蔽频道。
4. 通过脚本的Tampermonkey菜单打开屏蔽列表、设置或界面语言。

<https://raw.githubusercontent.com/Mango-Clark/ytblockhandlecomments/refs/heads/master/ytblockhandlecomments.js>

## 功能

- **屏蔽：** 默认账号名规则、可选UCID配对规则、独立正则规则及账号名大小写匹配。仅扩展评论作者相关操作。
- **评论与自动化：** 隐藏、灰色占位或点击展开；可选自动点踩、正则自动添加，以及评论文本、账号名或置顶标签的关键词检查及指定操作。复用评论节点也会重新处理。
- **屏蔽列表：** 搜索、类型/标签筛选、选择、批量操作，以及JSON/文本导入导出和下载。正则匹配计数、选择、展开和分页无需重建整个列表。
- **设置：** 八个统一的纵向选项分区：匹配、评论、自动化、配对、API密钥、显示/主题、日志/诊断、重置。窄屏时侧边导航改为顶部菜单。自动保存并标记默认值。
- **外观：** 五档文字/界面大小，浅色、深色、系统、反转系统、YouTube、反转YouTube或自定义主题。使用YouTube原生深色状态同步，仅改变脚本界面颜色。
- **性能：** 缓存匹配并限制评论宿主查找。每页100项。低性能模式使用50项、小批次、延迟搜索和逐个手动配对；跳过的自动查询不会补做。
- **日志：** 独立本地/控制台输出，可配置级别、保留条数、前缀、时区和ISO/自定义时间格式，支持测试输出、下载、确认清除及V0–V5详情。敏感值被隐藏，不记录逐条评论匹配。
- **状态：** 页面和语言切换时保留草稿、列表搜索、筛选、选择、分页和滚动位置。SPA导航重置临时观察器，对话框管理键盘焦点。

## UCID配对

1. 屏蔽账号名立即生效。默认启用即时配对并异步执行；失败保留现有屏蔽和连接。
2. 创建解析**handle → UCID**并保存配对及`id`规则。更新解析**UCID → 最新handle**，保留UCID并替换旧账号名。缺少UCID时走创建路径。
3. 分别设置创建、更新和即时配对的查询方式：仅频道页面、仅官方API或页面优先失败后API。页面查询无需密钥，API请求需要已保存密钥。
4. UCID匹配需开启UCID检测并选择配对规则。在所需UCID规则创建前使用账号名模式。关键词配对使用创建策略；低性能模式暂停自动查询，但允许手动操作。
5. 选择刷新间隔或自定义秒数（至少1秒）。默认页面查询10分钟，API查询1周。完整更新遵循间隔；更新所选账号名会强制查询。
6. 在屏蔽列表执行配对操作，查看状态、逐账号结果、筛选排序、失败账号复制导出、进度和观看页提示。API密钥测试提供重复配额错误指引。
7. 页面查询读取频道自身元数据；API更新要求UCID一致且自定义URL为`@handle`格式。数据缺失、冲突、取消和查询失败均保留现有连接。

## 语言

界面和README支持`en-us`, `ko-kr`, `ja-jp`, `de-de`, `zh-cn`, `zh-tw`, `fr-fr`, `pt-br`, `ru-ru`, `id-id`。在设置 → 显示/主题或Tampermonkey语言菜单选择。已保存选择优先；自动模式检查浏览器语言，未支持则使用`en-us`。

区域变体映射到同一支持语言（`en-GB` → `en-us`, `pt-PT` → `pt-br`）。中文按文字/区域区分：Hans/CN/SG → `zh-cn`，Hant/TW/HK/MO → `zh-tw`，单独`zh`使用简体。旧`en`/`ko`选择仍有效。Wiki和更新日志保留英韩两版，其他指南保留原语言。

## 存储与隐私

- `blocked_v2`：`handle`、`id`（UCID）、`regex`规则。JSON/文本导入导出保留原格式及`/pattern/flags`正则字面量。
- `pair_meta_v1`保存UCID连接与验证信息，`app_settings_v1`保存设置，`youtube_data_api_v3_config`保存API密钥及测试/配额信息，`lang`保存语言选择。
- 配对信息和API密钥不包含在屏蔽列表导入导出中。密钥本地保存，仅在官方API请求时发送。下载日志使用UTC ISO时间戳，保存位置由浏览器控制。
- 跨标签页同步通过修订和删除标记合并新增，防止已删除规则/日志恢复。读取失败阻止不安全写入；拒绝写入保留旧数据。
- 仅当不存在有效当前数据时迁移旧列表。UID字段转换为UCID，保留存储键、修订、删除标记和时间。更新后请刷新运行旧脚本的标签页。
- 详细数据结构、控制台时间标记和实现行为见下方Wiki。

## 默认值

- 账号名匹配、完全隐藏、自动点踩关闭、即时配对开启。新安装的三种查询策略均为频道页面。
- 文字/界面为级别3，级别2对应旧大小。诊断为V3；V0/V1省略数据，V2保留1字段，V3为3，V4为6，V5为10。
- 低性能模式和日志关闭。关键词不区分大小写，默认检查评论文本，启用前不执行操作。
- 更新保留现有设置和自定义间隔。查询和界面语言切换不会重置规则或草稿。

## 限制与说明

- 页面查询未经公开说明，YouTube HTML变更后可能失败。官方API消耗配额，规则创建后UCID匹配在本地进行。密钥测试使用固定公开频道。
- 旧账号名可能保存为小写，重新保存或添加后才保证精确大小写匹配。正则针对账号名，关键词仅检查所选字段。
- 正则验证长度、标志和保守结构复杂度，匹配对象限制为128字符。评论处理仅在支持的视频/Shorts区域，配对提示仅在观看页面显示。
- YouTube/API响应原文、用户保存内容、频道标识、协议字段和机器日志不翻译。排除嵌入播放器，仅使用列明的Tampermonkey权限。

## 文档

- Wiki: [English](../WIKI.md) / [한국어](../ko-kr/WIKI.md)
- Changelog: [English](../CHANGELOG.md) / [한국어](../ko-kr/CHANGELOG.md)
- 贡献指南: [English](../../CONTRIBUTING.md) / [한국어](../ko-kr/CONTRIBUTING.md)
- [TODO](../TODO.md) / [审查助手](../ABOUT.md)

## 开发与验证

- 在`dev`编辑`src/`的TypeScript模块。编号是阅读顺序，ES导入决定运行顺序。共享存储位于`03a-gm-backed-store.ts`，管理器模块为`12a`–`12e`。
- 编辑`src/template/`模板而非生成的README/docs。`npm run build`以事务方式重新生成全部翻译README和压缩`ytblockhandlecomments.js`；Tampermonkey只加载根脚本。
- 保持十种UI和README翻译一致。`en.ts`定义消息约定，`locales.ts`管理语言名、路径和贡献者，`i18n-mason.toml`记录范围。保留占位符和机器文本。
- `npm run verify`执行lint、Markdown lint、类型检查、确定性`node:test`、构建和生成物检查。各命令可单独执行；报告明确跳过的检查。
- 使用Conventional Commits同时提交源文件与生成物，并进行独立审查。未经明确授权不修改版本或推送。发布使用`npm run bump:version -- <MAJOR.MINOR.PATCH>`。

```sh
npm run lint
npm run lint:markdown
npm run typecheck
npm run build
npm run check:build
npm run verify
```

未来可选浏览器检查与无额外依赖验证分离；自动测试不需要真实YouTube会话。

## 翻译贡献者

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
- 许可证: MIT
