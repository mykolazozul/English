import fs from 'fs';

const appPath = 'src/App.jsx';
let code = fs.readFileSync(appPath, 'utf8');

const targetStart = 'function AvatarIcon({ id, av: propAv, size = 44, className = \'\', style = {}, aura = \'\', frame = \'\' }) {';
const targetEnd = 'function colorMixDark(hex) {';

const startIndex = code.indexOf(targetStart);
const endIndex = code.indexOf(targetEnd);

if (startIndex === -1 || endIndex === -1) {
  console.error('Could not find AvatarIcon block bounds!');
  process.exit(1);
}

const newAvatarIconCode = `function AvatarIcon({ id, av: propAv, size = 44, className = '', style = {}, aura = '', frame = '' }) {
  let actualId = id || propAv?.id || (typeof propAv === 'string' ? propAv : '');
  if (OLD_AVATAR_MAP[actualId]) {
    actualId = OLD_AVATAR_MAP[actualId];
  }
  const av = GAME_AVATARS_FUNNY.find(a => a.id === actualId) || (propAv && typeof propAv === 'object' ? propAv : GAME_AVATARS_FUNNY[0]);
  const imgUrl = av?.image ? \`/avatars/\${av.image}\` : '/avatars/funny_duck_pilot.png';

  const wrap = (node) => (!aura && !frame ? node : (
    <span className={\`avatar-cosmetic-wrap \${aura || ''} \${frame || ''}\`} style={{display:'inline-flex',alignItems:'center',justifyContent:'center',position:'relative',borderRadius:14,flexShrink:0}}>
      {node}
    </span>
  ));

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

`;

code = code.slice(0, startIndex) + newAvatarIconCode + code.slice(endIndex);

fs.writeFileSync(appPath, code, 'utf8');
console.log('Successfully replaced old AvatarIcon SVGs with new funny avatar image logos!');
