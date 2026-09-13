import fs from 'fs';

const appPath = 'src/App.jsx';
let code = fs.readFileSync(appPath, 'utf8');

console.log('Original App.jsx length:', code.length);

// 1. Definition of the 22 Funny Fantasy Character Avatars
const funnyAvatarsDefinition = `/* ==========================================================================
   22 FUNNY FANTASY CHARACTER AVATARS (OFFICIAL 2026 MOBILE GAME ROSTER)
   ========================================================================== */
export const GAME_AVATARS_FUNNY = [
  { id: 'funny_barbarian', name: 'Незграбний Варвар', action: 'Крихітний варвар із велетенським камʼяним молотом', image: 'funny_barbarian.png', tag: '🔨 Варвар' },
  { id: 'funny_duck_pilot', name: 'Качка-Пілот', action: 'Качка-ас в авіаторському шоломі керує крихітним літаком', image: 'funny_duck_pilot.png', tag: '✈️ Пілот' },
  { id: 'funny_tree_warrior', name: 'Збентежений Треант', action: 'Живий треант, що розгублено жонглює червоними яблуками', image: 'funny_tree_warrior.png', tag: '🌳 Треант' },
  { id: 'funny_knight', name: 'Самовпевнений Лицар', action: 'Лицар гордо віддає честь, коли забрало шолома падає на ніс', image: 'funny_knight.png', tag: '⚔️ Лицар' },
  { id: 'funny_dragon_sleepy', name: 'Сонний Дракончик', action: 'Дракончик у нічному ковпаку позіхає та чхає полумʼям', image: 'funny_dragon_sleepy.png', tag: '🐲 Дракон' },
  { id: 'funny_wizard', name: 'Сердитий Чаклун', action: 'Маг у зоряному капелюсі з обгорілою бородою від закляття', image: 'funny_wizard.png', tag: '🧙 Чаклун' },
  { id: 'funny_ninja_cat', name: 'Кіт-Ніндзя', action: 'Чорний кіт-ніндзя у стрибку з рибкою-кинжалом', image: 'funny_ninja_cat.png', tag: '🐱 Ніндзя' },
  { id: 'funny_pirate_frog', name: 'Жаба-Пірат', action: 'Жаба в трикутному капелюсі з повʼязкою та золотою шаблею', image: 'funny_pirate_frog.png', tag: '🏴‍☠️ Жаба' },
  { id: 'funny_goblin_engineer', name: 'Гоблін-Інженер', action: 'Гоблін в окулярах щасливо сміється над цокаючою бомбою', image: 'funny_goblin_engineer.png', tag: '💣 Гоблін' },
  { id: 'funny_tiny_giant', name: 'Крихітний Велетень', action: 'Камʼяний міні-колос гордо грає мускулами', image: 'funny_tiny_giant.png', tag: '🗿 Велетень' },
  { id: 'funny_castle', name: 'Живий Замок', action: 'Ожила камʼяна фортеця з очима-бійницями та ротом-мостом', image: 'funny_castle.png', tag: '🏰 Замок' },
  { id: 'funny_chicken', name: 'Бойовий Півень', action: 'Спартанський півень у шоломі зі списом-зубочисткою', image: 'funny_chicken.png', tag: '🐓 Півень' },
  { id: 'funny_alien_cowboy', name: 'Прибулець-Ковбой', action: 'Триокий бірюзовий прибулець у капелюсі з неоновими бластерами', image: 'funny_alien_cowboy.png', tag: '🤠 Ковбой' },
  { id: 'funny_prince', name: 'Принц-Чепурун', action: 'Принц із пишним чубом та короною надсилає поцілунок', image: 'funny_prince.png', tag: '👑 Принц' },
  { id: 'funny_queen', name: 'Могутня Королева', action: 'Гордовита королева чаклує іскристими метеликами', image: 'funny_queen.png', tag: '👸 Королева' },
  { id: 'funny_dragon_rider', name: 'Вершник на Драконі', action: 'Хлопчик у каструлі на голові верхи на усміхненому дракончику', image: 'funny_dragon_rider.png', tag: '🐉 Вершник' },
  { id: 'funny_carriage', name: 'Казкова Карета', action: 'Жива королівська карета на великих колесах мчить уперед', image: 'funny_carriage.png', tag: '🎠 Карета' },
  { id: 'funny_little_king', name: 'Кумедний Король', action: 'Пухкий король наступає на власну вельветову мантію', image: 'funny_little_king.png', tag: '👑 Король' },
  { id: 'funny_jester', name: 'Пустотливий Блазень', action: 'Блазень з бубонцями жонглює картами та кидає пиріг-бомбу', image: 'funny_jester.png', tag: '🃏 Блазень' },
  { id: 'funny_heroic_cat', name: 'Героїчний Кіт у Латах', action: 'Рудий кіт у лицарських латах на три розміри більших', image: 'funny_heroic_cat.png', tag: '🛡️ Кіт' },
  { id: 'funny_talking_tree', name: 'Дерево, що жонглює', action: 'Живе дерево весело розмовляє та жонглює яблуками', image: 'funny_talking_tree.png', tag: '🍎 Дерево' },
  { id: 'funny_dragon_chef', name: 'Дракончик-Шеф', action: 'Дракончик у білому ковпаку смажить маршмеллоу подихом вогню', image: 'funny_dragon_chef.png', tag: '👨‍🍳 Шеф' }
];

export const GAME_AVATARS_30 = GAME_AVATARS_FUNNY;

export const OLD_AVATAR_MAP = {
  'duo_owl': 'funny_duck_pilot',
  'avatar_boss': 'funny_little_king',
  'action_king': 'funny_little_king',
  'action_knight': 'funny_knight',
  'avatar_knight': 'funny_knight',
  'avatar_wizard': 'funny_wizard',
  'action_wizard': 'funny_wizard',
  'avatar_ninja': 'funny_ninja_cat',
  'action_ninja': 'funny_ninja_cat',
  'avatar_dragon': 'funny_dragon_sleepy',
  'action_dragon': 'funny_dragon_sleepy',
  'avatar_barbarian': 'funny_barbarian',
  'avatar_archer': 'funny_tree_warrior',
  'avatar_valkyrie': 'funny_queen',
  'action_princess': 'funny_queen',
  'duo_pirate': 'funny_pirate_frog',
  'duo_cat': 'funny_ninja_cat',
  'duo_fox': 'funny_alien_cowboy',
  'duo_robot': 'funny_goblin_engineer',
  'avatar_golem': 'funny_tiny_giant',
  'series2_monster': 'funny_barbarian',
  'series2_pilot_duck': 'funny_duck_pilot',
  'series2_treant': 'funny_tree_warrior',
  'series2_axe_knight': 'funny_knight',
  'series2_death_knight': 'funny_ninja_cat',
  'series2_heavy_axe': 'funny_barbarian',
  'series2_hunter_fox': 'funny_alien_cowboy',
  'series2_rogue_alien': 'funny_alien_cowboy',
  'series2_tactical_cat': 'funny_heroic_cat',
  'series2_warlock': 'funny_wizard',
  'series2_swarm_alien': 'funny_goblin_engineer',
  'series2_dwarf_berserker': 'funny_barbarian',
};`;

