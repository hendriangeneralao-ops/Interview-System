const QUESTIONS = [
  { id: 1, category: 'General', text: 'Tell me a little about yourself and what you are aiming for after graduation.', hint: 'Keep it natural and personal. Mention your program, strengths, and future goals.' },
  { id: 2, category: 'Behavioral', text: 'Can you walk me through a challenge you faced in school or in your thesis and how you handled it?', hint: 'Use a clear story with the problem, your action, and the result.' },
  { id: 3, category: 'Situational', text: 'If you were under pressure with a deadline, how would you stay calm and still deliver quality work?', hint: 'Focus on planning, priorities, and how you manage stress.' },
  { id: 4, category: 'Behavioral', text: 'Tell me about a time you worked well with a team. What was your role and what made it work?', hint: 'Highlight teamwork, communication, and your contribution.' },
  { id: 5, category: 'General', text: 'What strengths or skills do you think would help you stand out to an employer?', hint: 'Mention both technical and soft skills that matter in entry-level work.' },
  { id: 6, category: 'Situational', text: 'If you were given a task that was completely new to you, how would you approach it?', hint: 'Show initiative, learning mindset, and how you would ask for support if needed.' }
];
const CAT_CLASS = { General: 'cat-general', Behavioral: 'cat-behavioral', Situational: 'cat-situational' };
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
const state = { current: 0, transcripts: {}, recording: false, recTimerInterval: null, recSeconds: 0, startTime: Date.now(), sessionTimerInterval: null, recognition: null, micAllowed: !!SpeechRecognition, currentDraft: '', silenceMs: 20000, confirmationMs: 8000 };
const $ = id => document.getElementById(id);
const qs = s => document.querySelector(s);
// Hide question UI and use voice-only mode
function hideQuestionElements() {
  const ids = ['q-number', 'q-category', 'q-text', 'q-hint', 'q-dots', 'q-list'];
  ids.forEach(id => { const el = $(id); if (el) el.style.display = 'none'; });
  const qListCard = document.querySelector('.q-list-card'); if (qListCard) qListCard.style.display = 'none';
}

