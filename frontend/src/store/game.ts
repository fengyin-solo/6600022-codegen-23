import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type {
  BoardState,
  Move,
  GameRecord,
  AIConfig,
  GameStatus,
  PatternInfo,
  PatternType,
  BoardAnalysis,
  TeachingContent,
  TeachingConfig,
  HighlightPosition,
  NextHint,
} from '../types';

const BOARD_SIZE = 15;
const EMPTY = 0;
const BLACK = 1;
const WHITE = 2;

function createEmptyBoard(): BoardState {
  return Array.from({ length: BOARD_SIZE }, () => Array(BOARD_SIZE).fill(EMPTY));
}

// --- AI: Minimax + Alpha-Beta Pruning ---

const SCORE_TABLE: Record<string, number> = {
  'five': 1000000,
  'live-four': 100000,
  'dead-four': 10000,
  'live-three': 10000,
  'dead-three': 1000,
  'live-two': 1000,
  'dead-two': 100,
  'live-one': 100,
  'dead-one': 10,
};

const DIRECTIONS = [[0, 1], [1, 0], [1, 1], [1, -1]];

function countDirection(board: BoardState, row: number, col: number, dr: number, dc: number, player: number): number {
  let count = 0;
  let r = row + dr;
  let c = col + dc;
  while (r >= 0 && r < BOARD_SIZE && c >= 0 && c < BOARD_SIZE && board[r][c] === player) {
    count++;
    r += dr;
    c += dc;
  }
  return count;
}

function isBlocked(board: BoardState, row: number, col: number, dr: number, dc: number, steps: number): boolean {
  const r = row + dr * steps;
  const c = col + dc * steps;
  if (r < 0 || r >= BOARD_SIZE || c < 0 || c >= BOARD_SIZE) return true;
  return board[r][c] !== EMPTY;
}

function evaluateLine(board: BoardState, row: number, col: number, dr: number, dc: number, player: number): number {
  const count = 1 + countDirection(board, row, col, dr, dc, player) + countDirection(board, row, col, -dr, -dc, player);
  if (count >= 5) return SCORE_TABLE['five'];

  const fwd = countDirection(board, row, col, dr, dc, player);
  const bwd = countDirection(board, row, col, -dr, -dc, player);
  const fwdBlocked = isBlocked(board, row + dr * (fwd + 1), col + dc * (fwd + 1), 0, 0, 0) ||
    (row + dr * (fwd + 1) < 0 || row + dr * (fwd + 1) >= BOARD_SIZE || col + dc * (fwd + 1) < 0 || col + dc * (fwd + 1) >= BOARD_SIZE || board[row + dr * (fwd + 1)][col + dc * (fwd + 1)] !== EMPTY);
  const bwdBlocked = isBlocked(board, row - dr * (bwd + 1), col - dc * (bwd + 1), 0, 0, 0) ||
    (row - dr * (bwd + 1) < 0 || row - dr * (bwd + 1) >= BOARD_SIZE || col - dc * (bwd + 1) < 0 || col - dc * (bwd + 1) >= BOARD_SIZE || board[row - dr * (bwd + 1)][col - dc * (bwd + 1)] !== EMPTY);

  const openEnds = (fwdBlocked ? 0 : 1) + (bwdBlocked ? 0 : 1);

  if (openEnds === 0) return 0;

  const key = count === 4 ? (openEnds === 2 ? 'live-four' : 'dead-four')
    : count === 3 ? (openEnds === 2 ? 'live-three' : 'dead-three')
    : count === 2 ? (openEnds === 2 ? 'live-two' : 'dead-two')
    : (openEnds === 2 ? 'live-one' : 'dead-one');

  return SCORE_TABLE[key] || 0;
}

function evaluateBoard(board: BoardState, aiPlayer: number): number {
  let aiScore = 0;
  let humanScore = 0;
  const humanPlayer = aiPlayer === BLACK ? WHITE : BLACK;

  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      if (board[r][c] === aiPlayer) {
        for (const [dr, dc] of DIRECTIONS) {
          aiScore += evaluateLine(board, r, c, dr, dc, aiPlayer);
        }
      } else if (board[r][c] === humanPlayer) {
        for (const [dr, dc] of DIRECTIONS) {
          humanScore += evaluateLine(board, r, c, dr, dc, humanPlayer);
        }
      }
    }
  }
  return aiScore - humanScore * 1.1;
}

