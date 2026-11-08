import { useEffect, useState } from 'react';
import { useGame } from '../game/state';
import { PROPS, Sprite, characterSprite } from './pixel';

const you = characterSprite('mayor', 'happy');

const SLIDES = [
  {
    art: (
      <div className="intro-art town">
        <Sprite {...PROPS.house} scale={6} />
        <div className="intro-people">
          {[0, 1, 2, 3].map((i) => (
            <span key={i} className="intro-q">
              <b>?</b>
              <Sprite {...PROPS.person} scale={6} />
            </span>
          ))}
        </div>
        <Sprite {...PROPS.house} scale={6} />
      </div>
    ),
    title: 'This is a little town.',
    text: 'Nobody knows what is happening. They want NEWS!',
  },
  {
    art: (
      <div className="intro-art">
        <Sprite {...you} scale={8} />
        <div className="intro-bubble">HEAR YE! A goose became mayor!</div>
      </div>
    ),
    title: 'You are the News Shouter!',
    text: 'Type the news on your keyboard — you shout it to the town. People pay you for every word.',
  },
  {
    art: (
      <div className="intro-art evo">
        <span>📢</span><i>→</i><span>📰</span><i>→</i><span>📻</span><i>→</i><span>📺</span><i>→</i><span>🚀</span>
      </div>
    ),
    title: 'Grow your news empire!',
    text: 'Save money, hire helpers, and grow from shouting in a town… to a TV channel… to space!',
  },
];

export function Intro() {
  const [i, setI] = useState(0);
  const finish = useGame((s) => s.finishIntro);
  const last = i === SLIDES.length - 1;
  const next = () => (last ? finish() : setI(i + 1));

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        e.stopImmediatePropagation();
        next();
      }
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  });

  const s = SLIDES[i];
  return (
    <div className="modal-bg intro-bg">
      <div className="intro" key={i}>
        {s.art}
        <div className="intro-title">{s.title}</div>
        <div className="intro-text">{s.text}</div>
        <div className="intro-dots">
          {SLIDES.map((_, k) => <span key={k} className={k === i ? 'on' : ''} />)}
        </div>
        <button className="big-btn" onClick={next}>{last ? "Let's go! ▶" : 'Next ▶'}</button>
        <div className="muted">or press Enter</div>
      </div>
    </div>
  );
}
