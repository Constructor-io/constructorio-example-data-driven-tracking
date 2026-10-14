import { useSyncExternalStore } from 'react';

// Raw entries from public/cio-event-recorder.js, in the order they were sent.
// The recorder swaps its array on every change, so the reference is a valid
// snapshot. Without the recorder (tests, a stripped index.html) this stays empty.
const EMPTY = [];

const getRecorder = () => window.__cioEventRecorder;

const subscribe = (onChange) => {
  const recorder = getRecorder();
  return recorder ? recorder.subscribe(onChange) : () => {};
};

const getSnapshot = () => {
  const recorder = getRecorder();
  return recorder ? recorder.getEvents() : EMPTY;
};

export default function useRecordedEvents() {
  return useSyncExternalStore(subscribe, getSnapshot);
}

export const isRecorderLoaded = () => !!getRecorder();

export const clearRecordedEvents = () => {
  const recorder = getRecorder();
  if (recorder) recorder.clear();
};