function getCandidateMoves(board: BoardState): [number, number][] {
  const candidates: [number, number][] = [];
  const visited = new Set<string>();

  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      if (board[r][c] !== EMPTY) {
        for (let dr = -2; dr <= 2; dr++) {
          for (let dc = -2; dc <= 2; dc++) {
            const nr = r + dr;
            const nc = c + dc;
            const key = `${nr},${nc}`;
            if (nr >= 0 && nr < BOARD_SIZE && nc >= 0 && nc < BOARD_SIZE && board[nr][nc] === EMPTY && !visited.has(key)) {
              visited.add(key);
              candidates.push([nr, nc]);
            }
          }
        }
      }
    }
  }
  if (candidates.length === 0 && board[7][7] === EMPTY) {
    candidates.push([7, 7]);
  }
  return candidates;
}

function checkWinAt(board: BoardState, row: number, col: number, player: number): boolean {
  for (const [dr, dc] of DIRECTIONS) {
    const count = 1 + countDirection(board, row, col, dr, dc, player) + countDirection(board, row, col, -dr, -dc, player);
    if (count >= 5) return true;
  }
  return false;
}

function minimax(board: BoardState, depth: number, alpha: number, beta: number, isMaximizing: boolean, aiPlayer: number): number {
  const humanPlayer = aiPlayer === BLACK ? WHITE : BLACK;

  if (depth === 0) return evaluateBoard(board, aiPlayer);

  const candidates = getCandidateMoves(board);
  if (candidates.length === 0) return evaluateBoard(board, aiPlayer);

  if (isMaximizing) {
    let maxEval = -Infinity;
    for (const [r, c] of candidates) {
      board[r][c] = aiPlayer;
      if (checkWinAt(board, r, c, aiPlayer)) {
        board[r][c] = EMPTY;
        return SCORE_TABLE['five'] * (depth + 1);
      }
      const eval_ = minimax(board, depth - 1, alpha, beta, false, aiPlayer);
      board[r][c] = EMPTY;
      maxEval = Math.max(maxEval, eval_);
      alpha = Math.max(alpha, eval_);
      if (beta <= alpha) break;
    }
    return maxEval;
  } else {
    let minEval = Infinity;
    for (const [r, c] of candidates) {
      board[r][c] = humanPlayer;
      if (checkWinAt(board, r, c, humanPlayer)) {
        board[r][c] = EMPTY;
        return -SCORE_TABLE['five'] * (depth + 1);
      }
      const eval_ = minimax(board, depth - 1, alpha, beta, true, aiPlayer);
      board[r][c] = EMPTY;
      minEval = Math.min(minEval, eval_);
      beta = Math.min(beta, eval_);
      if (beta <= alpha) break;
    }
    return minEval;
  }
}

function getAIMove(board: BoardState, aiPlayer: number, depth: number): [number, number] | null {
  const candidates = getCandidateMoves(board);
  if (candidates.length === 0) return null;

  let bestMove: [number, number] = candidates[0];
  let bestScore = -Infinity;

  for (const [r, c] of candidates) {
    board[r][c] = aiPlayer;
    if (checkWinAt(board, r, c, aiPlayer)) {
      board[r][c] = EMPTY;
      return [r, c];
    }
    const score = minimax(board, depth - 1, -Infinity, Infinity, false, aiPlayer);
    board[r][c] = EMPTY;
    if (score > bestScore) {
      bestScore = score;
      bestMove = [r, c];
    }
  }
  return bestMove;
}

// --- Teaching Mode: Pattern Recognition ---

const PATTERN_NAMES: Record<PatternType, string> = {
  'five': '五连',
  'live-four': '活四',
  'dead-four': '冲四',
  'live-three': '活三',
  'dead-three': '眠三',
  'live-two': '活二',
  'dead-two': '眠二',
  'live-one': '活一',
  'dead-one': '眠一',
};

const PATTERN_PRIORITY: Record<PatternType, number> = {
  'five': 100,
  'live-four': 90,
  'dead-four': 80,
  'live-three': 70,
  'dead-three': 50,
  'live-two': 40,
  'dead-two': 20,
  'live-one': 15,
  'dead-one': 5,
};

