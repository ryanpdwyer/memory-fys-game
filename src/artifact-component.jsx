import React, { useState, useEffect } from 'react';

const FOOD_EMOJIS = ['🍕', '🍔', '🌮', '🍣', '🍜', '🍎', '🍇', '🥑', '🍦', '🧁', '🥐', '🥨', '🌭', '🥪', '🥞'];

const DIFFICULTY_LEVELS = {
  easy: { rows: 4, cols: 4, maxValue: 8 },
  medium: { rows: 4, cols: 5, maxValue: 10 },
  hard: { rows: 5, cols: 6, maxValue: 15 }
};

const DISPLAY_DURATION = 2500;  // How long cards stay visible
const AI_THINK_TIME = 800;      // How long before AI makes its move

// Inline styles object
const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '1rem',
    maxWidth: '800px',
    margin: '0 auto',
    fontFamily: 'system-ui, sans-serif'
  },
  header: {
    fontSize: '1.5rem',
    fontWeight: 'bold',
    marginBottom: '1rem',
    color: '#1a1a1a'
  },
  controls: {
    marginBottom: '1rem',
    display: 'flex',
    gap: '0.5rem',
    alignItems: 'center'
  },
  select: {
    padding: '0.5rem',
    borderRadius: '0.25rem',
    border: '1px solid #ccc',
    fontSize: '1rem',
    marginRight: '0.5rem'
  },
  button: {
    padding: '0.5rem 1rem',
    backgroundColor: '#3b82f6',
    color: 'white',
    border: 'none',
    borderRadius: '0.25rem',
    cursor: 'pointer',
    fontSize: '1rem',
    transition: 'background-color 0.2s'
  },
  scoreBoard: {
    display: 'flex',
    gap: '2rem',
    marginBottom: '1rem',
    fontSize: '1.125rem'
  },
  scoreActive: {
    fontWeight: 'bold',
    color: '#2563eb'
  },
  gameOver: {
    marginBottom: '1rem',
    fontSize: '1.25rem',
    fontWeight: 'bold',
    color: '#16a34a'
  },
  board: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '1rem'
  },
  labels: {
    display: 'flex',
    marginLeft: '5rem',
    marginBottom: '0.5rem',
    gap: '1rem'
  },
  label: {
    width: '4rem',
    textAlign: 'center',
    fontWeight: 'bold'
  },
  rowLabel: {
    width: '4rem',
    height: '4rem',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 'bold'
  },
  grid: {
    display: 'grid',
    gap: '0.5rem'
  },
  card: {
    width: '4rem',
    height: '4rem',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '1.5rem',
    border: '2px solid',
    borderRadius: '0.25rem',
    cursor: 'pointer',
    transition: 'all 0.3s ease'
  },
  status: {
    marginTop: '1rem',
    color: '#2563eb',
    fontStyle: 'italic',
    animation: 'pulse 2s infinite'
  }
};

