// client/src/utils/profileUtils.js

const PROFILE_KEY = 'poker_profile';

export const ACHIEVEMENTS = [
    { id: 'first_win', name: 'First Blood', desc: 'Win your first hand', icon: '🥊', reward: 50 },
    { id: 'big_pot', name: 'High Roller', desc: 'Win a pot of 1,000+ chips', icon: '💰', reward: 100 },
    { id: 'all_in_win', name: 'All-In Hero', desc: 'Win a hand while going all-in', icon: '🎯', reward: 75 },
    { id: 'bluff_master', name: 'Bluff Master', desc: 'Win 5 hands by making everyone fold', icon: '🎭', reward: 150 },
    { id: 'poker_night', name: 'Poker Night', desc: 'Play 25 total hands', icon: '🃏', reward: 75 },
    { id: 'game_winner', name: 'Last Standing', desc: 'Win a full game', icon: '🏆', reward: 200 },
    { id: 'point_hoarder', name: 'Point Hoarder', desc: 'Accumulate 500 total points', icon: '⭐', reward: 0 },
    { id: 'flush_rush', name: 'Flush Rush', desc: 'Make a straight flush or better', icon: '🌊', reward: 250 },
    { id: 'full_house', name: 'Full House', desc: 'Make a full house', icon: '🏠', reward: 50 },
    { id: 'comeback', name: 'Comeback Kid', desc: 'Win a hand with less than 200 chips', icon: '💪', reward: 100 },
];

export const AVATARS = [
    { id: 'default', icon: '🎮', name: 'Player', cost: 0 },
    { id: 'cat', icon: '🐱', name: 'Lucky Cat', cost: 100 },
    { id: 'fox', icon: '🦊', name: 'Sly Fox', cost: 200 },
    { id: 'wolf', icon: '🐺', name: 'Wolf', cost: 300 },
    { id: 'lion', icon: '🦁', name: 'Lion', cost: 500 },
    { id: 'dragon', icon: '🐉', name: 'Dragon', cost: 750 },
    { id: 'crown', icon: '👑', name: 'Royalty', cost: 1000 },
    { id: 'fire', icon: '🔥', name: 'Blaze', cost: 1500 },
    { id: 'gem', icon: '💎', name: 'Diamond', cost: 2000 },
    { id: 'ace', icon: '🂡', name: 'Ace High', cost: 3000 },
];

export const WIN_ANIMATIONS = [
    { id: 'confetti', icon: '🎊', name: 'Confetti', cost: 0, css: 'confetti', desc: 'Classic colorful confetti rain' },
    { id: 'fireworks', icon: '🎆', name: 'Fireworks', cost: 150, css: 'fireworks', desc: 'Bursting fireworks' },
    { id: 'stars', icon: '⭐', name: 'Starfall', cost: 250, css: 'stars', desc: 'Glittering falling stars' },
    { id: 'hearts', icon: '❤️', name: 'Love Rain', cost: 300, css: 'hearts', desc: 'Floating hearts cascade' },
    { id: 'money', icon: '💵', name: 'Money Rain', cost: 500, css: 'money', desc: 'Cash bills shower down' },
    { id: 'flames', icon: '🔥', name: 'Inferno', cost: 750, css: 'flames', desc: 'Flames rise from below' },
    { id: 'snow', icon: '❄️', name: 'Blizzard', cost: 400, css: 'snow', desc: 'Gentle snowflakes drift' },
    { id: 'lightning', icon: '⚡', name: 'Thunder', cost: 1000, css: 'lightning', desc: 'Electric lightning bolts' },
    { id: 'guns',  icon: '🔫', name: 'Gunslinger', cost: 800,  css: 'guns',  desc: 'Bullet tracers at opponents' },
    { id: 'robot', icon: '🤖', name: 'Robot',       cost: 600,  css: 'robot', desc: 'Giant 3D robots stomp in' },
];

// ── Ranks ──────────────────────────────────────────────────────────────────

export const RANKS = [
    { id: 'fish',       name: 'Fish',        icon: '🐟', minWins: 0,   color: '#60a5fa' },
    { id: 'rookie',     name: 'Rookie',      icon: '🃏', minWins: 10,  color: '#34d399' },
    { id: 'shark',      name: 'Shark',       icon: '🦈', minWins: 50,  color: '#a78bfa' },
    { id: 'highroller', name: 'High Roller', icon: '💰', minWins: 150, color: '#fbbf24' },
    { id: 'legend',     name: 'Legend',      icon: '👑', minWins: 500, color: '#f87171' },
];

