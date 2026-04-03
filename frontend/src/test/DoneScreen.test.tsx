import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { DoneScreen } from '../components/DoneScreen';

const stats = { again: 2, hard: 1, good: 3, easy: 4 };

describe('DoneScreen', () => {
  it('renders session stats', () => {
    render(<DoneScreen stats={stats} onHome={() => {}} />);
    expect(screen.getByText('2')).toBeTruthy();
    expect(screen.getByText('Again')).toBeTruthy();
    expect(screen.getByText('4')).toBeTruthy();
    expect(screen.getByText('Easy')).toBeTruthy();
  });

  it('calls onHome when button is clicked', () => {
    const onHome = vi.fn();
    render(<DoneScreen stats={stats} onHome={onHome} />);
    fireEvent.click(screen.getByText('Tillbaka till decks'));
    expect(onHome).toHaveBeenCalledOnce();
  });
});
