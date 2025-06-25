// src/app/animations.ts
import {
  trigger,
  state,
  style,
  transition,
  animate,
  keyframes,
} from '@angular/animations';

export const highlight = trigger('highlight', [
  state(
    'on',
    style({
      backgroundColor: 'rgba(10,61,102,0.1)',
      transform: 'scale(1.1)',
      boxShadow: '0 0 12px rgba(10,61,102,0.7)',
    })
  ),
  transition('off => on', [
    animate(
      '2000ms ease-out',
      keyframes([
        style({
          offset: 0,
          transform: 'scale(1)',
          boxShadow: '0 0 0 rgba(10,61,102,0)',
        }),
        style({
          offset: 0.4,
          transform: 'scale(1.05)',
          boxShadow: '0 0 20px rgba(10,61,102,0.5)',
        }),
        style({
          offset: 1.0,
          transform: 'scale(1.1)',
          boxShadow: '0 0 12px rgba(10,61,102,0.7)',
        }),
      ])
    ),
  ]),
  transition('on => off', [
    animate(
      '1000ms ease-in',
      keyframes([
        style({
          offset: 0,
          transform: 'scale(1.1)',
          boxShadow: '0 0 12px rgba(10,61,102,0.7)',
          backgroundColor: 'rgba(10,61,102,0.1)',
        }),
        style({
          offset: 0.4,
          transform: 'scale(1.05)',
          boxShadow: '0 0 20px rgba(10,61,102,0.5)',
          backgroundColor: 'rgba(10,61,102,0.1)',
        }),
        style({
          offset: 1.0,
          transform: 'scale(1)',
          boxShadow: 'none',
          backgroundColor: 'transparent',
        }),
      ])
    ),
  ]),
]);
