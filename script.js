(function(){
  // Initialize when DOM is ready to avoid errors when script is loaded in <head>
  function initChatWidget(){
    // Configuration: set window.ChatbotConfig = { apiUrl, apiKey, fetchOptions, socketUrl } before injecting if you want real backend.
    // Example:
    // window.ChatbotConfig = { socketUrl: 'http://localhost:3001' };

    const PREFIX = 'aiofc-';

    // parse cid (admin id) from script query param if present
    function getCidFromScripts(){
      try{
        const scripts = document.getElementsByTagName('script');
        for(let i=0;i<scripts.length;i++){
          const s = scripts[i];
          if(!s.src) continue;
          if(s.src.indexOf('script.js') !== -1 && s.src.indexOf('?') !== -1){
            const url = new URL(s.src, window.location.href);
            return url.searchParams.get('cid');
          }
        }
      }catch(e){/* ignore */}
      return null;
    }

    let adminId = getCidFromScripts();

    // Inject CSS — try to fetch owner-specific settings and build CSS, otherwise use defaults
    async function buildAndInjectStyles(){
      const defaultTheme = {
        themeColorHex: '#6366f1',
        themeTextColorHex: '#ffffff',
        botBg: '#f1f5f9',
        userBg: 'linear-gradient(135deg,#6366f1,#06b6d4)'
      };

      let settings = null;
      if(adminId){
        try{
          const cfgGlobal = window.ChatbotConfig || {};
          // Resolve API base: prefer explicit config, else derive origin from the script tag that loaded this file
          const apiBase = cfgGlobal.apiBase || (function(){
            try{
              const cur = document.currentScript;
              if(cur && cur.src){ const u = new URL(cur.src, window.location.href); return u.origin; }
              const scripts = document.getElementsByTagName('script');
              for(let i=0;i<scripts.length;i++){ const s = scripts[i]; if(s.src && s.src.indexOf('script.js') !== -1){ const u = new URL(s.src, window.location.href); return u.origin; } }
            }catch(e){}
            return '';
          })();

          // Build endpoint — if apiBase is empty we use relative path so same-origin works
          const endpoint = (apiBase ? apiBase.replace(/\/$/, '') : '') + '/api/chatbotui?ownerId=' + encodeURIComponent(adminId);
          if (console && console.debug) console.debug('[chat widget] fetching settings from', endpoint);

          const resp = await fetch(endpoint, { cache: 'no-store' });
          if(resp.ok){
            const j = await resp.json();
            if(j && j.success && j.data && j.data.settings) settings = j.data.settings;
          } else {
            console.warn('[chat widget] settings fetch failed', resp.status);
          }
        }catch(e){ console.warn('[chat widget] failed to fetch owner settings', e); }
      }

      const themeColor = (settings && settings.themeColorHex) || defaultTheme.themeColorHex;
      const themeText = (settings && settings.themeTextColorHex) || defaultTheme.themeTextColorHex;
      const botBg = (settings && settings.chatBgColor && settings.chatBgColor.indexOf('bg-')===0) ? null : (settings && settings.botBubbleColor) || defaultTheme.botBg; // best-effort
      const userBg = (settings && settings.userBubbleColor) || defaultTheme.userBg;

      // Build CSS using settings where possible. We keep all original rules but replace theme-related colors.
      const css = `
    .${PREFIX}container { position: fixed; left: 20px; bottom: 40px; z-index: 999999; font-family: Inter, ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial; }
    .${PREFIX}button { width: 64px; height: 64px; border-radius: 999px; background: linear-gradient(135deg, ${themeColor}, ${adjustHex(themeColor, -18)}); color: ${themeText}; box-shadow: 0 10px 30px rgba(2,6,23,0.2); display:flex; align-items:center; justify-content:center; cursor:pointer; border: none; transition: transform .12s ease, box-shadow .12s ease; }
    .${PREFIX}button:active { transform: scale(.98); }
    .${PREFIX}badge { position:absolute; right:-6px; top:-6px; background:#ef4444; color:#fff; min-width:18px; height:18px; border-radius:999px; display:flex; align-items:center; justify-content:center; font-size:12px; padding:0 6px; box-shadow: 0 4px 10px rgba(2,6,23,0.12); }

    .${PREFIX}panel { position: fixed; left: 20px; bottom: 120px; width: 360px; max-width: calc(100vw - 40px); height: 560px; max-height: calc(100vh - 80px); background: ${settings && settings.chatBgColor ? (cssFromBg(settings.chatBgColor) || '#fff') : '#fff'}; border-radius: 12px; box-shadow: 0 20px 60px rgba(2,6,23,0.18); overflow: hidden; display:flex; flex-direction:column; transform: translateX(-18px) translateY(8px) scale(.98); opacity:0; pointer-events:none; transition: all .18s cubic-bezier(.2,.9,.2,1); }
    .${PREFIX}panel.open { transform: translateX(0) translateY(0) scale(1); opacity:1; pointer-events:auto; }
    .${PREFIX}header { padding:12px 14px; display:flex; align-items:center; gap:10px; border-bottom: 1px solid #f3f4f6; }
    .${PREFIX}title { font-weight: 600; font-size:14px; color:#0f172a; }
    .${PREFIX}subtitle { font-size:12px; color:#64748b; }
    .${PREFIX}close { margin-left:auto; background:transparent; border:none; cursor:pointer; color:#475569; padding:6px; border-radius:6px; }
    .${PREFIX}messages { padding:12px; overflow:auto; display:flex; flex-direction:column; gap:10px; background: linear-gradient(180deg,#ffffff 0%, #fbfdff 100%); flex:1; }
    .${PREFIX}bubble { max-width: 78%; padding:10px 12px; border-radius: 12px; line-height:1.3; font-size:14px; box-shadow: 0 4px 16px rgba(2,6,23,0.06); }
    .${PREFIX}bot { align-self:flex-start; background: ${botBg || '#f1f5f9'}; color:#0f172a; border-bottom-left-radius:4px; }
    .${PREFIX}user { align-self:flex-end; background: ${userBg}; color:${themeText}; border-bottom-right-radius:4px; }
    .${PREFIX}inputArea { padding: 10px; border-top: 1px solid #eef2f7; display:flex; gap:8px; align-items:flex-end; }
    .${PREFIX}textarea { flex:1; min-height:44px; max-height:120px; padding:10px 12px; border-radius:10px; border:1px solid #e6edf3; outline:none; resize:none; font-size:14px; font-family:inherit; }
    .${PREFIX}send { background:linear-gradient(135deg,#06b6d4,#3b82f6); color:#fff; border:none; padding:10px 12px; border-radius:10px; cursor:pointer; display:flex; align-items:center; gap:8px; }
    .${PREFIX}meta { font-size:11px; color:#94a3b8; padding:6px 12px; }
    .${PREFIX}typing { display:inline-block; width:36px; height:12px; }
    .${PREFIX}typing span { display:inline-block; width:8px; height:8px; background:#cbd5e1; border-radius:999px; margin-right:6px; animation: ${PREFIX}blink 1s infinite; }
    .${PREFIX}typing span:nth-child(2){ animation-delay:.12s } .${PREFIX}typing span:nth-child(3){ animation-delay:.24s }
    @keyframes ${PREFIX}blink { 0%{opacity:.15}50%{opacity:1}100%{opacity:.15} }

    .${PREFIX}preform { padding:16px; display:flex; flex-direction:column; gap:8px; }
    .${PREFIX}preform input { width:100%; padding:8px 10px; border:1px solid #e6edf3; border-radius:8px; }
    .${PREFIX}preform .actions { display:flex; gap:8px; }

    @media (max-width: 520px) {
      .${PREFIX}panel { left: 12px; right: 12px; width: auto; bottom: 80px; height: 64vh; }
      .${PREFIX}container { left: 12px; bottom: 18px; }
    }
    `;

      const style = document.createElement('style');
      style.id = PREFIX + 'styles';
      style.appendChild(document.createTextNode(css));
      document.head.appendChild(style);

      // return the settings so caller can apply them to the DOM
      return settings;
    }

    // small helper: slightly adjust a hex color's brightness; amount -100..100
    function adjustHex(hex, amount){
      try{
        let col = hex.replace('#','');
        if(col.length === 3) col = col.split('').map(c=>c+c).join('');
        const num = parseInt(col,16);
        let r = (num >> 16) + amount;
        let g = ((num >> 8) & 0x00FF) + amount;
        let b = (num & 0x0000FF) + amount;
        r = Math.max(0, Math.min(255, r));
        g = Math.max(0, Math.min(255, g));
        b = Math.max(0, Math.min(255, b));
        return '#' + ( (1<<24) + (r<<16) + (g<<8) + b ).toString(16).slice(1);
      }catch(e){ return hex; }
    }

    // best-effort convert known tailwind-like bg classes to simple hexs (minimal)
    function cssFromBg(bgClass){
      if(!bgClass) return null;
      const map = {
        'bg-blue-500':'#3b82f6',
        'bg-slate-900':'#0f172a',
        'bg-blue-600':'#2563eb',
        'bg-slate-800':'#1f2937'
      };
      return map[bgClass] || null;
    }

    // Kick off building styles (async) — keep a promise so we can apply settings to DOM later
    const settingsPromise = buildAndInjectStyles().catch(()=>null);

    // Create container
    const container = document.createElement('div');
    container.className = PREFIX + 'container';

    // Button
    const button = document.createElement('button');
    button.className = PREFIX + 'button';
    button.setAttribute('aria-label','Open assistant');
    button.innerHTML = `
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 3C7.03 3 3 6.58 3 11C3 13.16 3.95 15.11 5.58 16.57C5.21 17.6 4.6 19.7 4.51 19.94C4.43 20.16 4.6 20.4 4.83 20.4C6.32 20.4 8.38 19.75 9.17 19.5C10.66 20.02 11.82 20.29 12 20.29C16.97 20.29 21 16.71 21 12.29C21 7.87 16.97 4.29 12 4.29V3Z" fill="white"/>
      </svg>
    `;

    const badge = document.createElement('span');
    badge.className = PREFIX + 'badge';
    badge.textContent = ' ';
    badge.style.display = 'none';
    button.appendChild(badge);

    // Panel
    const panel = document.createElement('div');
    panel.className = PREFIX + 'panel';
    panel.setAttribute('role','dialog');
    panel.setAttribute('aria-hidden','true');

    panel.innerHTML = `
      <div class="${PREFIX}header">
        <div style="display:flex;flex-direction:column;">
          <div class="${PREFIX}title">Assistant</div>
          <div class="${PREFIX}subtitle">Ask anything — powered by your app</div>
        </div>
        <button class="${PREFIX}close" aria-label="Close chat">✕</button>
      </div>
      <div class="${PREFIX}messages" aria-live="polite"></div>
      <div class="${PREFIX}preform" style="display:none;">
        <input class="${PREFIX}name" placeholder="Your name" />
        <input class="${PREFIX}email" placeholder="Email" />
        <input class="${PREFIX}phone" placeholder="Phone" />
        <div class="actions" style="display:flex; gap:8px; justify-content:flex-end; margin-top:6px;">
          <button class="${PREFIX}start" style="background:#06b6d4;color:#fff;border:none;padding:8px 12px;border-radius:8px;cursor:pointer">Start Chat</button>
        </div>
      </div>
      <div class="${PREFIX}meta">Pro tip: Press Enter to send, Shift+Enter for newline</div>
      <div class="${PREFIX}inputArea">
        <textarea class="${PREFIX}textarea" placeholder="Type your message..."></textarea>
        <button class="${PREFIX}send" aria-label="Send message">Send</button>
      </div>
    `;

    container.appendChild(button);
    container.appendChild(panel);
    document.body.appendChild(container);

    const messagesEl = panel.querySelector('.' + PREFIX + 'messages');
    const preFormEl = panel.querySelector('.' + PREFIX + 'preform');
    const nameInput = panel.querySelector('.' + PREFIX + 'name');
    const emailInput = panel.querySelector('.' + PREFIX + 'email');
    const phoneInput = panel.querySelector('.' + PREFIX + 'phone');
    const startBtn = panel.querySelector('.' + PREFIX + 'start');
    const textarea = panel.querySelector('.' + PREFIX + 'textarea');
    const sendBtn = panel.querySelector('.' + PREFIX + 'send');
    const closeBtn = panel.querySelector('.' + PREFIX + 'close');

    let unreadCount = 0;
    let open = false;
    let convo = JSON.parse(sessionStorage.getItem(PREFIX + 'convo') || '[]');

    function renderConvo() {
      messagesEl.innerHTML = '';
      convo.forEach(item => appendMessage(item.role, item.text, false));
      scrollBottom();
    }

    function saveConvo() {
      try{ sessionStorage.setItem(PREFIX + 'convo', JSON.stringify(convo)); } catch(e){}
    }

    function openPanel() {
      panel.classList.add('open');
      panel.setAttribute('aria-hidden','false');
      open = true;
      badge.style.display = 'none';
      unreadCount = 0;
      // if no metadata saved, show pre chat form
      const meta = JSON.parse(localStorage.getItem(PREFIX + 'meta') || 'null');
      if(!meta){ preFormEl.style.display = 'flex'; messagesEl.style.display = 'none'; textarea.style.display = 'none'; sendBtn.style.display = 'none'; } else { preFormEl.style.display = 'none'; messagesEl.style.display = 'flex'; textarea.style.display = ''; sendBtn.style.display = ''; }
      textarea.focus();
      renderConvo();
    }

    function closePanel() {
      panel.classList.remove('open');
      panel.setAttribute('aria-hidden','true');
      open = false;
      button.focus();
    }

    function togglePanel(){ open ? closePanel() : openPanel(); }

    button.addEventListener('click', togglePanel);
    closeBtn.addEventListener('click', closePanel);

    // Accessibility: close on Esc
    document.addEventListener('keydown', (e) => {
      if(e.key === 'Escape' && open) closePanel();
    });

    function scrollBottom(){ messagesEl.scrollTop = messagesEl.scrollHeight; }

    function appendMessage(role, text, save=true){
      const msg = document.createElement('div');
      msg.className = PREFIX + 'bubble ' + (role === 'user' ? PREFIX + 'user' : PREFIX + 'bot');
      msg.textContent = text;
      messagesEl.appendChild(msg);
      if(save){ convo.push({role, text, ts: Date.now()}); saveConvo(); }
      scrollBottom();
    }

    function showTyping(){
      const typing = document.createElement('div');
      typing.className = PREFIX + 'bubble ' + PREFIX + 'bot';
      typing.setAttribute('data-typing','1');
      typing.innerHTML = `<span class="${PREFIX}typing"><span></span><span></span><span></span></span>`;
      messagesEl.appendChild(typing);
      scrollBottom();
      return typing;
    }

    function removeTyping(typingEl){ if(typingEl && typingEl.parentNode) typingEl.parentNode.removeChild(typingEl); }

    // --- Socket setup for user ---
    const cfg = window.ChatbotConfig || {};
    const SOCKET_URL = cfg.socketUrl || cfg.socket || 'http://localhost:3001';
    let socket = null;
    let userId = localStorage.getItem(PREFIX + 'userId');
    if (!userId) {
      userId = 'u_' + Math.random().toString(36).slice(2,9);
      localStorage.setItem(PREFIX + 'userId', userId);
    }

    function loadSocketClient(){
      return new Promise((resolve, reject) => {
        if (window.io) return resolve(window.io);
        const s = document.createElement('script');
        s.src = 'https://cdn.socket.io/4.7.2/socket.io.min.js';
        s.onload = () => resolve(window.io);
        s.onerror = reject;
        document.head.appendChild(s);
      });
    }

    let socketConnected = false;
    loadSocketClient().then((io) => {
      try{
        socket = io(SOCKET_URL, { query: { role: 'user', userId } });
        socket.on('connect', () => {
          socketConnected = true;
          console.log('[chat widget] connected to socket', socket.id, 'userId', userId);
          // if we already have metadata saved locally, send it to server so owner/admin is aware
          const meta = JSON.parse(localStorage.getItem(PREFIX + 'meta') || 'null');
          if(meta && socket){
            socket.emit('setMetadata', Object.assign({ userId }, meta));
          }
        });

        socket.on('message', (msg) => {
          // server forwards owner messages
          if (msg && msg.from === 'owner') {
            appendMessage('bot', msg.text);
          }
        });

        socket.on('disconnect', () => {
          socketConnected = false;
          console.log('[chat widget] socket disconnected');
        });
      } catch (e) { console.error('socket init error', e); }
    }).catch(()=>{/* ignore load errors */});

    // start button handler — collect metadata, store and send to backend
    startBtn.addEventListener('click', () => {
      const name = (nameInput && nameInput.value && nameInput.value.trim()) ? nameInput.value.trim() : null;
      const email = (emailInput && emailInput.value && emailInput.value.trim()) ? emailInput.value.trim() : null;
      const phone = (phoneInput && phoneInput.value && phoneInput.value.trim()) ? phoneInput.value.trim() : null;
      const meta = { username: name, useremail: email, userphone: phone, ownerId: adminId || null };
      try{ localStorage.setItem(PREFIX + 'meta', JSON.stringify(meta)); } catch(e){}
      // send to backend via socket if connected
      if(socket && socketConnected){
        socket.emit('setMetadata', Object.assign({ userId }, meta));
      } else {
        // as fallback call metadata HTTP endpoint
        try{ const BACKEND = (window.ChatbotConfig || {}).socketUrl || 'http://localhost:3001'; fetch(BACKEND + '/chats/' + encodeURIComponent(userId) + '/metadata', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify(meta) }).catch(()=>{}); } catch(e){}
      }
      // hide preform and show chat
      preFormEl.style.display = 'none'; messagesEl.style.display = 'flex'; textarea.style.display = ''; sendBtn.style.display = '';
      textarea.focus();
    });

    async function sendMessage(message) {
      if(!message || !message.trim()) return;
      appendMessage('user', message);
      textarea.value = '';
      textarea.style.height = '';

      const typingEl = showTyping();

      // if user configured an API endpoint use it
      const cfg = window.ChatbotConfig || {};
      try {
        if(cfg.apiUrl){
          const body = cfg.buildPayload ? cfg.buildPayload(convo.concat({role:'user', text:message})) : { message };
          const headers = Object.assign({'Content-Type':'application/json'}, cfg.apiKey ? {'Authorization': 'Bearer ' + cfg.apiKey } : {});
          const res = await fetch(cfg.apiUrl, Object.assign({ method:'POST', headers, body: JSON.stringify(body) }, cfg.fetchOptions || {}));
          if(!res.ok) throw new Error('Network response not ok');
          const data = await res.json();
          const botText = (data && (data.reply || data.message || data.text)) || JSON.stringify(data);
          removeTyping(typingEl);
          appendMessage('bot', botText);
        } else if (socket && socketConnected) {
          // send via socket to backend; backend will forward to owners
          // include owner/admin id if available so server can associate owner
          const meta = JSON.parse(localStorage.getItem(PREFIX + 'meta') || 'null');
          const ownerId = (meta && meta.ownerId) || adminId || null;
          socket.emit('message', { text: message, ownerId });
          // backend may respond via 'message' event from owner; show fallback typing
          await new Promise(r => setTimeout(r, 300));
          removeTyping(typingEl);
        } else {
          // fallback: simple simulated reply
          await new Promise(r => setTimeout(r, 700 + Math.random()*700));
          removeTyping(typingEl);
          appendMessage('bot', `Echo: ${message}`);
        }
      } catch(err){
        removeTyping(typingEl);
        appendMessage('bot', 'Sorry, something went wrong. ' + (err.message || ''));
        console.error('Chatbot error', err);
      }

      if(!open){ unreadCount++; badge.style.display = 'flex'; badge.textContent = unreadCount; }
    }

    // Send on button click
    sendBtn.addEventListener('click', () => sendMessage(textarea.value));

    // Handle Enter / Shift+Enter
    textarea.addEventListener('keydown', (e) => {
      if(e.key === 'Enter' && !e.shiftKey){
        e.preventDefault();
        sendMessage(textarea.value);
      }
    });

    // auto-grow textarea
    textarea.addEventListener('input', () => {
      textarea.style.height = 'auto';
      textarea.style.height = Math.min(textarea.scrollHeight, 140) + 'px';
    });

    // load previous convo
    renderConvo();

    // Apply settings returned from API to the UI (header, prechat form, welcome text)
    function applySettingsToUI(settings){
      if(!settings) return;
      try{
        const titleEl = panel.querySelector('.' + PREFIX + 'title');
        const subtitleEl = panel.querySelector('.' + PREFIX + 'subtitle');
        if(titleEl && settings.headerName) titleEl.textContent = settings.headerName;
        if(subtitleEl && settings.headerMessage) subtitleEl.textContent = settings.headerMessage;

        // pre-chat heading (use as start button label when provided)
        if(settings.preChatHeading){
          const start = panel.querySelector('.' + PREFIX + 'start');
          if(start) start.textContent = settings.preChatHeading;
        }

        // show/hide preform according to settings
        if(typeof settings.showPreChatForm !== 'undefined'){
          if(settings.showPreChatForm === false){
            preFormEl.style.display = 'none';
            messagesEl.style.display = 'flex';
            textarea.style.display = '';
            sendBtn.style.display = '';
          } else {
            // If true, only show preform when no meta saved
            const meta = JSON.parse(localStorage.getItem(PREFIX + 'meta') || 'null');
            if(!meta){ preFormEl.style.display = 'flex'; messagesEl.style.display = 'none'; textarea.style.display = 'none'; sendBtn.style.display = 'none'; }
          }
        }

        // name/email/phone fields visibility and required flags
        if(typeof settings.showNameField !== 'undefined') nameInput.style.display = settings.showNameField ? '' : 'none';
        if(typeof settings.requireNameField !== 'undefined') nameInput.required = !!settings.requireNameField;
        if(typeof settings.showEmailField !== 'undefined') emailInput.style.display = settings.showEmailField ? '' : 'none';
        if(typeof settings.requireEmailField !== 'undefined') emailInput.required = !!settings.requireEmailField;
        if(typeof settings.showPhoneField !== 'undefined') phoneInput.style.display = settings.showPhoneField ? '' : 'none';
        if(typeof settings.requirePhoneField !== 'undefined') phoneInput.required = !!settings.requirePhoneField;

        // Use bubbleText as initial welcome message if convo empty
        if(convo.length === 0 && settings.bubbleText){
          // only append if there are no messages
          if(messagesEl.children.length === 0) appendMessage('bot', settings.bubbleText);
        }
      }catch(e){ console.warn('[chat widget] applySettings failed', e); }
    }

    // debug: show parsed adminId
    try{ if (console && console.debug) console.debug('[chat widget] parsed adminId:', adminId); }catch(e){}

    // When settingsPromise resolves, apply returned settings to UI and then show welcome message
    settingsPromise.then((s)=>{
      try{ if (console && console.debug) console.debug('[chat widget] fetched settings:', s); }catch(e){}
      const settings = s || null;
      applySettingsToUI(settings);

      // show welcome message after applying settings (so API bubbleText can override)
      if(convo.length === 0){
        setTimeout(()=>{
          const welcome = settings && settings.bubbleText ? settings.bubbleText : null;
          if(welcome) {
            if(messagesEl.children.length === 0) appendMessage('bot', welcome);
          } else {
            if(messagesEl.children.length === 0) appendMessage('bot', 'Hi! I\'m your assistant — ask me anything.');
          }
        }, 600);
      }
    }).catch((err)=>{
      console.warn('[chat widget] settingsPromise failed', err);
      if(convo.length === 0){ setTimeout(()=>{ if(messagesEl.children.length === 0) appendMessage('bot', 'Hi! I\'m your assistant — ask me anything.'); }, 600); }
    });

    // Expose small API
    window.AIOFC_Chat = {
      open: openPanel,
      close: closePanel,
      send: sendMessage,
      clear: () => { convo = []; saveConvo(); renderConvo(); }
    };

    // welcome message if empty
    if(convo.length === 0){
      setTimeout(()=> appendMessage('bot', 'Hi! I\'m your assistant — ask me anything.'), 600);
    }

  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initChatWidget);
  } else {
    initChatWidget();
  }

})();