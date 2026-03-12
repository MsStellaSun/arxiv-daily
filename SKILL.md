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
- 保存为本地 MD 文件（原文 + 总结 + 导读速览）

## 安装

```bash
# 克隆仓库
git clone https://github.com/MsStellaSun/arxiv-daily.git
cd arxiv-daily

# 安装依赖（Node.js 已内置，无需额外安装）
```

## 配置

编辑 `config.js`：

```javascript
module.exports = {
  // 抓取论文数量
  paperCount: 3,
  
  // arXiv 查询条件
  searchQuery: 'cat:cs.AI OR cat:cs.CL OR cat:cs.LG OR cat:cs.NE',
  
  // 大模型 API 配置
  llm: {
    provider: 'openai',
    apiKey: 'YOUR_OPENAI_API_KEY',  // <-- 在这里填入你的 API Key
    model: 'gpt-4o-mini',
    baseUrl: 'https://api.openai.com/v1',
    maxTokens: 4000
  },
  
  // 输出配置
  output: {
    dir: './output',
    saveOriginal: true,
    saveSummary: true,
    saveOverview: true
  }
};
```

### 获取 API Key

1. 访问 https://platform.openai.com/api-keys
2. 创建新的 API Key
3. 填入配置文件

## 使用方法

### 手动运行

```bash
cd arxiv-daily
node main.js
```

### 定时任务（Linux cron）

```bash
# 每天 20:00 运行
0 20 * * * cd /path/to/arxiv-daily && node main.js >> /var/log/arxiv-daily.log 2>&1
```

## 输出

运行后会在 `output/YYYY-MM-DD/` 目录下生成以下文件：

| 文件 | 说明 |
|------|------|
| `{arXiv_ID}_原文.md` | 论文英文原文 |
| `{arXiv_ID}_总结.md` | 大模型生成的中文笔记 |
| `导读速览_YYYY-MM-DD.md` | 今日论文汇总 |

## 提示词自定义

编辑 `prompts.js` 修改生成风格：

- `paperSummaryPrompt`: 单篇论文总结风格
- `dailySummaryPrompt`: 今日导读风格

## 依赖

- Node.js (v14+)
- curl
- OpenAI API Key

## 项目结构

```
arxiv-daily/
├── SKILL.md         # Skill 说明
├── _meta.json       # 元数据
├── config.js        # 配置文件
├── prompts.js       # 提示词
├── main.js          # 主脚本
├── logs/            # 日志目录
└── output/          # 输出目录（自动生成）
```
