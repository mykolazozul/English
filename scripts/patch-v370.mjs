import fs from 'fs';

console.log('Applying v3.7.0 comprehensive updates to src/App.jsx...');
let code = fs.readFileSync('src/App.jsx', 'utf8');

// 1. VERSION BUMP
code = code.replace("const VERSION = '3.5.1';", "const VERSION = '3.7.0';");
code = code.replace("const VERSION = '3.6.0';", "const VERSION = '3.7.0';");

// 2. UPDATED ANCIENT COIN ICON (Tilted, Cracked, Weathered Gold)
const oldCoinFuncStart = code.indexOf('function AncientCoinIcon(');
const oldCoinFuncEnd = code.indexOf('function AvatarIcon(', oldCoinFuncStart);
if (oldCoinFuncStart !== -1 && oldCoinFuncEnd !== -1) {
  const newCoinFunc = `function AncientCoinIcon({ size = 20, className = '', style = {} }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={'ancient-coin-svg ' + className}
      style={{ verticalAlign: 'middle', flexShrink: 0, display: 'inline-block', overflow: 'visible', ...style }}
    >
      <defs>
        <radialGradient id="acGoldFace" cx="38%" cy="32%" r="68%">
          <stop offset="0%" stopColor="#fef08a" />
          <stop offset="25%" stopColor="#f59e0b" />
          <stop offset="65%" stopColor="#b45309" />
          <stop offset="88%" stopColor="#78350f" />
          <stop offset="100%" stopColor="#451a03" />
        </radialGradient>
        <linearGradient id="acRimDepth" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#92400e" />
          <stop offset="50%" stopColor="#451a03" />
          <stop offset="100%" stopColor="#291004" />
        </linearGradient>
        <linearGradient id="acInnerBevel" x1="15%" y1="10%" x2="85%" y2="90%">
          <stop offset="0%" stopColor="#fde047" stopOpacity="0.9" />
          <stop offset="50%" stopColor="#b45309" stopOpacity="0.6" />
          <stop offset="100%" stopColor="#451a03" stopOpacity="0.95" />
        </linearGradient>
      </defs>
      <g transform="translate(50, 50) rotate(-12) scale(1, 0.88) translate(-50, -50)">
        {/* 3D Rim Thickness */}
        <path d="M 12 50 C 12 73 30 88 56 88 C 76 88 88 77 88 55 L 88 62 C 88 84 76 95 56 95 C 30 95 12 80 12 57 Z" fill="url(#acRimDepth)" />
        {/* Coin Face */}
        <path d="M 12 50 C 12 28 30 14 55 14 C 77 14 88 28 88 50 C 88 72 77 86 55 86 C 30 86 12 72 12 50 Z" fill="url(#acGoldFace)" stroke="#78350f" strokeWidth="2.2" />
        {/* Bevel Ring */}
        <path d="M 20 50 C 20 33 34 22 55 22 C 73 22 80 33 80 50 C 80 67 73 78 55 78 C 34 78 20 67 20 50 Z" fill="none" stroke="url(#acInnerBevel)" strokeWidth="2" strokeDasharray="6 3.5" />
        {/* Runic Sigil */}
        <g transform="translate(54, 50)" stroke="#451a03" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" fill="none">
          <path d="M -8 -15 L -8 15 M -8 -15 L 6 -6 L -8 2 M -8 -1 L 6 9" stroke="#3b1503" strokeWidth="3.2" />
          <path d="M -8 -15 L -8 15 M -8 -15 L 6 -6 L -8 2 M -8 -1 L 6 9" stroke="#fef08a" strokeWidth="1.2" strokeOpacity="0.85" />
          <circle cx="10" cy="-10" r="2.2" fill="#fde047" stroke="#451a03" strokeWidth="1" />
          <circle cx="-14" cy="0" r="1.8" fill="#fde047" stroke="#451a03" strokeWidth="1" />
          <circle cx="8" cy="12" r="2" fill="#fde047" stroke="#451a03" strokeWidth="1" />
        </g>
        {/* Crack / Fissure */}
        <g>
          <path d="M 68 15 L 63 24 L 66 31 L 58 40 L 61 48 L 54 58 L 56 66 L 49 76" fill="none" stroke="#1f0a01" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="bevel" />
          <path d="M 58 40 L 50 43 L 46 48" fill="none" stroke="#2a0e02" strokeWidth="1.8" strokeLinecap="round" />
          <path d="M 69.5 15.5 L 64.5 24.5 L 67.5 31.5 L 59.5 40.5 L 62.5 48.5 L 55.5 58.5 L 57.5 66.5 L 50.5 76.5" fill="none" stroke="#fef08a" strokeWidth="0.9" strokeLinecap="round" strokeOpacity="0.95" />
          <polygon points="66,13 72,16 67,19 63,16" fill="#381303" stroke="#220b01" strokeWidth="0.8" />
        </g>
      </g>
    </svg>
  );
}

`;
  code = code.slice(0, oldCoinFuncStart) + newCoinFunc + code.slice(oldCoinFuncEnd);
  console.log('✓ AncientCoinIcon component updated to tilted cracked antique design');
}

