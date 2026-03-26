'use client';
import { useState, useEffect } from 'react';

export default function TicTacToe() {
  const [board, setBoard] = useState(Array(9).fill(null));
  const [xIsNext, setXIsNext] = useState(true);

  const calculateWinner = (squares: string[]) => {
    const lines = [
      [0, 1, 2], [3, 4, 5], [6, 7, 8],
      [0, 3, 6], [1, 4, 7], [2, 5, 8],
      [0, 4, 8], [2, 4, 6]
    ];
    for (let i = 0; i < lines.length; i++) {
      const [a, b, c] = lines[i];
      if (squares[a] && squares[a] === squares[b] && squares[a] === squares[c]) {
        return squares[a];
      }
    }
    return null;
  };

  useEffect(() => {
    const winner = calculateWinner(board);
    if (!xIsNext && !winner && board.includes(null)) {
      const timer = setTimeout(() => {
        // Simple Random AI
        const nulls = board.map((val, idx) => val === null ? idx : null).filter(val => val !== null) as number[];
        if (nulls.length === 0) return;
        
        const aiMove = nulls[Math.floor(Math.random() * nulls.length)];
        const newBoard = [...board];
        newBoard[aiMove] = 'O';
        setBoard(newBoard);
        setXIsNext(true);
      }, 600);
      return () => clearTimeout(timer);
    }
  }, [xIsNext, board]);

  const handleClick = (i: number) => {
    if (board[i] || calculateWinner(board) || !xIsNext) return;
    const newBoard = [...board];
    newBoard[i] = 'X';
    setBoard(newBoard);
    setXIsNext(false);
  };

  const winner = calculateWinner(board);
  const isDraw = !winner && board.every((s) => s !== null);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
      <h3 style={{ color: 'var(--text-primary)', margin: 0 }}>Waiting for items? Play a game!</h3>
      <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', margin: 0 }}>
        {winner ? `Winner: ${winner} 🎉` : isDraw ? "It's a Draw! 🤝" : `Next Player: ${xIsNext ? 'X' : 'O'}`}
      </p>

      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(3, 1fr)', 
        gap: '8px',
        background: 'var(--glass-border)',
        padding: '8px',
        borderRadius: '12px'
      }}>
        {board.map((square, i) => (
          <button
            key={i}
            onClick={() => handleClick(i)}
            style={{
              width: '80px',
              height: '80px',
              fontSize: '2rem',
              fontWeight: 'bold',
              background: 'var(--glass-bg)',
              border: '1px solid var(--glass-border)',
              borderRadius: '8px',
              color: square === 'X' ? 'var(--accent-primary)' : 'var(--status-lost-text)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: 'var(--shadow-soft)'
            }}
          >
            {square}
          </button>
        ))}
      </div>

      <button onClick={() => { setBoard(Array(9).fill(null)); setXIsNext(true); }} className="btn-3d" style={{ padding: '8px 24px' }}>
        Restart Game
      </button>
    </div>
  );
}
