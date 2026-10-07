const{contextBridge,ipcRenderer:i}=require('electron');
contextBridge.exposeInMainWorld('api',{get:()=>i.invoke('get'),save:d=>i.invoke('save',d),test:r=>i.invoke('test',r),pause:m=>i.invoke('pause',m),
 answer:(id,a)=>i.invoke('answer',id,a),ignore:b=>i.send('ignore',b),closeOverlay:()=>i.send('close-overlay'),
 onFire:cb=>i.on('fire',(e,d)=>cb(d)),onRefresh:cb=>i.on('refresh',()=>cb())});
