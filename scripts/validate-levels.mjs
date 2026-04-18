import { levels } from "../src/game/data/levels.ts";

const HITBOX = 18, CORE_R = 62, CTRL_R = 72;
const bodyRect = (x,y,s=HITBOX) => ({ x:x-s/2, y:y-s/2, w:s, h:s });
const overlaps = (a,b) => a.x<b.x+b.w && a.x+a.w>b.x && a.y<b.y+b.h && a.y+a.h>b.y;
const clear    = (lv,pt) => !lv.walls.some(w => overlaps(bodyRect(pt.x,pt.y), w));

const pathExists = (lv, start, goal, openCh=[]) => {
  const closed = lv.doors.filter(d => !openCh.includes(d.channel));
  const block  = [...lv.walls, ...closed];
  const step=8, half=HITBOX/2, vis=new Set([`${Math.round(start.x/step)}:${Math.round(start.y/step)}`]);
  const q=[[start.x,start.y]], dirs=[[step,0],[-step,0],[0,step],[0,-step]];
  while(q.length){
    const [x,y]=q.shift();
    if(overlaps(bodyRect(x,y),goal)) return true;
    for(const [dx,dy] of dirs){
      const nx=x+dx, ny=y+dy;
      if(nx<half||ny<half||nx>lv.world.width-half||ny>lv.world.height-half) continue;
      if(block.some(b=>overlaps(bodyRect(nx,ny),b))) continue;
      const k=`${Math.round(nx/step)}:${Math.round(ny/step)}`;
      if(!vis.has(k)){ vis.add(k); q.push([nx,ny]); }
    }
  }
  return false;
};

const reachableChannels = (lv, initOpen) => {
  const ctrls=[
    ...lv.plates.map(p=>({ ch:p.channel, rect:p })),
    ...lv.switches.map(s=>({ ch:s.channel, rect:{ x:s.x-CTRL_R/2, y:s.y-CTRL_R/2, w:CTRL_R, h:CTRL_R } })),
    ...lv.terminals.map(t=>({ ch:t.channel, rect:{ x:t.x-CTRL_R/2, y:t.y-CTRL_R/2, w:CTRL_R, h:CTRL_R } }))
  ];
  const vis=new Set(), reached=new Set(initOpen), queue=[new Set(initOpen)];
  while(queue.length){
    const open=queue.shift(), key=[...open].sort().join("|");
    if(vis.has(key)) continue; vis.add(key);
    ctrls.forEach(c=>{
      if(!pathExists(lv,lv.spawn,c.rect,[...open])) return;
      if(reached.has(c.ch)&&open.has(c.ch)) return;
      reached.add(c.ch);
      const next=new Set(open); next.add(c.ch); queue.push(next);
    });
  }
  return [...reached];
};

let pass=true;
for(const lv of levels){
  const init   = Object.entries(lv.initialChannels).filter(([,v])=>v).map(([k])=>k);
  const reach  = reachableChannels(lv,init);
  const coreR  = { x:lv.core.x-CORE_R/2, y:lv.core.y-CORE_R/2, w:CORE_R, h:CORE_R };
  const canCore = pathExists(lv,lv.spawn,coreR,reach);
  const canExit = pathExists(lv,lv.spawn,lv.exit,reach);
  const skip    = lv.requiresBreach ? pathExists(lv,lv.spawn,coreR,init) : false;
  const badGuards = lv.guards.filter(g=>{
    if(!clear(lv,{x:g.x,y:g.y})) return true;
    return g.patrol.some(p=>!clear(lv,p));
  }).map(g=>g.id);
  const ok = canCore && canExit && !skip && !badGuards.length;
  if(!ok){
    pass=false;
    console.error(`FAIL ${lv.id}: core=${canCore} exit=${canExit} bypass=${skip} badGuards=[${badGuards}]`);
  } else {
    console.log(`pass ${lv.id}`);
  }
}
if(!pass){ console.error("\nValidation failed."); process.exit(1); }
else      console.log(`\nAll ${levels.length} levels validated.`);
