import { app, BrowserWindow, globalShortcut, Menu } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let mainWindow = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1180,
    height: 780,
    minWidth: 960,
    minHeight: 640,
    title: 'VocabMaster AI - Trợ lý Từ vựng & Tra từ Thông minh',
    icon: path.join(__dirname, '../icons/icon-128.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: false // Cho phép fetch trực tiếp Cambridge & Google Dict không bị giới hạn CORS
    },
    show: false,
    backgroundColor: '#0f172a'
  });

  mainWindow.loadFile(path.join(__dirname, 'index.html'));

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Tùy biến menu ứng dụng gọn gàng
  const menuTemplate = [
    {
      label: 'VocabMaster',
      submenu: [
        { label: 'Làm mới (Reload)', accelerator: 'CmdOrCtrl+R', click: () => mainWindow.reload() },
        { label: 'Toàn màn hình', accelerator: 'F11', click: () => mainWindow.setFullScreen(!mainWindow.isFullScreen()) },
        { type: 'separator' },
        { label: 'Thoát', accelerator: 'CmdOrCtrl+Q', click: () => app.quit() }
      ]
    },
    {
      label: 'Chỉnh sửa',
      submenu: [
        { label: 'Hoàn tác', role: 'undo' },
        { label: 'Làm lại', role: 'redo' },
        { type: 'separator' },
        { label: 'Cắt', role: 'cut' },
        { label: 'Sao chép', role: 'copy' },
        { label: 'Dán', role: 'paste' },
        { label: 'Chọn tất cả', role: 'selectAll' }
      ]
    },
    {
      label: 'Trợ giúp',
      submenu: [
        {
          label: 'Phím tắt tra nhanh: Ctrl+Shift+D',
          enabled: false
        },
        {
          label: 'Mã nguồn GitHub',
          click: async () => {
            const { shell } = await import('electron');
            shell.openExternal('https://github.com/khongphaifu/VocabMaster-AI');
          }
        }
      ]
    }
  ];

  const menu = Menu.buildFromTemplate(menuTemplate);
  Menu.setApplicationMenu(menu);
}

app.whenReady().then(() => {
  createWindow();

  // Đăng ký phím tắt toàn cục Ctrl+Shift+D để hiển thị/ẩn nhanh cửa sổ tra từ
  try {
    globalShortcut.register('CommandOrControl+Shift+D', () => {
      if (!mainWindow) {
        createWindow();
      } else if (mainWindow.isMinimized()) {
        mainWindow.restore();
        mainWindow.focus();
      } else if (mainWindow.isVisible()) {
        if (mainWindow.isFocused()) {
          mainWindow.hide();
        } else {
          mainWindow.focus();
        }
      } else {
        mainWindow.show();
        mainWindow.focus();
      }
    });
  } catch (err) {
    console.warn('Không thể đăng ký phím tắt toàn cục:', err);
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
