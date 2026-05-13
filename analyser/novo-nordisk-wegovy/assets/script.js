/* ============================================================
   AKTIEKOMPAS · Delt JavaScript
   ============================================================ */

(function(){
  'use strict';

  // -------- MOBILE NAV --------
  const burger = document.querySelector('.nav-burger');
  const navLinks = document.querySelector('.nav-links');
  if(burger && navLinks){
    burger.addEventListener('click', ()=> navLinks.classList.toggle('open'));
  }

  // -------- ACTIVE NAV LINK --------
  const path = window.location.pathname;
  document.querySelectorAll('.nav-links a').forEach(a => {
    const href = a.getAttribute('href') || '';
    if(href === '/' && (path === '/' || path.endsWith('/index.html'))){
      a.classList.add('active');
    } else if(href !== '/' && path.startsWith(href.replace(/\/$/,''))){
      a.classList.add('active');
    }
  });

  // -------- REVEAL ON SCROLL --------
  const io = new IntersectionObserver((entries)=>{
    entries.forEach(e=>{
      if(e.isIntersecting){ e.target.classList.add('in'); io.unobserve(e.target); }
    });
  },{threshold:.1});
  document.querySelectorAll('.reveal').forEach(el=>io.observe(el));

  // -------- FAQ ACCORDION --------
  document.querySelectorAll('.faq-item').forEach(item=>{
    const q = item.querySelector('.faq-q');
    if(q) q.addEventListener('click',()=> item.classList.toggle('open'));
  });

  // -------- ANALYSIS FILTER --------
  const filterBtns = document.querySelectorAll('.filter-bar button');
  if(filterBtns.length){
    filterBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        filterBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const filter = btn.dataset.filter;
        document.querySelectorAll('.ana-card').forEach(card => {
          if(filter === 'all' || card.dataset.cat === filter){
            card.style.display = '';
          } else {
            card.style.display = 'none';
          }
        });
      });
    });
  }

  // -------- NEWSLETTER FORM --------
  document.querySelectorAll('.news form').forEach(form => {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const input = form.querySelector('input');
      const msg = form.querySelector('.success-msg');
      if(input) input.value = '';
      if(msg) msg.style.display = 'inline-block';
    });
  });

  // -------- AI CHATBOT --------
  const msgs = document.getElementById('chatMsgs');
  const input = document.getElementById('chatInput');
  const send  = document.getElementById('chatSend');
  const suggestBtns = document.querySelectorAll('.chat-suggest button');

  if(msgs && input && send){
    const history = [];

    const SYSTEM_PROMPT = `Du er AI-assistenten på Aktiekompas, en dansk uddannelses- og analyseplatform for aktieinvestorer.

═══ GRUNDLÆGGENDE PRINCIP (MÅ ALDRIG BRYDES) ═══
Aktiekompas udbyder IKKE rådgivning eller anbefalinger. Alle analyser og oplysninger er UDELUKKENDE til undervisning. Aktiekompas fratager sig alt ansvar for analyserne. Du skal handle og kommunikere ud fra dette princip i HVERT svar.

═══ ABSOLUTTE REGLER ═══
1. Du er IKKE autoriseret finansiel rådgiver og opererer ikke under Finanstilsynet.
2. Giv ALDRIG direkte køb-, salg- eller hold-anbefalinger på konkrete aktier eller værdipapirer.
3. Sig ALDRIG "du bør købe", "du skal sælge", "denne aktie er en god investering for dig" eller lignende personlig vurdering.
4. Hvis brugeren spørger "skal jeg købe X?" eller lignende: forklar venligt at du ikke kan give personlig rådgivning. Tilbyd i stedet at gennemgå relevante nøgletal, indikatorer og spørgsmål brugeren selv kan stille.
5. Mind brugeren om at de aldrig bør investere penge de ikke har råd til at tabe.
6. Inkluder en kort disclaimer-linje i bunden af HVERT svar der berører konkrete aktier eller investeringsbeslutninger. Brug formatet: "*Kun til undervisning — ikke rådgivning. Historiske afkast er ingen garanti for fremtidige afkast.*"

═══ DU MÅ GERNE (UDDANNENDE) ═══
- Forklare tekniske indikatorer: RSI, MACD, glidende gennemsnit, Bollinger-bånd, support/resistance, volumen.
- Forklare regnskabsposter og nøgletal: P/E, P/B, EV/EBITDA, DCF, FCF, ROIC, gearing, free cash flow.
- Forklare sektorer, makroøkonomiske begreber og markedsdynamikker.
- Hjælpe brugeren med at strukturere sin egen research.
- Foreslå hvilke spørgsmål brugeren selv bør stille før en beslutning.
- Henvise til at brugeren bør konsultere en autoriseret rådgiver der kender deres personlige økonomi.

═══ TONE ═══
- Tal dansk, venligt, klart og uddannende.
- Hold svar korte og fokuserede: 2-4 afsnit max, medmindre brugeren beder om dybde.
- Brug konkrete eksempler frem for abstrakte definitioner.
- Hvis du nævner specifikke tal/kursmål: påpeg at tallene er illustrative og kan være forældede.
- Du må gerne være ærlig om markedsrisici og spekulative aktiver.`;

    function addMsg(text, who, disclaimer){
      const m = document.createElement('div');
      m.className = 'msg ' + who;
      m.innerHTML = text;
      if(disclaimer){
        const d = document.createElement('div');
        d.className = 'disc';
        d.textContent = disclaimer;
        m.appendChild(d);
      }
      msgs.appendChild(m);
      msgs.scrollTop = msgs.scrollHeight;
      return m;
    }

    function addTyping(){
      const t = document.createElement('div');
      t.className = 'msg bot';
      t.id = 'typing-bubble';
      t.innerHTML = '<div class="typing"><span></span><span></span><span></span></div>';
      msgs.appendChild(t);
      msgs.scrollTop = msgs.scrollHeight;
      return t;
    }

    /**
     * Chat-funktion.
     *
     * VIGTIGT: Når siden køres lokalt eller på GitHub Pages, har den ikke
     * adgang til en sikker backend. Konfigurer endpoint via window.AKTIEKOMPAS_CHAT_API,
     * eller sæt den direkte herunder. Hvis ingen er sat, vises en demo-besked.
     *
     * Eksempel på Vercel/Cloudflare endpoint: '/api/chat'
     */
    const CHAT_API = (typeof window !== 'undefined' && window.AKTIEKOMPAS_CHAT_API) || '';

    async function chat(userText){
      if(!userText.trim()) return;
      addMsg(userText, 'user');
      history.push({role:'user', content:userText});
      input.value = '';
      const typingEl = addTyping();

      // Demo-tilstand når ingen backend er sat op
      if(!CHAT_API){
        setTimeout(() => {
          typingEl.remove();
          addMsg(
            'Dette er en <b>demo-tilstand</b>. AI-assistenten er ikke aktiveret endnu, da den kræver en sikker backend (Vercel/Cloudflare Workers) for at beskytte API-nøglen.<br><br>Når Aktiekompas går live, vil jeg her kunne forklare RSI, MACD, P/E, regnskabsanalyse osv. – som ren undervisning.',
            'bot',
            'Kun til undervisning — ikke rådgivning.'
          );
        }, 700);
        return;
      }

      try{
        const res = await fetch(CHAT_API, {
          method:'POST',
          headers:{'Content-Type':'application/json'},
          body: JSON.stringify({
            system: SYSTEM_PROMPT,
            messages: history
          })
        });
        const data = await res.json();
        typingEl.remove();
        const text = (data.text || data.content || 'Kunne ikke generere svar.').replace(/\n/g,'<br>');
        addMsg(text, 'bot');
        history.push({role:'assistant', content: text.replace(/<br>/g,'\n')});
      } catch(err){
        typingEl.remove();
        addMsg('Beklager – kunne ikke nå AI-tjenesten lige nu. Prøv venligst igen om et øjeblik.', 'bot');
        console.error(err);
      }
    }

    send.addEventListener('click', ()=> chat(input.value));
    input.addEventListener('keypress', e=>{
      if(e.key === 'Enter') chat(input.value);
    });
    suggestBtns.forEach(b=>{
      b.addEventListener('click', ()=> chat(b.dataset.q));
    });
  }
})();
