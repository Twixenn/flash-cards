import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { FlashCard, intervalLabel } from '../components/FlashCard';
import type { Card } from '../types';

const card: Card = {
  id: 1,
  deck_id: 1,
  front: 'あ',
  back: 'a',
  notes: '',
  audio: '',
  image: '',
  due: 0,
  interval: 1,
  ease_factor: 2.5,
  repetitions: 0,
};

describe('FlashCard', () => {
  it('shows front text', () => {
    render(<FlashCard card={card} revealed={false} onReveal={() => {}} />);
    expect(screen.getByText('あ')).toBeTruthy();
  });

  it('hides back when not revealed', () => {
    render(<FlashCard card={card} revealed={false} onReveal={() => {}} />);
    expect(screen.queryByText('a')).toBeNull();
  });

  it('shows back when revealed', () => {
    render(<FlashCard card={card} revealed={true} onReveal={() => {}} />);
    expect(screen.getByText('a')).toBeTruthy();
  });

  it('calls onReveal when clicked and not revealed', () => {
    const onReveal = vi.fn();
    render(<FlashCard card={card} revealed={false} onReveal={onReveal} />);
    fireEvent.click(screen.getByText('あ'));
    expect(onReveal).toHaveBeenCalledOnce();
  });

  it('does not call onReveal when already revealed', () => {
    const onReveal = vi.fn();
    render(<FlashCard card={card} revealed={true} onReveal={onReveal} />);
    fireEvent.click(screen.getByText('あ'));
    expect(onReveal).not.toHaveBeenCalled();
  });
});

describe('intervalLabel', () => {
  it('returns "< 1 dag" for 0 days', () => {
    expect(intervalLabel(0)).toBe('< 1 dag');
  });
  it('returns "1 dag" for 1 day', () => {
    expect(intervalLabel(1)).toBe('1 dag');
  });
  it('returns days for < 7 days', () => {
    expect(intervalLabel(5)).toBe('5 dagar');
  });
  it('returns weeks for >= 7 days', () => {
    expect(intervalLabel(14)).toBe('2 v');
  });
  it('returns months for >= 30 days', () => {
    expect(intervalLabel(60)).toBe('2 mån');
  });
});
