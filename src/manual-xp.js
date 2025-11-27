const STORAGE_KEY="kamdin_xp_state_v2";

function load(){ try{return JSON.parse(localStorage.getItem(STORAGE_KEY))||{};}catch{return{};} }
function save(s){ localStorage.setItem(STORAGE_KEY, JSON.stringify(s)); }

function adjust(statKey, delta, label){
  const s=load();
  const stats=s.stats||[]; const h=s.history||[];
  const st=stats.find(x=>x.key===statKey); if(!st) return alert('Unknown stat: '+statKey);
  st.xp=Math.max(0,(st.xp||0)+delta);
  h.unshift({ts:new Date().toISOString(),label,stat:statKey,xp:delta});
  s.stats=stats; s.history=h; save(s);
  location.reload(); // ensure UI reflects changes immediately
}

function promptAndRun(sign){
  const stat=(prompt('Stat key (intelligence,strength,creation,discipline,charisma,mindfulness,wisdom)')||'').trim();
  const amt=Number(prompt(`How many XP to ${sign==='plus'?'ADD':'SUBTRACT'}?`));
  if(!stat || !Number.isFinite(amt) || amt<=0) return;
  adjust(stat, sign==='plus'? amt : -amt, `Manual ${sign==='plus'?'+':'-'}${amt} XP`);
}

window.addEventListener('keydown', (e)=>{
  const macMeta=e.metaKey; const shift=e.shiftKey;
  if(macMeta && shift && (e.key==='=')){ e.preventDefault(); promptAndRun('plus'); }
  if(macMeta && shift && (e.key==='-')){ e.preventDefault(); promptAndRun('minus'); }
});
