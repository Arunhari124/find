'use client';
import { useEffect, useRef } from 'react';

export default function DynamicBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = window.innerWidth;
    let height = window.innerHeight;
    canvas.width = width;
    canvas.height = height;

    const isMobile = window.matchMedia('(max-width: 768px)').matches;
    const gridSize = isMobile ? 15 : 25;
    const cols = Math.floor(width / gridSize);
    const rows = Math.floor(height / gridSize);
    
    // Target is mouse position initially
    let target = { x: Math.floor(cols / 2), y: Math.floor(rows / 2) };
    
    // Apple is placed randomly
    let apple = { x: Math.floor(Math.random() * cols), y: Math.floor(Math.random() * rows) };
    
    let currentMaxSnakeLength = isMobile ? 8 : 15;
    let snake: {x: number, y: number}[] = [{ x: target.x, y: target.y }];
    
    let lastTime = 0;
    const speedMs = 70;
    let animationFrame: number;
    let manualDirection = { dx: 0, dy: 0 };
    let isManual = false;

    const handleMouseMove = (e: MouseEvent) => {
      if (isManual) return; // Ignore mouse if using keyboard
      target.x = Math.floor(e.clientX / gridSize);
      target.y = Math.floor(e.clientY / gridSize);
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
        isManual = true;
        if (e.key === 'ArrowUp' && manualDirection.dy !== 1) manualDirection = { dx: 0, dy: -1 };
        if (e.key === 'ArrowDown' && manualDirection.dy !== -1) manualDirection = { dx: 0, dy: 1 };
        if (e.key === 'ArrowLeft' && manualDirection.dx !== 1) manualDirection = { dx: -1, dy: 0 };
        if (e.key === 'ArrowRight' && manualDirection.dx !== -1) manualDirection = { dx: 1, dy: 0 };
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('keydown', handleKeyDown);

    const resize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = width;
      canvas.height = height;
    };
    window.addEventListener('resize', resize);

    const render = (timestamp: number) => {
      animationFrame = requestAnimationFrame(render);
      
      const deltaTime = timestamp - lastTime;
      if (deltaTime < speedMs) return;
      lastTime = timestamp;

      const head = snake[0];

      let newHead = { x: head.x, y: head.y };

      if (isManual) {
        // Classic Nokia Snake Control
        newHead.x += manualDirection.dx;
        newHead.y += manualDirection.dy;
      } else {
        // AI chases the mouse cursor
        const moves = [
          { dx: 0, dy: -1 }, { dx: 1, dy: 0 }, { dx: 0, dy: 1 }, { dx: -1, dy: 0 }
        ];

        let bestMove = moves[0];
        let shortestDistance = Infinity;
        let moved = false;

        for (const move of moves) {
          let nx = head.x + move.dx;
          let ny = head.y + move.dy;
          
          if (nx < 0) nx = cols - 1;
          if (nx >= cols) nx = 0;
          if (ny < 0) ny = rows - 1;
          if (ny >= rows) ny = 0;

          const hitsBody = snake.some((segment, index) => 
            index !== snake.length - 1 && segment.x === nx && segment.y === ny
          );

          if (!hitsBody) {
            let dist = Math.abs(nx - target.x) + Math.abs(ny - target.y);
            if (dist < shortestDistance) {
              shortestDistance = dist;
              bestMove = { dx: move.dx, dy: move.dy };
              moved = true;
            }
          }
        }
        
        if (moved) {
          newHead.x += bestMove.dx;
          newHead.y += bestMove.dy;
        } else {
          newHead.x += moves[0].dx;
          newHead.y += moves[0].dy;
        }
      }

      // Border wrap
      if (newHead.x < 0) newHead.x = cols - 1;
      if (newHead.x >= cols) newHead.x = 0;
      if (newHead.y < 0) newHead.y = rows - 1;
      if (newHead.y >= rows) newHead.y = 0;

      // Detect Apple Collision
      if (newHead.x === apple.x && newHead.y === apple.y) {
        currentMaxSnakeLength += 3;
        apple = { x: Math.floor(Math.random() * cols), y: Math.floor(Math.random() * rows) };
      }

      snake.unshift(newHead);
      while (snake.length > currentMaxSnakeLength) {
        snake.pop();
      }

      // ---------------- DRAWING ----------------
      ctx.clearRect(0, 0, width, height);

      // Draw Grid
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.02)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let x = 0; x < width; x += gridSize) {
        ctx.moveTo(x, 0); ctx.lineTo(x, height);
      }
      for (let y = 0; y < height; y += gridSize) {
        ctx.moveTo(0, y); ctx.lineTo(width, y);
      }
      ctx.stroke();

      // Draw Apple
      ctx.fillStyle = 'rgba(239, 68, 68, 0.8)'; // Solid Red Apple
      ctx.shadowBlur = 15;
      ctx.shadowColor = 'rgba(239, 68, 68, 1)';
      ctx.fillRect(apple.x * gridSize + 2, apple.y * gridSize + 2, gridSize - 4, gridSize - 4);
      
      // Draw Snake
      ctx.shadowBlur = 10;
      ctx.shadowColor = 'rgba(34, 197, 94, 0.5)';
      
      for (let i = 0; i < snake.length; i++) {
        const segment = snake[i];
        const isHead = i === 0;
        ctx.fillStyle = isHead ? 'rgba(34, 197, 94, 0.8)' : `rgba(34, 197, 94, ${0.5 - (i/snake.length)*0.4})`;
        ctx.fillRect(segment.x * gridSize + 1, segment.y * gridSize + 1, gridSize - 2, gridSize - 2);
      }
      
      // Draw Ghost Mouse Target (if not playing manually)
      if (!isManual) {
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.strokeRect(target.x * gridSize + 2, target.y * gridSize + 2, gridSize - 4, gridSize - 4);
      }

      ctx.shadowBlur = 0;
    };
    
    animationFrame = requestAnimationFrame(render);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(animationFrame);
    };
  }, []);

  return (
    <canvas 
      ref={canvasRef} 
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: 0,
      }}
    />
  );
}
