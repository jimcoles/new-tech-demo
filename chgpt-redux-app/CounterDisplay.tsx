import React from 'react';
import {incrementCounter} from './actions';

// @ts-ignore
const CounterDisplay = ({ count }) => {
  return <p>Count: {count}</p>;
};

export default CounterDisplay;
