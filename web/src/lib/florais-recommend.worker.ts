import { recommendGarden } from './florais-recommend';
self.onmessage = event => {
  try { self.postMessage({ result: recommendGarden(event.data.garden, event.data.target) }); }
  catch { self.postMessage({ error: true }); }
};
