import { app, BrowserWindow, Tray, Menu, nativeImage, ipcMain, screen } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import { DesktopStore } from './store';
import { CompanionWindowManager } from './companionManager';
import { DesktopReminderScheduler } from './scheduler';
import { BUILTIN_AVATARS } from '@pulse-buddy/avatar';
import { ReminderAction } from '@pulse-buddy/shared-types';

let mainWindow: BrowserWindow | null = null;
let tray: Tray | null = null;
let isQuitting = false;

const store = new DesktopStore();
const companionManager = new CompanionWindowManager();
const scheduler = new DesktopReminderScheduler(store, companionManager);

// Single instance lock
const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.show();
      mainWindow.focus();
    }
  });

  app.whenReady().then(() => {
    createMainWindow();
    createSystemTray();
    scheduler.start();

    // Sync launch at login
    const settings = store.getSettings();
    if (app.setLoginItemSettings) {
      app.setLoginItemSettings({
        openAtLogin: settings.launchAtLogin,
      });
    }

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        createMainWindow();
      } else if (mainWindow) {
        mainWindow.show();
      }
    });
  });
}

function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1240,
    height: 820,
    minWidth: 960,
    minHeight: 640,
    title: 'Pulse Buddy - Avatar Reminder Platform',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  // Determine web content location
  const devServerUrl = process.env.VITE_DEV_SERVER_URL || 'http://localhost:5173';
  const isDev = !app.isPackaged && !process.env.PROD;

  const getProdHtmlPath = () => {
    const candidate1 = path.join(__dirname, '../web-dist/index.html');
    if (fs.existsSync(candidate1)) return candidate1;
    const candidate2 = path.join(__dirname, '../../web/dist/index.html');
    if (fs.existsSync(candidate2)) return candidate2;
    return path.join(__dirname, '../../apps/web/dist/index.html');
  };

  if (isDev) {
    mainWindow.loadURL(devServerUrl).catch(() => {
      // If dev server not yet up, load build or wait
      mainWindow?.loadFile(getProdHtmlPath()).catch(() => {});
    });
  } else {
    mainWindow.loadFile(getProdHtmlPath());
  }

  // Handle close to tray
  mainWindow.on('close', (event) => {
    const settings = store.getSettings();
    if (!isQuitting && settings.closeToTray) {
      event.preventDefault();
      mainWindow?.hide();
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function createSystemTray() {
  // Generate a clean 16x16 tray icon
  const icon = nativeImage.createFromBuffer(
    Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAZElEQVQ4T2NkoBAwUqifYdQAYgz4//8/AxZ1mBwTsm5sBsAUY9OIrBiXASRphhyu2DSMTSv2MEH3A3q4Eks34nIDNveQaxjRDyA5g5K8gS4ek+14YmKg+4W4bCc/3Yx6gGAAALbVFAWw1eH7AAAAAElFTkSuQmCC',
      'base64'
    )
  );

  tray = new Tray(icon);
  tray.setToolTip('Pulse Buddy - Avatar Reminders Active');

  const updateMenu = () => {
    const reminders = store.getReminders().filter((r) => r.enabled);
    const sorted = [...reminders].sort(
      (a, b) => new Date(a.nextOccurrence).getTime() - new Date(b.nextOccurrence).getTime()
    );
    const nextRem = sorted[0];
    const nextText = nextRem
      ? `Next: ${nextRem.title} (${new Date(nextRem.nextOccurrence).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})`
      : 'No upcoming reminders';

    const isPaused = scheduler.getPausedStatus();

    const contextMenu = Menu.buildFromTemplate([
      {
        label: 'Open Pulse Buddy',
        click: () => {
          mainWindow?.show();
          mainWindow?.focus();
        },
      },
      { type: 'separator' },
      { label: nextText, enabled: false },
      {
        label: isPaused ? '▶ Resume Reminders' : '⏸ Pause Reminders',
        click: () => {
          if (isPaused) {
            scheduler.resume();
          } else {
            scheduler.pause();
          }
          updateMenu();
        },
      },
      {
        label: 'Test Companion Overlay',
        click: () => {
          const testRem = store.getReminders()[0];
          if (testRem) {
            scheduler.triggerReminder(testRem);
          }
        },
      },
      { type: 'separator' },
      {
        label: 'Launch at Login',
        type: 'checkbox',
        checked: store.getSettings().launchAtLogin,
        click: (menuItem) => {
          const updated = store.saveSettings({ launchAtLogin: menuItem.checked });
          if (app.setLoginItemSettings) {
            app.setLoginItemSettings({ openAtLogin: updated.launchAtLogin });
          }
        },
      },
      { type: 'separator' },
      {
        label: 'Quit Completely',
        click: () => {
          isQuitting = true;
          scheduler.stop();
          companionManager.close();
          app.quit();
        },
      },
    ]);

    tray?.setContextMenu(contextMenu);
  };

  updateMenu();
  tray.on('double-click', () => {
    mainWindow?.show();
    mainWindow?.focus();
  });
}

// IPC Handlers
ipcMain.handle('desktop:get-reminders', async () => store.getReminders());
ipcMain.handle('desktop:save-reminder', async (_, reminder) => {
  const saved = store.saveReminder(reminder);
  scheduler.checkDueReminders();
  return saved;
});
ipcMain.handle('desktop:delete-reminder', async (_, id) => store.deleteReminder(id));

ipcMain.handle('desktop:get-settings', async () => store.getSettings());
ipcMain.handle('desktop:save-settings', async (_, settings) => {
  const updated = store.saveSettings(settings);
  if (app.setLoginItemSettings && settings.launchAtLogin !== undefined) {
    app.setLoginItemSettings({ openAtLogin: settings.launchAtLogin });
  }
  return updated;
});

ipcMain.handle('desktop:get-avatars', async () => {
  return [...BUILTIN_AVATARS, ...store.getCustomAvatars()];
});
ipcMain.handle('desktop:save-avatar', async (_, avatar) => store.saveCustomAvatar(avatar));
ipcMain.handle('desktop:delete-avatar', async (_, id) => store.deleteCustomAvatar(id));

ipcMain.handle('desktop:get-history', async () => store.getHistory());
ipcMain.handle('desktop:record-history', async (_, record) => store.recordHistory(record));

ipcMain.handle('desktop:get-diagnostics', async () => {
  const reminders = store.getReminders();
  return {
    platform: 'electron',
    os: process.platform === 'win32' ? 'windows' : process.platform === 'darwin' ? 'macos' : 'linux',
    backgroundServiceActive: !scheduler.getPausedStatus(),
    notificationsPermitted: true,
    webPushSupported: false,
    activeRemindersCount: reminders.filter((r) => r.enabled).length,
    storageType: 'Electron Persistent Store (JSON on Disk)',
  };
});

ipcMain.handle('desktop:test-companion', async (_, reminderId) => {
  const reminders = store.getReminders();
  const target = reminders.find((r) => r.id === reminderId) || reminders[0];
  if (target) {
    scheduler.triggerReminder(target);
  }
});

ipcMain.on('desktop:open-dashboard', () => {
  mainWindow?.show();
  mainWindow?.focus();
});

ipcMain.on('desktop:hide-to-tray', () => {
  mainWindow?.hide();
});

ipcMain.on('desktop:quit-app', () => {
  isQuitting = true;
  scheduler.stop();
  companionManager.close();
  app.quit();
});

ipcMain.on('desktop:close-companion', () => {
  companionManager.close();
});

ipcMain.on('desktop:reminder-action', (_, { action, reminderId, snoozeMinutes }) => {
  scheduler.handleAction(action as ReminderAction, reminderId, snoozeMinutes);
});

app.on('before-quit', () => {
  isQuitting = true;
  scheduler.stop();
});
