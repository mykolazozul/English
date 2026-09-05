// SRS v2 mirror. The server is authoritative; this module keeps the UI usable offline.
const MIN_EASE=1.3;
export function todayStr(){return new Date().toISOString().slice(0,10)}
export function isDue(card,today=todayStr()){return !card?.dueAt||String(card.dueAt)<=today}
export function normalize(card={}){return {version:2,stage:Number(card.stage)||0,ease:Number(card.ease)||2.5,interval:Number(card.interval)||0,dueAt:card.dueAt||card.due||null,repetitions:Number(card.repetitions)||0,lapses:Number(card.lapses)||0}}
export function review(card={},quality){const c=normalize(card),q=Math.max(0,Math.min(5,Math.round(Number(quality)||0)));let ease=c.ease,stage=c.stage,interval=c.interval,reps=c.repetitions,lapses=c.lapses;if(q>=3){ease=Math.max(MIN_EASE,ease+(q===5?.1:q===3?-.15:0));stage=Math.min(8,stage+1);interval=reps===0?1:reps===1?3:Math.max(1,Math.round(interval*ease));reps+=1}else{ease=Math.max(MIN_EASE,ease-.2);stage=0;interval=1;reps=0;lapses+=1}const d=new Date();d.setHours(0,0,0,0);d.setDate(d.getDate()+interval);return {version:2,stage,ease:Number(ease.toFixed(2)),interval,dueAt:d.toISOString().slice(0,10),repetitions:reps,lapses}}
export function onCorrect(card={}){return review(card,4)}
export function onWrong(card={}){return review(card,1)}