// Speak the provided text using Web Speech API. Resolves when speaking ends.
function speakQuestion(text) {
  return new Promise((resolve) => {
    try {
      if (!window.speechSynthesis) return resolve();
      const avatar = document.getElementById('interviewer-avatar');
      // randomize mouth speed and intensity a bit for a natural feel
      if (avatar) {
        const base = 0.12 + Math.random() * 0.12; // 0.12 - 0.24s
        avatar.style.setProperty('--mouth-speed', base.toFixed(3) + 's');
        if (Math.random() > 0.7) avatar.classList.add('speaking-strong'); else avatar.classList.remove('speaking-strong');
        avatar.classList.add('speaking');
      }
      // if a video avatar is present, play it while speaking
      try {
        const v = document.getElementById('interviewer-video');
        if (v && v.src) {
          // show video and hide fallback svg
          v.style.display = 'block';
          const fb = document.querySelector('#interviewer-avatar .avatar-fallback'); if (fb) fb.style.display = 'none';
          // reset and play
          try { v.currentTime = 0; } catch (e) {}
          v.play().catch(() => {});
        }
      } catch (e) {}
      const utter = new SpeechSynthesisUtterance(text);
      utter.lang = 'en-US';
      utter.rate = 1;
      utter.onend = () => {
        try {
          // pause/hide video avatar after speaking
          const v = document.getElementById('interviewer-video');
          if (v && v.src) { v.pause(); v.style.display = 'none'; const fb = document.querySelector('#interviewer-avatar .avatar-fallback'); if (fb) fb.style.display = 'block'; }
        } catch (e) {}
        if (avatar) { avatar.classList.remove('speaking'); avatar.classList.remove('speaking-strong'); }
        resolve();
      };
      utter.onerror = () => {
        try { const v = document.getElementById('interviewer-video'); if (v && v.src) { v.pause(); v.style.display = 'none'; const fb = document.querySelector('#interviewer-avatar .avatar-fallback'); if (fb) fb.style.display = 'block'; } } catch (e) {}
        if (avatar) { avatar.classList.remove('speaking'); avatar.classList.remove('speaking-strong'); }
        resolve();
      };
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(utter);
    } catch (err) {
      resolve();
    }
  });
}
document.addEventListener('DOMContentLoaded', () => { renderQDots(); renderQList(); loadQuestion(0); updateProgress(); state.sessionTimerInterval = setInterval(() => { const elapsed = Math.floor((Date.now() - state.startTime) / 1000); const minutes = String(Math.floor(elapsed / 60)).padStart(2, '0'); const seconds = String(elapsed % 60).padStart(2, '0'); const el = $('session-timer'); if (el) el.textContent = `${minutes}:${seconds}`; }, 1000); if (!SpeechRecognition) { showMicBanner('Voice capture is not supported in this browser. You can still type your answer below for the study prototype.'); setMicDisabled(true); } else { hideMicBanner(); } 
  // Immediately switch to voice-only mode UI
  hideQuestionElements();
  try { document.body.classList.add('voice-only'); } catch (e) {}
  // Ensure interviewer avatar + confirm hint exist (insert near mic controls)
  try {
      if (!document.getElementById('interviewer-avatar')) {
        const micWrap = document.querySelector('.mic-btn-wrap');
        if (micWrap && micWrap.parentNode) {
          const avatarHtml = `
            <div id="interviewer-avatar" class="interviewer-avatar" aria-hidden="true">
              <video id="interviewer-video" preload="auto" muted playsinline loop style="display:none"></video>
              <div class="avatar-fallback">
                <svg viewBox="0 0 220 220" xmlns="http://www.w3.org/2000/svg" width="140" height="140" role="img">
                  <defs><linearGradient id="g1" x1="0" x2="1"><stop offset="0" stop-color="#f5c26b"/><stop offset="1" stop-color="#e6a64a"/></linearGradient></defs>
                  <circle cx="110" cy="80" r="56" fill="url(#g1)" />
                  <rect x="62" y="130" width="96" height="62" rx="24" fill="#2b3b4a" />
                  <circle cx="92" cy="76" r="6" fill="#222" />
                  <circle cx="128" cy="76" r="6" fill="#222" />
                  <g id="mouth" transform="translate(80,102)"><ellipse cx="30" cy="18" rx="22" ry="8" fill="#2b3b4a" /></g>
                </svg>
              </div>
            </div>
          `;
          const hintHtml = `<div id="confirm-hint" class="confirm-hint" style="display:none">Is that it?</div>`;
          micWrap.insertAdjacentHTML('afterend', avatarHtml + hintHtml);
          // If a video file exists at ../assets/interviewer.mp4, set it as source
          try {
            const vid = document.getElementById('interviewer-video');
            if (vid) {
              // use available asset if present in the workspace
              const candidate = '../assets/Agent_video_Pippit_20260412122904.mp4';
              vid.src = candidate;
              // attempt to load — browsers may block autoplay unless muted (we keep muted)
              vid.load();
            }
          } catch (e) {}
        }
      }
  } catch (e) {}
});
function showMicBanner(msg) { const banner = $('mic-banner'); if (banner) { banner.querySelector('.perm-text').textContent = msg; banner.classList.add('show'); } }
function hideMicBanner() { const banner = $('mic-banner'); if (banner) banner.classList.remove('show'); }
function setMicDisabled(disabled) { const btn = $('mic-btn'); if (btn) { btn.classList.toggle('disabled', disabled); btn.disabled = disabled; } }
function loadQuestion(idx) { state.current = idx; const q = QUESTIONS[idx]; $('q-number').textContent = `Question ${idx + 1} of ${QUESTIONS.length}`; $('q-category').textContent = q.category; $('q-category').className = `q-cat-badge ${CAT_CLASS[q.category] || 'cat-general'}`; $('q-text').textContent = q.text; $('q-hint').textContent = `Prompt: ${q.hint}`; const saved = state.transcripts[idx]; $('typed-answer').value = saved || ''; if (saved) { setTranscriptText(saved); setRecStatus('done', 'Answer saved for this interview item'); } else { clearTranscriptText(); setRecStatus('idle', 'You can answer now'); } $('btn-prev').disabled = idx === 0; renderQDots(); renderQList(); updateProgress(); checkSubmitBanner();
  // Read the question aloud and auto-start recording (if supported)
  (async () => {
    try {
      const prompt = `Let’s talk about this. ${q.text}`;
      await speakQuestion(prompt);
      showInterviewerBubble('Please answer naturally, as if you were speaking to a real interviewer.');
    } catch (e) {}
    setTimeout(() => { if (SpeechRecognition) startRecording(); }, 250);
  })();
}

