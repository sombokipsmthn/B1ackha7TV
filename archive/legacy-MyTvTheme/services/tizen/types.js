// TypeScript 类型定义，用于浏览器和 Tizen 环境共享

export type App = {
  id: string;
  name: string;
  show: boolean;
  iconPath: string;
  category?: string; // 从 config.xml metadata 或用户分类获取
  installTime?: number;
};

export type VideoSource = {
  type: 'TV' | 'HDMI';
  number: number;
  label?: string;
};

export type TizenEvent = {
  type: string;
  data?: any;
};

export interface TizenAPI {
  ApplicationControl: (operation: string) => { operation: string };
  application: {
    getCurrentApplication: () => { appInfo: { id: string } };
    getAppsInfo: (callback: (apps: App[]) => void) => void;
    launch: (id: string, success: () => void, error: (err: any) => void) => void;
    launchAppControl: (control: string, id: string, success: () => void, error: (err: any) => void) => void;
    findAppControl: (control: string, success: (app: any) => void, error: (err: any) => void) => void;
  };
  tvwindow: {
    getSource: () => VideoSource;
    show: (success: () => void) => void;
    hide: (success: () => void) => void;
  };
  systeminfo: {
    getPropertyValue: (key: string, callback: (value: any) => void) => void;
  };
  tvinputdevice: { registerKey: () => void };
}

export interface TizenService {
  isSupported(): boolean;
  getUnified(): TizenAPI | null;
  launchApp(id: string, appControl?: string | null): void;
  getVideoSources(): VideoSource[];
  getCurrentAppId(): string;
  getAppsInfo(): Promise<App[]>;
  subscribeToEvents(callback: (event: string, data: any) => void): () => void;
  // 浏览器专有工具
  mockGetAppsInfo(callback: (apps: App[]) => void): void;
  setMockApps(apps: App[]): void;
  // 辅助
  getRecentApps(): { id: string; name: string; timestamp: number }[];
  clearRecentApps(): void;
  setAppCategory(id: string, category: string): void;
  getAppCategory(id: string): string | undefined;
}