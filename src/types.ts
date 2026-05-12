/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Point {
  x: number;
  y: number;
}

export interface Dimension {
  width: number;
  height: number;
}

export interface Ball extends Point {
  dx: number;
  dy: number;
  radius: number;
}

export interface Paddle extends Point {
  width: number;
  height: number;
}

export interface Brick extends Point {
  width: number;
  height: number;
  status: number; // 1 for active, 0 for destroyed
  color: string;
}

export type GameStatus = 'IDLE' | 'PLAYING' | 'PAUSED' | 'GAMEOVER' | 'VICTORY';
