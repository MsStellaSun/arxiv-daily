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
const https = require('https');
const http = require('http');

// ========== 配置 ==========
const config = require('./config');
const prompts = require('./prompts');

// 日期格式化
const getDateStr = () => new Date().toISOString().slice(0, 10);
const getTimeStr = () => new Date().toISOString();
const getDateTimeStr = () => new Date().toISOString().replace(/[:.]/g, '-');

// 日志
const log = {
  info: (...args) => {
    const msg = `[${getTimeStr()}] INFO: ${args.join(' ')}`;
    console.log(msg);
    if (config.log.file) {
      const logPath = config.log.filePath.replace('{date}', getDateStr());
      fs.mkdirSync(path.dirname(logPath), { recursive: true });
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
  let text = html.replace(/<script[\s\S]*?<\/script>/gi, '');
  text = text.replace(/<style[\s\S]*?<\/style>/gi, '');
  text = text.replace(/<!--[\s\S]*?-->/g, '');
  
  const paragraphs = [];
  const pRegex = /<p class="ltx_p[^"]*"[^>]*>([\s\S]*?)<\/p>/g;
  let pMatch;
  while ((pMatch = pRegex.exec(text)) !== null) {
    let content = pMatch[1];
    content = content.replace(/<[^>]+>/g, ' ');
    content = content.replace(/\s+/g, ' ').trim();
    if (content) paragraphs.push(content);
  }
  
  if (paragraphs.length < 5) {
    const sectionRegex = /<section[^>]*>[\s\S]*?<\/section>/g;
    const sections = text.match(sectionRegex) || [];
    sections.forEach(section => {
      const secContent = section.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
      if (secContent.length > 50) paragraphs.push(secContent);
    });
  }
  
  let result = paragraphs.join('\n\n');
  result = result.replace(/\$\$[\s\S]*?\$\$/g, '');
  result = result.replace(/\$[^$]+\$/g, '');
  result = result.replace(/\\frac\{[^}]+\}\{[^}]+\}/g, '');
  result = result.replace(/\\[a-zA-Z]+\{[^}]*\}/g, '');
  
  result = result.replace(/&lt;/g, '<');
  result = result.replace(/&gt;/g, '>');
  result = result.replace(/&amp;/g, '&');
  result = result.replace(/&quot;/g, '"');
  result = result.replace(/&#39;/g, "'");
  
  result = result.replace(/[ \t]+/g, ' ');
  result = result.replace(/\n\s*\n/g, '\n\n');
  result = result.trim();
  
  return result;
}

// 调用大模型 API
async function callLLM(prompt, systemPrompt = 'You are a helpful AI assistant.') {
  const { llm } = config;
  
  log.info('正在调用大模型...');
  
  if (llm.provider === 'openai') {
    return callOpenAI(prompt, systemPrompt);
  } else {
    throw new Error(`不支持的 LLM provider: ${llm.provider}`);
  }
}

// 调用 OpenAI API
async function callOpenAI(prompt, systemPrompt) {
  const { llm } = config;
  
  const data = JSON.stringify({
    model: llm.model,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: prompt }
    ],
    max_tokens: llm.maxTokens,
    temperature: 0.7
  });
  
  return new Promise((resolve, reject) => {
    const url = new URL(llm.baseUrl + '/chat/completions');
    const options = {
      hostname: url.hostname,
      path: url.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${llm.apiKey}`
      }
    };
    
    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          const result = JSON.parse(body);
          if (result.error) {
            reject(new Error(result.error.message));
          } else {
            resolve(result.choices[0].message.content);
          }
        } catch (e) {
          reject(e);
        }
      });
    });
    
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

// 生成单篇论文总结
async function generatePaperSummary(paper) {
  const prompt = prompts.paperSummaryPrompt
    .replace('{title}', paper.title)
    .replace('{paperContent}', paper.content.slice(0, 8000));
  
  const summary = await callLLM(prompt);
  return summary;
}

// 生成导读速览
async function generateDailyOverview(papers) {
  const paperList = papers.map((p, i) => {
    return `### ${i + 1}. ${p.titleZh || p.title}\n[${p.title}]\n作者: ${p.authors}\n日期: ${p.date}\n\n摘要: ${p.abstract.slice(0, 300)}...`;
  }).join('\n\n');
  
  const prompt = prompts.dailySummaryPrompt.replace('{paperList}', paperList);
  const overview = await callLLM(prompt);
  return overview;
}

// 保存为 MD 文件
function saveMarkdown(content, fileName) {
  const { output } = config;
  const outputDir = path.join(__dirname, output.dir, getDateStr());
  
  fs.mkdirSync(outputDir, { recursive: true });
  
  const filePath = path.join(outputDir, fileName);
  fs.writeFileSync(filePath, content, 'utf-8');
  log.info(`已保存: ${filePath}`);
  
  return filePath;
}

// ========== 主流程 ==========

async function main() {
  log.info('========== arxiv-daily 开始运行 ==========');
  log.info(`目标抓取数量: ${config.paperCount}`);
  log.info(`搜索条件: ${config.searchQuery}`);
  
  // 检查 API Key
  if (!config.llm.apiKey || config.llm.apiKey === 'YOUR_API_KEY_HERE') {
    log.error('请先在 config.js 中配置 LLM API Key');
    process.exit(1);
  }
  
  try {
    // 1. 获取论文列表
    log.info('[步骤1] 获取 arXiv 论文列表...');
    const papers = await fetchPaperList();
    log.info(`获取到 ${papers.length} 篇论文`);
    
    // 2. 逐篇抓取全文并生成总结
    for (let i = 0; i < papers.length; i++) {
      const paper = papers[i];
      log.info(`[步骤2.${i + 1}] 抓取论文 ${i + 1}/${papers.length}: ${paper.title}`);
      
      try {
        // 获取 HTML 全文
        const htmlContent = await fetchPaperHtml(paper.htmlUrl);
        paper.content = cleanHtml(htmlContent);
        log.info(`内容获取成功，清洗后长度: ${paper.content.length} 字符`);
        
        // 保存英文原文
        if (config.output.saveOriginal) {
          const originalContent = `# ${paper.title}\n\n**作者**: ${paper.authors}\n**日期**: ${paper.date}\n**arXiv ID**: ${paper.arxivId}\n\n---\n\n${paper.content}`;
          saveMarkdown(originalContent, `${paper.arxivId}_原文.md`);
        }
        
        // 生成总结
        if (config.output.saveSummary) {
          log.info(`生成论文总结...`);
          paper.summary = await generatePaperSummary(paper);
          const summaryContent = paper.summary;
          saveMarkdown(summaryContent, `${paper.arxivId}_总结.md`);
        }
        
        log.info(`  论文: ${paper.title}`);
        log.info(`  作者: ${paper.authors}`);
        log.info(`  日期: ${paper.date}`);
        
      } catch (err) {
        log.error(`处理论文失败: ${err.message}`);
      }
    }
    
    // 3. 生成导读速览
    if (config.output.saveOverview) {
      log.info('[步骤3] 生成导读速览...');
      const overview = await generateDailyOverview(papers);
      const overviewContent = `# 今日 AI 前沿速览 (${getDateStr()})\n\n${overview}`;
      saveMarkdown(overviewContent, `导读速览_${getDateStr()}.md`);
    }
    
    log.info('========== 运行完成 ==========');
    
  } catch (err) {
    log.error(`运行失败: ${err.message}`);
    log.error(err.stack);
  }
}

// 入口
main();
