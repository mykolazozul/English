import fs from 'fs';

const appPath = 'src/App.jsx';
let code = fs.readFileSync(appPath, 'utf8');

const newSvgAvatarsDef = `/* ==========================================================================
   12 UNIQUE ANIMATED SVG GAME CHARACTER AVATARS (OFFICIAL 2026 ROSTER)
   Real scalable animated vector SVG characters with multi-element animations
   ========================================================================== */
export const GAME_AVATARS_FUNNY = [
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
  { id: 'character_12_alien_cowboy', name: 'Прибулець-Ковбой', action: 'Триокий прибулець крутить бластери і підморгує верхи на слимаку', image: 'character_12_alien_cowboy.svg', tag: '🤠 Ковбой' }
];

export const GAME_AVATARS_30 = GAME_AVATARS_FUNNY;

export const OLD_AVATAR_MAP = {
  // Legacy avatars
  'duo_owl': 'character_02_flying_duck_pilot',
  'avatar_boss': 'character_04_overconfident_knight',
  'action_king': 'character_04_overconfident_knight',
  'action_knight': 'character_04_overconfident_knight',
  'avatar_knight': 'character_04_overconfident_knight',
  'avatar_wizard': 'character_06_angry_wizard',
  'action_wizard': 'character_06_angry_wizard',
  'avatar_ninja': 'character_07_ninja_cat',
  'action_ninja': 'character_07_ninja_cat',
  'avatar_dragon': 'character_05_sleepy_dragon',
  'action_dragon': 'character_05_sleepy_dragon',
  'avatar_barbarian': 'character_01_clumsy_barbarian',
  'avatar_archer': 'character_03_confused_tree_warrior',
  'avatar_valkyrie': 'character_04_overconfident_knight',
  'action_princess': 'character_12_alien_cowboy',
  'duo_pirate': 'character_08_pirate_frog',
  'duo_cat': 'character_07_ninja_cat',
  'duo_fox': 'character_12_alien_cowboy',
  'duo_robot': 'character_09_goblin_engineer',
  'avatar_golem': 'character_10_tiny_giant',

  // Funny batch 1 mapping
  'funny_barbarian': 'character_01_clumsy_barbarian',
  'funny_duck_pilot': 'character_02_flying_duck_pilot',
  'funny_tree_warrior': 'character_03_confused_tree_warrior',
  'funny_knight': 'character_04_overconfident_knight',
  'funny_dragon_sleepy': 'character_05_sleepy_dragon',
  'funny_wizard': 'character_06_angry_wizard',
  'funny_ninja_cat': 'character_07_ninja_cat',
  'funny_pirate_frog': 'character_08_pirate_frog',
  'funny_goblin_engineer': 'character_09_goblin_engineer',
  'funny_tiny_giant': 'character_10_tiny_giant',
  'funny_chicken': 'character_11_chicken_warrior',
  'funny_alien_cowboy': 'character_12_alien_cowboy',
  'funny_castle': 'character_10_tiny_giant',
  'funny_prince': 'character_04_overconfident_knight',
  'funny_queen': 'character_06_angry_wizard',
  'funny_dragon_rider': 'character_05_sleepy_dragon',
  'funny_carriage': 'character_02_flying_duck_pilot',
  'funny_little_king': 'character_04_overconfident_knight',
  'funny_jester': 'character_09_goblin_engineer',
  'funny_heroic_cat': 'character_07_ninja_cat',
  'funny_talking_tree': 'character_03_confused_tree_warrior',
  'funny_dragon_chef': 'character_05_sleepy_dragon',

  // Series 2
  'series2_monster': 'character_01_clumsy_barbarian',
  'series2_pilot_duck': 'character_02_flying_duck_pilot',
  'series2_treant': 'character_03_confused_tree_warrior',
  'series2_axe_knight': 'character_04_overconfident_knight',
  'series2_death_knight': 'character_07_ninja_cat',
  'series2_heavy_axe': 'character_01_clumsy_barbarian',
  'series2_hunter_fox': 'character_12_alien_cowboy',
  'series2_rogue_alien': 'character_12_alien_cowboy',
  'series2_tactical_cat': 'character_07_ninja_cat',
  'series2_warlock': 'character_06_angry_wizard',
  'series2_swarm_alien': 'character_09_goblin_engineer',
  'series2_dwarf_berserker': 'character_01_clumsy_barbarian',
};`;

// Replace GAME_AVATARS_FUNNY through OLD_AVATAR_MAP
const oldDefStart = code.indexOf('export const GAME_AVATARS_FUNNY = [');
const oldDefEnd = code.indexOf('function AvatarIcon(', oldDefStart);
if (oldDefStart !== -1 && oldDefEnd !== -1) {
  const currentBlock = code.slice(oldDefStart, oldDefEnd);
  code = code.replace(currentBlock, newSvgAvatarsDef + '\n\n');
  console.log('Replaced GAME_AVATARS_FUNNY and OLD_AVATAR_MAP with 12 Animated SVG Characters');
}

