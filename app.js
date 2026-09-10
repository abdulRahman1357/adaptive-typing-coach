/* Keystep V1: practice-scoped event capture. No global listeners or network calls. */
const defaultFingerMap = {
  'left-ring': ['Escape','F1','F2','F3','F4','Backquote','Digit1','Digit2','KeyQ','KeyA','KeyZ','Tab','CapsLock','ShiftLeft','ControlLeft','AltLeft'],
  'left-middle': ['F5','F6','Digit3','KeyW','KeyS','KeyX'],
  'left-index': ['F7','F8','Digit4','Digit5','KeyE','KeyR','KeyT','KeyD','KeyF','KeyG','KeyC','KeyV','KeyB'],
  'right-index': ['F9','F10','Digit6','Digit7','KeyY','KeyU','KeyH','KeyJ','KeyN','KeyM'],
  'right-middle': ['F11','Digit8','KeyI','KeyK','Comma'],
  'right-ring': ['F12','PrintScreen','ScrollLock','Pause','Insert','Home','PageUp','Delete','End','PageDown','ArrowUp','ArrowLeft','ArrowDown','ArrowRight','NumLock','NumpadDivide','NumpadMultiply','NumpadSubtract','NumpadAdd','NumpadEnter','NumpadDecimal','Numpad0','Numpad1','Numpad2','Numpad3','Numpad4','Numpad5','Numpad6','Numpad7','Numpad8','Numpad9','Digit9','Digit0','Minus','Equal','KeyO','KeyP','BracketLeft','BracketRight','Backslash','KeyL','Semicolon','Quote','Period','Slash','Enter','Backspace','ShiftRight','ControlRight','AltRight'],
  'thumb': ['Space']
};
let fingerMap = JSON.parse(localStorage.getItem('keystep-finger-map') || JSON.stringify(defaultFingerMap));
const fingerInfo = {
  'left-ring':['Left ring','#7a5d9d'], 'left-middle':['Left middle','#4d7699'], 'left-index':['Left index','#397c73'],
  'right-index':['Right index','#a05e45'], 'right-middle':['Right middle','#c1843e'], 'right-ring':['Right ring','#a64d62'], thumb:['Thumb · space','#8b9296']
};
const layouts = [
  [['Escape','Esc'],['F1','F1'],['F2','F2'],['F3','F3'],['F4','F4'],['F5','F5'],['F6','F6'],['F7','F7'],['F8','F8'],['F9','F9'],['F10','F10'],['F11','F11'],['F12','F12'],['PrintScreen','PrtSc']],
  [['Backquote','`'],['Digit1','1'],['Digit2','2'],['Digit3','3'],['Digit4','4'],['Digit5','5'],['Digit6','6'],['Digit7','7'],['Digit8','8'],['Digit9','9'],['Digit0','0'],['Minus','-'],['Equal','='],['Backspace','⌫']],
  [['Tab','Tab'],['KeyQ','Q'],['KeyW','W'],['KeyE','E'],['KeyR','R'],['KeyT','T'],['KeyY','Y'],['KeyU','U'],['KeyI','I'],['KeyO','O'],['KeyP','P'],['BracketLeft','['],['BracketRight',']'],['Backslash','\\']],
  [['CapsLock','Caps'],['KeyA','A'],['KeyS','S'],['KeyD','D'],['KeyF','F'],['KeyG','G'],['KeyH','H'],['KeyJ','J'],['KeyK','K'],['KeyL','L'],['Semicolon',';'],['Quote',"'"],['Enter','Enter']],
  [['ShiftLeft','Shift'],['KeyZ','Z'],['KeyX','X'],['KeyC','C'],['KeyV','V'],['KeyB','B'],['KeyN','N'],['KeyM','M'],['Comma',','],['Period','.'],['Slash','/'],['ShiftRight','Shift']],
  [['ControlLeft','Ctrl'],['AltLeft','Alt'],['Space','Space'],['AltRight','Alt'],['ControlRight','Ctrl']],
  [['Insert','Ins'],['Home','Home'],['PageUp','PgUp'],['Delete','Del'],['End','End'],['PageDown','PgDn'],['ArrowLeft','←'],['ArrowUp','↑'],['ArrowDown','↓'],['ArrowRight','→']]
];
let codeToFinger = {};
function rebuildCodeMap(){ codeToFinger=Object.fromEntries(Object.entries(fingerMap).flatMap(([finger,codes]) => codes.map(code => [code,finger]))); }
rebuildCodeMap();
const keyToCode = Object.fromEntries(layouts.flat().map(([code,label]) => [label.toLowerCase(),code]));
const words = ['sad','ask','dad','fall','jazz','milk','kind','flash','garden','jungle','market','planet','quick','brave','smooth','typing','practice','keyboard','comfort'];
const sentences = ['small steps build steady skill', 'keep your eyes relaxed and your hands calm', 'accuracy comes before speed', 'practice makes the keyboard feel familiar'];
const transitions = ['as','sd','df','fj','jk','kl','er','re','ty','yu','ui','io','gh','hj','nm','mn','de','ki'];
const $ = id => document.getElementById(id);
let round = null, history = JSON.parse(localStorage.getItem('keystep-v1') || '[]'), fullMap = false;

