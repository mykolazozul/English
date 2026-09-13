import fs from 'fs';

const appPath = 'src/App.jsx';
let code = fs.readFileSync(appPath, 'utf8');

// 1. Add duel invite button and mode selector in DuelArena
const duelStartPanelTarget = `<button className="duel-start-btn" style={{marginTop:20,maxWidth:280,marginInline:'auto'}} onClick={startDuel}>
            ⚡ Почати Дуель!
          </button>
        </div>`;

const duelStartPanelReplacement = `<div style={{display:'flex',justifyContent:'center',gap:10,marginTop:16,flexWrap:'wrap'}}>
            <button className="duel-start-btn" style={{margin:0,minWidth:200}} onClick={startDuel}>
              ⚡ Почати Дуель!
            </button>
            <button
              type="button"
              className="secondary"
              style={{padding:'12px 20px',borderRadius:12,fontWeight:700,display:'inline-flex',alignItems:'center',gap:6}}
              onClick={() => {
                window.dispatchEvent(new CustomEvent('ef-open-chat', { detail: { duelInvite: true } }));
                emitSiteToast('💬 Відкрито чат для виклику друга на дуель! Натисніть на друга для запрошення.', 'ok');
              }}
            >
              ✉️ Запросити друга з чату
            </button>
          </div>
        </div>`;

if (code.includes(duelStartPanelTarget)) {
  code = code.replace(duelStartPanelTarget, duelStartPanelReplacement);
  console.log('Added duel invite button to DuelArena');
}

// 2. Add 3D Arena tab button and tab rendering in ChallengesPage
const chButtonsTarget = `        <button
          type="button"
          className={activeTab === 'duel' ? 'primary' : 'secondary'}
          onClick={() => setActiveTab('duel')}
          style={activeTab === 'duel' ? {background:'linear-gradient(135deg,#7c3aed,#6d28d9)',borderColor:'#7c3aed'} : {borderColor:'#6d28d9',color:'#a78bfa'}}
        >
          ⚡ Зала Суперників (Дуель)
        </button>
      </div>`;

const chButtonsReplacement = `        <button
          type="button"
          className={activeTab === 'duel' ? 'primary' : 'secondary'}
          onClick={() => setActiveTab('duel')}
          style={activeTab === 'duel' ? {background:'linear-gradient(135deg,#7c3aed,#6d28d9)',borderColor:'#7c3aed'} : {borderColor:'#6d28d9',color:'#a78bfa'}}
        >
          ⚡ Зала Суперників (Дуель)
        </button>
        <button
          type="button"
          className={activeTab === 'arena3d' ? 'primary' : 'secondary'}
          onClick={() => setActiveTab('arena3d')}
          style={activeTab === 'arena3d' ? {background:'linear-gradient(135deg,#0284c7,#0369a1)',borderColor:'#0284c7'} : {borderColor:'#0284c7',color:'#38bdf8'}}
        >
          🔮 3D Рунічна Арена
        </button>
      </div>`;

if (code.includes(chButtonsTarget)) {
  code = code.replace(chButtonsTarget, chButtonsReplacement);
  console.log('Added 3D Arena button to ChallengesPage tabs');
}

// Render the 3D Arena tab JSX
const chDuelRenderEndTarget = `      {/* DUEL — RIVALRY HALL */}
      {activeTab === 'duel' && (
        <DuelArena state={state} save={save} activeWords={activeWords} />
      )}`;

const chDuelRenderEndReplacement = `      {/* DUEL — RIVALRY HALL */}
      {activeTab === 'duel' && (
        <DuelArena state={state} save={save} activeWords={activeWords} />
      )}

      {/* 3D RUNIC WORD ARENA */}
      {activeTab === 'arena3d' && (
        <div className="card" style={{borderLeft:'5px solid #38bdf8',padding:'20px'}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:12,marginBottom:16}}>
            <div>
              <span className="pill" style={{background:'rgba(56,189,248,0.15)',color:'#38bdf8',fontWeight:700}}>3D РУНІЧНИЙ ПРОСТІР</span>
              <h2 style={{margin:'8px 0 4px'}}>🔮 3D Рунічна Арена Слів</h2>
              <p className="muted small">Знаходьте пари між англійськими словами та українськими перекладами на 3D плитах!</p>
            </div>
            <div style={{display:'flex',alignItems:'center',gap:12}}>
              <span style={{fontSize:18,fontWeight:800,color:'#38bdf8'}}>Очки: {arenaScore}</span>
              <button className="secondary small" type="button" onClick={initArena}>
                🔄 Перемішати плити
              </button>
            </div>
          </div>

          <div className="arena-3d-grid">
            {arenaCards.map(card => {
              const isMatched = arenaMatches.has(card.pairId);
              const isSelected = arenaSelected && arenaSelected.id === card.id;
              return (
                <div
                  key={card.id}
                  className={\`arena-runic-card \${isMatched ? 'matched' : ''} \${isSelected ? 'selected' : ''}\`}
                  onClick={() => handleArenaCardClick(card)}
                >
                  <div style={{fontSize:10,letterSpacing:1,textTransform:'uppercase',color: card.type==='en'?'#38bdf8':'#a78bfa',marginBottom:4}}>
                    {card.type === 'en' ? '🇬🇧 English' : '🇺🇦 Переклад'}
                  </div>
                  <div style={{fontSize:16,fontWeight:700,color: isMatched ? '#22c55e' : '#fff'}}>
                    {isMatched ? \`✓ \${card.text}\` : card.text}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}`;

if (code.includes(chDuelRenderEndTarget)) {
  code = code.replace(chDuelRenderEndTarget, chDuelRenderEndReplacement);
  console.log('Added 3D Arena JSX rendering to ChallengesPage');
}

fs.writeFileSync(appPath, code, 'utf8');
console.log('Challenges arena patched successfully!');
