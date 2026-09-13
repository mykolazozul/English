import fs from 'fs';

const brainDir = 'C:/Users/mikol/.gemini/antigravity-ide/brain/0c568a31-bda6-4238-9197-c010b3b4c65e';
const logoSrc = `${brainDir}/english_flow_funny_game_logo_1789329128157.jpg`;
const destLogo = 'public/logo.png';
const destBrand = 'public/brand_logo.png';

if (fs.existsSync(logoSrc)) {
  fs.copyFileSync(logoSrc, destLogo);
  fs.copyFileSync(logoSrc, destBrand);
  console.log('Copied master funny game logo to public/logo.png and public/brand_logo.png');
}

// Copy full roster collection images to public/avatars as well
const collection1 = `${brainDir}/funny_fantasy_avatars_collection_1789328888555.jpg`;
const collection2 = `${brainDir}/funny_fantasy_avatars_expansion_1789328909948.jpg`;
if (fs.existsSync(collection1)) {
  fs.copyFileSync(collection1, 'public/avatars/roster_collection_1.jpg');
}
if (fs.existsSync(collection2)) {
  fs.copyFileSync(collection2, 'public/avatars/roster_collection_2.jpg');
}

// Update BrandLogo in src/App.jsx to use this master game logo
const appPath = 'src/App.jsx';
let code = fs.readFileSync(appPath, 'utf8');

const oldBrandLogo = `function BrandLogo({size = 34, showText = true, className = ''}) {
  return (
    <div className={'brand-logo-wrap ' + className} style={{display:'inline-flex',alignItems:'center',gap:10}}>
      <svg width={size} height={size} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" style={{flexShrink:0,filter:'drop-shadow(0 3px 10px rgba(34,197,94,0.38))'}}>
        <defs>
          <linearGradient id="brandGreenGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#58CC02" />
            <stop offset="50%" stopColor="#22C55E" />
            <stop offset="100%" stopColor="#15803D" />
          </linearGradient>
          <linearGradient id="brandTopGlow" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#86EFAC" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#22C55E" stopOpacity="0" />
          </linearGradient>
        </defs>
        <rect width="64" height="64" rx="19" fill="url(#brandGreenGrad)"/>
        <rect x="2" y="2" width="60" height="30" rx="17" fill="url(#brandTopGlow)"/>
        <path d="M16 22C21 20 28 21.5 32 25C36 21.5 43 20 48 22V42C43 40 36 41.5 32 45C28 41.5 21 40 16 42V22Z" fill="#FFFFFF"/>
        <path d="M32 25V45" stroke="#22C55E" strokeWidth="2.5" strokeLinecap="round"/>
        <circle cx="32" cy="17" r="4.5" fill="#FEF08A"/>
        <circle cx="48" cy="18" r="2.5" fill="#FEF08A"/>
        <circle cx="16" cy="18" r="2.5" fill="#FEF08A"/>
      </svg>
      {showText && (
        <span className="brand-text" style={{fontWeight:800,fontSize:18,letterSpacing:'-0.02em',color:'var(--text)'}}>
          English<span style={{color:'#22c55e',marginLeft:3}}>Flow</span>
        </span>
      )}
    </div>
  );
}`;

const newBrandLogo = `function BrandLogo({size = 36, showText = true, className = ''}) {
  return (
    <div className={'brand-logo-wrap ' + className} style={{display:'inline-flex',alignItems:'center',gap:10}}>
      <img
        src="/brand_logo.png"
        alt="English Flow"
        style={{
          width: size,
          height: size,
          borderRadius: Math.max(8, Math.floor(size * 0.22)),
          boxShadow: '0 4px 14px rgba(0, 0, 0, 0.45)',
          border: '1.5px solid rgba(56, 189, 248, 0.5)',
          objectFit: 'cover',
          flexShrink: 0
        }}
      />
      {showText && (
        <span className="brand-text" style={{fontWeight:800,fontSize:18,letterSpacing:'-0.02em',color:'var(--text)'}}>
          English<span style={{color:'#38bdf8',marginLeft:3}}>Flow</span>
        </span>
      )}
    </div>
  );
}`;

if (code.includes(oldBrandLogo)) {
  code = code.replace(oldBrandLogo, newBrandLogo);
  console.log('Updated BrandLogo with new master game logo');
}

fs.writeFileSync(appPath, code, 'utf8');
