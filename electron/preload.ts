import { contextBridge, ipcRenderer } from "electron";

export type ApiMethod = "GET" | "POST" | "PATCH" | "DELETE";

export interface ApiRequest {
  method: ApiMethod;
  path: string;
  body?: unknown;
}

export interface ApiResponse {
  status: number;
  data: unknown;
}

const api = {
  platform: process.platform,
  invoke(request: ApiRequest): Promise<ApiResponse> {
    return ipcRenderer.invoke("api:invoke", request);
  },
};

export type HomeDocApi = typeof api;

contextBridge.exposeInMainWorld("homedoc", api);
