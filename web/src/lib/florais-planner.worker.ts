import { planGardens } from './florais-planner';
self.onmessage = event => {
  try { const { stock, limits, target, current } = event.data; self.postMessage({result:planGardens(stock,limits,target,current)}); }
  catch { self.postMessage({error:true}); }
};
