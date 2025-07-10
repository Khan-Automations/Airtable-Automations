const fs = require('fs');
const path = require('path');

const baseDir = '.';
const outputFile = 'README.md';
const sectionHeader = '## 📂 Available Scripts';

function getScriptEntries(dir) {
  const files = fs.readdirSync(dir);
  return files
    .filter(file => file.endsWith('.md') && file !== 'README.md')
    .map(file => {
      const content = fs.readFileSync(path.join(dir, file), 'utf-8');
      const titleMatch = content.match(/title:\s*["'](.+)["']/i);
      const title = titleMatch ? titleMatch[1] : file;
      return `- [${title}](${file})`;
    });
}

// Read the current README.md
const currentReadme = fs.existsSync(outputFile) ? fs.readFileSync(outputFile, 'utf-8') : '';
const [beforeSection] = currentReadme.split(sectionHeader);

// Generate the new section
const entries = getScriptEntries(baseDir);
const newSection = `${sectionHeader}\n\n${entries.join('\n')}\n`;

const finalContent = `${beforeSection.trim()}\n\n${newSection}`;
fs.writeFileSync(outputFile, finalContent);
console.log('✅ README.md updated without removing existing content');
