const { PokerGame } = require('./games/PokerGame');
const logger = require('../utils/logger');

// Mock logger to avoid clutter
logger.info = () => { };
logger.error = console.error;

// Setup
const players = [
    { id: 'p1', name: 'Alice', chips: 100 },
    { id: 'p2', name: 'Bob', chips: 200 },
    { id: 'p3', name: 'Charlie', chips: 500 }
];

const game = new PokerGame(players, { startingChips: 1000, smallBlind: 10, bigBlind: 20 });
// Force chips
game.playerStates['p1'].chips = 100;
game.playerStates['p2'].chips = 200;
game.playerStates['p3'].chips = 500;

console.log('--- Starting Game ---');
game.start();

// Preflop: Blinds posted.
// Alice (SB) 10, Bob (BB) 20. Charlie (Dealer) acts first?
// 3 players. Dealer=0. SB=1, BB=2.
// Wait, normal order: Dealer(0), SB(1), BB(2).
// Action starts at UTG (Position after BB). Here it is Dealer (0) again?
// Let's check logic:
// 3 players. D=p1, SB=p2, BB=p3.
// Action: p1.

// game.playerStates indices match players array?
// p1 at index 0. p2 at 1. p3 at 2.
// Dealer is index 0 (p1).
// SB is p2 (10). Chips: 190.
// BB is p3 (20). Chips: 480.
// Action on p1 (Dealer/UTG). Chips: 100.

console.log('P1 (100) goes All-In');
game.handleAction('p1', { action: 'raise', amount: 100 });
// P1 bets 100 (All-in). Pot: 10+20+100 = 130? No, P1 adds 100.
// Preflop calling amounts: CurrentBet=20.
// P1 raises to 100.
// ps['p1'].currentBet = 100. ps['p1'].chips = 0. AllIn.

console.log('P2 (200) goes All-In');
game.handleAction('p2', { action: 'raise', amount: 200 });
// P2 (SB) already put 10. Needs 190 more to reach 200.
// Call 100, Raise to 200.
// Chips: 190 - 190 = 0. AllIn.
// ps['p2'].currentBet = 200.

console.log('P3 (500) calls');
game.handleAction('p3', { action: 'call' }); // Matches 200.
// P3 (BB) put 20. Adds 180.
// Chips: 480 - 180 = 300.
// ps['p3'].currentBet = 200.

console.log('Game Phase:', game.phase); // Should be 'flop' or 'showdown' dependent on logic?
// All players acted?
// P1 Allin. P2 Allin. P3 Called (Not allin).
// Betting round over? Yes.
// _advancePhase -> _distributeBetsToPots.

console.log('--- POTS ---');
game.pots.forEach((pot, i) => {
    console.log(`Pot ${i}: Amount=${pot.amount}, Contributors=${pot.contributors}`);
});

// Expected:
// Bets: P1:100, P2:200, P3:200.
// Level 1: 100. (Everyone).
// Pot 0: 300. Contrib: p1, p2, p3.
// Level 2: 200. (P2, P3).
// Pot 1: 200 (100 each from P2, P3). Contrib: p2, p3.

if (game.pots.length !== 2) console.error('FAIL: Expected 2 pots');
if (game.pots[0].amount !== 300) console.error(`FAIL: Pot 0 amount ${game.pots[0].amount} != 300`);
if (game.pots[1].amount !== 200) console.error(`FAIL: Pot 1 amount ${game.pots[1].amount} != 200`);

console.log('Test Complete');