// Simple follow-up rules: keywords -> follow-up prompt
const FOLLOWUPS = [
  { keywords: ['challenge', 'problem', 'difficult', 'threat'], text: 'Can you describe the specific steps you took and the measurable outcome?' },
  { keywords: ['team', 'teamwork', 'collaborat', 'group'], text: 'What was your role in the team and how did you resolve any disagreements?' },
  { keywords: ['deadline', 'pressure', 'stress', 'urgent'], text: 'How did you prioritize tasks and ensure you met the deadline?' },
  { keywords: ['strength', 'skill', 'skills', 'ability'], text: 'Which of those skills are you most confident in and can you give an example?' }
];

function getFollowUpForAnswer(text) {
  if (!text) return null;
  const t = text.toLowerCase();
  for (const rule of FOLLOWUPS) {
    for (const k of rule.keywords) if (t.includes(k)) return rule.text;
  }
  return null;
}

// Speak follow-up and start recording. Keeps main question index the same.
async function speakAndRecordFollowUp(promptText) {
  if (!promptText) return;
  state.followUpActive = true;
  state.followUpText = promptText;
  setTranscriptPlaceholder('Listening for your follow-up...');
  try { await speakQuestion(promptText); } catch (e) {}
  setTimeout(() => { if (SpeechRecognition) startRecording(); }, 250);
}
function renderQDots() { const wrap = $('q-dots'); if (!wrap) return; wrap.innerHTML = QUESTIONS.map((_, i) => { let cls = 'q-dot'; if (i === state.current) cls += ' current'; else if (state.transcripts[i]) cls += ' answered'; return `<div class="${cls}" onclick="jumpTo(${i})" title="Q${i + 1}"></div>`; }).join(''); }
function renderQList() { const list = $('q-list'); if (!list) return; list.innerHTML = QUESTIONS.map((q, i) => { const numberClass = 'q-list-num' + (i === state.current ? ' current' : state.transcripts[i] ? ' answered' : ''); const textClass = 'q-list-txt' + (i === state.current ? ' current' : ''); const short = q.text.length > 48 ? `${q.text.slice(0, 48)}...` : q.text; return `<div class="q-list-item" onclick="jumpTo(${i})"><div class="${numberClass}">${i + 1}</div><div class="${textClass}">${short}</div></div>`; }).join(''); }
function jumpTo(idx) { if (state.recording) stopRecording(); loadQuestion(idx); }
function prevQuestion() { if (state.current > 0) jumpTo(state.current - 1); }
function nextQuestion() { if (state.recording) stopRecording(); if (state.current < QUESTIONS.length - 1) jumpTo(state.current + 1); else qs('.submit-banner').scrollIntoView({ behavior: 'smooth' }); }
function skipQuestion() { if (state.recording) stopRecording(); delete state.transcripts[state.current]; $('typed-answer').value = ''; if (state.current < QUESTIONS.length - 1) jumpTo(state.current + 1); else { clearTranscriptText(); updateProgress(); checkSubmitBanner(); } }
async function toggleRecording() { if (!SpeechRecognition) { showToast('Voice capture is unavailable in this browser. Please type your answer instead.', 'error'); return; } if (state.recording) { showToast('I’m still listening. Please keep speaking naturally.', 'info'); return; } startRecording(); }
function startRecording() {
  try {
    const recognition = new SpeechRecognition();
    recognition.lang = 'en-US';
    recognition.interimResults = true;
    recognition.continuous = true;
      state.currentDraft = '';
    state.recognition = recognition;
    state.recording = true;
    state.recSeconds = 0;
      // silence/confirmation timers
      state.silenceTimerId = null;
      state.confirmationTimerId = null;
      state.awaitingConfirmation = false;
    recognition.onresult = event => {
      let transcript = '';
      for (let i = 0; i < event.results.length; i += 1) transcript += `${event.results[i][0].transcript} `;
      const latest = transcript.trim();
      // If we were awaiting confirmation (asked "Is that it?"), treat incoming speech as continuation
      if (state.awaitingConfirmation) {
        // append continuation to current draft
        state.currentDraft = ((state.currentDraft || '') + ' ' + latest).trim();
        state.awaitingConfirmation = false;
        if (state.confirmationTimerId) { clearTimeout(state.confirmationTimerId); state.confirmationTimerId = null; }
        hideConfirmHint();
        setTranscriptPlaceholder(state.currentDraft || 'Listening for your answer...');
        $('typed-answer').value = state.currentDraft;
        // reset silence timer to wait for further speech
        resetSilenceTimer();
        return;
      }
      state.currentDraft = latest;
      setTranscriptPlaceholder(state.currentDraft || 'Listening for your answer...');
      $('typed-answer').value = state.currentDraft;
      // reset silence detection timer on each partial/final result
      resetSilenceTimer();
    };
    recognition.onerror = () => {
      stopRecording();
      showToast('Voice capture was interrupted. You can try again or type your answer.', 'error');
    };
    recognition.onend = () => {
      if (!state.recording) return;
      // Use enhanced finalize so follow-ups and auto-advance work
      finalizeCurrentAnswerEnhanced(state.currentDraft);
      state.recording = false;
      setMicRecording(false);
      showWaveform(false);
      showRipples(false);
      clearInterval(state.recTimerInterval);
      if (state.silenceTimerId) { clearTimeout(state.silenceTimerId); state.silenceTimerId = null; }
      if (state.confirmationTimerId) { clearTimeout(state.confirmationTimerId); state.confirmationTimerId = null; }
      const timer = $('rec-timer');
      if (timer) timer.classList.remove('visible');
    };
    recognition.start();
    setMicRecording(true);
    setRecStatus('recording', 'Listening... speak naturally.');
    showWaveform(true);
    showRipples(true);
    setTranscriptActive(true);
    setTranscriptPlaceholder('Listening for your answer...');
    startRecTimer();
    // begin silence detection
    resetSilenceTimer();
  } catch (error) {
    showToast(`Unable to start voice capture: ${error.message}`, 'error');
  }
}
function stopRecording() { if (!state.recording) return; state.recording = false; clearInterval(state.recTimerInterval); if (state.recognition) state.recognition.stop(); setMicRecording(false); showWaveform(false); showRipples(false); setRecStatus('processing', 'Saving your recorded answer...'); if (state.silenceTimerId) { clearTimeout(state.silenceTimerId); state.silenceTimerId = null; } if (state.confirmationTimerId) { clearTimeout(state.confirmationTimerId); state.confirmationTimerId = null; } state.awaitingConfirmation = false; }
function saveTypedAnswer() { finalizeCurrentAnswerEnhanced($('typed-answer').value.trim()); }
function clearCurrentAnswer() { delete state.transcripts[state.current]; $('typed-answer').value = ''; clearTranscriptText(); setRecStatus('idle', 'Answer cleared. You can record or type again.'); renderQDots(); renderQList(); updateProgress(); checkSubmitBanner(); }
function finalizeCurrentAnswer(text) { const cleaned = (text || '').trim(); if (!cleaned) { clearTranscriptText(); setRecStatus('idle', 'No answer detected yet. Record or type your response.'); updateProgress(); return; } state.transcripts[state.current] = cleaned; $('typed-answer').value = cleaned; setTranscriptText(cleaned); setRecStatus('done', 'Answer saved and ready for analysis'); renderQDots(); renderQList(); updateProgress(); checkSubmitBanner(); showToast('Answer saved', 'success'); }

