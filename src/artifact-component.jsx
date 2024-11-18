import React, { useState, useEffect } from 'react';

const DIFFICULTY_LEVELS = {
  easy: { rows: 4, cols: 4, maxValue: 8 },
  medium: { rows: 4, cols: 5, maxValue: 10 },
  hard: { rows: 5, cols: 6, maxValue: 15 }
};

const DISPLAY_DURATION = 2500;  // How long cards stay visible
const AI_THINK_TIME = 800;      // How long before AI makes its move

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
    for (let i = 1; i <= (rows * cols) / 2; i++) {
      pairs.push(i, i);
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
        // Match found - mark it immediately
        const newMatchedCards = new Set(matchedCards);
        newMatchedCards.add(`${r1},${c1}`);
        newMatchedCards.add(`${r2},${c2}`);
        setMatchedCards(newMatchedCards);
        setPlayerMatches(prev => prev + 1);
      }

      // Always wait before clearing revealed cards
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
            // Match found - mark it immediately
            const newMatchedCards = new Set(matchedCards);
            newMatchedCards.add(`${card1[0]},${card1[1]}`);
            newMatchedCards.add(`${card2[0]},${card2[1]}`);
            setMatchedCards(newMatchedCards);
            setAiMatches(prev => prev + 1);
          }

          // Always wait before clearing revealed cards
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
    <div className="flex flex-col items-center p-4 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Memory Card Game</h1>
      
      <div className="mb-4">
        <select 
          value={difficulty} 
          onChange={(e) => setDifficulty(e.target.value)}
          className="mr-2 p-2 border rounded"
        >
          <option value="easy">Easy</option>
          <option value="medium">Medium</option>
          <option value="hard">Hard</option>
        </select>
        <button 
          onClick={startNewGame}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          New Game
        </button>
      </div>

      <div className="flex gap-8 mb-4">
        <div className={`text-lg ${currentPlayer === 'human' ? 'font-bold text-blue-600' : ''}`}>
          Player Matches: {playerMatches}
        </div>
        <div className={`text-lg ${currentPlayer === 'ai' ? 'font-bold text-blue-600' : ''}`}>
          AI Matches: {aiMatches}
        </div>
      </div>

      {isGameOver && (
        <div className="mb-4 text-xl font-bold text-green-600">
          {playerMatches > aiMatches ? "You won! 🎉" : 
           aiMatches > playerMatches ? "AI won! 🤖" : "It's a tie! 🤝"}
        </div>
      )}

      {/* Column labels */}
      <div className="flex ml-20 mb-2">
        {columnLabels.slice(0, DIFFICULTY_LEVELS[difficulty].cols).map((label) => (
          <div key={label} className="w-16 text-center font-bold">{label}</div>
        ))}
      </div>

      <div className="flex items-center">
        {/* Row labels */}
        <div className="flex flex-col mr-2">
          {rowLabels.slice(0, DIFFICULTY_LEVELS[difficulty].rows).map((label) => (
            <div 
              key={label} 
              className="w-16 h-16 flex items-center justify-center font-bold"
            >
              {label}
            </div>
          ))}
        </div>

        {/* Game board */}
        <div 
          className="grid gap-2"
          style={{
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
                  className={`
                    w-16 h-16 flex items-center justify-center text-xl font-bold
                    rounded border-2 transition-all duration-300
                    ${isMatched ? 'bg-green-200 border-green-500' :
                      isRevealed ? 'bg-blue-200 border-blue-500' :
                      'bg-gray-100 border-gray-300 hover:bg-gray-200'}
                    ${isProcessing ? 'cursor-not-allowed' : 'cursor-pointer'}
                  `}
                  disabled={isMatched || currentPlayer === 'ai' || isProcessing}
                >
                  {isMatched || isRevealed ? value : '?'}
                </button>
              );
            })
          )}
        </div>
      </div>

      {(currentPlayer === 'ai' || isProcessing) && !isGameOver && (
        <div className="mt-4 text-blue-600 animate-pulse">
          {currentPlayer === 'ai' ? "AI is thinking..." : "Processing..."}
        </div>
      )}
    </div>
  );
};

export default MemoryGame;