// .github/scripts/generate-readme.js

const fs = require('fs');
const path = require('path');

const baseDir = '.';
const outputFile = 'README.md';

const header = `# 🛠 Airtable Automation Script Hub

A curated collection of **real-world Airtable scripts** for business workflows, API integrations, and platform challenges — tested in production.
`;

function getScriptEntries(dir) {
  const files = fs.readdirSync(dir);
  return files
    .filter(file => file.endsWith('.md') && file !== 'README.md')
    .map(file => {
      const content = fs.readFileSync(path.join(dir, file), 'utf-8');
      const titleMatch = content.match(/title:\s*["'](.+)["']/);
      const title = titleMatch ? titleMatch[1] : file;
      return `- [${title}](${file})`;
    });
}

const entries = getScriptEntries(baseDir);
const finalContent = `${header}\n## 📂 Available Scripts\n\n${entries.join('\n')}\n`;

fs.writeFileSync(outputFile, finalContent);
console.log('✅ README.md updated');
