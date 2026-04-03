import { useState } from 'react';
import { HomeScreen } from './components/HomeScreen';
import { StudyScreen } from './components/StudyScreen';
import { DoneScreen } from './components/DoneScreen';
import type { Deck, Screen, SessionStats } from './types';

export default function App() {
  const [screen, setScreen] = useState<Screen>('home');
  const [activeDeck, setActiveDeck] = useState<Deck | null>(null);
  const [lastStats, setLastStats] = useState<SessionStats>({
    again: 0, hard: 0, good: 0, easy: 0,
  });

  function startStudy(deck: Deck) {
    setActiveDeck(deck);
    setScreen('study');
  }

  function finishStudy(stats: SessionStats) {
    setLastStats(stats);
    setScreen('done');
  }

  return (
    <>
      {screen === 'home' && <HomeScreen onStudy={startStudy} />}
      {screen === 'study' && activeDeck && (
        <StudyScreen
          deck={activeDeck}
          onDone={finishStudy}
          onBack={() => setScreen('home')}
        />
      )}
      {screen === 'done' && (
        <DoneScreen stats={lastStats} onHome={() => setScreen('home')} />
      )}
    </>
  );
}
