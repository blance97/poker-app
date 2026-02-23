// client/src/components/Profile.jsx
import { useState } from 'react';
import { ACHIEVEMENTS, AVATARS, WIN_ANIMATIONS, buyAvatar, selectAvatar, buyAnimation, selectAnimation, getAvatarIcon } from '../utils/profileUtils';

export default function Profile({ profile, onProfileChange, onClose }) {
    const [tab, setTab] = useState('stats');

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

    const unlockedCount = (profile.achievements || []).length;

    return (
        <div className="profile-panel">
            <div className="profile-panel__header">
                <div className="profile-panel__identity">
                    <span className="profile-panel__avatar-display">{getAvatarIcon(profile)}</span>
                    <div>
                        <div className="profile-panel__points">⭐ {profile.points || 0} pts</div>
                        <div className="profile-panel__ach-count">{unlockedCount}/{ACHIEVEMENTS.length} achievements</div>
                    </div>
                </div>
                <button className="profile-panel__close" onClick={onClose}>✕</button>
            </div>

            <div className="profile-panel__tabs">
                {['stats', 'achievements', 'shop'].map(t => (
                    <button
                        key={t}
                        className={`profile-panel__tab ${tab === t ? 'profile-panel__tab--active' : ''}`}
                        onClick={() => setTab(t)}
                    >
                        {t === 'stats' ? '📊 Stats' : t === 'achievements' ? '🏅 Achieve' : '🛒 Shop'}
                    </button>
                ))}
            </div>

            <div className="profile-panel__body">
                {tab === 'stats' && (
                    <div className="profile-panel__stats">
                        {[
                            ['Hands Played', profile.stats?.handsPlayed || 0],
                            ['Hands Won', profile.stats?.handsWon || 0],
                            ['Games Won', profile.stats?.gamesWon || 0],
                            ['Bluff Wins', profile.stats?.foldWins || 0],
                            ['Total Points', `⭐ ${profile.points || 0}`],
                        ].map(([label, val]) => (
                            <div key={label} className="profile-panel__stat-row">
                                <span className="profile-panel__stat-label">{label}</span>
                                <span className="profile-panel__stat-val">{val}</span>
                            </div>
                        ))}
                    </div>
                )}

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

                {tab === 'shop' && (
                    <div className="profile-panel__shop">
                        <div className="profile-panel__balance">Balance: ⭐ {profile.points || 0} pts</div>
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
                    </div>
                )}
            </div>
        </div>
    );
}
