export interface IElectronAPI {
  selectFile: () => Promise<string[]>;
  selectSaveLocation: () => Promise<string | undefined>;
  selectDirectory: () => Promise<string[]>;
  ping: () => Promise<void>;
  platform: string;
  versions: {
    node: string;
    chrome: string;
    electron: string;
  };
}

declare global {
  interface Window {
    electronAPI: IElectronAPI;
  }
}