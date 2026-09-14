import { cleanup, fireEvent, render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { GestureCourtInput } from './GestureCourtInput';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('GestureCourtInput', () => {
  function prepare() {
    const onTrajectory = vi.fn();
    const { getByRole } = render(<GestureCourtInput onTrajectory={onTrajectory} />);
    const frame = getByRole('application');
    vi.spyOn(frame, 'getBoundingClientRect').mockReturnValue({
      left: 0, top: 0, width: 400, height: 320, right: 400, bottom: 320, x: 0, y: 0,
      toJSON: () => ({}),
    });
    const surface = frame.querySelector('.spatial-v2-surface') as HTMLDivElement;
    vi.spyOn(surface, 'getBoundingClientRect').mockReturnValue({
      left: 40, top: 32, width: 320, height: 256, right: 360, bottom: 288, x: 40, y: 32,
      toJSON: () => ({}),
    });
    return { frame, onTrajectory };
  }

  it('captures a pointer drag and emits normalized spatial endpoints', () => {
    const { frame, onTrajectory } = prepare();
    fireEvent.pointerDown(frame, { pointerId: 1, clientX: 80, clientY: 64 });
    fireEvent.pointerUp(frame, { pointerId: 1, clientX: 320, clientY: 256 });
    expect(onTrajectory).toHaveBeenCalledWith({
      origin: { surface: 'court', x: 0.125, y: 0.125 },
      destination: { surface: 'court', x: 0.875, y: 0.875 },
    });
  });

  it('ignores accidental taps and cancelled pointers', () => {
    const { frame, onTrajectory } = prepare();
    fireEvent.pointerDown(frame, { pointerId: 1, clientX: 80, clientY: 64 });
    fireEvent.pointerUp(frame, { pointerId: 1, clientX: 82, clientY: 65 });
    fireEvent.pointerDown(frame, { pointerId: 2, clientX: 80, clientY: 64 });
    fireEvent.pointerMove(frame, { pointerId: 2, clientX: 200, clientY: 150 });
    fireEvent.pointerCancel(frame, { pointerId: 2 });
    expect(onTrajectory).not.toHaveBeenCalled();
  });

  it('emits exactly twenty drafts for twenty completed gestures', () => {
    const { frame, onTrajectory } = prepare();
    for (let pointerId = 1; pointerId <= 20; pointerId += 1) {
      fireEvent.pointerDown(frame, { pointerId, clientX: 80, clientY: 64 });
      fireEvent.pointerMove(frame, { pointerId, clientX: 200, clientY: 150 });
      fireEvent.pointerUp(frame, { pointerId, clientX: 320, clientY: 256 });
    }
    expect(onTrajectory).toHaveBeenCalledTimes(20);
  });
});
