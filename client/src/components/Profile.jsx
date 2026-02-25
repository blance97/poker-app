// client/src/components/Profile.jsx
import { useState } from 'react';
import {
    ACHIEVEMENTS, AVATARS, WIN_ANIMATIONS, TABLE_THEMES, CARD_BACKS,
    RANKS, getRank, getNextRank,
    getDailyChallenges, getDailyProgress, getChallengeProgress,
    buyAvatar, selectAvatar, buyAnimation, selectAnimation,
    buyTableTheme, selectTableTheme, buyCardBack, selectCardBack,
    getAvatarIcon,
} from '../utils/profileUtils';

function ProgressBar({ value, max }) {
    const pct = Math.min(100, Math.round((value / max) * 100));
    return (
        <div className="challenge-bar">
            <div className="challenge-bar__fill" style={{ width: `${pct}%` }} />
        </div>
    );
}

export default function Profile({ profile, onProfileChange, onClose }) {
    const [tab, setTab] = useState('stats');
    const dailyChallenges = getDailyChallenges();
    const dailyProgress = getDailyProgress();

    const rank = getRank(profile);
    const nextRank = getNextRank(profile);

    const handleBuy = (avatarId) => {
        const result = buyAvatar(profile, avatarId);
        if (!result.error) onProfileChange(result.profile);
    };

    const handleSelect = (avatarId) => {
        const result = selectAvatar(profile, avatarId);
        if (!result.error) onProfileChange(result.profile);
    };

    const handleBuyAnim = (animId) => {
        const result = buyAnimation(profile, animId);
        if (!result.error) onProfileChange(result.profile);
    };

    const handleSelectAnim = (animId) => {
        const result = selectAnimation(profile, animId);
        if (!result.error) onProfileChange(result.profile);
    };

    const handleBuyTheme = (themeId) => {
        const result = buyTableTheme(profile, themeId);
        if (!result.error) onProfileChange(result.profile);
    };

    const handleSelectTheme = (themeId) => {
        const result = selectTableTheme(profile, themeId);
        if (!result.error) onProfileChange(result.profile);
    };

    const handleBuyCardBack = (cbId) => {
        const result = buyCardBack(profile, cbId);
        if (!result.error) onProfileChange(result.profile);
    };

    const handleSelectCardBack = (cbId) => {
        const result = selectCardBack(profile, cbId);
        if (!result.error) onProfileChange(result.profile);
    };

    const unlockedCount = (profile.achievements || []).length;

    return (
        <div className="profile-panel">
            <div className="profile-panel__header">
                <div className="profile-panel__identity">
                    <span className="profile-panel__avatar-display">{getAvatarIcon(profile)}</span>
                    <div>
                        <div className="profile-panel__rank-badge" style={{ color: rank.color }}>
                            {rank.icon} {rank.name}
                        </div>
                        <div className="profile-panel__points">⭐ {profile.points || 0} pts</div>
                        <div className="profile-panel__ach-count">{unlockedCount}/{ACHIEVEMENTS.length} achievements</div>
                    </div>
                </div>
                <button className="profile-panel__close" onClick={onClose}>✕</button>
            </div>

            {nextRank && (
                <div className="profile-panel__rank-progress">
                    <span className="profile-panel__rank-progress-label">
                        {profile.stats?.handsWon || 0}/{nextRank.minWins} wins → {nextRank.icon} {nextRank.name}
                    </span>
                    <ProgressBar value={profile.stats?.handsWon || 0} max={nextRank.minWins} />
                </div>
            )}

            <div className="profile-panel__tabs">
                {['stats', 'challenges', 'achievements', 'shop'].map(t => (
                    <button
                        key={t}
                        className={`profile-panel__tab ${tab === t ? 'profile-panel__tab--active' : ''}`}
                        onClick={() => setTab(t)}
                    >
                        {t === 'stats' ? '📊 Stats'
                            : t === 'challenges' ? '📅 Daily'
                            : t === 'achievements' ? '🏅 Achieve'
                            : '🛒 Shop'}
                    </button>
                ))}
            </div>

            <div className="profile-panel__body">
                {/* ── Stats ── */}
                {tab === 'stats' && (
                    <div className="profile-panel__stats">
                        {[
                            ['Hands Played', profile.stats?.handsPlayed || 0],
                            ['Hands Won', profile.stats?.handsWon || 0],
                            ['Games Won', profile.stats?.gamesWon || 0],
                            ['Bluff Wins', profile.stats?.foldWins || 0],
                            ['All-In Wins', profile.stats?.allInWins || 0],
                            ['Best Win Streak', profile.stats?.bestWinStreak || 0],
                            ['Biggest Pot', `${(profile.stats?.biggestPot || 0).toLocaleString()} chips`],
                            ['Total Chips Won', `${(profile.stats?.totalChipsWon || 0).toLocaleString()} chips`],
                            ['Total Points', `⭐ ${profile.points || 0}`],
                        ].map(([label, val]) => (
                            <div key={label} className="profile-panel__stat-row">
                                <span className="profile-panel__stat-label">{label}</span>
                                <span className="profile-panel__stat-val">{val}</span>
                            </div>
                        ))}

                        <div className="profile-panel__points-info">
                            <h4 className="profile-panel__points-info-title">How to Earn Points</h4>
                            <ul className="profile-panel__points-info-list">
                                <li><span>Win a Hand</span> <span>+10</span></li>
                                <li><span>Pot Bonus</span> <span>+1 per 100 chips</span></li>
                                <li><span>Win the Game</span> <span>+50</span></li>
                                <li><span>Daily Challenges</span> <span>+10–60</span></li>
                                <li><span>Achievements</span> <span>Varies</span></li>
                            </ul>
                        </div>
                    </div>
                )}

                {/* ── Daily Challenges ── */}
                {tab === 'challenges' && (
                    <div className="profile-panel__challenges">
                        <div className="profile-panel__challenges-heading">
                            Today's Challenges — resets at midnight
                        </div>
                        {dailyChallenges.map(ch => {
                            const current = getChallengeProgress(dailyProgress, ch);
                            const done = current >= ch.goal;
                            return (
                                <div key={ch.id} className={`challenge-row ${done ? 'challenge-row--done' : ''}`}>
                                    <div className="challenge-row__header">
                                        <span className="challenge-row__icon">{done ? '✅' : ch.icon}</span>
                                        <span className="challenge-row__desc">{ch.desc}</span>
                                        <span className="challenge-row__reward">+{ch.reward} pts</span>
                                    </div>
                                    <div className="challenge-row__progress-line">
                                        <ProgressBar value={current} max={ch.goal} />
                                        <span className="challenge-row__count">
                                            {ch.stat === 'chipsWon'
                                                ? `${Math.min(current, ch.goal).toLocaleString()}/${ch.goal.toLocaleString()}`
                                                : `${Math.min(current, ch.goal)}/${ch.goal}`}
                                        </span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}

                {/* ── Achievements ── */}
                {tab === 'achievements' && (
                    <div className="profile-panel__achievements">
                        {ACHIEVEMENTS.map(ach => {
                            const unlocked = (profile.achievements || []).includes(ach.id);
                            return (
                                <div key={ach.id} className={`profile-panel__ach ${unlocked ? 'profile-panel__ach--unlocked' : ''}`}>
                                    <span className="profile-panel__ach-icon">{unlocked ? ach.icon : '🔒'}</span>
                                    <div className="profile-panel__ach-info">
                                        <div className="profile-panel__ach-name">{ach.name}</div>
                                        <div className="profile-panel__ach-desc">{ach.desc}</div>
                                    </div>
                                    {ach.reward > 0 && (
                                        <span className={`profile-panel__ach-reward ${unlocked ? 'profile-panel__ach-reward--earned' : ''}`}>
                                            +{ach.reward}
                                        </span>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}

                {/* ── Shop ── */}
                {tab === 'shop' && (
                    <div className="profile-panel__shop">
                        <div className="profile-panel__balance">Balance: ⭐ {profile.points || 0} pts</div>

                        {/* Avatars */}
                        <h3 className="profile-panel__shop-heading">🧑 Avatars</h3>
                        <div className="profile-panel__avatar-grid">
                            {AVATARS.map(av => {
                                const owned = (profile.unlockedAvatars || ['default']).includes(av.id);
                                const selected = profile.avatar === av.id;
                                const affordable = (profile.points || 0) >= av.cost;
                                return (
                                    <div key={av.id} className={`profile-panel__av-item ${owned ? 'profile-panel__av-item--owned' : ''} ${selected ? 'profile-panel__av-item--selected' : ''}`}>
                                        <span className="profile-panel__av-icon">{av.icon}</span>
                                        <span className="profile-panel__av-name">{av.name}</span>
                                        {owned ? (
                                            <button
                                                className={`profile-panel__av-btn ${selected ? 'profile-panel__av-btn--equipped' : ''}`}
                                                onClick={() => handleSelect(av.id)}
                                            >
                                                {selected ? '✓ On' : 'Equip'}
                                            </button>
                                        ) : (
                                            <button
                                                className="profile-panel__av-btn profile-panel__av-btn--buy"
                                                onClick={() => handleBuy(av.id)}
                                                disabled={!affordable}
                                            >
                                                {av.cost === 0 ? 'Free' : `⭐ ${av.cost}`}
                                            </button>
                                        )}
                                    </div>
                                );
                            })}
                        </div>

                        {/* Win Animations */}
                        <h3 className="profile-panel__shop-heading">🎆 Win Animations</h3>
                        <div className="profile-panel__avatar-grid">
                            {WIN_ANIMATIONS.map(anim => {
                                const owned = (profile.unlockedAnimations || ['confetti']).includes(anim.id);
                                const selected = (profile.winAnimation || 'confetti') === anim.id;
                                const affordable = (profile.points || 0) >= anim.cost;
                                return (
                                    <div key={anim.id} className={`profile-panel__av-item ${owned ? 'profile-panel__av-item--owned' : ''} ${selected ? 'profile-panel__av-item--selected' : ''}`}>
                                        <span className="profile-panel__av-icon">{anim.icon}</span>
                                        <span className="profile-panel__av-name">{anim.name}</span>
                                        <span className="profile-panel__av-desc">{anim.desc}</span>
                                        {owned ? (
                                            <button
                                                className={`profile-panel__av-btn ${selected ? 'profile-panel__av-btn--equipped' : ''}`}
                                                onClick={() => handleSelectAnim(anim.id)}
                                            >
                                                {selected ? '✓ On' : 'Equip'}
                                            </button>
                                        ) : (
                                            <button
                                                className="profile-panel__av-btn profile-panel__av-btn--buy"
                                                onClick={() => handleBuyAnim(anim.id)}
                                                disabled={!affordable}
                                            >
                                                {anim.cost === 0 ? 'Free' : `⭐ ${anim.cost}`}
                                            </button>
                                        )}
                                    </div>
                                );
                            })}
                        </div>

                        {/* Table Themes */}
                        <h3 className="profile-panel__shop-heading">🎰 Table Themes</h3>
                        <div className="profile-panel__avatar-grid">
                            {TABLE_THEMES.map(theme => {
                                const owned = (profile.unlockedThemes || ['classic']).includes(theme.id);
                                const selected = (profile.tableTheme || 'classic') === theme.id;
                                const affordable = (profile.points || 0) >= theme.cost;
                                return (
                                    <div key={theme.id} className={`profile-panel__av-item ${owned ? 'profile-panel__av-item--owned' : ''} ${selected ? 'profile-panel__av-item--selected' : ''}`}>
                                        <span className="profile-panel__av-icon">{theme.icon}</span>
                                        <span className="profile-panel__av-name">{theme.name}</span>
                                        {owned ? (
                                            <button
                                                className={`profile-panel__av-btn ${selected ? 'profile-panel__av-btn--equipped' : ''}`}
                                                onClick={() => handleSelectTheme(theme.id)}
                                            >
                                                {selected ? '✓ On' : 'Equip'}
                                            </button>
                                        ) : (
                                            <button
                                                className="profile-panel__av-btn profile-panel__av-btn--buy"
                                                onClick={() => handleBuyTheme(theme.id)}
                                                disabled={!affordable}
                                            >
                                                {theme.cost === 0 ? 'Free' : `⭐ ${theme.cost}`}
                                            </button>
                                        )}
                                    </div>
                                );
                            })}
                        </div>

                        {/* Card Backs */}
                        <h3 className="profile-panel__shop-heading">🃏 Card Backs</h3>
                        <div className="profile-panel__avatar-grid">
                            {CARD_BACKS.map(cb => {
                                const owned = (profile.unlockedCardBacks || ['default']).includes(cb.id);
                                const selected = (profile.cardBack || 'default') === cb.id;
                                const affordable = (profile.points || 0) >= cb.cost;
                                return (
                                    <div key={cb.id} className={`profile-panel__av-item ${owned ? 'profile-panel__av-item--owned' : ''} ${selected ? 'profile-panel__av-item--selected' : ''}`}>
                                        <span className="profile-panel__av-icon">{cb.icon}</span>
                                        <span className="profile-panel__av-name">{cb.name}</span>
                                        {owned ? (
                                            <button
                                                className={`profile-panel__av-btn ${selected ? 'profile-panel__av-btn--equipped' : ''}`}
                                                onClick={() => handleSelectCardBack(cb.id)}
                                            >
                                                {selected ? '✓ On' : 'Equip'}
                                            </button>
                                        ) : (
                                            <button
                                                className="profile-panel__av-btn profile-panel__av-btn--buy"
                                                onClick={() => handleBuyCardBack(cb.id)}
                                                disabled={!affordable}
                                            >
                                                {cb.cost === 0 ? 'Free' : `⭐ ${cb.cost}`}
                                            </button>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
