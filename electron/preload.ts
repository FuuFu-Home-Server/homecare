import { contextBridge, ipcRenderer } from "electron";
import type { ApiRequest, ApiResponse, HomeCareBridge } from "@/types";

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
};

contextBridge.exposeInMainWorld("homecare", api);
