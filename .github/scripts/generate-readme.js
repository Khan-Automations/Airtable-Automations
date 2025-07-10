const fs = require('fs');
const path = require('path');

const baseDir = '.';
const readmePath = 'README.md';
const sectionStart = '| Script Name | Description |';
const sectionEnd = '|---'; // optional, fallback marker

function extractTitleAndDescription(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const title = (content.match(/title:\s*["'](.+?)["']/i) || [])[1] || path.basename(filePath);
  const description = (content.match(/description:\s*["'](.+?)["']/i) || [])[1] || '';
  return { title, description };
}

function getMarkdownRows() {
  return fs.readdirSync(baseDir)
    .filter(f => f.endsWith('.md') && f !== 'README.md')
    .map(file => {
      const { title, description } = extractTitleAndDescription(path.join(baseDir, file));
      return `| [${title}](${file}) | ${description} |`;
    });
}

function updateReadme() {
  const original = fs.readFileSync(readmePath, 'utf8');
  const lines = original.split('\n');

  const startIdx = lines.findIndex(l => l.trim() === sectionStart);
  const endIdx = lines.findIndex((l, i) => i > startIdx && l.startsWith('|') === false);

  if (startIdx === -1) {
    console.error('❌ Table start marker not found.');
    return;
  }

  const before = lines.slice(0, startIdx + 2); // include header and separator row
  const after = lines.slice(endIdx !== -1 ? endIdx : lines.length);

  const tableRows = getMarkdownRows();
  const updated = [...before, ...tableRows, ...after].join('\n');
  fs.writeFileSync(readmePath, updated);
  console.log('✅ README.md updated with script rows in the table.');
}

updateReadme();