// Replace GAME_AVATARS_30 block (lines ~576 to 627)
const oldAvatarsStart = code.indexOf('const GAME_AVATARS_30 = [');
if (oldAvatarsStart !== -1) {
  const oldAvatarsEnd = code.indexOf('];', oldAvatarsStart);
  if (oldAvatarsEnd !== -1) {
    const toReplace = code.slice(oldAvatarsStart, oldAvatarsEnd + 2);
    code = code.replace(toReplace, funnyAvatarsDefinition);
    console.log('Replaced old GAME_AVATARS_30 with GAME_AVATARS_FUNNY and mappings');
  }
}

// 2. Update AvatarIcon implementation to use the new cropped high-res image logos
const oldAvatarIconStart = code.indexOf('function AvatarIcon({ id, av: propAv, size = 44, className = \'\', style = {}, aura = \'\', frame = \'\' }) {');
if (oldAvatarIconStart !== -1) {
  // Find where AvatarIcon ends (before next function)
  const nextFn = code.indexOf('function EmptyLeagueCard({league}) {', oldAvatarIconStart);
  if (nextFn !== -1) {
    const oldIconCode = code.slice(oldAvatarIconStart, nextFn);
    
    const newAvatarIconCode = `function AvatarIcon({ id, av: propAv, size = 44, className = '', style = {}, aura = '', frame = '' }) {
  let actualId = id || propAv?.id || (typeof propAv === 'string' ? propAv : '');
  if (OLD_AVATAR_MAP[actualId]) {
    actualId = OLD_AVATAR_MAP[actualId];
  }
  const av = GAME_AVATARS_FUNNY.find(a => a.id === actualId) || (propAv && typeof propAv === 'object' ? propAv : GAME_AVATARS_FUNNY[0]);
  const imgUrl = av?.image ? \`/avatars/\${av.image}\` : null;

  const wrap = (node) => (!aura && !frame ? node : (
    <span className={\`avatar-cosmetic-wrap \${aura || ''} \${frame || ''}\`} style={{display:'inline-flex',alignItems:'center',justifyContent:'center',position:'relative',borderRadius:14,flexShrink:0}}>
      {node}
    </span>
  ));

  if (imgUrl) {
    return wrap(
      <img
        src={imgUrl}
        alt={av.name || 'Аватар'}
        className={\`funny-avatar-img \${className}\`}
        style={{
          width: size,
          height: size,
          objectFit: 'cover',
          borderRadius: Math.max(8, Math.floor(size * 0.18)),
          border: '1.5px solid rgba(56, 189, 248, 0.45)',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.4), inset 0 0 8px rgba(56, 189, 248, 0.2)',
          background: '#101622',
          flexShrink: 0,
          ...style
        }}
        loading="lazy"
      />
    );
  }

  return wrap(
    <span
      className={'avatar-emoji-fallback ' + className}
      style={{
        width: size, height: size, fontSize: Math.floor(size * 0.6),
        display: 'inline-grid', placeItems: 'center', borderRadius: 14,
        background: 'color-mix(in srgb, var(--accent) 12%, var(--surface))',
        flexShrink: 0, ...style
      }}
    >
      🎭
    </span>
  );
}

`;
    code = code.replace(oldIconCode, newAvatarIconCode);
    console.log('Replaced AvatarIcon with new image-based high-res logo renderer');
  }
}

