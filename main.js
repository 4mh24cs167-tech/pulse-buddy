const{app,BrowserWindow,Tray,Menu,ipcMain,screen,nativeImage,powerMonitor}=require('electron');
const path=require('path'),fs=require('fs'),Core=require('./core.js');
const StateStore = require('./src/main/persistence/StateStore');
const AssetStore = require('./src/main/persistence/AssetStore');
if(!app.requestSingleInstanceLock())app.quit();
let win,tray,overlay,stateStore,assetStore,queue=[],pausedUntil=0,quitting=false;
const autostart=()=>app.setLoginItemSettings({openAtLogin:!!stateStore.getState().settings.autostart,args:['--hidden']});
function openWin(){if(win){win.show();win.focus();return}
 win=new BrowserWindow({width:1000,height:740,backgroundColor:'#0d1b1e',title:'Pulse Buddy',autoHideMenuBar:true,webPreferences:{preload:path.join(__dirname,'preload.js')}});
 win.loadFile('index.html');win.on('close',e=>{if(!quitting){e.preventDefault();win.hide()}})}
function showOverlay(r){queue.push(r);if(!overlay)nextOverlay()}
function nextOverlay(){const r=queue.shift();if(!r)return;
 const d=screen.getPrimaryDisplay().workArea,w=d.width,h=d.height;
   overlay=new BrowserWindow({x:d.x,y:d.y,width:w,height:h,transparent:true,frame:false,alwaysOnTop:true,skipTaskbar:true,resizable:false,hasShadow:false,show:false,webPreferences:{preload:path.join(__dirname,'preload.js')}});
 overlay.setAlwaysOnTop(true,'screen-saver');overlay.setIgnoreMouseEvents(true,{forward:true});overlay.loadFile('overlay.html');
 overlay.webContents.on('did-finish-load',()=>{overlay.showInactive();overlay.webContents.send('fire',{r,count:Core.today(r),sound:stateStore.getState().settings.sound})});
 overlay.on('closed',()=>{overlay=null;nextOverlay()})}
setInterval(()=>{
 if(Date.now()<pausedUntil)return;
 const state = stateStore.getState();
 const due=Core.collect(state.reminders,Date.now());
 if(due.length){stateStore.persist();due.forEach(showOverlay);win&&!win.isDestroyed()&&win.webContents.send('refresh')}
},1000);

ipcMain.handle('get',()=>stateStore.getState());
ipcMain.handle('save',(e,d)=>{
    // Fallback for legacy save calls. Will be deprecated.
    Object.assign(stateStore.getState(), d);
    stateStore.persist();
    autostart();
});
ipcMain.handle('createReminder', (e, r) => {
    const state = stateStore.getState();
    r.id = Date.now().toString() + Math.random().toString(36).substr(2, 5);
    if (r.buddy && r.buddy.startsWith('data:')) r.buddy = assetStore.storeAsset(r.buddy, 'image');
    state.reminders.push(r);
    stateStore.persist();
    win&&!win.isDestroyed()&&win.webContents.send('refresh');
    return r.id;
});
ipcMain.handle('updateReminder', (e, id, updates) => {
    const state = stateStore.getState();
    const idx = state.reminders.findIndex(x => x.id === id);
    if (idx !== -1) {
        if (updates.buddy && updates.buddy.startsWith('data:')) updates.buddy = assetStore.storeAsset(updates.buddy, 'image');
        Object.assign(state.reminders[idx], updates);
        stateStore.persist();
        win&&!win.isDestroyed()&&win.webContents.send('refresh');
    }
});
ipcMain.handle('deleteReminder', (e, id) => {
    const state = stateStore.getState();
    state.reminders = state.reminders.filter(x => x.id !== id);
    stateStore.persist();
    win&&!win.isDestroyed()&&win.webContents.send('refresh');
});
ipcMain.handle('setSetting', (e, key, value) => {
    const state = stateStore.getState();
    if (state.settings) state.settings[key] = value;
    stateStore.persist();
    if(key === 'autostart') autostart();
});
ipcMain.handle('test',(e,r)=>showOverlay(r));
ipcMain.handle('pause',(e,m)=>{pausedUntil=m?Date.now()+m*60000:0});
ipcMain.handle('answer',(e,id,a)=>{
 const state = stateStore.getState();
 const r=state.reminders.find(x=>x.id===id);if(!r)return{count:0,goal:1};
 if(a==='done'){r.log=(r.log||[]).concat(Date.now())}else{r.active=true;r.next=Date.now()+(state.settings.snooze||10)*60000}
 stateStore.persist();win&&!win.isDestroyed()&&win.webContents.send('refresh');return{count:Core.today(r),goal:r.goal||1}
});
ipcMain.on('ignore',(e,b)=>overlay&&!overlay.isDestroyed()&&overlay.setIgnoreMouseEvents(b,{forward:true}));
ipcMain.on('close-overlay',()=>overlay&&!overlay.isDestroyed()&&overlay.close());
app.on('second-instance',openWin);
app.whenReady().then(()=>{
 stateStore = new StateStore(app.getPath('userData'));
 assetStore = new AssetStore(app.getPath('userData'));
 autostart();
 tray=new Tray(nativeImage.createFromPath(path.join(__dirname,'build','icon.png')).resize({width:20}));tray.setToolTip('Pulse Buddy');
 const menu=()=>Menu.buildFromTemplate([{label:'Open Pulse Buddy',click:openWin},{label:'Pause 1 hour',click:()=>pausedUntil=Date.now()+36e5},{label:'Resume',click:()=>pausedUntil=0},{type:'separator'},{label:'Quit completely',click:()=>{quitting=true;app.quit()}}]);
 tray.setContextMenu(menu());tray.on('click',openWin);
 if(!process.argv.includes('--hidden'))openWin();
 powerMonitor.on('resume',()=>{pausedUntil=0})});
app.on('window-all-closed',e=>e.preventDefault());