// Enhanced finalize: save answer, optionally trigger follow-up, or advance
function finalizeCurrentAnswerEnhanced(text) {
  const cleaned = (text || '').trim();
  if (!cleaned) {
    clearTranscriptText(); setRecStatus('idle', 'No answer detected yet. Record or type your response.'); updateProgress(); return;
  }
  // hide any pending confirmation hint
  hideConfirmHint();
  // If we are collecting a follow-up answer, save it separately
  if (state.followUpActive) {
    state.followUps = state.followUps || {};
    state.followUps[state.current] = cleaned;
    state.followUpActive = false;
    state.followUpText = null;
    setTranscriptText(cleaned);
    setRecStatus('done', 'Follow-up answer saved');
    showToast('Follow-up saved', 'success');
    // Advance to next main question
    if (state.current < QUESTIONS.length - 1) setTimeout(() => jumpTo(state.current + 1), 400);
    else setTimeout(() => qs('.submit-banner').scrollIntoView({ behavior: 'smooth' }), 400);
    return;
  }

  // Save main answer
  state.transcripts[state.current] = cleaned;
  $('typed-answer').value = cleaned;
  setTranscriptText(cleaned);
  setRecStatus('done', 'Answer saved and ready for analysis');
  renderQDots(); renderQList(); updateProgress(); checkSubmitBanner(); showToast('Answer saved', 'success');

  // Check for a follow-up prompt
  const follow = getFollowUpForAnswer(cleaned);
  if (follow) {
    // ask follow-up immediately
    setTimeout(() => speakAndRecordFollowUp(follow), 400);
    return;
  }

  // No follow-up needed — advance to next question after short pause
  setTimeout(() => {
    if (state.current < QUESTIONS.length - 1) jumpTo(state.current + 1);
    else qs('.submit-banner').scrollIntoView({ behavior: 'smooth' });
  }, 600);
}
function startRecTimer() { const el = $('rec-timer'); if (el) { el.classList.add('visible'); el.classList.remove('red'); } state.recTimerInterval = setInterval(() => { state.recSeconds += 1; const minutes = String(Math.floor(state.recSeconds / 60)).padStart(2, '0'); const seconds = String(state.recSeconds % 60).padStart(2, '0'); if (el) { el.textContent = `${minutes}:${seconds}`; if (state.recSeconds >= 120) { el.classList.add('red'); stopRecording(); } } }, 1000); }
function setMicRecording(isRec) { const btn = $('mic-btn'); if (!btn) return; btn.classList.toggle('recording', isRec); const icon = btn.querySelector('.mic-icon'); if (icon) icon.textContent = isRec ? 'Listening' : 'Talk'; }
function setRecStatus(type, msg) { const el = $('rec-status'); if (!el) return; el.textContent = msg; el.className = `rec-status ${type}`; }
function showWaveform(show) { const el = $('waveform'); if (el) el.classList.toggle('active', show); const liveDot = $('live-dot'); if (liveDot) liveDot.classList.toggle('show', show); }
function showRipples(show) { document.querySelectorAll('.mic-ripple').forEach(ripple => ripple.classList.toggle('active', show)); }
function setTranscriptText(text) { const el = $('transcript-text'); if (!el) return; el.textContent = text; el.classList.remove('placeholder'); const words = text.trim().split(/\s+/).filter(Boolean).length; const wc = $('word-count'); if (wc) wc.textContent = `${words} word${words === 1 ? '' : 's'}`; const box = $('transcript-box'); if (box) { box.classList.remove('active'); box.classList.add('filled'); } const timer = $('rec-timer'); if (timer) timer.classList.remove('visible'); }
function clearTranscriptText() { const el = $('transcript-text'); if (!el) return; el.textContent = 'Your recorded or typed answer will appear here.'; el.classList.add('placeholder'); const wc = $('word-count'); if (wc) wc.textContent = ''; const box = $('transcript-box'); if (box) box.classList.remove('active', 'filled'); const timer = $('rec-timer'); if (timer) { timer.classList.remove('visible'); timer.textContent = '00:00'; } }
function setTranscriptPlaceholder(text) { const el = $('transcript-text'); if (!el) return; el.textContent = text; el.classList.add('placeholder'); }
function setTranscriptActive(active) { const box = $('transcript-box'); if (box) { box.classList.toggle('active', active); box.classList.remove('filled'); } }

