---
name: arXiv Daily
description: 每日自动抓取 arXiv AI 论文，生成中文笔记总结，创建飞书文档。
read_when:
  - 抓取 arXiv 论文
  - 追踪 AI 前沿动态
  - 生成论文笔记
metadata: {"clawdbot":{"emoji":"📚","requires":{"bins":["node","curl"]}}}
allowed-tools: Bash(curl:*),Feishu(feishu_create_doc:*,feishu_drive_file:upload:*)
---

# arXiv Daily - 每日 AI 论文追踪

## 功能

- 每日自动抓取 arXiv AI 相关论文
- 清洗 HTML 全文内容
- 生成科技媒体风格的中文笔记
- 创建飞书文档（内容总结 + 导读速览）
- 上传英文原文到飞书云空间

## 安装

```bash
# 克隆或下载脚本到本地
git clone <repo-url> arxiv-daily
cd arxiv-daily
```

## 配置

编辑 `config.js`：

```javascript
module.exports = {
  // 抓取论文数量
  paperCount: 3,
  
  // arXiv 查询条件
  searchQuery: 'cat:cs.AI OR cat:cs.CL OR cat:cs.LG OR cat:cs.NE',
  
  // 排序：按提交日期倒序
  sortBy: 'submittedDate',
  sortOrder: 'descending'
};
```

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

运行后会创建以下飞书文档：

| 类型 | 说明 |
|------|------|
| 内容总结 | 每篇论文的中文笔记（科技媒体风） |
| 导读速览 | 今日论文汇总 |
| 英文原文 | 每篇论文的原文（txt 上传到云空间） |

## 提示词自定义

编辑 `prompts.js` 修改生成风格：

- `paperSummaryPrompt`: 单篇论文总结风格
- `dailySummaryPrompt`: 今日导读风格

## 依赖

- Node.js
- curl
- 飞书账号授权
