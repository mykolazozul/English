import fs from 'fs';

const appPath = 'src/App.jsx';
let code = fs.readFileSync(appPath, 'utf8');

code = code.replace(
  'function Sidebar({mobile, setMobile, page, nav}) {',
  'function Sidebar({mobile, setMobile, page, nav, isAdmin}) {'
);

code = code.replace(
  '<Sidebar mobile={mobile} setMobile={setMobile} page={page} nav={nav} />',
  '<Sidebar mobile={mobile} setMobile={setMobile} page={page} nav={nav} isAdmin={isAdmin} />'
);

fs.writeFileSync(appPath, code, 'utf8');
console.log('Fixed Sidebar isAdmin definition and prop passing');