function analyzeLineForPattern(
  board: BoardState,
  row: number,
  col: number,
  dr: number,
  dc: number,
  player: number
): PatternInfo | null {
  const fwd = countDirection(board, row, col, dr, dc, player);
  const bwd = countDirection(board, row, col, -dr, -dc, player);
  const count = 1 + fwd + bwd;

  if (count >= 5) {
    return {
      type: 'five',
      player,
      row,
      col,
      direction: [dr, dc],
      count,
      openEnds: 0,
    };
  }

  const fwdBlocked = !inBoundsTeaching(row + dr * (fwd + 1), col + dc * (fwd + 1)) ||
    board[row + dr * (fwd + 1)]?.[col + dc * (fwd + 1)] !== EMPTY;
  const bwdBlocked = !inBoundsTeaching(row - dr * (bwd + 1), col - dc * (bwd + 1)) ||
    board[row - dr * (bwd + 1)]?.[col - dc * (bwd + 1)] !== EMPTY;

  const openEnds = (fwdBlocked ? 0 : 1) + (bwdBlocked ? 0 : 1);

  if (openEnds === 0 && count < 5) return null;

  let type: PatternType;
  if (count === 4) type = openEnds === 2 ? 'live-four' : 'dead-four';
  else if (count === 3) type = openEnds === 2 ? 'live-three' : 'dead-three';
  else if (count === 2) type = openEnds === 2 ? 'live-two' : 'dead-two';
  else type = openEnds === 2 ? 'live-one' : 'dead-one';

  return { type, player, row, col, direction: [dr, dc], count, openEnds };
}

function inBoundsTeaching(r: number, c: number): boolean {
  return r >= 0 && r < BOARD_SIZE && c >= 0 && c < BOARD_SIZE;
}

function findAllPatterns(board: BoardState, player: number): PatternInfo[] {
  const patterns: PatternInfo[] = [];
  const seen = new Set<string>();

  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      if (board[r][c] === player) {
        for (const [dr, dc] of DIRECTIONS) {
          const pattern = analyzeLineForPattern(board, r, c, dr, dc, player);
          if (pattern) {
            const key = `${pattern.type}-${r}-${c}-${dr}-${dc}`;
            if (!seen.has(key)) {
              seen.add(key);
              patterns.push(pattern);
            }
          }
        }
      }
    }
  }

  patterns.sort((a, b) => PATTERN_PRIORITY[b.type] - PATTERN_PRIORITY[a.type]);
  return patterns;
}

function findEmptyPositionsInPattern(
  board: BoardState,
  pattern: PatternInfo
): [number, number][] {
  const positions: [number, number][] = [];
  const [dr, dc] = pattern.direction;
  const fwd = countDirection(board, pattern.row, pattern.col, dr, dc, pattern.player);
  const bwd = countDirection(board, pattern.row, pattern.col, -dr, -dc, pattern.player);

  const fwdEmptyRow = pattern.row + dr * (fwd + 1);
  const fwdEmptyCol = pattern.col + dc * (fwd + 1);
  if (inBoundsTeaching(fwdEmptyRow, fwdEmptyCol) && board[fwdEmptyRow][fwdEmptyCol] === EMPTY) {
    positions.push([fwdEmptyRow, fwdEmptyCol]);
  }

  const bwdEmptyRow = pattern.row - dr * (bwd + 1);
  const bwdEmptyCol = pattern.col - dc * (bwd + 1);
  if (inBoundsTeaching(bwdEmptyRow, bwdEmptyCol) && board[bwdEmptyRow][bwdEmptyCol] === EMPTY) {
    positions.push([bwdEmptyRow, bwdEmptyCol]);
  }

  return positions;
}

