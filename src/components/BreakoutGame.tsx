/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Play, RotateCcw, Trophy, Skull, Pause } from 'lucide-react';
import { 
  CANVAS_WIDTH, 
  CANVAS_HEIGHT, 
  PADDLE_WIDTH, 
  PADDLE_HEIGHT, 
  PADDLE_BOTTOM_MARGIN,
  BALL_RADIUS,
  BALL_SPEED,
  BRICK_ROWS,
  BRICK_COLS,
  BRICK_HEIGHT,
  BRICK_PADDING,
  BRICK_OFFSET_TOP,
  BRICK_OFFSET_LEFT,
  COLORS
} from '../constants';
import { Ball, Paddle, Brick, GameStatus } from '../types';

const BreakoutGame: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [status, setStatus] = useState<GameStatus>('IDLE');
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);

  // Mutable game state held in refs to avoid re-renders during loop
  const ballRef = useRef<Ball>({
    x: CANVAS_WIDTH / 2,
    y: CANVAS_HEIGHT - PADDLE_BOTTOM_MARGIN - PADDLE_HEIGHT - BALL_RADIUS,
    dx: BALL_SPEED,
    dy: -BALL_SPEED,
    radius: BALL_RADIUS
  });

  const paddleRef = useRef<Paddle>({
    x: (CANVAS_WIDTH - PADDLE_WIDTH) / 2,
    y: CANVAS_HEIGHT - PADDLE_BOTTOM_MARGIN - PADDLE_HEIGHT,
    width: PADDLE_WIDTH,
    height: PADDLE_HEIGHT
  });

  const bricksRef = useRef<Brick[]>([]);
  const requestRef = useRef<number>(0);
  const rightPressed = useRef(false);
  const leftPressed = useRef(false);

  // Initialize Bricks
  const initBricks = useCallback(() => {
    const bricks: Brick[] = [];
    const brickWidth = (CANVAS_WIDTH - BRICK_OFFSET_LEFT * 2 - (BRICK_COLS - 1) * BRICK_PADDING) / BRICK_COLS;
    
    for (let c = 0; c < BRICK_COLS; c++) {
      for (let r = 0; r < BRICK_ROWS; r++) {
        bricks.push({
          x: c * (brickWidth + BRICK_PADDING) + BRICK_OFFSET_LEFT,
          y: r * (BRICK_HEIGHT + BRICK_PADDING) + BRICK_OFFSET_TOP,
          width: brickWidth,
          height: BRICK_HEIGHT,
          status: 1,
          color: COLORS.BRICKS[r % COLORS.BRICKS.length]
        });
      }
    }
    bricksRef.current = bricks;
  }, []);

  // Reset Game
  const resetGame = useCallback(() => {
    ballRef.current = {
      x: CANVAS_WIDTH / 2,
      y: CANVAS_HEIGHT - PADDLE_BOTTOM_MARGIN - PADDLE_HEIGHT - BALL_RADIUS,
      dx: BALL_SPEED * (Math.random() > 0.5 ? 1 : -1),
      dy: -BALL_SPEED,
      radius: BALL_RADIUS
    };
    paddleRef.current.x = (CANVAS_WIDTH - PADDLE_WIDTH) / 2;
    initBricks();
    setScore(0);
    setLives(3);
    setStatus('IDLE');
  }, [initBricks]);

  // Input Handling
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Right' || e.key === 'ArrowRight') rightPressed.current = true;
      else if (e.key === 'Left' || e.key === 'ArrowLeft') leftPressed.current = true;
      else if (e.key === ' ' && status === 'IDLE') setStatus('PLAYING');
      else if (e.key === ' ' && status === 'PLAYING') setStatus('PAUSED');
      else if (e.key === ' ' && status === 'PAUSED') setStatus('PLAYING');
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'Right' || e.key === 'ArrowRight') rightPressed.current = false;
      else if (e.key === 'Left' || e.key === 'ArrowLeft') leftPressed.current = false;
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!canvasRef.current) return;
      const rect = canvasRef.current.getBoundingClientRect();
      const relativeX = e.clientX - rect.left;
      if (relativeX > 0 && relativeX < CANVAS_WIDTH) {
        paddleRef.current.x = relativeX - PADDLE_WIDTH / 2;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    canvasRef.current?.addEventListener('mousemove', handleMouseMove);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      canvasRef.current?.removeEventListener('mousemove', handleMouseMove);
    };
  }, [status]);

  // Drawing functions
  const draw = useCallback((ctx: CanvasRenderingContext2D) => {
    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Draw Bricks
    bricksRef.current.forEach(brick => {
      if (brick.status === 1) {
        ctx.beginPath();
        ctx.roundRect(brick.x, brick.y, brick.width, brick.height, 4);
        ctx.fillStyle = brick.color;
        ctx.fill();
        ctx.closePath();
        
        // Brick highlight
        ctx.beginPath();
        ctx.roundRect(brick.x + 2, brick.y + 2, brick.width - 4, 2, 1);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
        ctx.fill();
        ctx.closePath();
      }
    });

    // Draw Ball
    const ball = ballRef.current;
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
    ctx.fillStyle = COLORS.BALL;
    ctx.shadowBlur = 15;
    ctx.shadowColor = COLORS.BALL;
    ctx.fill();
    ctx.closePath();
    ctx.shadowBlur = 0; // Reset shadow for other drawings

    // Draw Paddle
    const paddle = paddleRef.current;
    ctx.beginPath();
    ctx.roundRect(paddle.x, paddle.y, paddle.width, paddle.height, 8);
    ctx.fillStyle = COLORS.PADDLE;
    ctx.fill();
    ctx.closePath();
    
    // Paddle detail
    ctx.beginPath();
    ctx.roundRect(paddle.x + 10, paddle.y + 4, paddle.width - 20, 2, 1);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.fill();
    ctx.closePath();
  }, []);

  // Movement & Collision
  const update = useCallback(() => {
    if (status !== 'PLAYING') return;

    const ball = ballRef.current;
    const paddle = paddleRef.current;

    // Paddle movement
    if (rightPressed.current && paddle.x < CANVAS_WIDTH - paddle.width) {
      paddle.x += 8;
    } else if (leftPressed.current && paddle.x > 0) {
      paddle.x -= 8;
    }

    // Ball movement
    ball.x += ball.dx;
    ball.y += ball.dy;

    // Wall collision (Left/Right)
    if (ball.x + ball.dx > CANVAS_WIDTH - ball.radius || ball.x + ball.dx < ball.radius) {
      ball.dx = -ball.dx;
    }

    // Wall collision (Top)
    if (ball.y + ball.dy < ball.radius) {
      ball.dy = -ball.dy;
    } 
    // Bottom collision
    else if (ball.y + ball.dy > CANVAS_HEIGHT - ball.radius) {
      // Paddle collision
      if (ball.x > paddle.x && ball.x < paddle.x + paddle.width) {
        // Change angle based on where it hit the paddle
        const hitPoint = (ball.x - (paddle.x + paddle.width / 2)) / (paddle.width / 2);
        ball.dx = hitPoint * BALL_SPEED * 1.5;
        ball.dy = -ball.dy;
      } else {
        // Lose life
        setLives(prev => {
          if (prev <= 1) {
            setStatus('GAMEOVER');
            return 0;
          }
          // Reset ball position
          ball.x = paddle.x + paddle.width / 2;
          ball.y = paddle.y - ball.radius - 2;
          ball.dx = BALL_SPEED * (Math.random() > 0.5 ? 1 : -1);
          ball.dy = -BALL_SPEED;
          return prev - 1;
        });
      }
    }

    // Brick collision
    let activeBricks = 0;
    bricksRef.current.forEach(brick => {
      if (brick.status === 1) {
        activeBricks++;
        if (
          ball.x > brick.x && 
          ball.x < brick.x + brick.width && 
          ball.y > brick.y && 
          ball.y < brick.y + brick.height
        ) {
          ball.dy = -ball.dy;
          brick.status = 0;
          setScore(s => s + 10);
        }
      }
    });

    if (activeBricks === 0) {
      setStatus('VICTORY');
    }
  }, [status]);

  // Main Loop
  const loop = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (ctx) {
      update();
      draw(ctx);
    }
    requestRef.current = requestAnimationFrame(loop);
  }, [draw, update]);

  useEffect(() => {
    initBricks();
    requestRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(requestRef.current);
  }, [initBricks, loop]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-[#05070a] p-4 font-inter select-none">
      {/* Header Info */}
      <div className="w-full max-w-[1024px] flex items-center justify-between mb-8 px-6">
        <div>
          <h1 className="text-4xl font-bold font-orbitron text-[#00f2ff] drop-shadow-[0_0_10px_rgba(0,242,255,0.7)]">
            NEON BREAKER
          </h1>
          <p className="text-[10px] text-slate-500 uppercase tracking-[0.3em] mt-1 font-medium">
            Vite + React + TypeScript Canvas Engine
          </p>
        </div>
        
        <div className="bg-white/[0.03] border border-white/10 rounded-xl px-8 py-4 flex gap-12 backdrop-blur-md">
          <div className="flex flex-col">
            <span className="text-[10px] text-slate-500 uppercase tracking-widest font-bold mb-1">分數 SCORE</span>
            <span className="text-3xl font-orbitron text-[#00f2ff] tabular-nums leading-none">
              {score.toString().padStart(5, '0')}
            </span>
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] text-slate-500 uppercase tracking-widest font-bold mb-1">生命 LIVES</span>
            <div className="text-2xl leading-none flex gap-1">
              {[...Array(3)].map((_, i) => (
                <span key={i} className={i < lives ? "text-[#ff007a] drop-shadow-[0_0_8px_rgba(255,0,122,0.6)]" : "text-white/10"}>
                  ❤️
                </span>
              ))}
            </div>
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] text-slate-500 uppercase tracking-widest font-bold mb-1">關卡 LEVEL</span>
            <span className="text-3xl font-orbitron text-[#39ff14] leading-none">01</span>
          </div>
        </div>
      </div>

      {/* Game Canvas Container */}
      <div className="relative group p-1 bg-gradient-to-br from-[#00f2ff]/20 to-[#ff007a]/20 rounded-2xl border-2 border-[#00f2ff]/30 shadow-[0_0_30px_rgba(0,242,255,0.15)]">
        <div className="relative bg-black rounded-xl overflow-hidden">
          <canvas 
            ref={canvasRef}
            width={CANVAS_WIDTH}
            height={CANVAS_HEIGHT}
            className="block cursor-none"
          />

          {/* Overlays */}
          <AnimatePresence>
            {status !== 'PLAYING' && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 z-10 flex items-center justify-center bg-black/85 backdrop-blur-sm"
              >
                <div className="text-center p-8 max-w-sm">
                  {status === 'IDLE' && (
                    <motion.div 
                      key="idle"
                      initial={{ scale: 0.9, y: 20 }}
                      animate={{ scale: 1, y: 0 }}
                    >
                      <h2 className="text-6xl font-orbitron text-white mb-6 tracking-tighter drop-shadow-[0_0_15px_rgba(255,255,255,0.3)] font-black">準備好了嗎？</h2>
                      <button 
                        onClick={() => setStatus('PLAYING')}
                        className="px-10 py-4 bg-[#00f2ff] text-black font-black rounded-full transition-all hover:scale-105 active:scale-95 uppercase tracking-widest text-sm shadow-[0_0_20px_rgba(0,242,255,0.4)]"
                      >
                        啟動核心
                      </button>
                    </motion.div>
                  )}

                  {status === 'PAUSED' && (
                    <motion.div 
                      key="paused"
                      initial={{ scale: 0.9 }}
                      animate={{ scale: 1 }}
                    >
                      <h2 className="text-5xl font-orbitron text-[#00f2ff] mb-10 italic font-black">系統已暫停</h2>
                      <button 
                        onClick={() => setStatus('PLAYING')}
                        className="px-10 py-4 bg-white text-black font-black rounded-full transition-all hover:bg-[#00f2ff] uppercase tracking-widest text-sm shadow-[0_0_20px_rgba(255,255,255,0.2)]"
                      >
                        繼續任務
                      </button>
                    </motion.div>
                  )}

                  {status === 'GAMEOVER' && (
                    <motion.div 
                      key="gameover"
                      initial={{ scale: 0.9, y: 20 }}
                      animate={{ scale: 1, y: 0 }}
                    >
                      <h2 className="text-6xl font-orbitron text-[#ff007a] mb-10 drop-shadow-[0_0_20px_rgba(255,0,122,0.4)] font-black">遊戲結束</h2>
                      <button 
                        onClick={resetGame}
                        className="px-10 py-4 bg-[#00f2ff] text-black font-black rounded-full transition-all hover:scale-105 active:scale-95 uppercase tracking-widest text-sm shadow-[0_0_20px_rgba(0,242,255,0.4)]"
                      >
                        重新啟動
                      </button>
                    </motion.div>
                  )}

                  {status === 'VICTORY' && (
                    <motion.div 
                      key="victory"
                      initial={{ scale: 0.9, y: 20 }}
                      animate={{ scale: 1, y: 0 }}
                    >
                      <h2 className="text-6xl font-orbitron text-[#39ff14] mb-10 drop-shadow-[0_0_20px_rgba(57,255,20,0.4)] font-black">任務達成</h2>
                      <button 
                        onClick={resetGame}
                        className="px-10 py-4 bg-[#00f2ff] text-black font-black rounded-full transition-all hover:scale-105 active:scale-95 uppercase tracking-widest text-sm"
                      >
                        下一個區域
                      </button>
                    </motion.div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Footer Controls */}
      <footer className="mt-12 flex justify-center gap-12 text-[13px] font-bold text-white/40 uppercase tracking-widest">
        <div className="flex items-center gap-3">
          <span className="text-[#00f2ff]/50 px-2 py-0.5 border border-[#00f2ff]/30 rounded font-mono">[AD]</span> 
          <span>移動平台</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[#00f2ff]/50 px-2 py-0.5 border border-[#00f2ff]/30 rounded font-mono">[SPACE]</span> 
          <span>暫停 / 開始</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[#00f2ff]/50 px-2 py-0.5 border border-[#00f2ff]/30 rounded font-mono">[ESC]</span> 
          <span>選單</span>
        </div>
      </footer>
    </div>
  );
};

export default BreakoutGame;
