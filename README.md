# 🌤️ 天气应用

> 100 项目挑战 · Day 8 · 方案由 Andy 自己撰写

搜城市 → 当前温度天气 + 未来 6 天预报 + 穿衣建议 + 天气图标，背景随天气变化。数据来自 Open-Meteo（免费公开 API，无需 key）。

## 文件结构

```
weather/
├── index.html   页面结构
├── style.css    样式（6 套天气背景）
└── script.js    逻辑（两次 API 串联 + WMO 代码翻译表）
```

## 技术点

- **fetch + async/await**：向外部服务器要数据并等待返回（接大模型 API 的直通预习）
- **两次 API 串联**：城市搜索（geocoding）拿经纬度 → 天气查询用经纬度
- **请求失败兜底**：try/catch + 人话提示，页面不白屏
- **WMO 天气代码映射表**：API 返回数字，`WEATHER_CODES` 翻译成中文/图标/背景

## 本地预览

双击 `index.html`；F12 → Network 面板能看到每次请求飞出去和回来的 JSON。

## 在线地址

https://liuandi-dev.github.io/weather/
