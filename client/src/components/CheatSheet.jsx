// client/src/components/CheatSheet.jsx
import { useState } from 'react';
import Card from './Card';

const HAND_RANKINGS = [
    {
        name: 'Royal Flush',
        description: 'A, K, Q, J, 10, all the same suit',
        cards: [
            { rank: 'A', suit: 'spades' }, { rank: 'K', suit: 'spades' },
            { rank: 'Q', suit: 'spades' }, { rank: 'J', suit: 'spades' },
            { rank: '10', suit: 'spades' },
        ],
        rarity: 'Legendary',
    },
    {
        name: 'Straight Flush',
        description: 'Five cards in a sequence, all the same suit',
        cards: [
            { rank: '9', suit: 'hearts' }, { rank: '8', suit: 'hearts' },
            { rank: '7', suit: 'hearts' }, { rank: '6', suit: 'hearts' },
            { rank: '5', suit: 'hearts' },
        ],
        rarity: 'Ultra Rare',
    },
    {
        name: 'Four of a Kind',
        description: 'Four cards of the same rank',
        cards: [
            { rank: 'K', suit: 'hearts' }, { rank: 'K', suit: 'diamonds' },
            { rank: 'K', suit: 'clubs' }, { rank: 'K', suit: 'spades' },
            { rank: '3', suit: 'hearts' },
        ],
        rarity: 'Very Rare',
    },
    {
        name: 'Full House',
        description: 'Three of a kind plus a pair',
        cards: [
            { rank: 'J', suit: 'hearts' }, { rank: 'J', suit: 'diamonds' },
            { rank: 'J', suit: 'clubs' }, { rank: '8', suit: 'spades' },
            { rank: '8', suit: 'hearts' },
        ],
        rarity: 'Rare',
    },
    {
        name: 'Flush',
        description: 'Any five cards of the same suit',
        cards: [
            { rank: 'A', suit: 'diamonds' }, { rank: 'J', suit: 'diamonds' },
            { rank: '8', suit: 'diamonds' }, { rank: '5', suit: 'diamonds' },
            { rank: '3', suit: 'diamonds' },
        ],
        rarity: 'Uncommon',
    },
    {
        name: 'Straight',
        description: 'Five cards in a sequence, any suit',
        cards: [
            { rank: '10', suit: 'hearts' }, { rank: '9', suit: 'clubs' },
            { rank: '8', suit: 'diamonds' }, { rank: '7', suit: 'spades' },
            { rank: '6', suit: 'hearts' },
        ],
        rarity: 'Uncommon',
    },
    {
        name: 'Three of a Kind',
        description: 'Three cards of the same rank',
        cards: [
            { rank: '7', suit: 'hearts' }, { rank: '7', suit: 'diamonds' },
            { rank: '7', suit: 'clubs' }, { rank: 'K', suit: 'spades' },
            { rank: '2', suit: 'hearts' },
        ],
        rarity: 'Common',
    },
    {
        name: 'Two Pair',
        description: 'Two different pairs',
        cards: [
            { rank: 'Q', suit: 'hearts' }, { rank: 'Q', suit: 'diamonds' },
            { rank: '5', suit: 'clubs' }, { rank: '5', suit: 'spades' },
            { rank: 'A', suit: 'hearts' },
        ],
        rarity: 'Common',
    },
    {
        name: 'One Pair',
        description: 'Two cards of the same rank',
        cards: [
            { rank: '10', suit: 'hearts' }, { rank: '10', suit: 'diamonds' },
            { rank: 'A', suit: 'clubs' }, { rank: '7', suit: 'spades' },
            { rank: '3', suit: 'hearts' },
        ],
        rarity: 'Very Common',
    },
    {
        name: 'High Card',
        description: 'No matches — highest card wins',
        cards: [
            { rank: 'A', suit: 'hearts' }, { rank: 'J', suit: 'clubs' },
            { rank: '8', suit: 'diamonds' }, { rank: '5', suit: 'spades' },
            { rank: '2', suit: 'clubs' },
        ],
        rarity: 'Most Common',
    },
];

