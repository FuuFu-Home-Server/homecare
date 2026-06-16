import { contextBridge, ipcRenderer } from "electron";
import type { ApiRequest, ApiResponse, HomeDocBridge } from "@/types";

const api: HomeDocBridge = {
  platform: process.platform,
  invoke(request: ApiRequest): Promise<ApiResponse> {
    return ipcRenderer.invoke("api:invoke", request);
  },
};

contextBridge.exposeInMainWorld("homedoc", api);
