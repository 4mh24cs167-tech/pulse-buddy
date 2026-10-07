const Core={
 mins(s){const[a,b]=s.split(':').map(Number);return a*60+b},
 next(r,from){
  if(r.mode==='interval'){let t=from+r.every*60000;
   if(r.hs&&r.he){const a=Core.mins(r.hs),b=Core.mins(r.he),d=new Date(t),m=d.getHours()*60+d.getMinutes();
    if(m<a)d.setHours(Math.floor(a/60),a%60,0,0);else if(m>b){d.setDate(d.getDate()+1);d.setHours(Math.floor(a/60),a%60,0,0)}t=+d}
   return t}
  if(r.mode==='daily'){let best=null;for(const t of r.times){const[h,m]=t.split(':').map(Number);const c=new Date(from);c.setHours(h,m,0,0);if(+c<=from)c.setDate(c.getDate()+1);if(best===null||+c<best)best=+c}return best}
  return null},
 collect(list,now){const due=[];for(const r of list){if(r.active&&r.next&&r.next<=now){due.push({...r});const n=Core.next(r,now);r.next=n;if(n===null)r.active=false}}return due},
 today(r){const d=new Date().toDateString();return(r.log||[]).filter(t=>new Date(t).toDateString()===d).length}
};
if(typeof module!=='undefined')module.exports=Core;
