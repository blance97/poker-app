const { PokerGame } = require('./games/PokerGame');
const logger = require('./utils/logger');

// Mock logger to avoid clutter
logger.info = console.log;
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

// Force dealer to make P1 the first to act (UTG)
// 3 Players. Action starts after BB.
// If Dealer = P1 (0). SB=P2, BB=P3. UTG=P1.
// start() advances dealer. So set to 2 (P3), so it advances to 0 (P1).
game.dealerIndex = 2;

console.log('--- Starting Game ---');
game.start();

console.log('P1 (100) goes All-In');
let res = game.handleAction('p1', { action: 'raise', amount: 100 });
console.log('Result:', res);

console.log('P2 (200) goes All-In');
res = game.handleAction('p2', { action: 'raise', amount: 200 });
console.log('Result:', res);

console.log('P3 (500) calls');
res = game.handleAction('p3', { action: 'call' });
console.log('Result:', res);

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
