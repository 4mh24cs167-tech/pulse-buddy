const{app,BrowserWindow,Tray,Menu,ipcMain,screen,nativeImage,powerMonitor}=require('electron');
const path=require('path'),fs=require('fs'),Core=require('./core.js');
if(!app.requestSingleInstanceLock())app.quit();
let win,tray,overlay,store,queue=[],pausedUntil=0,quitting=false;
const file=()=>path.join(app.getPath('userData'),'data.json');
const load=()=>{try{store=JSON.parse(fs.readFileSync(file()))}catch{store={reminders:[],settings:{autostart:true,sound:true,snooze:10}}}};
const persist=()=>fs.writeFileSync(file(),JSON.stringify(store));
const autostart=()=>app.setLoginItemSettings({openAtLogin:!!store.settings.autostart,args:['--hidden']});
function openWin(){if(win){win.show();win.focus();return}
 win=new BrowserWindow({width:1000,height:740,backgroundColor:'#0d1b1e',title:'Pulse Buddy',autoHideMenuBar:true,webPreferences:{preload:path.join(__dirname,'preload.js')}});
 win.loadFile('index.html');win.on('close',e=>{if(!quitting){e.preventDefault();win.hide()}})}
function showOverlay(r){queue.push(r);if(!overlay)nextOverlay()}
function nextOverlay(){const r=queue.shift();if(!r)return;
 const d=screen.getPrimaryDisplay().workArea,w=d.width,h=d.height;
   overlay=new BrowserWindow({x:d.x,y:d.y,width:w,height:h,transparent:true,frame:false,alwaysOnTop:true,skipTaskbar:true,resizable:false,hasShadow:false,show:false,webPreferences:{preload:path.join(__dirname,'preload.js')}});
 overlay.setAlwaysOnTop(true,'screen-saver');overlay.setIgnoreMouseEvents(true,{forward:true});overlay.loadFile('overlay.html');
 overlay.webContents.on('did-finish-load',()=>{overlay.showInactive();overlay.webContents.send('fire',{r,count:Core.today(r),sound:store.settings.sound})});
 overlay.on('closed',()=>{overlay=null;nextOverlay()})}
setInterval(()=>{if(Date.now()<pausedUntil)return;const due=Core.collect(store.reminders,Date.now());
 if(due.length){persist();due.forEach(showOverlay);win&&!win.isDestroyed()&&win.webContents.send('refresh')}},1000);
ipcMain.handle('get',()=>store);
ipcMain.handle('save',(e,d)=>{store=d;persist();autostart()});
ipcMain.handle('test',(e,r)=>showOverlay(r));
ipcMain.handle('pause',(e,m)=>{pausedUntil=m?Date.now()+m*60000:0});
ipcMain.handle('answer',(e,id,a)=>{const r=store.reminders.find(x=>x.id===id);if(!r)return{count:0,goal:1};
 if(a==='done'){r.log=(r.log||[]).concat(Date.now())}else{r.active=true;r.next=Date.now()+(store.settings.snooze||10)*60000}
 persist();win&&!win.isDestroyed()&&win.webContents.send('refresh');return{count:Core.today(r),goal:r.goal||1}});
ipcMain.on('ignore',(e,b)=>overlay&&!overlay.isDestroyed()&&overlay.setIgnoreMouseEvents(b,{forward:true}));
ipcMain.on('close-overlay',()=>overlay&&!overlay.isDestroyed()&&overlay.close());
app.on('second-instance',openWin);
app.whenReady().then(()=>{load();autostart();
 tray=new Tray(nativeImage.createFromPath(path.join(__dirname,'build','icon.png')).resize({width:20}));tray.setToolTip('Pulse Buddy');
 const menu=()=>Menu.buildFromTemplate([{label:'Open Pulse Buddy',click:openWin},{label:'Pause 1 hour',click:()=>pausedUntil=Date.now()+36e5},{label:'Resume',click:()=>pausedUntil=0},{type:'separator'},{label:'Quit completely',click:()=>{quitting=true;app.quit()}}]);
 tray.setContextMenu(menu());tray.on('click',openWin);
 if(!process.argv.includes('--hidden'))openWin();
 powerMonitor.on('resume',()=>{pausedUntil=0})});
app.on('window-all-closed',e=>e.preventDefault());
