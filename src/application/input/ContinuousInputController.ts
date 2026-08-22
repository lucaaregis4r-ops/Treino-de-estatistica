import { InputBuffer } from '../../domain/scout/input/InputBuffer';
import {
  isCommitReady,
  type InputCandidateState,
} from '../../domain/scout/input/InputCandidateState';
import { ScoutCodeFramer } from '../../domain/scout/input/ScoutCodeFramer';
import type { CodeProfile } from '../../profiles/types';

export interface AutoCommitPolicy {
  readonly idleMs: number;
  readonly commitOnNextEventPrefix: boolean;
  readonly allowManualCommit: boolean;
}

export const DEFAULT_AUTO_COMMIT_POLICY: AutoCommitPolicy = Object.freeze({
  idleMs: 280,
  commitOnNextEventPrefix: true,
  allowManualCommit: true,
});

export interface ContinuousInputUpdate {
  readonly committedCodes: readonly string[];
  readonly buffer: string;
  readonly state: InputCandidateState;
}

export class ContinuousInputController {
  private readonly buffer = new InputBuffer();

  constructor(
    private readonly profile: CodeProfile,
    readonly policy: AutoCommitPolicy = DEFAULT_AUTO_COMMIT_POLICY,
    private readonly framer = new ScoutCodeFramer(),
  ) {}

  replace(value: string): ContinuousInputUpdate {
    this.buffer.replace(value);
    const framed = this.framer.frame(
      this.buffer.snapshot(),
      this.profile,
      this.policy.commitOnNextEventPrefix,
    );
    this.buffer.replace(framed.remainingBuffer);
    return {
      committedCodes: framed.committedCodes,
      buffer: framed.remainingBuffer,
      state: framed.state,
    };
  }

  idleCommit(): ContinuousInputUpdate {
    if (this.profile.tacticalInput) return this.current();
    return this.commitReadyBuffer();
  }

  decode(value: string) {
    return this.framer.decode(value, this.profile);
  }

  manualCommit(): ContinuousInputUpdate {
    if (!this.policy.allowManualCommit) return this.current();
    return this.commitReadyBuffer();
  }

  clear(): ContinuousInputUpdate {
    this.buffer.clear();
    return this.current();
  }

  current(): ContinuousInputUpdate {
    const value = this.buffer.snapshot();
    return { committedCodes: [], buffer: value, state: this.framer.inspect(value, this.profile) };
  }

  private commitReadyBuffer(): ContinuousInputUpdate {
    const current = this.current();
    if (!isCommitReady(current.state)) return current;
    this.buffer.clear();
    return { committedCodes: [current.buffer.trim()], buffer: '', state: 'empty' };
  }
}