function analyzeBoard(board: BoardState, currentPlayer: number): BoardAnalysis {
  const opponent = currentPlayer === BLACK ? WHITE : BLACK;
  const playerPatterns = findAllPatterns(board, currentPlayer);
  const opponentPatterns = findAllPatterns(board, opponent);

  const threats = opponentPatterns.filter(p =>
    p.type === 'five' || p.type === 'live-four' || p.type === 'dead-four' || p.type === 'live-three'
  );

  const opportunities = playerPatterns.filter(p =>
    p.type === 'five' || p.type === 'live-four' || p.type === 'dead-four' || p.type === 'live-three'
  );

  const highlights: HighlightPosition[] = [];
  const seenHighlights = new Set<string>();

  for (const threat of threats) {
    const positions = findEmptyPositionsInPattern(board, threat);
    for (const [r, c] of positions) {
      const key = `${r}-${c}`;
      if (!seenHighlights.has(key)) {
        seenHighlights.add(key);
        highlights.push({
          row: r,
          col: c,
          type: 'defense',
          priority: PATTERN_PRIORITY[threat.type],
        });
      }
    }
  }

  for (const opp of opponentPatterns) {
    if (opp.type === 'live-four' || opp.type === 'dead-four') {
      const positions = findEmptyPositionsInPattern(board, opp);
      for (const [r, c] of positions) {
        const key = `${r}-${c}`;
        if (!seenHighlights.has(key)) {
          seenHighlights.add(key);
          highlights.push({
            row: r,
            col: c,
            type: 'threat',
            priority: PATTERN_PRIORITY[opp.type] + 10,
          });
        }
      }
    }
  }

  for (const opp of opportunities) {
    const positions = findEmptyPositionsInPattern(board, opp);
    for (const [r, c] of positions) {
      const key = `${r}-${c}`;
      if (!seenHighlights.has(key)) {
        seenHighlights.add(key);
        highlights.push({
          row: r,
          col: c,
          type: 'opportunity',
          priority: PATTERN_PRIORITY[opp.type],
        });
      }
    }
  }

  highlights.sort((a, b) => b.priority - a.priority);

  return { playerPatterns, opponentPatterns, threats, opportunities, highlights };
}