// 3. FULL ROSTER OF 27 CHARACTERS IN GAME_AVATARS_FUNNY
const rosterStart = code.indexOf('const GAME_AVATARS_FUNNY = [');
const rosterEnd = code.indexOf('];', rosterStart);
if (rosterStart !== -1 && rosterEnd !== -1) {
  const newRoster = `const GAME_AVATARS_FUNNY = [
  { id: 'character_01_clumsy_barbarian', name: 'Незграбний Варвар', action: 'Крихітний варвар хитається під вагою гігантського камʼяного молота', image: 'character_01_clumsy_barbarian.svg', tag: '🔨 Варвар' },
  { id: 'character_02_flying_duck_pilot', name: 'Качка-Пілот', action: 'Качка в авіаторському шоломі відчайдушно керує літаком з гвинтом', image: 'character_02_flying_duck_pilot.svg', tag: '✈️ Пілот' },
  { id: 'character_03_confused_tree_warrior', name: 'Збентежений Треант', action: 'Живий треант чухає потилицю та розгублено жонглює яблуками', image: 'character_03_confused_tree_warrior.svg', tag: '🌳 Треант' },
  { id: 'character_04_overconfident_knight', name: 'Самовпевнений Лицар', action: 'Лицар гордо показує палець вгору, поки важке забрало падає на ніс', image: 'character_04_overconfident_knight.svg', tag: '⚔️ Лицар' },
  { id: 'character_05_sleepy_dragon', name: 'Сонний Дракончик', action: 'Дракончик у нічному ковпаку позіхає, хропе і раптово чхає полумʼям', image: 'character_05_sleepy_dragon.svg', tag: '🐲 Дракон' },
  { id: 'character_06_angry_wizard', name: 'Сердитий Чаклун', action: 'Маг у зоряному капелюсі з обгорілою від вибуху бородою та посохом', image: 'character_06_angry_wizard.svg', tag: '🧙 Чаклун' },
  { id: 'character_07_ninja_cat', name: 'Кіт-Ніндзя', action: 'Чорний кіт із рибкою-кунаєм; його хвіст несамовито смикається', image: 'character_07_ninja_cat.svg', tag: '🐱 Ніндзя' },
  { id: 'character_08_pirate_frog', name: 'Жаба-Пірат', action: 'Капітан із золотою шаблею та повʼязкою стріляє язиком по мусі', image: 'character_08_pirate_frog.svg', tag: '🏴‍☠️ Жаба' },
  { id: 'character_09_goblin_engineer', name: 'Гоблін-Інженер', action: 'Гоблін в окулярах закручує гайку на цокаючій бомбі з іскрами', image: 'character_09_goblin_engineer.svg', tag: '💣 Гоблін' },
  { id: 'character_10_tiny_giant', name: 'Крихітний Велетень', action: 'Міні-колос напружено грає біцепсами, поки на голові цвіте ромашка', image: 'character_10_tiny_giant.svg', tag: '🗿 Велетень' },
  { id: 'character_11_chicken_warrior', name: 'Бойовий Півень', action: 'Спартанський півень у шоломі зі списом, коліна якого тремтять від жаху', image: 'character_11_chicken_warrior.svg', tag: '🐓 Півень' },
  { id: 'character_12_alien_cowboy', name: 'Прибулець-Ковбой', action: 'Триокий прибулець крутить бластери і підморгує верхи на слимаку', image: 'character_12_alien_cowboy.svg', tag: '🤠 Ковбой' },
  { id: 'character_13_cyber_samurai', name: 'Кібер-Самурай', action: 'Неонова катана з іскрами, голографічне забрало пульсує', image: 'character_13_cyber_samurai.svg', tag: '⚔️ Самурай' },
  { id: 'character_14_coffee_mage', name: 'Маг-Кавоман', action: 'Чашка з парою, очі шалено розширені від потрійного еспресо', image: 'character_14_coffee_mage.svg', tag: '☕ Кавоман' },
  { id: 'character_15_space_hamster', name: 'Космічний Хомʼяк', action: 'Хомʼяк у скафандрі ширяє в невагомості навколо зернятка', image: 'character_15_space_hamster.svg', tag: '🐹 Хомʼяк' },
  { id: 'character_16_steam_owl', name: 'Парова Сова', action: 'Латунні шестерні обертаються, монокль світиться синім лазером', image: 'character_16_steam_owl.svg', tag: '⚙️ Сова' },
  { id: 'character_17_lazy_panda_monk', name: 'Панда-Монах', action: 'Медитує на вершині гори, пузо плавно піднімається під час хропіння', image: 'character_17_lazy_panda_monk.svg', tag: '🐼 Панда' },
  { id: 'character_18_pixel_vampire', name: 'Піксельний Вампір', action: 'Готичний плащ майорить, гострі ікла блищать, кажанчик кружляє', image: 'character_18_pixel_vampire.svg', tag: '🧛 Вампір' },
  { id: 'character_19_disco_skeleton', name: 'Діско-Скелет', action: 'Неонові ребра підсвічуються в такт, сонцезахисні окуляри та диско-куля', image: 'character_19_disco_skeleton.svg', tag: '🕺 Скелет' },
  { id: 'character_20_glitch_fox', name: 'Глітч-Лисиця', action: 'Кіцуне з неоновими хвилястими хвостами та цифровим мерехтінням', image: 'character_20_glitch_fox.svg', tag: '🦊 Лисиця' },
  { id: 'character_21_storm_valkyrie', name: 'Штормова Валькірія', action: 'Крила з білим пірʼям махають, а спис блискавок потріскує іскрами', image: 'character_21_storm_valkyrie.svg', tag: '⚡ Валькірія' },
  { id: 'character_22_chef_octopus', name: 'Восьминіг-Кухар', action: 'Кухарський ковпак підстрибує, щупальця тримають сковорідку', image: 'character_22_chef_octopus.svg', tag: '🐙 Восьминіг' },
  { id: 'character_23_alchemist_raccoon', name: 'Єнот-Алхімік', action: 'Бурхлива колба зі смарагдовим зіллям та бандитська маска', image: 'character_23_alchemist_raccoon.svg', tag: '🦝 Єнот' },
  { id: 'character_24_cyber_dino', name: 'Кібер-Тиранозавр', action: 'Механічна щелепа клацає зубами, лазерний приціл сканує здобич', image: 'character_24_cyber_dino.svg', tag: '🦖 Динозавр' },
  { id: 'character_25_astral_jellyfish', name: 'Астральна Медуза', action: 'Напівпрозорий фіолетовий купол пульсує, біолюмінесцентні нитки', image: 'character_25_astral_jellyfish.svg', tag: '🪼 Медуза' },
  { id: 'character_26_polar_miner', name: 'Полярний Шахтар', action: 'Борода в крижаному інеї, кирка вибиває яскраві іскри з руди', image: 'character_26_polar_miner.svg', tag: '⛏️ Шахтар' },
  { id: 'character_27_phoenix_bard', name: 'Фенікс-Бард', action: 'Вогняне пірʼя палає, а фенікс натхненно грає на древній лютні', image: 'character_27_phoenix_bard.svg', tag: '🪕 Фенікс' }
];`;
  code = code.slice(0, rosterStart) + newRoster + code.slice(rosterEnd + 2);
  console.log('✓ GAME_AVATARS_FUNNY updated with 27 full character roster');
}