export function getRank(profile) {
    const wins = profile?.stats?.handsWon || 0;
    let rank = RANKS[0];
    for (const r of RANKS) {
        if (wins >= r.minWins) rank = r;
    }
    return rank;
}

export function getNextRank(profile) {
    const wins = profile?.stats?.handsWon || 0;
    for (const r of RANKS) {
        if (wins < r.minWins) return r;
    }
    return null; // max rank reached
}

// ── Daily Challenges ───────────────────────────────────────────────────────

const DAILY_CHALLENGES_POOL = [
    { id: 'win_1',      desc: 'Win at least 1 hand',          icon: '✨', goal: 1,   stat: 'wins',         reward: 10 },
    { id: 'win_3',      desc: 'Win 3 hands today',             icon: '🏆', goal: 3,   stat: 'wins',         reward: 30 },
    { id: 'bluff_2',    desc: 'Win 2 hands by bluff',          icon: '🎭', goal: 2,   stat: 'foldWins',     reward: 40 },
    { id: 'play_5',     desc: 'Play 5 hands today',            icon: '🎮', goal: 5,   stat: 'handsPlayed',  reward: 15 },
    { id: 'play_10',    desc: 'Play 10 hands today',           icon: '🃏', goal: 10,  stat: 'handsPlayed',  reward: 20 },
    { id: 'big_pot',    desc: 'Win a pot over 500 chips',      icon: '💰', goal: 1,   stat: 'bigPotWins',   reward: 50 },
    { id: 'win_streak', desc: 'Win 2 hands in a row',          icon: '🔥', goal: 2,   stat: 'streak',       reward: 35 },
    { id: 'allin_win',  desc: 'Win a hand while all-in',       icon: '🎯', goal: 1,   stat: 'allInWins',    reward: 45 },
    { id: 'chips_500',  desc: 'Win 500 chips total today',     icon: '💵', goal: 500, stat: 'chipsWon',     reward: 25 },
    { id: 'comeback',   desc: 'Win with less than 300 chips',  icon: '💪', goal: 1,   stat: 'comebackWins', reward: 60 },
];

function _seededShuffle(arr, seed) {
    const out = [...arr];
    let s = seed;
    for (let i = out.length - 1; i > 0; i--) {
        s = (s * 1103515245 + 12345) & 0x7fffffff;
        const j = s % (i + 1);
        [out[i], out[j]] = [out[j], out[i]];
    }
    return out;
}

export function getDailyChallenges() {
    const today = new Date();
    const seed = today.getFullYear() * 10000 + (today.getMonth() + 1) * 100 + today.getDate();
    return _seededShuffle(DAILY_CHALLENGES_POOL, seed).slice(0, 3);
}

function _getDailyKey() {
    const d = new Date();
    return `poker_daily_${d.getFullYear()}_${d.getMonth() + 1}_${d.getDate()}`;
}

export function getDailyProgress() {
    try {
        const raw = localStorage.getItem(_getDailyKey());
        return raw ? JSON.parse(raw) : {};
    } catch { return {}; }
}

export function saveDailyProgress(progress) {
    try { localStorage.setItem(_getDailyKey(), JSON.stringify(progress)); } catch { /* ignore */ }
}

/** Get a challenge's current progress value from the daily progress object. */
export function getChallengeProgress(dailyProgress, challenge) {
    const map = {
        wins: dailyProgress.wins || 0,
        foldWins: dailyProgress.foldWins || 0,
        handsPlayed: dailyProgress.handsPlayed || 0,
        bigPotWins: dailyProgress.bigPotWins || 0,
        streak: dailyProgress.streak || 0,
        allInWins: dailyProgress.allInWins || 0,
        chipsWon: dailyProgress.chipsWon || 0,
        comebackWins: dailyProgress.comebackWins || 0,
    };
    return map[challenge.stat] || 0;
}

/**
 * Update daily challenge progress after a game event.
 * eventType: 'handPlayed' | 'win' | 'loss'
 * payload (for 'win'): { amount, foldWin, wasAllIn, chipsBeforeHand }
 * Returns { progress, rewardEarned, newlyCompleted }
 */
