const fs = require('fs');
const content = fs.readFileSync('frontend/src/app/app/page.tsx', 'utf8');
let braceCount = 0;
let parenCount = 0;
let bracketCount = 0;
let inString = false;
let stringChar = '';
let inTemplate = false;
let escaped = false;
let inComment = false;
let inBlockComment = false;

for (let i = 0; i < content.length; i++) {
  const char = content[i];
  const nextChar = content[i + 1];
  
  if (inBlockComment) {
    if (char === '*' && nextChar === '/') {
      inBlockComment = false;
      i++;
    }
    continue;
  }
  
  if (inComment) {
    if (char === '\n') inComment = false;
    continue;
  }
  
  if (char === '/' && nextChar === '*') {
    inBlockComment = true;
    i++;
    continue;
  }
  
  if (char === '/' && nextChar === '/') {
    inComment = true;
    i++;
    continue;
  }
  
  if (inString) {
    if (escaped) {
      escaped = false;
    } else if (char === '\\') {
      escaped = true;
    } else if (char === stringChar) {
      inString = false;
    }
    continue;
  }
  
  if (inTemplate) {
    if (escaped) {
      escaped = false;
    } else if (char === '\\') {
      escaped = true;
    } else if (char === '`') {
      inTemplate = false;
    }
    continue;
  }
  
  if (char === '"' || char === "'") {
    inString = true;
    stringChar = char;
    continue;
  }
  
  if (char === '`') {
    inTemplate = true;
    continue;
  }
  
  if (char === '{') braceCount++;
  if (char === '}') braceCount--;
  if (char === '(') parenCount++;
  if (char === ')') parenCount--;
  if (char === '[') bracketCount++;
  if (char === ']') bracketCount--;
  
  if (braceCount < 0) {
    console.log('Negative brace at position', i);
    console.log(content.slice(Math.max(0, i-50), i+50));
    break;
  }
  if (parenCount < 0) {
    console.log('Negative paren at position', i);
    console.log(content.slice(Math.max(0, i-50), i+50));
    break;
  }
  if (bracketCount < 0) {
    console.log('Negative bracket at position', i);
    console.log(content.slice(Math.max(0, i-50), i+50));
    break;
  }
}

console.log('Final counts:', { braceCount, parenCount, bracketCount });