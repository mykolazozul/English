import fs from 'fs';
import path from 'path';

console.log('🤖 [Text Auditor & Anti-Plagiarism Agent] Starting repository scan...');

const targetFiles = [
  'src/App.jsx',
  'src/data.js',
  'src/lib/storage.js',
  'src/styles.css',
  'lib/server/api-handlers/admin-users.js',
  'lib/server/api-handlers/auth.js',
  'lib/server/api-handlers/chat.js'
];

// Term replacements dictionary
const REPLACEMENTS = [
  // CS/CS:GO / Gambling Trademark Risks
  { pattern: /Кейс-Майстер CS:GO/g, replacement: 'Майстер Таємничої Скрині', reason: 'Trademark protection (CS:GO)' },
  { pattern: /CS:GO Скриня/gi, replacement: 'Таємнича Скриня Знань', reason: 'Trademark protection (CS:GO)' },
  { pattern: /CS:GO рулетка/gi, replacement: 'Рулетка Таємничої Скрині', reason: 'Trademark protection (CS:GO)' },
  { pattern: /Таємничу Мега-Скриню в рулетці/g, replacement: 'Таємничу Скриню Знань', reason: 'Gambling reference cleanup' },

  // Chest price: must be 200 (user instruction: "скриня зроби щоб 200 коштувала")
  { pattern: /150\s*(?:🪙\s*)?(?:Древніх\s*)?(?:Дублонів|монет|Монет)/g, replacement: '200 Золотих Монет', reason: 'Chest price update to 200' },
  { pattern: /100\s*(?:🪙\s*)?(?:Древніх\s*)?(?:Дублонів|монет|Монет)/g, replacement: '200 Золотих Монет', reason: 'Chest price update to 200' },
  { pattern: /cost:\s*150/g, replacement: 'cost: 200', reason: 'Chest price update to 200 in code' },
  { pattern: /gems\s*<\s*150/g, replacement: 'gems < 200', reason: 'Chest price check update to 200 in code' },
  { pattern: /gems\s*-\s*150/g, replacement: 'gems - 200', reason: 'Chest price deduction update to 200 in code' },
  { pattern: /150\s*🪙/g, replacement: '200 🪙', reason: 'Chest price display update to 200' },

  // Currency: Dubloons -> Golden Coins
  { pattern: /Древніх Дублонів/g, replacement: 'Золотих Монет', reason: 'Currency standardisation' },
  { pattern: /Древні Дублони/g, replacement: 'Золоті Монети', reason: 'Currency standardisation' },
  { pattern: /Древніми Дублонами/g, replacement: 'Золотими Монетами', reason: 'Currency standardisation' },
  { pattern: /древніх дублонів/g, replacement: 'золотих монет', reason: 'Currency standardisation' },
  { pattern: /древні дублони/g, replacement: 'золоті монети', reason: 'Currency standardisation' },
  { pattern: /Дублонів/g, replacement: 'Золотих Монет', reason: 'Currency rename' },
  { pattern: /дублонів/g, replacement: 'золотих монет', reason: 'Currency rename' },
  { pattern: /Дублони/g, replacement: 'Золоті Монети', reason: 'Currency rename' },
  { pattern: /дублони/g, replacement: 'золоті монети', reason: 'Currency rename' },
  { pattern: /Дублонами/g, replacement: 'Золотими Монетами', reason: 'Currency rename' },
  { pattern: /дублонами/g, replacement: 'золотими монетами', reason: 'Currency rename' },
  { pattern: /Дублонах/g, replacement: 'Золотих Монетах', reason: 'Currency rename' },
  { pattern: /дублонах/g, replacement: 'золотих монетах', reason: 'Currency rename' },
  { pattern: /Дзвін Дублона/g, replacement: 'Дзвін Золотої Монети', reason: 'Audio title update' },
  { pattern: /playTavernCoinDubloon/g, replacement: 'playTavernGoldCoin', reason: 'Function identifier standardisation' },

  // Legacy Points & Currency cleanup
  { pattern: /Древні Поінти/g, replacement: 'Золоті Монети', reason: 'Legacy points cleanup' },
  { pattern: /Древніх Поінтів/g, replacement: 'Золотих Монет', reason: 'Legacy points cleanup' },
  { pattern: /Древніми Поінтами/g, replacement: 'Золотими Монетами', reason: 'Legacy points cleanup' },
  { pattern: /Древніх поінтів/g, replacement: 'золотих монет', reason: 'Legacy points cleanup' },
  { pattern: /древніх поінтів/g, replacement: 'золотих монет', reason: 'Legacy points cleanup' },
  { pattern: /древні поінти/g, replacement: 'золоті монети', reason: 'Legacy points cleanup' },

  // XP from shop cleanup (Strict Merit-Based)
  { pattern: /XP Booster 2× \(Подвійний досвід\)/g, replacement: 'Сувій Глибокого Фокусу (2× Фокус)', reason: 'Strict merit-based XP: no XP sales' },
  { pattern: /⚡ XP Booster/g, replacement: '📜 Сувій Фокусу', reason: 'Strict merit-based XP: no XP in gift items' },
  { pattern: /Подаруй другу 2× XP на 30 хвилин/g, replacement: 'Подаруй другу сувій глибокого фокусу пам\'яті на 30 хвилин', reason: 'Strict merit-based XP' },
  { pattern: /Підсилювач уроків \(2× XP\) активовано на 30 хв/g, replacement: 'Сувій глибокого фокусу активовано на 30 хв', reason: 'Strict merit-based XP' },
  { pattern: /додає <b>\+100 XP<\/b>/g, replacement: 'відкриває преміум-колоду ідіом C1/C2', reason: 'Strict merit-based XP' },
  { pattern: /Додає <b>\+40 XP<\/b> до рейтингу ліги/g, replacement: 'інтенсивне практичне тренування граматичних часів', reason: 'Strict merit-based XP' },
  { pattern: /отримайте <b>\+60 XP<\/b>/g, replacement: 'отримайте бонусні Золоті Монети', reason: 'Strict merit-based XP' },
  { pattern: /Шанс отримати до 500 XP,\s*/g, replacement: 'Шанс отримати до ', reason: 'Strict merit-based XP: remove XP from chest' },
  { pattern: /подвійний XP для уроків,\s*/g, replacement: '', reason: 'Strict merit-based XP: dialogue cleanup' }
];