// Update AvatarIcon default fallback
code = code.replace(
  "const imgUrl = av?.image ? `/avatars/${av.image}` : '/avatars/funny_duck_pilot.png';",
  "const imgUrl = av?.image ? `/avatars/${av.image}` : '/avatars/character_02_flying_duck_pilot.svg';"
);

// Update BrandLogo to use SVG
code = code.replace('src="/brand_logo.png"', 'src="/brand_logo.svg"');

// Update Profile heading & description
code = code.replace(
  '<h2>🎭 Колекція Кумедних Героїв (Funny Fantasy Avatars)</h2>',
  '<h2>🎭 Колекція Анімованих SVG Героїв (Animated Game Avatars)</h2>'
);
code = code.replace(
  '<p className="muted small">22 кумедних, високодеталізованих персонажі у стилі мобільних фентезі-ігор: виразні емоції, гумор, жива анімація та фірмові сталеві рамки:</p>',
  '<p className="muted small">12 унікальних живих анімованих SVG-персонажів у стилі мобільних фентезі-ігор: справжня безперервна векторна анімація, виразні емоції, гумор та фірмові сталеві рамки:</p>'
);

// Update Shop animated avatars
const newShopCatalog = `  // Catalogues — 12 Animated SVG Game Heroes
  const ANIMATED_AVATARS_SHOP = [
    { id: 'character_02_flying_duck_pilot', name: 'Качка-Пілот', desc: 'Анімований векторний SVG: гвинт обертається, літак хитає турбулентність, шарф майорить', cost: 450 },
    { id: 'character_01_clumsy_barbarian', name: 'Незграбний Варвар', desc: 'Анімований векторний SVG: молот перехиляється, варвар тремтить та балансує з потом', cost: 500 },
    { id: 'character_05_sleepy_dragon', name: 'Сонний Дракончик', desc: 'Анімований векторний SVG: дихання животом, похитування голови і раптовий спалах полумʼя', cost: 650 },
    { id: 'character_07_ninja_cat', name: 'Кіт-Ніндзя', desc: 'Анімований векторний SVG: нервове сіпання пухнастого хвоста, вушка на сторожі, звуження зіниць', cost: 600 },
    { id: 'character_06_angry_wizard', name: 'Сердитий Чаклун', desc: 'Анімований векторний SVG: магічна сфера левітує й іскрить, дим із бороди, брови сіпаються', cost: 550 },
    { id: 'character_08_pirate_frog', name: 'Жаба-Пірат', desc: 'Анімований векторний SVG: роздування горла, миттєвий кидок язика за дзижчачою мухою', cost: 400 },
    { id: 'character_09_goblin_engineer', name: 'Гоблін-Інженер', desc: 'Анімований векторний SVG: обертання шестерень, закручування гайкового ключа та іскри запалу', cost: 450 },
    { id: 'character_10_tiny_giant', name: 'Крихітний Велетень', desc: 'Анімований векторний SVG: камʼяні біцепси напружуються, руни пульсують, ромашка хитається', cost: 500 },
    { id: 'character_11_chicken_warrior', name: 'Бойовий Півень', desc: 'Анімований векторний SVG: коліна шалено стукають від страху, спис вібрує, пірʼя кружляє', cost: 350 },
    { id: 'character_12_alien_cowboy', name: 'Прибулець-Ковбой', desc: 'Анімований векторний SVG: бластер обертається на 360°, третє око підморгує, слимак пружинить', cost: 550 },
    { id: 'character_04_overconfident_knight', name: 'Самовпевнений Лицар', desc: 'Анімований векторний SVG: важке забрало з гуркотом падає на очі, лицар підкидає його назад', cost: 600 },
    { id: 'character_03_confused_tree_warrior', name: 'Збентежений Треант', desc: 'Анімований векторний SVG: безперервне жонглювання яблуками та спантеличене чухання верхівки', cost: 500 }
  ];`;

const oldShopStart = code.indexOf('// Catalogues');
const oldShopEnd = code.indexOf('const AURAS = [', oldShopStart);
if (oldShopStart !== -1 && oldShopEnd !== -1) {
  const shopBlock = code.slice(oldShopStart, oldShopEnd);
  code = code.replace(shopBlock, newShopCatalog + '\n\n  ');
  console.log('Updated Shop animated avatars to 12 Animated SVG Game Heroes');
}

fs.writeFileSync(appPath, code, 'utf8');
console.log('Successfully patched App.jsx with 12 Animated SVG Characters!');