function generateTeachingContent(
  analysis: BoardAnalysis,
  board: BoardState,
  currentPlayer: number,
  lastMove: Move | null,
  moveCount: number,
  difficulty: 'beginner' | 'intermediate' | 'advanced'
): TeachingContent {
  const opponent = currentPlayer === BLACK ? WHITE : BLACK;
  const playerColor = currentPlayer === BLACK ? '黑棋' : '白棋';
  const opponentColor = opponent === BLACK ? '黑棋' : '白棋';

  const explanation: string[] = [];
  const strategyTips: string[] = [];
  const nextHints: NextHint[] = [];
  const keyPoints: string[] = [];

  let situation = '';

  if (moveCount === 0) {
    situation = '开局阶段，黑棋先行';
    explanation.push('五子棋规则：黑棋先行，双方轮流在棋盘交叉点上落子。');
    explanation.push('获胜条件：先在横、竖、斜任意方向形成连续五子同色者获胜。');
    strategyTips.push('【开局策略】黑棋第一手建议下在天元（棋盘正中央），占据最有利位置。');
    strategyTips.push('【基础原则】棋子要尽量下在靠近中心和已有棋子的位置，便于形成连接。');
    keyPoints.push('中心位置价值最高，向四周逐渐降低');
    keyPoints.push('活棋（两端都有空位）比死棋（一端被堵）价值高');
    nextHints.push({
      position: [7, 7],
      reason: '占据天元，控制棋盘中心',
      strategy: '开局第一手，天元是最优位置',
      priority: 100,
    });
    return { situation, explanation, strategyTips, nextHints, keyPoints };
  }

  if (lastMove) {
    const lastColor = lastMove.player === BLACK ? '黑棋' : '白棋';
    const coord = `(${String.fromCharCode(65 + lastMove.col)}${15 - lastMove.row})`;
    situation = `第 ${moveCount} 手，${lastColor} 落子于 ${coord}`;
  }

  const winningPattern = analysis.playerPatterns.find(p => p.type === 'five');
  if (winningPattern) {
    explanation.push(`🎉 ${playerColor}已经形成五连，获胜！`);
    return { situation, explanation, strategyTips, nextHints, keyPoints };
  }

  const opponentWinning = analysis.opponentPatterns.find(p => p.type === 'five');
  if (opponentWinning) {
    explanation.push(`😢 ${opponentColor}已经形成五连，${playerColor}输了。`);
    explanation.push('复盘思考：为什么没有提前防守？注意观察对方的威胁棋型。');
    return { situation, explanation, strategyTips, nextHints, keyPoints };
  }

  if (moveCount <= 6) {
    explanation.push('当前处于布局阶段，双方都在抢占要点。');
    if (difficulty === 'beginner') {
      strategyTips.push('【布局原则1】棋子不要太分散，要互相呼应，便于后续形成连接。');
      strategyTips.push('【布局原则2】避免下在边角，边角位置发展空间有限。');
      strategyTips.push('【布局原则3】注意观察对方的棋型，不要让对方轻易形成活三、活四。');
    }
  } else if (moveCount <= 15) {
    explanation.push('当前进入中盘阶段，开始形成各种棋型，攻守逐渐激烈。');
  } else {
    explanation.push('当前进入尾盘阶段，棋型已基本定型，需要精确计算每一步。');
  }

  if (analysis.threats.length > 0) {
    const topThreat = analysis.threats[0];
    const threatName = PATTERN_NAMES[topThreat.type];
    explanation.push(`⚠️ 【防守预警】${opponentColor}形成了${threatName}，需要立即防守！`);

    if (topThreat.type === 'live-four') {
      explanation.push('活四只有两个端点可以防守，但对方可以任选一端成五，所以活四是必胜棋型！');
      keyPoints.push('活四：两端都有空位的四连，无法防守，是必胜棋型');
    } else if (topThreat.type === 'dead-four') {
      explanation.push('冲四只有一端可以成五，必须堵住那个空位！');
      keyPoints.push('冲四：只有一端有空位的四连，堵住空位即可防守');
    } else if (topThreat.type === 'live-three') {
      explanation.push('活三如果不防守，下一步就会变成活四，也是很危险的棋型！');
      keyPoints.push('活三：两端都有空位的三连，下一步可变活四，必须防守');
    }

    const defensePositions = findEmptyPositionsInPattern(board, topThreat);
    for (const [r, c] of defensePositions.slice(0, 2)) {
      nextHints.push({
        position: [r, c],
        reason: `防守${opponentColor}的${threatName}`,
        strategy: '优先防守对方的必胜棋型',
        priority: 100,
      });
    }
  }

  if (analysis.opportunities.length > 0) {
    const topOpp = analysis.opportunities[0];
    const oppName = PATTERN_NAMES[topOpp.type];
    explanation.push(`✨ 【进攻机会】${playerColor}有${oppName}，可以考虑进攻！`);

    if (topOpp.type === 'live-four') {
      explanation.push('你有活四！这是必胜棋型，直接在任意一端落子成五即可获胜！');
      keyPoints.push('活四必胜：两个端点任选其一即可成五');
    } else if (topOpp.type === 'dead-four') {
      explanation.push('你有冲四！在空位落子即可成五，或者先看看有没有更重要的防守。');
    } else if (topOpp.type === 'live-three') {
      explanation.push('你有活三！如果对方不防守，下一步可以成活四，形成必胜局面。');
      keyPoints.push('活三进攻：如果对方不防守，下一步成活四');
    }

    const oppPositions = findEmptyPositionsInPattern(board, topOpp);
    for (const [r, c] of oppPositions.slice(0, 2)) {
      nextHints.push({
        position: [r, c],
        reason: `延伸自己的${oppName}`,
        strategy: topOpp.type === 'live-four' || topOpp.type === 'dead-four'
          ? '直接进攻获胜'
          : '积极进攻，制造威胁',
        priority: topOpp.type === 'live-four' || topOpp.type === 'dead-four' ? 95 : 80,
      });
    }
  }

  if (analysis.threats.length === 0 && analysis.opportunities.length === 0) {
    explanation.push('目前局面平稳，没有明显的攻守机会。');
    strategyTips.push('【稳健策略】可以选择靠近己方棋子的位置落子，发展自己的棋型。');
    strategyTips.push('【进攻意识】尝试形成活二、活三，为后续进攻做准备。');

    if (lastMove) {
      const aroundPositions: [number, number][] = [];
      for (let dr = -2; dr <= 2; dr++) {
        for (let dc = -2; dc <= 2; dc++) {
          const nr = lastMove.row + dr;
          const nc = lastMove.col + dc;
          if (inBoundsTeaching(nr, nc) && board[nr]?.[nc] === EMPTY) {
            aroundPositions.push([nr, nc]);
          }
        }
      }
      if (aroundPositions.length > 0) {
        const [r, c] = aroundPositions[Math.floor(aroundPositions.length / 2)];
        nextHints.push({
          position: [r, c],
          reason: '靠近已有棋子，发展棋型',
          strategy: '稳扎稳打，逐步扩大优势',
          priority: 50,
        });
      }
    }
  }

  if (difficulty === 'beginner' && keyPoints.length === 0) {
    keyPoints.push('先看对方有没有威胁，再看自己有没有进攻机会');
    keyPoints.push('活棋优先：活四 > 冲四 > 活三 > 眠三 > 活二');
    keyPoints.push('防守优先于无意义的进攻');
  }

  nextHints.sort((a, b) => b.priority - a.priority);

  return { situation, explanation, strategyTips, nextHints, keyPoints };
}