// Silence detection: if no speech for `silenceMs`, ask confirmation "Is that it?"
function resetSilenceTimer(silenceMs) {
  const ms = typeof silenceMs === 'number' ? silenceMs : state.silenceMs;
  if (state.silenceTimerId) { clearTimeout(state.silenceTimerId); state.silenceTimerId = null; }
  // Start new silence timer
  state.silenceTimerId = setTimeout(() => {
    handleSilence();
  }, ms);
}

function handleSilence() {
  // Ask confirmation
  const prompt = 'Is that it?';
  try { speakQuestion(prompt); } catch (e) {}
  // show small on-screen hint
  showConfirmHint();
  state.awaitingConfirmation = true;
  // Give the user a short window to continue. Use configured ms.
  if (state.confirmationTimerId) { clearTimeout(state.confirmationTimerId); state.confirmationTimerId = null; }
  state.confirmationTimerId = setTimeout(() => {
    // No continuation — finalize current answer and advance
    state.awaitingConfirmation = false;
    hideConfirmHint();
    finalizeCurrentAnswerEnhanced(state.currentDraft);
    // clear timers
    if (state.silenceTimerId) { clearTimeout(state.silenceTimerId); state.silenceTimerId = null; }
    if (state.confirmationTimerId) { clearTimeout(state.confirmationTimerId); state.confirmationTimerId = null; }
  }, state.confirmationMs || 10000);
}

