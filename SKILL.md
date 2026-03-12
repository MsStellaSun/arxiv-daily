---
name: arXiv Daily
description: 每日自动抓取 arXiv AI 论文，调用大模型生成中文笔记总结，保存为本地 MD 文件。
read_when:
  - 抓取 arXiv 论文
  - 追踪 AI 前沿动态
  - 生成论文笔记
metadata: {"clawdbot":{"emoji":"📚","requires":{"bins":["node","curl"]}}}
allowed-tools: Bash(curl:*)
---

# arXiv Daily - 每日 AI 论文追踪

## 功能

- 每日自动抓取 arXiv AI 相关论文
- 清洗 HTML 全文内容
- 调用大模型（OpenAI）生成科技媒体风格的中文笔记
- 保存为本地 MD 文件

## 安装

```bash
git clone https://github.com/MsStellaSun/arxiv-daily.git
cd arxiv-daily
```

## 配置

编辑 `config.js`：

```javascript
llm: {
  provider: 'openai',
  apiKey: 'YOUR_OPENAI_API_KEY',  // 填入你的 API Key
  model: 'gpt-4o-mini'
}
```

## 使用

```bash
node main.js
```

输出目录：`output/YYYY-MM-DD/`

---

## OpenClaw 集成（仅限 OpenClaw 用户）

如果你使用 OpenClaw，可以配置定时任务自动：
1. 运行脚本抓取论文
2. 调用大模型生成总结
3. **自动创建飞书文档**
4. **上传原文到飞书云空间**

配置定时任务：
```bash
# 每天 20:00 运行
openclaw cron add ...
```

具体配置请联系 OpenClaw 管理员。

## 依赖

- Node.js (v14+)
- curl
- OpenAI API Key
