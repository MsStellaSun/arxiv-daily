// arxiv-daily 配置文件
// 修改后需要重启脚本生效

module.exports = {
  // 抓取论文数量（测试时用 1，上线后用 3 或更多）
  paperCount: 3,

  // arXiv API 查询语句
  // 可用分类: cs.AI, cs.CL, cs.LG, cs.CV, cs.NE, stat.ML
  searchQuery: 'cat:cs.AI OR cat:cs.CL OR cat:cs.LG OR cat:cs.NE',
  
  // 排序方式: submittedDate, lastUpdatedDate
  sortBy: 'submittedDate',
  // 排序顺序: descending, ascending
  sortOrder: 'descending',

  // 飞书文档存储配置
  feishu: {
    // 文档存储的文件夹 token（可选，不填则存到我的空间）
    folderToken: ''
  },

  // 日志配置
  log: {
    // 是否在终端打印日志
    console: true,
    // 是否写入日志文件
    file: true,
    // 日志文件路径
    filePath: './logs/arxiv-{date}.log'
  }
};