// 4. ROUND AVATARS IN AvatarIcon
code = code.replace(
  "const imgUrl = av?.image ? `/avatars/${av.image}` : '/avatars/character_02_flying_duck_pilot.svg';",
  `const imgUrl = av?.image ? \`/avatars/\${av.image}\` : '/avatars/character_02_flying_duck_pilot.svg';
  const roundStyle = { borderRadius: '50%', overflow: 'hidden', objectFit: 'cover', ...style };`
);
code = code.replace("style={{borderRadius:12,...style}}", "style={{borderRadius:'50%',overflow:'hidden',...roundStyle}}");
code = code.replace("style={{borderRadius:14,flexShrink:0}}", "style={{borderRadius:'50%',flexShrink:0,overflow:'hidden'}}");

// 5. REMOVE CEFR CERTIFICATE FROM AboutPage
const cefrStart = code.indexOf('{/* Офіційний Документ Верифікації CEFR */}');
if (cefrStart !== -1) {
  const cefrEnd = code.indexOf('</div>\n        </div>\n      )}\n\n      {/* TAB 2: Конфіденційність та Правила */}', cefrStart);
  if (cefrEnd !== -1) {
    code = code.slice(0, cefrStart) + '</div>\n      )}\n\n      {/* TAB 2: Конфіденційність та Правила */}' + code.slice(cefrEnd + '</div>\n        </div>\n      )}\n\n      {/* TAB 2: Конфіденційність та Правила */}'.length);
    console.log('✓ Official CEFR certificate removed from AboutPage');
  }
}

