/**
 * arxiv-daily: 每日 AI 论文抓取与总结
 * 
 * 使用方法:
 *   node main.js          # 手动运行
 * 
 * 定时任务: 每天 20:00 自动运行
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// ========== 配置 ==========
const config = require('./config');
const prompts = require('./prompts');

// 日期格式化
const getDateStr = () => new Date().toISOString().slice(0, 10);
const getTimeStr = () => new Date().toISOString();

// 日志
const log = {
  info: (...args) => {
    const msg = `[${getTimeStr()}] INFO: ${args.join(' ')}`;
    console.log(msg);
    if (config.log.file) {
      const logPath = config.log.filePath.replace('{date}', getDateStr());
      fs.appendFileSync(path.join(__dirname, logPath), msg + '\n');
    }
  },
  error: (...args) => {
    const msg = `[${getTimeStr()}] ERROR: ${args.join(' ')}`;
    console.error(msg);
    if (config.log.file) {
      const logPath = config.log.filePath.replace('{date}', getDateStr());
      fs.appendFileSync(path.join(__dirname, logPath), msg + '\n');
    }
  }
};

// ========== 工具函数 ==========

// 调用 arXiv API 获取论文列表
async function fetchPaperList() {
  const url = `https://export.arxiv.org/api/query?search_query=${encodeURIComponent(config.searchQuery)}&sortBy=${config.sortBy}&sortOrder=${config.sortOrder}&max_results=${config.paperCount}`;
  log.info(`正在请求 arXiv API...`);
  
  const xml = execSync(`curl -s "${url}"`, { encoding: 'utf-8', timeout: 30000 });
  
  // 解析 XML
  const papers = [];
  const entryRegex = /<entry>([\s\S]*?)<\/entry>/g;
  let match;
  
  while ((match = entryRegex.exec(xml)) !== null) {
    const entry = match[1];
    
    // 提取 ID
    const idMatch = entry.match(/<id>(.*?)<\/id>/);
    const id = idMatch ? idMatch[1].trim() : '';
    const arxivId = id.match(/(\d+\.\d+)/)?.[1] || '';
    
    // 提取标题
    const titleMatch = entry.match(/<title>([\s\S]*?)<\/title>/);
    const title = titleMatch ? titleMatch[1].trim().replace(/\n/g, ' ') : '';
    
    // 提取摘要
    const summaryMatch = entry.match(/<summary>([\s\S]*?)<\/summary>/);
    const summary = summaryMatch ? summaryMatch[1].trim().replace(/\n/g, ' ') : '';
    
    // 提取作者
    const authorMatches = entry.match(/<author><name>(.*?)<\/name><\/author>/g);
    const authors = authorMatches ? authorMatches.map(a => a.match(/<name>(.*?)<\/name>/)[1]).join(', ') : '';
    
    // 提取日期
    const dateMatch = entry.match(/<published>(.*?)<\/published>/);
    const date = dateMatch ? dateMatch[1].slice(0, 10) : '';
    
    papers.push({
      title,
      titleZh: '',
      authors,
      date,
      arxivId,
      abstract: summary,
      link: id,
      htmlUrl: `https://arxiv.org/html/${arxivId}v1`,
      content: '',
      summary: ''
    });
  }
  
  return papers;
}

// 获取 HTML 全文页面
async function fetchPaperHtml(url) {
  log.info(`正在请求: ${url}`);
  const html = execSync(`curl -s -L "${url}" -H "User-Agent: Mozilla/5.0"`, { 
    encoding: 'utf-8', 
    timeout: 60000 
  });
  return html;
}

// 清洗 HTML 内容 - 正确提取论文正文
function cleanHtml(html) {
  // 移除脚本和样式
  let text = html.replace(/<script[\s\S]*?<\/script>/gi, '');
  text = text.replace(/<style[\s\S]*?<\/style>/gi, '');
  text = text.replace(/<!--[\s\S]*?-->/g, '');
  
  // 提取所有段落 - ltx_p 是 arXiv HTML 的段落标签
  const paragraphs = [];
  
  // 方法1: 提取 ltx_p 段落
  const pRegex = /<p class="ltx_p[^"]*"[^>]*>([\s\S]*?)<\/p>/g;
  let pMatch;
  while ((pMatch = pRegex.exec(text)) !== null) {
    let content = pMatch[1];
    // 清理标签但保留内容
    content = content.replace(/<[^>]+>/g, ' ');
    content = content.replace(/\s+/g, ' ').trim();
    if (content) paragraphs.push(content);
  }
  
  // 方法2: 如果没有 ltx_p，提取 section 内容
  if (paragraphs.length < 5) {
    const sectionRegex = /<section[^>]*>[\s\S]*?<\/section>/g;
    const sections = text.match(sectionRegex) || [];
    sections.forEach(section => {
      const secContent = section.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
      if (secContent.length > 50) paragraphs.push(secContent);
    });
  }
  
  // 清理 LaTeX 噪音
  let result = paragraphs.join('\n\n');
  result = result.replace(/\$\$[\s\S]*?\$\$/g, '');
  result = result.replace(/\$[^$]+\$/g, '');
  result = result.replace(/\\frac\{[^}]+\}\{[^}]+\}/g, '');
  result = result.replace(/\\[a-zA-Z]+\{[^}]*\}/g, '');
  
  // 解码 HTML 实体
  result = result.replace(/&lt;/g, '<');
  result = result.replace(/&gt;/g, '>');
  result = result.replace(/&amp;/g, '&');
  result = result.replace(/&quot;/g, '"');
  result = result.replace(/&#39;/g, "'");
  
  // 清理多余空白
  result = result.replace(/[ \t]+/g, ' ');
  result = result.replace(/\n\s*\n/g, '\n\n');
  result = result.trim();
  
  return result;
}

// 保存原文到临时文件（供上传飞书用）
function saveContentToFile(paper, index) {
  const fileName = `/tmp/paper_${paper.arxivId}.txt`;
  fs.writeFileSync(fileName, paper.content, 'utf-8');
  return fileName;
}

// ========== 主流程 ==========

async function main() {
  log.info('========== arxiv-daily 开始运行 ==========');
  log.info(`目标抓取数量: ${config.paperCount}`);
  log.info(`搜索条件: ${config.searchQuery}`);
  
  try {
    // 1. 获取论文列表
    log.info('[步骤1] 获取 arXiv 论文列表...');
    const papers = await fetchPaperList();
    log.info(`获取到 ${papers.length} 篇论文`);
    
    // 2. 逐篇抓取全文
    for (let i = 0; i < papers.length; i++) {
      const paper = papers[i];
      log.info(`[步骤2.${i + 1}] 抓取论文 ${i + 1}/${papers.length}: ${paper.title}`);
      
      try {
        // 获取 HTML 全文
        const htmlContent = await fetchPaperHtml(paper.htmlUrl);
        paper.content = cleanHtml(htmlContent);
        log.info(`内容获取成功，清洗后长度: ${paper.content.length} 字符`);
        
        // 保存原文到临时文件
        const filePath = saveContentToFile(paper, i);
        log.info(`原文已保存: ${filePath}`);
        
        log.info(`  论文: ${paper.title}`);
        log.info(`  作者: ${paper.authors}`);
        log.info(`  日期: ${paper.date}`);
        log.info(`  arXiv ID: ${paper.arxivId}`);
        
      } catch (err) {
        log.error(`抓取论文失败: ${err.message}`);
        paper.content = `抓取失败: ${err.message}`;
      }
    }
    
    log.info('========== 抓取完成 ==========');
    log.info('提示: 大模型总结和飞书文档创建需要通过阿圈手动完成');
    log.info('');
    log.info('论文列表:');
    papers.forEach((p, i) => {
      log.info(`  ${i + 1}. ${p.title} (${p.arxivId})`);
    });
    
  } catch (err) {
    log.error(`运行失败: ${err.message}`);
    log.error(err.stack);
  }
}

// 入口
main();