export function updateDailyProgress(eventType, payload = {}) {
    const progress = getDailyProgress();

    if (eventType === 'handPlayed') {
        progress.handsPlayed = (progress.handsPlayed || 0) + 1;
    } else if (eventType === 'win') {
        const { amount = 0, foldWin = false, wasAllIn = false, chipsBeforeHand = Infinity } = payload;
        progress.wins = (progress.wins || 0) + 1;
        progress.streak = (progress.streak || 0) + 1;
        progress.chipsWon = (progress.chipsWon || 0) + amount;
        if (foldWin) progress.foldWins = (progress.foldWins || 0) + 1;
        if (wasAllIn) progress.allInWins = (progress.allInWins || 0) + 1;
        if (amount >= 500) progress.bigPotWins = (progress.bigPotWins || 0) + 1;
        if (chipsBeforeHand < 300) progress.comebackWins = (progress.comebackWins || 0) + 1;
    } else if (eventType === 'loss') {
        progress.streak = 0;
    }

    // Check for newly completed challenges
    const challenges = getDailyChallenges();
    let rewardEarned = 0;
    const newlyCompleted = [];

    for (const ch of challenges) {
        const doneKey = `done_${ch.id}`;
        if (progress[doneKey]) continue; // already rewarded
        const current = getChallengeProgress(progress, ch);
        if (current >= ch.goal) {
            progress[doneKey] = true;
            rewardEarned += ch.reward;
            newlyCompleted.push(ch);
        }
    }

    saveDailyProgress(progress);
    return { progress, rewardEarned, newlyCompleted };
}

// ── Table Themes ───────────────────────────────────────────────────────────

export const TABLE_THEMES = [
    { id: 'classic',  name: 'Classic',       icon: '🎰', cost: 0,
      vars: { '--felt-green': '#0d5a3a', '--felt-dark': '#0a3d28', '--felt-border': '#1a7a52', '--felt-glow': 'rgba(16,185,129,0.15)' } },
    { id: 'midnight', name: 'Midnight Blue',  icon: '🌙', cost: 200,
      vars: { '--felt-green': '#1e3a5f', '--felt-dark': '#172b47', '--felt-border': '#2563eb', '--felt-glow': 'rgba(59,130,246,0.2)' } },
    { id: 'crimson',  name: 'Crimson',        icon: '❤️', cost: 300,
      vars: { '--felt-green': '#7f1d1d', '--felt-dark': '#6b1212', '--felt-border': '#dc2626', '--felt-glow': 'rgba(239,68,68,0.2)' } },
    { id: 'purple',   name: 'Royal Purple',   icon: '💜', cost: 400,
      vars: { '--felt-green': '#4c1d95', '--felt-dark': '#3b1278', '--felt-border': '#7c3aed', '--felt-glow': 'rgba(124,58,237,0.2)' } },
    { id: 'gold',     name: 'Gold Rush',      icon: '✨', cost: 600,
      vars: { '--felt-green': '#78350f', '--felt-dark': '#5c2a0b', '--felt-border': '#d97706', '--felt-glow': 'rgba(217,119,6,0.25)' } },
    { id: 'space',    name: 'Deep Space',     icon: '🌌', cost: 800,
      vars: { '--felt-green': '#0f172a', '--felt-dark': '#070e1f', '--felt-border': '#6366f1', '--felt-glow': 'rgba(99,102,241,0.3)' } },
];

export const CARD_BACKS = [
    { id: 'default', name: 'Classic Blue', icon: '🔵', cost: 0 },
    { id: 'red',     name: 'Classic Red',  icon: '🔴', cost: 100 },
    { id: 'black',   name: 'Onyx',         icon: '⚫', cost: 200 },
    { id: 'wood',    name: 'Walnut',       icon: '🪵', cost: 300 },
    { id: 'gold',    name: 'Gold',         icon: '🌟', cost: 400 },
    { id: 'space',   name: 'Cosmic',       icon: '🌌', cost: 600 },
];

export function applyTableTheme(themeId) {
    const theme = TABLE_THEMES.find(t => t.id === themeId) || TABLE_THEMES[0];
    Object.entries(theme.vars).forEach(([k, v]) => {
        document.documentElement.style.setProperty(k, v);
    });
}

export function applyCardBack(cardBackId) {
    document.documentElement.setAttribute('data-card-back', cardBackId || 'default');
}

// ── Profile defaults & persistence ────────────────────────────────────────

function defaultProfile() {
    return {
        points: 0,
        avatar: 'default',
        winAnimation: 'confetti',
        tableTheme: 'classic',
        cardBack: 'default',
        unlockedAvatars: ['default'],
        unlockedAnimations: ['confetti'],
        unlockedThemes: ['classic'],
        unlockedCardBacks: ['default'],
        achievements: [],
        stats: {
            handsPlayed: 0, handsWon: 0, foldWins: 0, gamesWon: 0,
            biggestPot: 0, winStreak: 0, bestWinStreak: 0, totalChipsWon: 0, allInWins: 0,
        },
    };
}

