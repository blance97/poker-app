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
    { id: 'guns', icon: '🔫', name: 'Gunslinger', cost: 800, css: 'guns', desc: 'Bullet tracers at opponents' },
];

function defaultProfile() {
    return {
        points: 0,
        avatar: 'default',
        winAnimation: 'confetti',
        unlockedAvatars: ['default'],
        unlockedAnimations: ['confetti'],
        achievements: [],
        stats: { handsPlayed: 0, handsWon: 0, foldWins: 0, gamesWon: 0 },
    };
}

export function loadProfile() {
    try {
        const raw = localStorage.getItem(PROFILE_KEY);
        if (!raw) return defaultProfile();
        return { ...defaultProfile(), ...JSON.parse(raw) };
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
