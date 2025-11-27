/**
 * Auto-penalty engine for overdue tasks.
 * Looks for tasks with { dueAt, done:false, penaltyXp }, and applies penalty once
 * when now > dueAt. For repeats ('daily'|'weekly') it rolls dueAt forward.
 */
const STORAGE_KEY = 'kamdin-levelup';

function loadState(){ try{return JSON.parse(localStorage.getItem(STORAGE_KEY))||{};}catch{return{};} }
function saveState(s){ localStorage.setItem(STORAGE_KEY, JSON.stringify(s)); }

function nextDue(iso,repeats){
  const d=new Date(iso); if(isNaN(d)) return null;
  if(repeats==='daily') d.setDate(d.getDate()+1);
  else if(repeats==='weekly') d.setDate(d.getDate()+7);
  else return null;
  return d.toISOString();
}

function applyOverduePenalties(){
  const state=loadState();
  const tasks=state.tasks||[]; const stats=state.stats||[]; const history=state.history||[];
  const now=Date.now(); let changed=false;

  for(const t of tasks){
    if(!t||t.done) continue;
    if(!t.dueAt || !t.penaltyXp || t.penaltyXp<=0) continue;

    const due=Date.parse(t.dueAt); if(!Number.isFinite(due)) continue;
    const last=t.lastPenaltyAt?Date.parse(t.lastPenaltyAt):NaN;
    const alreadyPenalized=Math.abs((last||0)-due)<60_000;

    if(now>due && !alreadyPenalized){
      const stat=stats.find(s=>s.key===t.stat);
      if(stat){
        stat.xp=Math.max(0,(stat.xp||0)-t.penaltyXp);
        history.unshift({ts:new Date().toISOString(),label:`Missed: ${t.title}`,stat:t.stat,xp:-t.penaltyXp});
        changed=true;
      }
      t.lastPenaltyAt=new Date(due).toISOString();
      const next=nextDue(t.dueAt,t.repeats||'none'); if(next) t.dueAt=next;
    }
  }
  if(changed){ state.tasks=tasks; state.stats=stats; state.history=history; saveState(state); }
}

export function startAutoPenaltyEngine(){
  try{applyOverduePenalties();}catch{}
  setInterval(()=>{ try{applyOverduePenalties();}catch{} }, 60_000);
}