// 3. Update Profile Character Avatars Card heading and descriptions
code = code.replace(
  '<h2>🎭 Епічні Герої у Повний Зріст (Full-Body Action Avatars)</h2>',
  '<h2>🎭 Колекція Кумедних Героїв (Funny Fantasy Avatars)</h2>'
);
code = code.replace(
  '<p className="muted small">30 унікальних персонажів у динамічній дії: лицар у замаху, маг кастує блискавку, сова в польоті з сувоєм, ніндзя у стрибку та інші герої без повторів:</p>',
  '<p className="muted small">22 кумедних, високодеталізованих персонажі у стилі мобільних фентезі-ігор: виразні емоції, гумор, жива анімація та фірмові сталеві рамки:</p>'
);

// 4. Update Shop animated avatars to feature the funny fantasy collection
const oldShopAvatarsTarget = `  // Catalogues
  const ANIMATED_AVATARS_SHOP = [
    { id: 'goblin_walker', name: 'Гоблін-мандрівник', desc: 'Анімований герой: неспішна хода з торбою слів', cost: 850 },
    { id: 'flying_dragon', name: 'Дракон Знань', desc: 'Анімований герой: величний політ та помахи крил над хмарами', cost: 1100 },
    { id: 'flying_phoenix', name: 'Сонячний Фенікс', desc: 'Анімований герой: ширяння у полум\\'ї знань з іскрами', cost: 1250 },
    { id: 'crown_sovereign', name: 'Для Корони (Суверен)', desc: 'Анімований герой: монарше сяйво корони та золота аура', cost: 1400 },
    { id: 'arcane_wizard', name: 'Арканний Чарівник', desc: 'Анімований герой: каст зоряних граматичних чар', cost: 1350 },
    { id: 'monster_warrior', name: 'Звіролов-Воїн', desc: 'Серія 2: мускулистий звір із шипованою палицею', cost: 950 },
    { id: 'pilot_duck', name: 'Качка-Пілот', desc: 'Серія 2: авіатор у штурмовику з гвинтом, що обертається', cost: 1200 },
    { id: 'treant_defender', name: 'Дерев\\'яний Вартовий', desc: 'Серія 2: могутній дубовий велетень з булавою та щитом', cost: 1150 },
    { id: 'axe_knight', name: 'Лицар із Сокирою', desc: 'Серія 2: залізний лицар із бойовою сокирою', cost: 900 },
    { id: 'death_knight', name: 'Лицар Тіні', desc: 'Серія 2: темний паладин із клинком смерті та тіньовою аурою', cost: 1450 },
    { id: 'heavy_axe_knight', name: 'Важкий Дроворуб', desc: 'Серія 2: важкий латний лицар із червоним плюмажем', cost: 1100 },
    { id: 'hunter_fox', name: 'Лис-Слідопит', desc: 'Серія 2: хитрий лісовий лис, що натягує композитний лук', cost: 1050 },
    { id: 'rogue_alien', name: 'Прибулець-Шпигун', desc: 'Серія 2: смарагдовий ассасін із токсичними клинками', cost: 1250 },
    { id: 'tactical_cat', name: 'Тактичний Кіт', desc: 'Серія 2: кіт-спецпризначенець у ПНБ з карабіном', cost: 1300 },
    { id: 'warlock_mage', name: 'Темний Чорнокнижник', desc: 'Серія 2: рогатий маг темної блискавки', cost: 1400 },
    { id: 'swarm_alien', name: 'Космічний Бджоляр', desc: 'Серія 2: чотирирукий інсектоїд з парними бластерами', cost: 1150 },
    { id: 'dwarf_berserker', name: 'Гном-Берсерк', desc: 'Серія 2: північний гном із подвійними бородатими сокирами', cost: 1200 },
  ];`;