export function loadProfile() {
    try {
        const raw = localStorage.getItem(PROFILE_KEY);
        if (!raw) return defaultProfile();
        const stored = JSON.parse(raw);
        const def = defaultProfile();
        // Deep-merge stats so new fields appear for existing users
        return {
            ...def,
            ...stored,
            stats: { ...def.stats, ...(stored.stats || {}) },
        };
    } catch {
        return defaultProfile();
    }
}

export function saveProfile(profile) {
    try { localStorage.setItem(PROFILE_KEY, JSON.stringify(profile)); } catch { /* ignore */ }
}

export function getAvatarIcon(profile) {
    const av = AVATARS.find(a => a.id === (profile?.avatar || 'default'));
    return av ? av.icon : '🎮';
}

/**
 * Award points after winning a hand.
 * Returns { profile, newAchievements, pointsEarned }
 */
export function awardHandWin(profile, { amount, hand, wasAllIn, chipsBeforeHand, isGameWin }) {
    const p = { ...profile, stats: { ...profile.stats }, achievements: [...(profile.achievements || [])] };

    // Base: 10pts + 1pt per 100 chips won
    let pointsEarned = 10 + Math.floor(amount / 100);

    p.stats.handsWon = (p.stats.handsWon || 0) + 1;
    if (hand === 'Winner by fold') p.stats.foldWins = (p.stats.foldWins || 0) + 1;
    if (isGameWin) { p.stats.gamesWon = (p.stats.gamesWon || 0) + 1; pointsEarned += 50; }

    // Extended career stats
    p.stats.biggestPot = Math.max(p.stats.biggestPot || 0, amount);
    p.stats.winStreak = (p.stats.winStreak || 0) + 1;
    p.stats.bestWinStreak = Math.max(p.stats.bestWinStreak || 0, p.stats.winStreak);
    p.stats.totalChipsWon = (p.stats.totalChipsWon || 0) + amount;
    if (wasAllIn) p.stats.allInWins = (p.stats.allInWins || 0) + 1;

    const newAchievements = [];
    const unlock = (id) => {
        if (p.achievements.includes(id)) return;
        const ach = ACHIEVEMENTS.find(a => a.id === id);
        if (!ach) return;
        p.achievements.push(id);
        pointsEarned += ach.reward;
        newAchievements.push(ach);
    };

    if (p.stats.handsWon === 1) unlock('first_win');
    if (amount >= 1000) unlock('big_pot');
    if (wasAllIn) unlock('all_in_win');
    if ((p.stats.foldWins || 0) >= 5) unlock('bluff_master');
    if (chipsBeforeHand < 200) unlock('comeback');
    if (isGameWin) unlock('game_winner');
    if (hand?.includes('Straight Flush') || hand?.includes('Royal Flush')) unlock('flush_rush');
    if (hand?.includes('Full House')) unlock('full_house');

    p.points = (p.points || 0) + pointsEarned;
    if (p.points >= 500) unlock('point_hoarder');

    saveProfile(p);
    return { profile: p, newAchievements, pointsEarned };
}

/** Reset win streak when a hand is lost. */
export function resetWinStreak(profile) {
    const p = { ...profile, stats: { ...profile.stats } };
    p.stats.winStreak = 0;
    saveProfile(p);
    return p;
}

/** Record a hand played, check poker_night achievement. */
export function recordHandPlayed(profile) {
    const p = { ...profile, stats: { ...profile.stats }, achievements: [...(profile.achievements || [])] };
    p.stats.handsPlayed = (p.stats.handsPlayed || 0) + 1;

    const newAchievements = [];
    if (p.stats.handsPlayed >= 25 && !p.achievements.includes('poker_night')) {
        const ach = ACHIEVEMENTS.find(a => a.id === 'poker_night');
        if (ach) { p.achievements.push(ach.id); p.points = (p.points || 0) + ach.reward; newAchievements.push(ach); }
    }

    saveProfile(p);
    return { profile: p, newAchievements };
}

/** Buy an avatar from the shop. */
export function buyAvatar(profile, avatarId) {
    const av = AVATARS.find(a => a.id === avatarId);
    if (!av) return { error: 'Not found' };
    if ((profile.unlockedAvatars || []).includes(avatarId)) return { error: 'Already owned' };
    if ((profile.points || 0) < av.cost) return { error: 'Not enough points' };
    const p = { ...profile, points: profile.points - av.cost, unlockedAvatars: [...(profile.unlockedAvatars || ['default']), avatarId] };
    saveProfile(p);
    return { profile: p };
}

