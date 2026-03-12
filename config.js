// arxiv-daily 配置文件
// 修改后需要重启脚本生效

module.exports = {
  // 抓取论文数量
  paperCount: 3,

  // arXiv API 查询语句
  searchQuery: 'cat:cs.AI OR cat:cs.CL OR cat:cs.LG OR cat:cs.NE',
  
  // 排序方式: submittedDate, lastUpdatedDate
  sortBy: 'submittedDate',
  // 排序顺序: descending, ascending
  sortOrder: 'descending',

  // 飞书配置
  feishu: {
    // 是否启用飞书文档创建
    enabled: true,
    // 文档存储的文件夹 token（可选）
    folderToken: ''
  },

  // 大模型 API 配置
  llm: {
    // API 类型: openai, anthropic, local 等
    provider: 'openai',
    // API Key（必填）
    apiKey: 'YOUR_API_KEY_HERE',
    // 模型名称
    model: 'gpt-4o-mini',
    // API 基础地址（可选，默认 OpenAI）
    baseUrl: 'https://api.openai.com/v1',
    // 最大 token 限制
    maxTokens: 4000
  },

  // 输出配置
  output: {
    // 输出目录（本地 MD 文件）
    dir: './output',
    // 是否保存英文原文到本地
    saveLocalOriginal: true,
    // 是否保存总结到本地
    saveLocalSummary: true,
    // 是否保存导读速览
    saveLocalOverview: true
  },

  // 日志配置
  log: {
    console: true,
    file: true,
    filePath: './logs/arxiv-{date}.log'
  }
};