const newShopAvatarsReplacement = `  // Catalogues — Funny Fantasy Game Roster
  const ANIMATED_AVATARS_SHOP = [
    { id: 'funny_duck_pilot', name: 'Качка-Пілот', desc: 'Авіатор на крихітному червоному біплані з гвинтом, що обертається', cost: 450 },
    { id: 'funny_barbarian', name: 'Незграбний Варвар', desc: 'Крихітний варвар, що героїчно бореться з велетенським молотом', cost: 500 },
    { id: 'funny_dragon_sleepy', name: 'Сонний Дракончик', desc: 'Малюк у нічному ковпаку, який позіхає та чхає полумʼям', cost: 650 },
    { id: 'funny_ninja_cat', name: 'Кіт-Ніндзя', desc: 'Чорний кіт-шинобі у неймовірному стрибку з рибкою-кинжалом', cost: 600 },
    { id: 'funny_wizard', name: 'Сердитий Чаклун', desc: 'Маг у зоряному капелюсі з обгорілою бородою від закляття', cost: 550 },
    { id: 'funny_pirate_frog', name: 'Жаба-Пірат', desc: 'Капітан із піратською повʼязкою та блискучою золотою шаблею', cost: 400 },
    { id: 'funny_goblin_engineer', name: 'Гоблін-Інженер', desc: 'Гоблін в окулярах щасливо сміється над цокаючою бомбою', cost: 450 },
    { id: 'funny_castle', name: 'Живий Замок', desc: 'Ожила камʼяна фортеця з очима-бійницями та ротом-мостом', cost: 700 },
    { id: 'funny_chicken', name: 'Бойовий Півень', desc: 'Спартанський півень у шоломі зі списом-зубочисткою', cost: 350 },
    { id: 'funny_alien_cowboy', name: 'Прибулець-Ковбой', desc: 'Триокий бірюзовий ковбой із подвійними неоновими бластерами', cost: 550 },
    { id: 'funny_little_king', name: 'Кумедний Король', desc: 'Пухкий король у вельветовій мантії із золотим скіпетром', cost: 800 },
    { id: 'funny_jester', name: 'Пустотливий Блазень', action: 'Блазень з бубонцями кидає пиріг-бомбу', cost: 500 },
    { id: 'funny_heroic_cat', name: 'Героїчний Кіт у Латах', desc: 'Рудий кіт у лицарських латах на три розміри більших', cost: 600 },
    { id: 'funny_talking_tree', name: 'Дерево, що жонглює', desc: 'Живе дерево весело розмовляє та жонглює яблуками', cost: 500 },
    { id: 'funny_carriage', name: 'Казкова Карета', desc: 'Жива королівська карета на великих колесах мчить уперед', cost: 600 },
    { id: 'funny_dragon_chef', name: 'Дракончик-Шеф', desc: 'Дракончик у білому ковпаку смажить маршмеллоу подихом вогню', cost: 650 },
  ];`;

if (code.includes(oldShopAvatarsTarget)) {
  code = code.replace(oldShopAvatarsTarget, newShopAvatarsReplacement);
  console.log('Updated Shop animated avatars to funny fantasy roster');
}

fs.writeFileSync(appPath, code, 'utf8');
console.log('Updated App.jsx successfully. New length:', code.length);
