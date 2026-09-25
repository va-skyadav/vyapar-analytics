"use client";
import {useEffect,useState} from "react";
import {LogOut,RefreshCw} from "lucide-react";
import {supabase} from "../lib/supabase";

const links=[["/","Business Overview"],["/customers","Customers"],["/finance","Finance & Growth"],["/organization","Organization"],["/settings","Settings & Platform"]];

export default function AdminShell({active,children}:{active:string;children:React.ReactNode}){
  const [checking,setChecking]=useState(true);\n  const [lastRefreshed,setLastRefreshed]=useState("");
  useEffect(()=>{(async()=>{const s=supabase();const {data:{user}}=await s.auth.getUser();if(!user){location.href="/login";return}const {data:admin}=await s.from("admin_users").select("id,status,role_id").eq("user_id",user.id).eq("status","active").maybeSingle();if(!admin){await s.auth.signOut();location.href="/login";return}setChecking(false)})()},[]);
  const logout=async()=>{await supabase().auth.signOut();location.href="/login"};
  useEffect(()=>{setLastRefreshed(new Date().toLocaleTimeString("en-IN",{hour:"2-digit",minute:"2-digit"}))},[]);\n  const refresh=()=>{window.location.reload()};
  const pageInfo=active==="/customers"?["Customers","Customer accounts, subscriptions and support"]:active==="/finance"?["Finance & Growth","Revenue, plans, acquisition and commercial performance"]:active==="/organization"?["Organization","Admin users, roles and organizational controls"]:active==="/settings"?["Settings & Platform","Permissions, configuration and platform audit"]:[ "Business Overview","Platform performance, customers and commercial activity" ];
  return checking?<div className="adminLoading"><div className="card">Checking admin access...</div></div>:<div className="shell"><aside className="sidebar"><div className="brand">Vyapar Analytics<span>Business Control Center</span></div><nav className="nav">{links.map(([href,label])=><a key={href} className={active===href?"active":""} href={href}>{label}</a>)}</nav></aside><main className="main"><header className="adminTopbar"><div className="adminPageInfo"><h1>{pageInfo[0]}</h1><span>{pageInfo[1]}</span></div><div className="adminTopbarRight"><span className="lastRefreshed">Last refreshed {lastRefreshed}</span><button className="topRefreshButton" onClick={refresh}><RefreshCw size={15}/><span>Refresh</span></button><button className="iconButton" aria-label="Sign out" title="Sign out" onClick={logout}><LogOut size={17}/></button></div></header><div className="adminContent">{children}</div></main></div>;
}