const MemoryGame = () => {
  const [difficulty, setDifficulty] = useState('easy');
  const [board, setBoard] = useState([]);
  const [matchedCards, setMatchedCards] = useState(new Set());
  const [revealedCards, setRevealedCards] = useState([]);
  const [playerMatches, setPlayerMatches] = useState(0);
  const [aiMatches, setAiMatches] = useState(0);
  const [currentPlayer, setCurrentPlayer] = useState('human');
  const [isGameOver, setIsGameOver] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const initializeBoard = () => {
    const { rows, cols } = DIFFICULTY_LEVELS[difficulty];
    const pairs = [];
    const numPairs = (rows * cols) / 2;
    const selectedEmojis = FOOD_EMOJIS.slice(0, numPairs);
    
    for (let emoji of selectedEmojis) {
      pairs.push(emoji, emoji);
    }
    
    for (let i = pairs.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [pairs[i], pairs[j]] = [pairs[j], pairs[i]];
    }
    
    const newBoard = [];
    for (let i = 0; i < rows; i++) {
      newBoard.push(pairs.slice(i * cols, (i + 1) * cols));
    }
    return newBoard;
  };

  const startNewGame = () => {
    const newBoard = initializeBoard();
    setBoard(newBoard);
    setMatchedCards(new Set());
    setRevealedCards([]);
    setPlayerMatches(0);
    setAiMatches(0);
    setCurrentPlayer('human');
    setIsGameOver(false);
    setIsProcessing(false);
  };

  const handleCardClick = (row, col) => {
    if (
      currentPlayer !== 'human' ||
      isProcessing ||
      revealedCards.length === 2 ||
      matchedCards.has(`${row},${col}`) ||
      revealedCards.some(([r, c]) => r === row && c === col)
    ) {
      return;
    }

    const newRevealedCards = [...revealedCards, [row, col]];
    setRevealedCards(newRevealedCards);

    if (newRevealedCards.length === 2) {
      setIsProcessing(true);
      const [[r1, c1], [r2, c2]] = newRevealedCards;
      
      if (board[r1][c1] === board[r2][c2]) {
        const newMatchedCards = new Set(matchedCards);
        newMatchedCards.add(`${r1},${c1}`);
        newMatchedCards.add(`${r2},${c2}`);
        setMatchedCards(newMatchedCards);
        setPlayerMatches(prev => prev + 1);
      }

      setTimeout(() => {
        setRevealedCards([]);
        if (board[r1][c1] !== board[r2][c2]) {
          setCurrentPlayer('ai');
        }
        setIsProcessing(false);
      }, DISPLAY_DURATION);
    }
  };

  useEffect(() => {
    const totalPairs = (board.length * board[0]?.length) / 2;
    if (playerMatches + aiMatches === totalPairs && totalPairs > 0) {
      setIsGameOver(true);
    }
  }, [playerMatches, aiMatches, board]);

  useEffect(() => {
    if (currentPlayer === 'ai' && !isGameOver && !isProcessing) {
      setIsProcessing(true);
      
      setTimeout(() => {
        const availableCards = [];
        board.forEach((row, i) => {
          row.forEach((_, j) => {
            if (!matchedCards.has(`${i},${j}`)) {
              availableCards.push([i, j]);
            }
          });
        });

        if (availableCards.length >= 2) {
          const card1Index = Math.floor(Math.random() * availableCards.length);
          const card1 = availableCards[card1Index];
          availableCards.splice(card1Index, 1);
          const card2 = availableCards[Math.floor(Math.random() * availableCards.length)];

          setRevealedCards([card1, card2]);

          if (board[card1[0]][card1[1]] === board[card2[0]][card2[1]]) {
            const newMatchedCards = new Set(matchedCards);
            newMatchedCards.add(`${card1[0]},${card1[1]}`);
            newMatchedCards.add(`${card2[0]},${card2[1]}`);
            setMatchedCards(newMatchedCards);
            setAiMatches(prev => prev + 1);
          }

          setTimeout(() => {
            setRevealedCards([]);
            if (board[card1[0]][card1[1]] !== board[card2[0]][card2[1]]) {
              setCurrentPlayer('human');
            }
            setIsProcessing(false);
          }, DISPLAY_DURATION);
        }
      }, AI_THINK_TIME);
    }
  }, [currentPlayer, matchedCards, board, isGameOver, isProcessing]);

  useEffect(() => {
    startNewGame();
  }, [difficulty]);

  const columnLabels = 'ABCDEFGH'.split('');
  const rowLabels = ['1', '2', '3', '4', '5'];

  return (
    <div style={styles.container}>
      <h1 style={styles.header}>Memory Card Game</h1>
      
      <div style={styles.controls}>
        <select 
          value={difficulty} 
          onChange={(e) => setDifficulty(e.target.value)}
          style={styles.select}
        >
          <option value="easy">Easy</option>
          <option value="medium">Medium</option>
          <option value="hard">Hard</option>
        </select>
        <button 
          onClick={startNewGame}
          style={styles.button}
        >
          New Game
        </button>
      </div>

      <div style={styles.scoreBoard}>
        <div style={currentPlayer === 'human' ? styles.scoreActive : null}>
          Player Matches: {playerMatches}
        </div>
        <div style={currentPlayer === 'ai' ? styles.scoreActive : null}>
          AI Matches: {aiMatches}
        </div>
      </div>

      {isGameOver && (
        <div style={styles.gameOver}>
          {playerMatches > aiMatches ? "You won! 🎉" : 
           aiMatches > playerMatches ? "AI won! 🤖" : "It's a tie! 🤝"}
        </div>
      )}

      <div style={styles.labels}>
        {columnLabels.slice(0, DIFFICULTY_LEVELS[difficulty].cols).map((label) => (
          <div key={label} style={styles.label}>{label}</div>
        ))}
      </div>

      <div style={styles.board}>
        <div style={{display: 'flex', flexDirection: 'column'}}>
          {rowLabels.slice(0, DIFFICULTY_LEVELS[difficulty].rows).map((label) => (
            <div key={label} style={styles.rowLabel}>
              {label}
            </div>
          ))}
        </div>

        <div 
          style={{
            ...styles.grid,
            gridTemplateColumns: `repeat(${DIFFICULTY_LEVELS[difficulty].cols}, 1fr)`
          }}
        >
          {board.map((row, i) => 
            row.map((value, j) => {
              const isMatched = matchedCards.has(`${i},${j}`);
              const isRevealed = revealedCards.some(([r, c]) => r === i && c === j);
              
              return (
                <button
                  key={`${i}-${j}`}
                  onClick={() => handleCardClick(i, j)}
                  style={{
                    ...styles.card,
                    backgroundColor: isMatched ? '#bbf7d0' : isRevealed ? '#bfdbfe' : '#f3f4f6',
                    borderColor: isMatched ? '#22c55e' : isRevealed ? '#3b82f6' : '#d1d5db',
                    cursor: (isMatched || currentPlayer === 'ai' || isProcessing) ? 'not-allowed' : 'pointer'
                  }}
                  disabled={isMatched || currentPlayer === 'ai' || isProcessing}
                >
                  {isMatched || isRevealed ? value : ' '}
                </button>
              );
            })
          )}
        </div>
      </div>

      {(currentPlayer === 'ai' || isProcessing) && !isGameOver && (
        <div style={styles.status}>
          {currentPlayer === 'ai' ? "AI is thinking..." : "Processing..."}
        </div>
      )}
    </div>
  );
};

export default MemoryGame;