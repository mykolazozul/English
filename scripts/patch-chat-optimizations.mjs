import fs from 'fs';

const appPath = 'src/App.jsx';
let code = fs.readFileSync(appPath, 'utf8');

// 1. Add ef-open-chat listener and displayMessages memoization in FloatingChatWidget
const chatStartTarget = `  const longPressTimerRef = useRef(null);
  const messagesEndRef = useRef(null);

  const canSendPhoto = state.role === 'admin' || state.role === 'moderator' || String(state.nick).toLowerCase() === 'boss';
  const TG_REACTIONS = ['⭐', '✍️', '💡', '📅', '🔥', '⚡', '👍', '❤️', '😂', '🎉'];`;

const chatStartReplacement = `  const longPressTimerRef = useRef(null);
  const messagesEndRef = useRef(null);

  const canSendPhoto = state.role === 'admin' || state.role === 'moderator' || String(state.nick).toLowerCase() === 'boss';
  const TG_REACTIONS = ['⭐', '✍️', '💡', '📅', '🔥', '⚡', '👍', '❤️', '😂', '🎉'];

  // Global listener to open floating chat from profile, friends page or duel invite
  useEffect(() => {
    const handleOpenChat = (e) => {
      const { targetNick, duelInvite } = e.detail || {};
      setOpen(true);
      if (targetNick) {
        setActiveFriend(targetNick);
      }
      if (duelInvite) {
        setInput('⚔️ Викликаю тебе на лицарську дуель у Залі Суперників! Приймеш виклик?');
      }
    };
    window.addEventListener('ef-open-chat', handleOpenChat);
    return () => window.removeEventListener('ef-open-chat', handleOpenChat);
  }, []);

  // Performance optimization: slice messages to last 80 for silky smooth rendering
  const displayMessages = useMemo(() => {
    return messages.length > 80 ? messages.slice(-80) : messages;
  }, [messages]);`;

if (code.includes(chatStartTarget)) {
  code = code.replace(chatStartTarget, chatStartReplacement);
  console.log('Added ef-open-chat listener and displayMessages memo in FloatingChatWidget');
}

// In FloatingChatWidget message polling: use dynamic interval (3s when open, 8s when closed)
const pollingTarget = `    fetchChat();
    const interval = setInterval(fetchChat, 3000);
    return () => { alive = false; clearInterval(interval); };
  }, [open, activeFriend, state.nick, state.guest, lastMsgCount]);`;

const pollingReplacement = `    fetchChat();
    const interval = setInterval(fetchChat, open ? 3000 : 8000);
    return () => { alive = false; clearInterval(interval); };
  }, [open, activeFriend, state.nick, state.guest, lastMsgCount]);`;

if (code.includes(pollingTarget)) {
  code = code.replace(pollingTarget, pollingReplacement);
  console.log('Optimized chat polling interval (3s when open, 8s background)');
}

// Replace messages.map with displayMessages.map in message list rendering
const msgMapTarget = `{messages.map(m => {`;
const msgMapReplacement = `{displayMessages.map(m => {`;
if (code.includes(msgMapTarget)) {
  code = code.replace(msgMapTarget, msgMapReplacement);
  console.log('Switched message rendering to displayMessages');
}

fs.writeFileSync(appPath, code, 'utf8');
console.log('Chat optimizations applied!');
