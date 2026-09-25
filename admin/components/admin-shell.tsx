"use client";
import {useEffect,useState} from "react";
import {LogOut} from "lucide-react";
import {supabase} from "../lib/supabase";

const links=[["/","Dashboard"],["/customers","Customers"],["/finance","Finance & Growth"],["/organization","Organization"],["/settings","Settings & Platform"]];

export default function AdminShell({active,children}:{active:string;children:React.ReactNode}){
  const [checking,setChecking]=useState(true);
  useEffect(()=>{(async()=>{const s=supabase();const {data:{user}}=await s.auth.getUser();if(!user){location.href="/login";return}const {data:admin}=await s.from("admin_users").select("id,status,role_id").eq("user_id",user.id).eq("status","active").maybeSingle();if(!admin){await s.auth.signOut();location.href="/login";return}setChecking(false)})()},[]);
  const logout=async()=>{await supabase().auth.signOut();location.href="/login"};
  const title=active==="/customers"?"Customers":active==="/finance"?"Finance & Growth":active==="/organization"?"Organization":active==="/settings"?"Settings & Platform":"Admin Dashboard";
  return checking?<div className="adminLoading"><div className="card">Checking admin access...</div></div>:<div className="shell"><aside className="sidebar"><div className="brand">Vyapar Analytics<span>Business Control Center</span></div><nav className="nav">{links.map(([href,label])=><a key={href} className={active===href?"active":""} href={href}>{label}</a>)}</nav></aside><main className="main"><header className="adminTopbar"><h1>{title}</h1><div className="adminTopbarRight"><span className="adminRole">Admin Control Center</span><button className="iconButton" aria-label="Sign out" title="Sign out" onClick={logout}><LogOut size={17}/></button></div></header><div className="adminContent">{children}</div></main></div>;
}