let totalModified = 0;
const auditLog = [];

for (const relPath of targetFiles) {
  const fullPath = path.resolve(process.cwd(), relPath);
  if (!fs.existsSync(fullPath)) continue;

  let content = fs.readFileSync(fullPath, 'utf8');
  let original = content;
  let fileChanges = 0;

  for (const { pattern, replacement, reason } of REPLACEMENTS) {
    const matches = content.match(pattern);
    if (matches && matches.length > 0) {
      content = content.replace(pattern, replacement);
      fileChanges += matches.length;
      auditLog.push({
        file: relPath,
        matches: matches.length,
        reason,
        sample: matches[0] + ' -> ' + (typeof replacement === 'string' ? replacement.slice(0, 30) : '[computed]')
      });
    }
  }

  if (content !== original) {
    fs.writeFileSync(fullPath, content, 'utf8');
    totalModified++;
    console.log(`  ✓ Updated ${relPath}: ${fileChanges} text instances modified.`);
  }
}

console.log('\n======================================================');
console.log(`🎉 [Text Auditor & Anti-Plagiarism Agent] Completed!`);
console.log(`Files modified: ${totalModified}`);
console.log(`Total text corrections applied: ${auditLog.length}`);
console.log('Summary of key adjustments:');
const reasons = {};
auditLog.forEach(l => { reasons[l.reason] = (reasons[l.reason] || 0) + l.matches; });
for (const [r, count] of Object.entries(reasons)) {
  console.log(`  • ${r}: ${count} occurrences`);
}
console.log('======================================================');