const TERMS = [
    { term: 'Blinds', definition: 'Forced bets posted by the two players left of the dealer before cards are dealt. Small Blind = half, Big Blind = full.' },
    { term: 'Flop', definition: 'The first three community cards dealt face-up on the table.' },
    { term: 'Turn', definition: 'The fourth community card dealt after the flop.' },
    { term: 'River', definition: 'The fifth and final community card.' },
    { term: 'Check', definition: "Pass the action to the next player without betting (only if no one has bet yet)." },
    { term: 'Call', definition: "Match the current bet to stay in the hand." },
    { term: 'Raise', definition: "Increase the current bet. Other players must then call your raise or fold." },
    { term: 'Fold', definition: "Surrender your hand and forfeit the pot." },
    { term: 'All-In', definition: "Bet all your remaining chips." },
    { term: 'Pot', definition: "The total amount of chips bet by all players in the current hand." },
];

const TIPS = [
    "🎯 Play tight early — only play strong starting hands like high pairs and suited connectors.",
    "📍 Position matters — acting later gives you more information about other players' hands.",
    "🎭 Don't bluff too often — as a beginner, play straightforward and let strong hands win for you.",
    "💰 Manage your chips — don't go all-in without a very strong hand.",
    "👀 Watch the community cards — they help everyone, so think about what hands your opponents might have.",
    "🃏 Starting hands to play: AA, KK, QQ, JJ, AK, AQ — fold most other hands pre-flop as a beginner.",
];

export default function CheatSheet() {
    const [isOpen, setIsOpen] = useState(false);
    const [activeTab, setActiveTab] = useState('hands');

    return (
        <>
            <button
                className={`cheat-sheet__toggle ${isOpen ? 'cheat-sheet__toggle--open' : ''}`}
                onClick={() => setIsOpen(!isOpen)}
            >
                {isOpen ? '✕' : '📖'} {!isOpen && 'Cheat Sheet'}
            </button>

            <div className={`cheat-sheet ${isOpen ? 'cheat-sheet--open' : ''}`}>
                <div className="cheat-sheet__header">
                    <h2>Poker Cheat Sheet</h2>
                    <div className="cheat-sheet__tabs">
                        <button
                            className={`cheat-sheet__tab ${activeTab === 'hands' ? 'cheat-sheet__tab--active' : ''}`}
                            onClick={() => setActiveTab('hands')}
                        >
                            Hand Rankings
                        </button>
                        <button
                            className={`cheat-sheet__tab ${activeTab === 'terms' ? 'cheat-sheet__tab--active' : ''}`}
                            onClick={() => setActiveTab('terms')}
                        >
                            Terminology
                        </button>
                        <button
                            className={`cheat-sheet__tab ${activeTab === 'tips' ? 'cheat-sheet__tab--active' : ''}`}
                            onClick={() => setActiveTab('tips')}
                        >
                            Tips
                        </button>
                    </div>
                </div>

                <div className="cheat-sheet__content">
                    {activeTab === 'hands' && (
                        <div className="cheat-sheet__hands">
                            {HAND_RANKINGS.map((hand, i) => (
                                <div key={hand.name} className="cheat-sheet__hand">
                                    <div className="cheat-sheet__hand-header">
                                        <span className="cheat-sheet__hand-rank">#{i + 1}</span>
                                        <span className="cheat-sheet__hand-name">{hand.name}</span>
                                        <span className={`cheat-sheet__rarity cheat-sheet__rarity--${hand.rarity.toLowerCase().replace(' ', '-')}`}>
                                            {hand.rarity}
                                        </span>
                                    </div>
                                    <p className="cheat-sheet__hand-desc">{hand.description}</p>
                                    <div className="cheat-sheet__hand-cards">
                                        {hand.cards.map((card, j) => (
                                            <Card key={j} card={card} small />
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {activeTab === 'terms' && (
                        <div className="cheat-sheet__terms">
                            {TERMS.map(({ term, definition }) => (
                                <div key={term} className="cheat-sheet__term">
                                    <dt>{term}</dt>
                                    <dd>{definition}</dd>
                                </div>
                            ))}
                        </div>
                    )}

                    {activeTab === 'tips' && (
                        <div className="cheat-sheet__tips">
                            {TIPS.map((tip, i) => (
                                <div key={i} className="cheat-sheet__tip">{tip}</div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </>
    );
}
