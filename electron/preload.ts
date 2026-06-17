import { contextBridge, ipcRenderer } from "electron";
import type { ApiRequest, ApiResponse, AppPrefs, HomeCareBridge } from "@/types";

const api: HomeCareBridge = {
  platform: process.platform,
  invoke(request: ApiRequest): Promise<ApiResponse> {
    return ipcRenderer.invoke("api:invoke", request);
  },
  print(): Promise<void> {
    return ipcRenderer.invoke("print:now");
  },
  printToPdf(filename: string): Promise<boolean> {
    return ipcRenderer.invoke("print:pdf", filename);
  },
  getAppPrefs(): Promise<AppPrefs> {
    return ipcRenderer.invoke("app:get-prefs");
  },
  setAppPrefs(prefs: Partial<AppPrefs>): Promise<AppPrefs> {
    return ipcRenderer.invoke("app:set-prefs", prefs);
  },
  quit(): Promise<void> {
    return ipcRenderer.invoke("app:quit");
  },
};

contextBridge.exposeInMainWorld("homecare", api);