function choose(list){ return list[Math.floor(Math.random()*list.length)]; }
function targetFor(stage) {
  if(stage==='hunt') return choose('asdfghjklqwertyuiopzxcvbnm'.split(''));
  if(stage==='zone') { const f=choose(Object.keys(fingerInfo).filter(x=>x!=='thumb')); const chars=fingerMap[f].map(c=>layouts.flat().find(x=>x[0]===c)?.[1]).filter(x=>x && /^[A-Z]$/.test(x)); return choose(chars).toLowerCase(); }
  if(stage==='transition') return choose(transitions);
  if(stage==='word') return choose(words);
  if(stage==='sentence' || stage==='speed') return choose(sentences);
}
function stageName(stage){ return ({hunt:'Find one key',zone:'Finger zones',transition:'Key transitions',word:'Word practice',sentence:'Sentence practice',speed:'Gentle speed test'})[stage]; }
function startRound(){
  const stage=$('stage').value, difficulty=$('difficulty').value, target=targetFor(stage);
  round={id:crypto.randomUUID(),stage,difficulty,target,startedAt:null,finishedAt:null,events:[],firstAttempts:{},corrected:0,typed:''};
  $('stage-label').textContent=stageName(stage); $('round-status').textContent='Ready'; $('target-display').textContent=target;
  $('typed-display').textContent=''; $('practice-input').value=''; $('practice-input').disabled=false; $('practice-input').focus();
  $('instruction').textContent=stage==='hunt' ? 'Press the highlighted key once. Only the first attempt is measured.' : stage==='speed' ? 'Type naturally for one short sentence. Stay accurate; the clock is only a gentle signal.' : 'Type the target. Backspace is captured so the coach can see corrections.';
  updateLive(); renderKeyboard();
}
function normalKey(event){ if(event.key===' ') return ' '; return event.key.length===1 ? event.key.toLowerCase() : null; }
function intendedChar(){ return round.target[round.typed.length] || null; }
function record(event, type, extra={}) { round.events.push({type,timestamp:performance.now(),key:event.key,code:event.code,expected:intendedChar(),actual:normalKey(event),finger:codeToFinger[event.code] || 'unassigned',...extra}); }
function handleKeydown(event){
  if(!round || $('practice-input')!==document.activeElement) return;
  if(['Shift','Control','Alt','Meta','CapsLock'].includes(event.key)) return;
  if(!round.startedAt) round.startedAt=performance.now();
  if(event.key==='Backspace') { record(event,'backspace',{beforeLength:round.typed.length}); if(round.typed.length) {round.typed=round.typed.slice(0,-1); round.corrected++;} event.preventDefault(); refresh(); return; }
  const key=normalKey(event); if(key===null || event.ctrlKey || event.metaKey) return;
  const index=round.typed.length, expected=round.target[index];
  record(event,'key',{correct:key===expected,index});
  if(round.stage==='hunt') {
    if(round.firstAttempts[round.target]===undefined) round.firstAttempts[round.target]={key,correct:key===round.target,at:performance.now()};
    if(key===round.target) { round.typed=key; finishRound(); } else { $('round-status').textContent='Try again — first attempt saved'; }
  } else {
    round.typed+=key; if(round.typed===round.target) finishRound(); else refresh();
  }
  event.preventDefault();
}
function refresh(){ $('typed-display').textContent=round.typed || '…'; $('practice-input').value=''; updateLive(); renderKeyboard(); }
function metrics(r){
  const keys=r.events.filter(e=>e.type==='key'), backspaces=r.events.filter(e=>e.type==='backspace');
  const correct=keys.filter(e=>e.correct).length, accuracy=keys.length?correct/keys.length:0;
  const latencies=keys.slice(1).map((e,i)=>e.timestamp-keys[i].timestamp);
  const hesitations=latencies.filter(x=>x>700).length, mean=latencies.length?latencies.reduce((a,b)=>a+b,0)/latencies.length:0;
  const duration=(r.finishedAt-(r.startedAt||r.finishedAt))/60000, wpm=duration>0?(r.typed.length/5)/duration:0;
  const correctionLatencies=backspaces.map(b=>{const prev=[...keys].reverse().find(k=>k.timestamp<b.timestamp);return prev?b.timestamp-prev.timestamp:null}).filter(Boolean);
  const transitionTimes={}; keys.slice(1).forEach((e,i)=>{const pair=(keys[i].actual||'?')+'→'+(e.actual||'?');(transitionTimes[pair]??=[]).push(e.timestamp-keys[i].timestamp)});
  const slowTransitions=Object.entries(transitionTimes).map(([pair,t])=>[pair,t.reduce((a,b)=>a+b,0)/t.length]).filter(([,t])=>t>Math.max(450,mean*1.35)).sort((a,b)=>b[1]-a[1]).slice(0,3);
  return {accuracy,wpm,keys:keys.length,backspaces:backspaces.length,backspaceRate:keys.length?backspaces.length/keys.length:0,hesitations,meanLatency:mean,correctionLatency:correctionLatencies.length?correctionLatencies.reduce((a,b)=>a+b,0)/correctionLatencies.length:0,slowTransitions};
}
function updateLive(){ if(!round)return; const m=metrics({...round,finishedAt:performance.now()}); $('live-accuracy').textContent=m.keys?Math.round(m.accuracy*100)+'%':'—'; $('live-wpm').textContent=m.keys?Math.round(m.wpm)+' WPM':'—'; $('live-corrections').textContent=round.corrected; $('live-hesitations').textContent=m.hesitations; }
function finishRound(){ round.finishedAt=performance.now(); $('practice-input').disabled=true; $('round-status').textContent='Complete'; refresh(); history.unshift(round); history=history.slice(0,30); localStorage.setItem('keystep-v1',JSON.stringify(history)); showAnalysis(round); }
function showAnalysis(r){ const m=metrics(r), observations=[];
  if(m.accuracy<.85) observations.push('<strong>Accuracy is the priority:</strong> slow down enough to let each key land cleanly. Try Finger zones next.');
  else if(m.hesitations>0) observations.push(`<strong>${m.hesitations} hesitation${m.hesitations===1?'':'s'} detected:</strong> pauses over 700 ms usually mean key-searching. Repeat the same zone before adding speed.`);
  else observations.push('<strong>Nice controlled round:</strong> your rhythm was steady. Keep this pace for a few rounds before increasing difficulty.');
  if(m.backspaceRate>.12) observations.push(`<strong>${m.backspaces} Backspace event${m.backspaces===1?'':'s'}:</strong> corrections are useful evidence, not failure. Frequent immediate corrections often point to uncertain finger placement.`);
  if(m.correctionLatency>900) observations.push('<strong>Late correction pattern:</strong> you sometimes notice an error after a pause. Briefly glance at the target after each word.');
  if(m.slowTransitions.length) observations.push(`<strong>Slow transition:</strong> ${m.slowTransitions.map(([p,t])=>`${p} (${Math.round(t)} ms)`).join(', ')}. Practice those pairs deliberately.`);
  $('summary').classList.remove('empty'); $('summary').innerHTML=`<p><strong>${Math.round(m.accuracy*100)}% accuracy · ${Math.round(m.wpm)} WPM · ${Math.round(m.meanLatency||0)} ms average between keys</strong></p>${observations.map(x=>'<p>'+x+'</p>').join('')}`;
  $('event-preview').textContent=JSON.stringify(r.events.map(({timestamp,...e})=>({...e,elapsedMs:Math.round(timestamp-(r.startedAt||timestamp))})),null,2);
}
function renderKeyboard(){ const keyboard=$('keyboard'); keyboard.innerHTML=''; const targetChar=round?.target[round?.typed.length] || round?.target;
  layouts.slice(fullMap?0:1,fullMap?layouts.length:5).forEach(row=>{const el=document.createElement('div');el.className='key-row'; row.forEach(([code,label])=>{const k=document.createElement('div'), finger=codeToFinger[code]||'thumb';k.className='key'+(finger==='thumb'?' utility':'')+(label.toLowerCase()===targetChar?.toLowerCase()?' active':''); k.style.background=fingerInfo[finger]?.[1]||'#8b9296'; k.innerHTML=`<small>${fingerInfo[finger]?.[0]||'utility'}</small>${label}`;el.append(k)});keyboard.append(el)});
  $('finger-legend').innerHTML=Object.entries(fingerInfo).map(([f,[name,color]])=>`<span class="legend" style="background:${color}">${name}</span>`).join('');
}
function renderMapConfig(){
  $('map-config').innerHTML=Object.entries(fingerInfo).map(([finger,[name]])=>`<label>${name}<input data-finger="${finger}" value="${fingerMap[finger].join(' ')}" aria-label="${name} assigned physical keys"></label>`).join('');
  $('map-config').querySelectorAll('input').forEach(input=>input.addEventListener('change',()=>{
    const next=input.value.trim().split(/\s+/).filter(Boolean); if(!next.length){ input.value=fingerMap[input.dataset.finger].join(' '); return; }
    fingerMap[input.dataset.finger]=next; rebuildCodeMap(); localStorage.setItem('keystep-finger-map',JSON.stringify(fingerMap)); renderKeyboard();
  }));
}
$('practice-input').addEventListener('keydown',handleKeydown); $('new-round').addEventListener('click',startRound); $('stage').addEventListener('change',startRound);
$('toggle-map').addEventListener('click',()=>{fullMap=!fullMap;$('toggle-map').textContent=fullMap?'Show letter map':'Show full map';renderKeyboard()});
$('clear-data').addEventListener('click',()=>{history=[];localStorage.removeItem('keystep-v1');$('summary').className='summary empty';$('summary').textContent='Local history cleared. Finish a round to see new analysis.';$('event-preview').textContent='[]'});
$('reset-map').addEventListener('click',()=>{fingerMap=JSON.parse(JSON.stringify(defaultFingerMap));rebuildCodeMap();localStorage.setItem('keystep-finger-map',JSON.stringify(fingerMap));renderMapConfig();renderKeyboard()});
renderMapConfig(); startRound();
