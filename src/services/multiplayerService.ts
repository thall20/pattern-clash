/**
 * MultiplayerService — Placeholder for future online multiplayer.
 *
 * This file defines the interface that an online backend (e.g. Supabase
 * Realtime, Liveblocks, or a custom WebSocket server) will need to implement.
 *
 * All methods currently return rejected promises with a clear "not implemented"
 * message so that any accidental call is immediately visible during development.
 *
 * When online multiplayer is added:
 *  1. Replace the placeholder bodies with real network calls.
 *  2. The game modes should already type-check because the interface won't change.
 */

import type { MultiplayerRoom, MultiplayerEvent, ConnectionStatus } from "../engine/types";

export type RoomEventHandler = (event: MultiplayerEvent) => void;

export interface IMultiplayerService {
  readonly status: ConnectionStatus;

  /** Connect to the backend service (WebSocket handshake, auth, etc.). */
  connect(userId: string): Promise<void>;

  /** Cleanly disconnect. */
  disconnect(): void;

  /** Create a new private room and return its join code. */
  createRoom(settings: { difficulty: string }): Promise<MultiplayerRoom>;

  /** Join an existing room by code. */
  joinRoom(code: string, playerName: string): Promise<MultiplayerRoom>;

  /** Leave the current room. */
  leaveRoom(): Promise<void>;

  /** Send the locked pattern to the opponent (host only). */
  sendPattern(pattern: number[]): Promise<void>;

  /** Submit the player's replay input for server validation. */
  submitReplay(input: number[]): Promise<{ correct: boolean }>;

  /** Subscribe to real-time room events. Returns an unsubscribe function. */
  subscribe(handler: RoomEventHandler): () => void;
}

class PlaceholderMultiplayerService implements IMultiplayerService {
  readonly status: ConnectionStatus = "disconnected";

  private _reject(method: string): never {
    throw new Error(
      `[MultiplayerService] "${method}" is not yet implemented. ` +
        "Online multiplayer support is planned for a future release.",
    );
  }

  connect(_userId: string): Promise<void> { this._reject("connect"); }
  disconnect(): void { this._reject("disconnect"); }
  createRoom(_settings: { difficulty: string }): Promise<MultiplayerRoom> { this._reject("createRoom"); }
  joinRoom(_code: string, _playerName: string): Promise<MultiplayerRoom> { this._reject("joinRoom"); }
  leaveRoom(): Promise<void> { this._reject("leaveRoom"); }
  sendPattern(_pattern: number[]): Promise<void> { this._reject("sendPattern"); }
  submitReplay(_input: number[]): Promise<{ correct: boolean }> { this._reject("submitReplay"); }
  subscribe(_handler: RoomEventHandler): () => void { this._reject("subscribe"); }
}

export const multiplayerService: IMultiplayerService = new PlaceholderMultiplayerService();
