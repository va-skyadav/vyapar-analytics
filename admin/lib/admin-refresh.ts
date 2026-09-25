import {useEffect} from "react";

export const ADMIN_REFRESH_EVENT="admin:refresh";
export const ADMIN_REFRESH_COMPLETE_EVENT="admin:refresh-complete";
export function useAdminRefresh(load:()=>Promise<void>){
  useEffect(()=>{
    const handler=()=>{void load()};
    window.addEventListener(ADMIN_REFRESH_EVENT,handler);
    return()=>window.removeEventListener(ADMIN_REFRESH_EVENT,handler);
  },[load]);
}
export function notifyAdminRefreshComplete(){window.dispatchEvent(new Event(ADMIN_REFRESH_COMPLETE_EVENT));}