// --- Store ---

export const useGameStore = defineStore('game', () => {
  const board = ref<BoardState>(createEmptyBoard());
  const currentPlayer = ref<number>(BLACK);
  const moves = ref<Move[]>([]);
  const status = ref<GameStatus>('idle');
  const winner = ref<number | null>(null);
  const gameRecords = ref<GameRecord[]>([]);
  const aiConfig = ref<AIConfig>({ depth: 3, enabled: true, playerColor: WHITE });
  const isAiThinking = ref(false);

  // Teaching Mode
  const teachingConfig = ref<TeachingConfig>({
    enabled: false,
    showHighlights: true,
    showHints: true,
    difficulty: 'beginner',
  });
  const boardAnalysis = ref<BoardAnalysis | null>(null);
  const teachingContent = ref<TeachingContent | null>(null);

  // Replay
  const replayMoves = ref<Move[]>([]);
  const replayIndex = ref(0);
  const replayBoard = ref<BoardState>(createEmptyBoard());
  const isReplayPlaying = ref(false);
  const replaySpeed = ref(1000);

  const currentMoveCount = computed(() => moves.value.length);
  const isGameOver = computed(() => status.value === 'finished');

  function updateAnalysis() {
    if (!teachingConfig.value.enabled) {
      boardAnalysis.value = null;
      teachingContent.value = null;
      return;
    }

    const currentBoard = status.value === 'replaying' ? replayBoard.value : board.value;
    const analysis = analyzeBoard(currentBoard, currentPlayer.value);
    boardAnalysis.value = analysis;

    const lastMove = moves.value.length > 0 ? moves.value[moves.value.length - 1] : null;
    teachingContent.value = generateTeachingContent(
      analysis,
      currentBoard,
      currentPlayer.value,
      lastMove,
      moves.value.length,
      teachingConfig.value.difficulty
    );
  }

  function getPatternEmptyPositions(pattern: PatternInfo): [number, number][] {
    const currentBoard = status.value === 'replaying' ? replayBoard.value : board.value;
    return findEmptyPositionsInPattern(currentBoard, pattern);
  }

  function startGame() {
    board.value = createEmptyBoard();
    currentPlayer.value = BLACK;
    moves.value = [];
    status.value = 'playing';
    winner.value = null;
    isAiThinking.value = false;
    updateAnalysis();
  }

  function placeStone(row: number, col: number): boolean {
    if (status.value !== 'playing') return false;
    if (board.value[row][col] !== EMPTY) return false;
    if (isAiThinking.value) return false;

    board.value[row][col] = currentPlayer.value;
    const move: Move = { row, col, player: currentPlayer.value, timestamp: Date.now() };
    moves.value.push(move);

    if (checkWinAt(board.value, row, col, currentPlayer.value)) {
      winner.value = currentPlayer.value;
      status.value = 'finished';
      saveRecord();
      updateAnalysis();
      return true;
    }

    if (moves.value.length === BOARD_SIZE * BOARD_SIZE) {
      winner.value = 0;
      status.value = 'finished';
      saveRecord();
      updateAnalysis();
      return true;
    }

    currentPlayer.value = currentPlayer.value === BLACK ? WHITE : BLACK;
    updateAnalysis();
    return true;
  }

  async function aiMove() {
    if (!aiConfig.value.enabled || status.value !== 'playing') return;
    if (currentPlayer.value !== aiConfig.value.playerColor) return;

    isAiThinking.value = true;
    await new Promise(resolve => setTimeout(resolve, 100));

    const move = getAIMove(board.value, aiConfig.value.playerColor, aiConfig.value.depth);
    if (move) {
      placeStone(move[0], move[1]);
    }
    isAiThinking.value = false;
  }

  function saveRecord() {
    const record: GameRecord = {
      id: Date.now().toString(),
      moves: [...moves.value],
      winner: winner.value,
      createdAt: new Date().toLocaleString('zh-CN'),
      duration: moves.value.length > 0 ? moves.value[moves.value.length - 1].timestamp - moves.value[0].timestamp : 0,
    };
    gameRecords.value.unshift(record);
  }

  function startReplay(record: GameRecord) {
    replayMoves.value = [...record.moves];
    replayIndex.value = 0;
    replayBoard.value = createEmptyBoard();
    status.value = 'replaying';
    isReplayPlaying.value = false;
  }

  function replayStepForward() {
    if (replayIndex.value >= replayMoves.value.length) return;
    const move = replayMoves.value[replayIndex.value];
    replayBoard.value[move.row][move.col] = move.player;
    replayIndex.value++;
  }

  function replayStepBack() {
    if (replayIndex.value <= 0) return;
    replayIndex.value--;
    const move = replayMoves.value[replayIndex.value];
    replayBoard.value[move.row][move.col] = EMPTY;
  }

  function replayGoToStart() {
    replayBoard.value = createEmptyBoard();
    replayIndex.value = 0;
  }

  function replayGoToEnd() {
    replayBoard.value = createEmptyBoard();
    for (let i = 0; i < replayMoves.value.length; i++) {
      const m = replayMoves.value[i];
      replayBoard.value[m.row][m.col] = m.player;
    }
    replayIndex.value = replayMoves.value.length;
  }

  let replayTimer: ReturnType<typeof setInterval> | null = null;

  function toggleReplayPlay() {
    isReplayPlaying.value = !isReplayPlaying.value;
    if (isReplayPlaying.value) {
      replayTimer = setInterval(() => {
        if (replayIndex.value >= replayMoves.value.length) {
          isReplayPlaying.value = false;
          if (replayTimer) clearInterval(replayTimer);
          replayTimer = null;
          return;
        }
        replayStepForward();
      }, replaySpeed.value);
    } else {
      if (replayTimer) clearInterval(replayTimer);
      replayTimer = null;
    }
  }

  function setReplaySpeed(ms: number) {
    replaySpeed.value = ms;
    if (isReplayPlaying.value) {
      if (replayTimer) clearInterval(replayTimer);
      replayTimer = setInterval(() => {
        if (replayIndex.value >= replayMoves.value.length) {
          isReplayPlaying.value = false;
          if (replayTimer) clearInterval(replayTimer);
          replayTimer = null;
          return;
        }
        replayStepForward();
      }, replaySpeed.value);
    }
  }

  function stopReplay() {
    isReplayPlaying.value = false;
    if (replayTimer) clearInterval(replayTimer);
    replayTimer = null;
    status.value = 'idle';
  }

  function checkWin(row: number, col: number): boolean {
    return checkWinAt(board.value, row, col, board.value[row][col]);
  }

  function toggleTeachingMode() {
    teachingConfig.value.enabled = !teachingConfig.value.enabled;
    updateAnalysis();
  }

  return {
    board, currentPlayer, moves, status, winner, gameRecords, aiConfig, isAiThinking,
    replayMoves, replayIndex, replayBoard, isReplayPlaying, replaySpeed,
    teachingConfig, boardAnalysis, teachingContent,
    currentMoveCount, isGameOver,
    startGame, placeStone, aiMove, saveRecord,
    startReplay, replayStepForward, replayStepBack, replayGoToStart, replayGoToEnd,
    toggleReplayPlay, setReplaySpeed, stopReplay, checkWin,
    updateAnalysis, toggleTeachingMode, getPatternEmptyPositions,
  };
});
