/**
 * Trophy engine:
 * - Detects first time any stat reaches Level 1 (>=100 XP).
 * - Awards "First Level" trophy once.
 * - Grants a 24h Recovery Boost (penalties halved while active).
 * - Stores derived levels for quick detection.
 */
const KEY = 'kamdin-levelup';
const LEVEL_SIZE = 100; // Level = floor(xp / 100)

function load(){ try{return JSON.parse(localStorage.getItem(KEY))||{};}catch{return{};} }
function save(s){ localStorage.setItem(KEY, JSON.stringify(s)); }

function computeLevels(stats=[]) {
  const map = {};
  for (const s of stats) map[s.key] = Math.floor((s.xp||0) / LEVEL_SIZE);
  return map;
}

function startTrophyLoop(){
  let notified=false; // avoid duplicate alerts in a single session
  function tick(){
    const state = load();
    const stats = state.stats || [];
    const nowISO = new Date().toISOString();

    // ensure containers
    state.trophies = state.trophies || [];
    state.meta = state.meta || {};
    state.meta.levels = state.meta.levels || {};

    const prevLevels = state.meta.levels;
    const currLevels = computeLevels(stats);

    // unlock condition: any stat crosses from <1 to >=1
    const crossed = Object.keys(currLevels).some(k => (prevLevels[k]||0) < 1 && currLevels[k] >= 1);

    const hasTrophy = state.trophies.some(t => t.id === 'first-level');

    if (crossed && !hasTrophy) {
      // add trophy
      state.trophies.unshift({
        id: 'first-level',
        title: 'First Level',
        desc: 'Reached level 1 in any stat.',
        ts: nowISO,
        effect: 'recoveryBoost24h'
      });

      // grant 24h recovery boost
      const until = new Date(Date.now() + 24*60*60*1000).toISOString();
      state.boosts = state.boosts || {};
      state.boosts.recoveryBoostUntil = until;

      // record history event
      state.history = state.history || [];
      state.history.unshift({
        ts: nowISO,
        label: '🏆 Trophy: First Level — Recovery Boost active (24h)',
        stat: null,
        xp: 0
      });

      save(state);
      if (!notified) {
        notified = true;
        try { alert('🏆 First Level unlocked!\nRecovery Boost active for 24 hours (penalties halved).'); } catch {}
      }
    }

    // persist derived levels for next comparison
    if (JSON.stringify(prevLevels) !== JSON.stringify(currLevels)) {
      state.meta.levels = currLevels;
      save(state);
    }
  }

  try { tick(); } catch {}
  setInterval(() => { try { tick(); } catch {} }, 10_000); // every 10s
}

export function startTrophiesEngine(){ startTrophyLoop(); }
