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

  it('captures football with two clicks and keeps canonical coordinates when visually flipped', () => {
    const onTrajectory = vi.fn();
    const { getByRole } = render(<GestureCourtInput sport="football" flipped onTrajectory={onTrajectory} />);
    const frame = getByRole('application');
    vi.spyOn(frame, 'getBoundingClientRect').mockReturnValue({
      left: 100, top: 50, width: 600, height: 400, right: 700, bottom: 450, x: 100, y: 50,
      toJSON: () => ({}),
    });
    const surface = frame.querySelector('.football-surface') as HTMLDivElement;
    vi.spyOn(surface, 'getBoundingClientRect').mockReturnValue({
      left: 100, top: 50, width: 600, height: 400, right: 700, bottom: 450, x: 100, y: 50,
      toJSON: () => ({}),
    });
    fireEvent.pointerDown(frame, { pointerId: 1, clientX: 100, clientY: 50 });
    fireEvent.pointerUp(frame, { pointerId: 1, clientX: 100, clientY: 50 });
    fireEvent.pointerDown(frame, { pointerId: 2, clientX: 700, clientY: 450 });
    fireEvent.pointerUp(frame, { pointerId: 2, clientX: 700, clientY: 450 });
    expect(onTrajectory).toHaveBeenCalledWith({
      origin: { surface: 'court', x: 1, y: 1 },
      destination: { surface: 'court', x: 0, y: 0 },
    });
  });

  it('uses the current rendered football rectangle after resize', () => {
    const onTrajectory = vi.fn();
    const { getByRole } = render(<GestureCourtInput sport="football" onTrajectory={onTrajectory} />);
    const frame = getByRole('application');
    const surface = frame.querySelector('.football-surface') as HTMLDivElement;
    vi.spyOn(frame, 'getBoundingClientRect').mockReturnValue({ left: 0, top: 0, width: 300, height: 200, right: 300, bottom: 200, x: 0, y: 0, toJSON: () => ({}) });
    const bounds = vi.spyOn(surface, 'getBoundingClientRect');
    bounds.mockReturnValue({ left: 0, top: 0, width: 300, height: 200, right: 300, bottom: 200, x: 0, y: 0, toJSON: () => ({}) });
    fireEvent.pointerDown(frame, { pointerId: 1, clientX: 150, clientY: 100 });
    fireEvent.pointerUp(frame, { pointerId: 1, clientX: 150, clientY: 100 });
    bounds.mockReturnValue({ left: 0, top: 0, width: 600, height: 400, right: 600, bottom: 400, x: 0, y: 0, toJSON: () => ({}) });
    fireEvent.pointerDown(frame, { pointerId: 2, clientX: 300, clientY: 200 });
    fireEvent.pointerUp(frame, { pointerId: 2, clientX: 300, clientY: 200 });
    expect(onTrajectory).toHaveBeenCalledWith({
      origin: { surface: 'court', x: .5, y: .5 },
      destination: { surface: 'court', x: .5, y: .5 },
    });
  });

  it('keeps the football field visible but inert while no spatial action is selected', () => {
    const onTrajectory = vi.fn();
    const { getByLabelText, getByRole } = render(<GestureCourtInput sport="football" isEnabled={false} onTrajectory={onTrajectory} />);
    expect(getByLabelText('Campo de futebol')).toBeTruthy();
    const frame = getByRole('application');
    expect(frame.getAttribute('aria-disabled')).toBe('true');
    fireEvent.pointerDown(frame, { pointerId: 1, clientX: 10, clientY: 10 });
    fireEvent.pointerUp(frame, { pointerId: 1, clientX: 50, clientY: 50 });
    expect(onTrajectory).not.toHaveBeenCalled();
  });
});
