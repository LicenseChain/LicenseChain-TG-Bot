const fs = require('fs');
const path = require('path');

const localesDir = path.join(__dirname, 'src', 'locales');
const enFile = path.join(localesDir, 'en.json');
const en = JSON.parse(fs.readFileSync(enFile, 'utf8'));

function getAllKeys(obj, prefix = '') {
  let keys = [];
  for (const key in obj) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (typeof obj[key] === 'object' && obj[key] !== null && !Array.isArray(obj[key])) {
      keys = keys.concat(getAllKeys(obj[key], fullKey));
    } else {
      keys.push(fullKey);
    }
  }
  return keys;
}

const enKeys = getAllKeys(en).sort();
console.log(`English has ${enKeys.length} keys`);

const langFiles = fs.readdirSync(localesDir).filter(f => f.endsWith('.json') && f !== 'en.json');

langFiles.forEach(file => {
  const langPath = path.join(localesDir, file);
  const lang = JSON.parse(fs.readFileSync(langPath, 'utf8'));
  const langKeys = getAllKeys(lang).sort();
  
  const missing = enKeys.filter(k => !langKeys.includes(k));
  const extra = langKeys.filter(k => !enKeys.includes(k));
  
  if (missing.length > 0 || extra.length > 0) {
    console.log(`\n${file}:`);
    if (missing.length > 0) {
      console.log(`  Missing keys (${missing.length}):`, missing.slice(0, 10).join(', '), missing.length > 10 ? '...' : '');
    }
    if (extra.length > 0) {
      console.log(`  Extra keys (${extra.length}):`, extra.slice(0, 10).join(', '), extra.length > 10 ? '...' : '');
    }
  } else {
    console.log(`✓ ${file} - All keys match`);
  }
});