// 6. DICTATION BUG FIX IN SprintGame
// Replace correct checking logic
const sprintCheckTarget = "if (!w) return null;\n  const correct = picked === w.answer;";
const sprintCheckReplacement = `if (!w) return null;
  const isDictation = mode === 'dictation';
  const expectedAnswer = isDictation ? String(w.word || '').trim() : String(w.answer || '').trim();
  const cleanPicked = String(picked || '').trim();
  const correct = isDictation 
    ? (picked !== null && cleanPicked.toLowerCase() === expectedAnswer.toLowerCase())
    : (picked === w.answer);`;

if (code.includes(sprintCheckTarget)) {
  code = code.replace(sprintCheckTarget, sprintCheckReplacement);
  console.log('✓ Dictation check logic in SprintGame fixed');
}

// Fix feedback hint in SprintGame
const feedbackWrongTarget = `<p className="feedback-hint">Правильно: <b>{w.answer}</b>{w.explanation ? \` — \${w.explanation}\` : (w.translation ? \` — \${w.translation}\` : '')}</p>`;
const feedbackWrongReplacement = `<p className="feedback-hint">
  Правильно: <b>{isDictation ? w.word : w.answer}</b>
  {isDictation ? (w.translation ? \` — \${w.translation}\` : '') : (w.explanation ? \` — \${w.explanation}\` : (w.translation ? \` — \${w.translation}\` : ''))}
</p>`;
if (code.includes(feedbackWrongTarget)) {
  code = code.replace(feedbackWrongTarget, feedbackWrongReplacement);
  console.log('✓ Dictation wrong hint feedback fixed');
}

// Fix DictationInput submission in SprintGame
const dictInputTarget = `const ok = val.trim().toLowerCase() === String(w.word || w.answer).trim().toLowerCase();
            setPicked(val);
            applyAnswer(ok, w, val);`;
const dictInputReplacement = `const targetWord = String(w.word || '').trim().toLowerCase();
            const ok = val.trim().toLowerCase() === targetWord;
            setPicked(val.trim());
            applyAnswer(ok, w, val.trim());`;
if (code.includes(dictInputTarget)) {
  code = code.replace(dictInputTarget, dictInputReplacement);
  console.log('✓ DictationInput onSubmit handler fixed');
}

// 7. REMOVE "Режим героя: 2D RPG / 3D Голограма" FROM Profile
const heroModeTarget = `<div style={{marginTop:8,display:'flex',gap:6,alignItems:'center',flexWrap:'wrap'}}>
            <span className="muted small">Режим героя:</span>
            <button type="button" className={profileViewMode === '2d' ? 'primary small' : 'secondary small'} style={{fontSize:11,padding:'3px 10px'}} onClick={() => setProfileViewMode('2d')}>
              2D RPG
            </button>
            <button type="button" className={profileViewMode === '3d' ? 'primary small' : 'secondary small'} style={{fontSize:11,padding:'3px 10px'}} onClick={() => setProfileViewMode('3d')}>
              🔮 3D Голограма
            </button>
          </div>`;
if (code.includes(heroModeTarget)) {
  code = code.replace(heroModeTarget, '');
  console.log('✓ Removed "Режим героя: 2D RPG / 3D Голограма" from Profile');
}

// Also simplify Hero Header in Profile to remove 3d hologram branch
const heroHologramStart = code.indexOf('{profileViewMode === \'3d\' ? (');
if (heroHologramStart !== -1) {
  const heroHologramEnd = code.indexOf('<div style={{flex:1,minWidth:200}}>', heroHologramStart);
  if (heroHologramEnd !== -1) {
    const cleanRpgAvatar = `<div className="rpg-avatar" style={{borderRadius:'50%',overflow:'hidden',width:76,height:76,boxShadow:'0 0 20px rgba(56,189,248,0.4)',border:'2px solid #38bdf8'}}>
          <AvatarIcon id={selectedAvatar || 'character_01_clumsy_barbarian'} size={76} className={state.inventory?.vipFrame ? 'vip-avatar-glow' : ''} />
        </div>\n        `;
    code = code.slice(0, heroHologramStart) + cleanRpgAvatar + code.slice(heroHologramEnd);
    console.log('✓ Clean circular hero avatar placed in Profile');
  }
}

// 8. REMOVE DICTIONARY SYNC WORDS BUTTON
const syncWordsBtnTarget = `<button
          type="button"
          className="secondary"
          disabled={syncBusy}
          onClick={handleSyncWords}
          style={{marginLeft:'auto'}}
        >
          <RotateCcw size={15}/> {syncBusy ? 'Синхронізація…' : '🔄 Синхронізувати слова'}
        </button>`;
if (code.includes(syncWordsBtnTarget)) {
  code = code.replace(syncWordsBtnTarget, '');
  console.log('✓ Removed "🔄 Синхронізувати слова" button from Dictionary');
}

fs.writeFileSync('src/App.jsx', code, 'utf8');
console.log('✓ Batch 1 applied to src/App.jsx');
