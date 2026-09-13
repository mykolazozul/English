import fs from 'node:fs';

const appPath = 'src/App.jsx';
let content = fs.readFileSync(appPath, 'utf8');

const oldChatStart = "function FloatingChatWidget({state, nav}) {";
const oldChatEnd = "      <button\n        className={'floating-chat-fab' + (open ? ' active' : '')}\n        type=\"button\"\n        onClick={() => setOpen(!open)}\n        title=\"Швидкий чат з друзями\"\n        aria-label=\"Швидкий чат\"\n      >\n        <MessageCircle size={24} />\n        {hasNewMsg && <span className=\"floating-chat-badge\"></span>}\n      </button>\n    </div>\n  );\n}";

const newChatCode = `function FloatingChatWidget({state, nav}) {
  const [open, setOpen] = useState(false);
  const [friends, setFriends] = useState([]);
  const [activeFriend, setActiveFriend] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [replyingTo, setReplyingTo] = useState(null); // {id, sender, text}
  const [pinnedMsg, setPinnedMsg] = useState(null);
  const [lightboxImg, setLightboxImg] = useState(null);
  const [reactionsMap, setReactionsMap] = useState({});
  const [tgMenu, setTgMenu] = useState(null); // { msg, x, y, displayMsg, isMe }
  const [bubble, setBubble] = useState(null);
  const [bubbleFading, setBubbleFading] = useState(false);
  const [hasNewMsg, setHasNewMsg] = useState(false);
  const [lastMsgCount, setLastMsgCount] = useState(0);
  const [selectedMsgs, setSelectedMsgs] = useState(new Set());
  const [selectMode, setSelectMode] = useState(false);

  const longPressTimerRef = useRef(null);
  const messagesEndRef = useRef(null);

  const canSendPhoto = state.role === 'admin' || state.role === 'moderator' || String(state.nick).toLowerCase() === 'boss';
  const TG_REACTIONS = ['⭐', '✍️', '💡', '📅', '🔥', '⚡', '👍', '❤️', '😂', '🎉'];

  // Load friends list
  useEffect(() => {
    if (state.guest || !open) return;
    getFriends(state.nick).then(f => {
      setFriends(f || []);
      if (f?.length && !activeFriend) setActiveFriend(f[0].nick);
    }).catch(() => {});
  }, [open, state.nick, state.guest, activeFriend]);

  // Load pinned message for active friend
  useEffect(() => {
    if (!activeFriend) return;
    try {
      const saved = localStorage.getItem('ef_pinned_chat_' + activeFriend);
      if (saved) setPinnedMsg(JSON.parse(saved));
      else setPinnedMsg(null);
    } catch {}
  }, [activeFriend]);

  // Live message polling
  useEffect(() => {
    if (!activeFriend || state.guest) return;
    let alive = true;
    const fetchChat = async () => {
      try {
        const raw = await getChat(state.nick, activeFriend);
        if (alive && raw) {
          if (!open && raw.length > lastMsgCount && raw.length > 0) {
            const latest = raw[raw.length - 1];
            const senderNick = latest?.sender_nick || activeFriend;
            if (String(senderNick).toLowerCase() !== String(state.nick).toLowerCase()) {
              setBubble({ text: \`💬 Повідомлення від @\${senderNick}!\`, nick: senderNick });
              setBubbleFading(false);
              setHasNewMsg(false);
              setTimeout(() => {
                setBubbleFading(true);
                setTimeout(() => {
                  setBubble(null);
                  setBubbleFading(false);
                  setHasNewMsg(true);
                }, 500);
              }, 3000);
            }
          }
          setLastMsgCount(raw.length);
          setMessages(raw);
        }
      } catch {}
    };
    fetchChat();
    const interval = setInterval(fetchChat, 3000);
    return () => { alive = false; clearInterval(interval); };
  }, [open, activeFriend, state.nick, state.guest, lastMsgCount]);

  useEffect(() => {
    if (open) { setHasNewMsg(false); setBubble(null); }
  }, [open]);

  // Close context menu on click elsewhere
  useEffect(() => {
    const handleGlobalClick = () => setTgMenu(null);
    if (tgMenu) {
      window.addEventListener('click', handleGlobalClick);
      return () => window.removeEventListener('click', handleGlobalClick);
    }
  }, [tgMenu]);

  const send = async (e) => {
    e?.preventDefault();
    let t = censorMessage(input.trim());
    if (!activeFriend || !t) return;
    if (replyingTo) {
      t = \`[quote:\${replyingTo.sender}:\${replyingTo.text.slice(0, 45)}]\${t}\`;
      setReplyingTo(null);
    }
    setInput('');
    try {
      const sent = await sendChat(state.nick, activeFriend, t);
      if (sent) setMessages(prev => [...prev, sent]);
      const raw = await getChat(state.nick, activeFriend);
      if (raw) setMessages(raw);
    } catch {}
  };

  const handleAddReaction = (msgId, emoji) => {
    setReactionsMap(prev => {
      const cur = prev[msgId] || {};
      const count = (cur[emoji] || 0) + 1;
      return { ...prev, [msgId]: { ...cur, [emoji]: count } };
    });
    setTgMenu(null);
    sendChatReaction(msgId, emoji).catch(() => {});
    emitSiteToast(\`Реакцію \${emoji} додано!\`, 'ok');
  };

  const handlePin = (m) => {
    setPinnedMsg(m);
    try {
      localStorage.setItem('ef_pinned_chat_' + activeFriend, JSON.stringify(m));
    } catch {}
    setTgMenu(null);
    emitSiteToast('Повідомлення закріплено 📌', 'ok');
  };

  const handleCopy = (txt) => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(txt).then(() => {
        emitSiteToast('Текст скопійовано в буфер 📋', 'ok');
      }).catch(() => {});
    }
    setTgMenu(null);
  };

  const handleForward = (txt, sender) => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(\`[Переслано від @\${sender}]: \${txt}\`);
      emitSiteToast('Повідомлення підготовлено для пересилання ↗️', 'ok');
    }
    setTgMenu(null);
  };

  const handleDelete = (msgId) => {
    setMessages(prev => prev.filter(x => x.id !== msgId));
    if (pinnedMsg?.id === msgId) {
      setPinnedMsg(null);
      localStorage.removeItem('ef_pinned_chat_' + activeFriend);
    }
    setTgMenu(null);
    emitSiteToast('Повідомлення видалено 🗑️', 'info');
  };

  const openTgMenu = (m, clientX, clientY, displayMsg, isMe) => {
    const clampedX = Math.min(Math.max(16, clientX - 80), window.innerWidth - 260);
    const clampedY = Math.min(Math.max(16, clientY - 140), window.innerHeight - 300);
    setTgMenu({ msg: m, x: clampedX, y: clampedY, displayMsg, isMe });
  };

  const handleTouchStart = (m, e, displayMsg, isMe) => {
    if (!e.touches || !e.touches[0]) return;
    const x = e.touches[0].clientX;
    const y = e.touches[0].clientY;
    longPressTimerRef.current = setTimeout(() => {
      openTgMenu(m, x, y, displayMsg, isMe);
    }, 450);
  };

  const handleTouchEnd = () => {
    if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);
  };

  const handlePhotoUpload = async (e) => {
    if (!canSendPhoto) return;
    const file = e.target.files?.[0];
    if (!file || !activeFriend) return;
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const dataUrl = ev.target.result;
      try {
        const sent = await sendChat(state.nick, activeFriend, \`[img]\${dataUrl}\`);
        if (sent) setMessages(prev => [...prev, sent]);
        const raw = await getChat(state.nick, activeFriend);
        if (raw) setMessages(raw);
      } catch {}
    };
    reader.readAsDataURL(file);
  };

  if (state.guest) return null;

  return (
    <div className="floating-chat-root">
      {/* Speech bubble notification */}
      {bubble && (
        <div className={\`chat-incoming-bubble\${bubbleFading ? ' fading' : ''}\`}>
          {bubble.text}
        </div>
      )}

      {open && (
        <div className="floating-chat-window card" style={{width: 340, height: 440}}>
          {/* Header with Telegram styling & Contacts switcher */}
          <div className="floating-chat-header" style={{padding:'10px 14px'}}>
            <div style={{display:'flex',alignItems:'center',gap:8,flex:1,minWidth:0}}>
              <span className="live-dot pulse"></span>
              <div style={{display:'flex',flexDirection:'column',minWidth:0}}>
                <b style={{fontSize:13,whiteSpace:'nowrap',color:'var(--text)'}}>
                  {activeFriend ? \`@\${activeFriend}\` : 'Чат'}
                </b>
                <span className="muted" style={{fontSize:10}}>
                  {friends.some(f => f.nick === activeFriend && f.is_online) ? '🟢 в мережі' : '⚪ був нещодавно'}
                </span>
              </div>
            </div>

            {/* Friend Selector Dropdown */}
            <div style={{display:'flex',alignItems:'center',gap:6}}>
              <select
                className="chat-friend-select"
                value={activeFriend || ''}
                onChange={e => setActiveFriend(e.target.value)}
                style={{
                  fontSize: 11,
                  padding: '4px 8px',
                  borderRadius: 8,
                  background: 'var(--surface, #1e293b)',
                  color: 'var(--text, #f8fafc)',
                  border: '1px solid var(--border)',
                  maxWidth: 110,
                  outline: 'none'
                }}
              >
                {friends.length === 0 && <option value="">(Без друзів)</option>}
                {friends.map(f => (
                  <option key={f.nick} value={f.nick}>@{f.nick}</option>
                ))}
              </select>
              <button className="icon small" title="Гільдія друзів" onClick={() => { setOpen(false); nav('friends'); }}>
                ↗
              </button>
              <button className="icon small" onClick={() => setOpen(false)}>
                ✕
              </button>
            </div>
          </div>

          {/* Quick Friend Tabs Strip */}
          {friends.length > 1 && (
            <div className="floating-chat-tabs" style={{padding:'4px 8px',gap:6}}>
              {friends.slice(0, 5).map(f => (
                <button
                  key={f.nick}
                  type="button"
                  className={'floating-chat-tab' + (activeFriend === f.nick ? ' active' : '')}
                  onClick={() => setActiveFriend(f.nick)}
                  style={{display:'inline-flex',alignItems:'center',gap:4}}
                >
                  <AvatarIcon id={f.avatar || 'duo_owl'} size={18} />
                  <span>@{f.nick}</span>
                </button>
              ))}
            </div>
          )}

          {/* Pinned Message Banner */}
          {pinnedMsg && (
            <div className="chat-pinned-banner" onClick={() => emitSiteToast('📌 ' + (pinnedMsg.text || 'Вкладення'), 'info')}>
              <span className="chat-pinned-indicator">📌</span>
              <div className="chat-pinned-content">
                <b style={{fontSize:10,color:'var(--accent)',textTransform:'uppercase',letterSpacing:0.5}}>Закріплене</b>
                <div style={{fontSize:11,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',color:'var(--text)'}}>
                  {pinnedMsg.text ? censorMessage(pinnedMsg.text.replace(/\\[quote:[^\\/]+:([^\\/]+)\\]/g, '')) : '📷 Фото'}
                </div>
              </div>
              <button
                type="button"
                className="chat-pinned-unpin-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  setPinnedMsg(null);
                  try { localStorage.removeItem('ef_pinned_chat_' + activeFriend); } catch {}
                }}
                title="Відкріпити"
              >
                ✕
              </button>
            </div>
          )}

          {/* Messages Stream */}
          <div className="floating-chat-messages" style={{flex:1,padding:'10px 12px'}}>
            {messages.length === 0 && (
              <p className="muted small" style={{textAlign:'center',padding:20}}>
                Ще немає повідомлень з @{activeFriend || 'другом'}. Напишіть перше слово!
              </p>
            )}
            {messages.slice(-30).map(m => {
              const isMe = String(m.sender_nick || '').toLowerCase() === String(state.nick).toLowerCase();
              const rawText = m.text || '';
              const isImg = rawText.startsWith('[img]');
              
              let quoteSender = null;
              let quoteText = null;
              let displayMsg = rawText;
              if (rawText.startsWith('[quote:')) {
                const endIdx = rawText.indexOf(']');
                if (endIdx > 7) {
                  const parts = rawText.slice(7, endIdx).split(':');
                  quoteSender = parts[0];
                  quoteText = parts.slice(1).join(':');
                  displayMsg = rawText.slice(endIdx + 1);
                }
              }

              const msgReactions = reactionsMap[m.id] || {};

              return (
                <div
                  key={m.id || Math.random()}
                  className={'floating-chat-msg' + (isMe ? ' me' : '')}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    openTgMenu(m, e.clientX, e.clientY, displayMsg, isMe);
                  }}
                  onTouchStart={(e) => handleTouchStart(m, e, displayMsg, isMe)}
                  onTouchEnd={handleTouchEnd}
                  onTouchMove={handleTouchEnd}
                  title="Права кнопка миші або затискання — відкрити меню Telegram"
                  style={{cursor:'context-menu',position:'relative'}}
                >
                  {quoteText && (
                    <div className="chat-quote-bar" style={{borderLeft:'3px solid var(--accent)',paddingLeft:6,marginBottom:4,opacity:0.9}}>
                      <b style={{fontSize:10,color:'var(--accent)'}}>@{quoteSender}:</b>
                      <span style={{fontSize:10,marginLeft:4}}>{quoteText}</span>
                    </div>
                  )}

                  {isImg ? (
                    <img
                      src={rawText.slice(5)}
                      className="chat-msg-image"
                      alt="Вкладене фото"
                      onClick={() => setLightboxImg(rawText.slice(5))}
                      style={{cursor:'zoom-in',borderRadius:8,maxWidth:'100%',maxHeight:150}}
                    />
                  ) : (
                    <span>{censorMessage(displayMsg) || '🔒 Повідомлення'}</span>
                  )}

                  {/* Emoji Reactions Badges on Message */}
                  {Object.keys(msgReactions).length > 0 && (
                    <div style={{display:'flex',gap:4,flexWrap:'wrap',marginTop:4}}>
                      {Object.entries(msgReactions).map(([emoji, count]) => (
                        <span key={emoji} style={{fontSize:11,background:'rgba(0,0,0,0.2)',padding:'1px 5px',borderRadius:8}}>
                          {emoji} {count > 1 ? count : ''}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>

          {/* Replying Quote Preview Bar */}
          {replyingTo && (
            <div className="chat-reply-bar" style={{display:'flex',alignItems:'center',gap:8,padding:'6px 12px',background:'var(--surface-sunken)',borderTop:'1px solid var(--border)'}}>
              <div style={{fontSize:11,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',flex:1}}>
                ↩ Відповідь для <b>@{replyingTo.sender}</b>: <i>{replyingTo.text.slice(0, 30)}...</i>
              </div>
              <button type="button" className="icon small" onClick={() => setReplyingTo(null)}>✕</button>
            </div>
          )}

          {/* Input Bar with Blue Circular Paper-Airplane Send Button */}
          <form className="floating-chat-input-bar" onSubmit={send} style={{alignItems:'center'}}>
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder="Повідомлення…"
              style={{fontSize:13}}
            />
            {canSendPhoto && (
              <label className="chat-admin-photo-btn" title="Відправити фото (тільки адмін / Boss)" style={{cursor:'pointer',fontSize:18,padding:'0 4px'}}>
                📷
                <input type="file" accept="image/*" style={{display:'none'}} onChange={handlePhotoUpload}/>
              </label>
            )}
            <button
              type="submit"
              className="chat-send-plane-btn"
              disabled={!input.trim()}
              title="Надіслати"
            >
              <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
              </svg>
            </button>
          </form>

          {/* High-Res Lightbox Modal */}
          {lightboxImg && (
            <div className="chat-lightbox-overlay" onClick={() => setLightboxImg(null)}>
              <div className="chat-lightbox-content" onClick={e => e.stopPropagation()}>
                <img src={lightboxImg} alt="Збільшене фото" />
                <button type="button" className="chat-lightbox-close" onClick={() => setLightboxImg(null)}>✕</button>
              </div>
            </div>
          )}

          {/* Telegram Context Menu Modal */}
          {tgMenu && (
            <>
              <div className="tg-context-backdrop" onClick={() => setTgMenu(null)} />
              <div className="tg-context-menu" style={{top: tgMenu.y, left: tgMenu.x}}>
                {/* Horizontal Emojis Reaction Strip */}
                <div className="tg-reaction-strip">
                  {TG_REACTIONS.map(emoji => (
                    <button
                      key={emoji}
                      type="button"
                      className="tg-reaction-btn"
                      onClick={() => handleAddReaction(tgMenu.msg.id, emoji)}
                      title={\`Поставити реакцію \${emoji}\`}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>

                {/* Context Menu Actions */}
                <div className="tg-menu-list">
                  <button
                    type="button"
                    className="tg-menu-item"
                    onClick={() => {
                      setReplyingTo({ id: tgMenu.msg.id, sender: tgMenu.msg.sender_nick || activeFriend, text: tgMenu.displayMsg });
                      setTgMenu(null);
                    }}
                  >
                    <span>↩</span> Відповісти
                  </button>
                  <button
                    type="button"
                    className="tg-menu-item"
                    onClick={() => handlePin(tgMenu.msg)}
                  >
                    <span>📌</span> Закріпити
                  </button>
                  <button
                    type="button"
                    className="tg-menu-item"
                    onClick={() => handleCopy(tgMenu.displayMsg)}
                  >
                    <span>📋</span> Скопіювати текст
                  </button>
                  <button
                    type="button"
                    className="tg-menu-item"
                    onClick={() => handleForward(tgMenu.displayMsg, tgMenu.msg.sender_nick || activeFriend)}
                  >
                    <span>↗️</span> Переслати
                  </button>
                  {(tgMenu.isMe || canSendPhoto) && (
                    <button
                      type="button"
                      className="tg-menu-item danger"
                      onClick={() => handleDelete(tgMenu.msg.id)}
                    >
                      <span>🗑️</span> Видалити
                    </button>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* FAB Button */}
      <button
        className={'floating-chat-fab' + (open ? ' active' : '')}
        type="button"
        onClick={() => setOpen(!open)}
        title="Швидкий чат з друзями"
        aria-label="Швидкий чат"
      >
        <MessageCircle size={24} />
        {hasNewMsg && <span className="floating-chat-badge"></span>}
      </button>
    </div>
  );
}`;

const startIndex = content.indexOf(oldChatStart);
const endIndex = content.indexOf(oldChatEnd) + oldChatEnd.length;

if (startIndex === -1 || endIndex === -1) {
  console.error('Could not locate FloatingChatWidget block in App.jsx');
  process.exit(1);
}

content = content.slice(0, startIndex) + newChatCode + content.slice(endIndex);
fs.writeFileSync(appPath, content, 'utf8');
console.log('Successfully upgraded FloatingChatWidget to Telegram interactions!');