function showConfirmHint() { try { const el = document.getElementById('confirm-hint'); if (el) el.style.display = 'block'; } catch (e) {} }
function hideConfirmHint() { try { const el = document.getElementById('confirm-hint'); if (el) el.style.display = 'none'; } catch (e) {} }
function updateProgress() { const answered = Object.keys(state.transcripts).filter(key => state.transcripts[key]).length; const pct = Math.round((answered / QUESTIONS.length) * 100); const offset = 271 - (271 * pct / 100); const fill = qs('.pr-fill'); if (fill) fill.style.strokeDashoffset = offset; const pctEl = $('pr-pct'); if (pctEl) pctEl.textContent = `${pct}%`; const ac = $('answered-count'); if (ac) ac.textContent = answered; const rc = $('remaining-count'); if (rc) rc.textContent = QUESTIONS.length - answered; }
function checkSubmitBanner() { const answered = Object.keys(state.transcripts).filter(key => state.transcripts[key]).length; const banner = qs('.submit-banner'); if (banner && answered >= 3) banner.classList.add('show'); }
function submitInterview() { if (state.recording) stopRecording(); const answered = Object.keys(state.transcripts).filter(key => state.transcripts[key]); if (answered.length === 0) { showToast('Please answer at least one interview question.', 'error'); return; } const studentSession = JSON.parse(localStorage.getItem('bisu-student-session') || '{}'); const payload = { studyTitle: 'AI-Assisted Interview System for Job Matching to the BISU Clarin Graduating Students', respondentGroup: 'BISU Clarin graduating students', studentName: studentSession.name || 'Student', program: studentSession.program || 'BSCS', cvFileName: studentSession.cvFileName || '', cvText: studentSession.cvText || '', applicationLetterFileName: studentSession.applicationLetterFileName || '', applicationLetterText: studentSession.applicationLetterText || '', answers: QUESTIONS.map((q, i) => ({ question: q.text, category: q.category, answer: state.transcripts[i] || '' })).filter(item => item.answer.trim()), totalQuestions: QUESTIONS.length, answeredCount: answered.length, durationMs: Date.now() - state.startTime }; sessionStorage.setItem('interviewData', JSON.stringify(payload)); showToast('Interview responses submitted for analysis', 'success'); setTimeout(() => { window.location.href = 'analyzing.html'; }, 900); }
function showInterviewerBubble(msg) {
  const bubble = document.getElementById('interviewer-bubble');
  if (!bubble) return;
  bubble.textContent = msg;
  bubble.classList.add('show');
  clearTimeout(window._bubbleTimer);
  window._bubbleTimer = setTimeout(() => bubble.classList.remove('show'), 3200);
}
function showToast(msg, type = '') { const toast = $('toast'); if (!toast) return; toast.textContent = msg; toast.className = `toast ${type}`; toast.style.display = 'flex'; clearTimeout(window._toastTimer); window._toastTimer = setTimeout(() => { toast.style.display = 'none'; }, 3200); }