/** Equip a purchased avatar. */
export function selectAvatar(profile, avatarId) {
    if (!(profile.unlockedAvatars || ['default']).includes(avatarId)) return { error: 'Not owned' };
    const p = { ...profile, avatar: avatarId };
    saveProfile(p);
    return { profile: p };
}

/** Get avatar emoji by ID. */
export function getAvatarById(avatarId) {
    const av = AVATARS.find(a => a.id === avatarId);
    return av ? av.icon : '🎮';
}

/** Particle effects and seat glow color for each avatar (shown on win). */
export const AVATAR_WIN_FX = {
    default: { emoji: '✨', color: 'rgba(245,158,11,0.7)' },
    cat: { emoji: '🐾', color: 'rgba(249,115,22,0.7)' },
    fox: { emoji: '✨', color: 'rgba(249,115,22,0.7)' },
    wolf: { emoji: '❄️', color: 'rgba(148,163,184,0.7)' },
    lion: { emoji: '👑', color: 'rgba(245,158,11,0.8)' },
    dragon: { emoji: '🔥', color: 'rgba(239,68,68,0.8)' },
    crown: { emoji: '✨', color: 'rgba(245,158,11,0.9)' },
    fire: { emoji: '🔥', color: 'rgba(239,68,68,0.9)' },
    gem: { emoji: '💎', color: 'rgba(59,130,246,0.8)' },
    ace: { emoji: '♠️', color: 'rgba(241,245,249,0.8)' },
};

/** Buy a win animation from the shop. */
export function buyAnimation(profile, animId) {
    const anim = WIN_ANIMATIONS.find(a => a.id === animId);
    if (!anim) return { error: 'Not found' };
    if ((profile.unlockedAnimations || ['confetti']).includes(animId)) return { error: 'Already owned' };
    if ((profile.points || 0) < anim.cost) return { error: 'Not enough points' };
    const p = { ...profile, points: profile.points - anim.cost, unlockedAnimations: [...(profile.unlockedAnimations || ['confetti']), animId] };
    saveProfile(p);
    return { profile: p };
}

/** Equip a purchased win animation. */
export function selectAnimation(profile, animId) {
    if (!(profile.unlockedAnimations || ['confetti']).includes(animId)) return { error: 'Not owned' };
    const p = { ...profile, winAnimation: animId };
    saveProfile(p);
    return { profile: p };
}

/** Get the CSS class for a player's equipped win animation. */
export function getWinAnimationCSS(profile) {
    const animId = profile?.winAnimation || 'confetti';
    const anim = WIN_ANIMATIONS.find(a => a.id === animId);
    return anim ? anim.css : 'confetti';
}

/** Buy a table theme from the shop. */
export function buyTableTheme(profile, themeId) {
    const theme = TABLE_THEMES.find(t => t.id === themeId);
    if (!theme) return { error: 'Not found' };
    if ((profile.unlockedThemes || ['classic']).includes(themeId)) return { error: 'Already owned' };
    if ((profile.points || 0) < theme.cost) return { error: 'Not enough points' };
    const p = { ...profile, points: profile.points - theme.cost, unlockedThemes: [...(profile.unlockedThemes || ['classic']), themeId] };
    saveProfile(p);
    return { profile: p };
}

/** Equip a table theme. */
export function selectTableTheme(profile, themeId) {
    if (!(profile.unlockedThemes || ['classic']).includes(themeId)) return { error: 'Not owned' };
    const p = { ...profile, tableTheme: themeId };
    saveProfile(p);
    applyTableTheme(themeId);
    return { profile: p };
}

/** Buy a card back from the shop. */
export function buyCardBack(profile, cardBackId) {
    const cb = CARD_BACKS.find(c => c.id === cardBackId);
    if (!cb) return { error: 'Not found' };
    if ((profile.unlockedCardBacks || ['default']).includes(cardBackId)) return { error: 'Already owned' };
    if ((profile.points || 0) < cb.cost) return { error: 'Not enough points' };
    const p = { ...profile, points: profile.points - cb.cost, unlockedCardBacks: [...(profile.unlockedCardBacks || ['default']), cardBackId] };
    saveProfile(p);
    return { profile: p };
}

/** Equip a card back. */
export function selectCardBack(profile, cardBackId) {
    if (!(profile.unlockedCardBacks || ['default']).includes(cardBackId)) return { error: 'Not owned' };
    const p = { ...profile, cardBack: cardBackId };
    saveProfile(p);
    applyCardBack(cardBackId);
    return { profile: p };
}
