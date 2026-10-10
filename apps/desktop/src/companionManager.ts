import { BrowserWindow, screen, ipcMain } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import { ReminderTriggerPayload, CompanionPosition, CompanionSize } from '@pulse-buddy/shared-types';

export class CompanionWindowManager {
  private window: BrowserWindow | null = null;
  private currentPayload: ReminderTriggerPayload | null = null;
  private autoDismissTimer: NodeJS.Timeout | null = null;

  public show(
    payload: ReminderTriggerPayload,
    position: CompanionPosition = 'bottom-right',
    size: CompanionSize = 'medium',
    displayDurationSeconds: number = 45,
    onActionCallback?: (action: string, reminderId: string, snoozeMinutes?: number) => void
  ): void {
    this.currentPayload = payload;

    // Window dimensions based on size
    let winWidth = 380;
    let winHeight = 440;
    if (size === 'small') {
      winWidth = 320;
      winHeight = 380;
    } else if (size === 'large') {
      winWidth = 440;
      winHeight = 500;
    }

    const primaryDisplay = screen.getPrimaryDisplay();
    const { x, y, width, height } = primaryDisplay.workArea;
    const margin = 24;

    let posX = x + width - winWidth - margin;
    let posY = y + height - winHeight - margin;

    if (position === 'bottom-left') {
      posX = x + margin;
      posY = y + height - winHeight - margin;
    } else if (position === 'top-right') {
      posX = x + width - winWidth - margin;
      posY = y + margin;
    } else if (position === 'top-left') {
      posX = x + margin;
      posY = y + margin;
    } else if (position === 'center') {
      posX = x + Math.round((width - winWidth) / 2);
      posY = y + Math.round((height - winHeight) / 2);
    }

    if (this.window && !this.window.isDestroyed()) {
      this.window.setBounds({ x: posX, y: posY, width: winWidth, height: winHeight });
      this.window.webContents.send('companion:update-payload', payload);
      this.window.showInactive();
      this.window.setAlwaysOnTop(true, 'screen-saver');
    } else {
      this.window = new BrowserWindow({
        width: winWidth,
        height: winHeight,
        x: posX,
        y: posY,
        frame: false,
        transparent: true,
        hasShadow: false,
        resizable: false,
        alwaysOnTop: true,
        skipTaskbar: true,
        focusable: true,
        webPreferences: {
          preload: path.join(__dirname, 'preload.js'),
          contextIsolation: true,
          nodeIntegration: false,
        },
      });

      this.window.setAlwaysOnTop(true, 'screen-saver');

      const devCompanionPath = path.join(__dirname, '../src/companion.html');
      const prodCompanionPath = path.join(__dirname, 'companion.html');
      const companionHtmlPath = fs.existsSync(prodCompanionPath) ? prodCompanionPath : devCompanionPath;

      this.window.loadFile(companionHtmlPath).then(() => {
        if (this.window && !this.window.isDestroyed()) {
          this.window.webContents.send('companion:update-payload', payload);
        }
      });

      this.window.on('closed', () => {
        this.window = null;
      });
    }

    // Reset auto-dismiss timer
    if (this.autoDismissTimer) {
      clearTimeout(this.autoDismissTimer);
    }
    this.autoDismissTimer = setTimeout(() => {
      this.close();
      if (onActionCallback && payload.reminder) {
        onActionCallback('dismissed', payload.reminder.id);
      }
    }, displayDurationSeconds * 1000);
  }

  public close(): void {
    if (this.autoDismissTimer) {
      clearTimeout(this.autoDismissTimer);
      this.autoDismissTimer = null;
    }
    if (this.window && !this.window.isDestroyed()) {
      this.window.close();
      this.window = null;
    }
  }

  public isVisible(): boolean {
    return !!this.window && !this.window.isDestroyed() && this.window.isVisible();
  }
}
