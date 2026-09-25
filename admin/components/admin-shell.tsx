"use client";
import {useEffect,useState} from "react";
import {supabase} from "../lib/supabase";

const links=[["/","Dashboard"],["/customers","Customers"],["/finance","Finance & Growth"],["/organization","Organization"],["/settings","Settings & Platform"]];

export default function AdminShell({active,children}:{active:string;children:React.ReactNode}){
  const [checking,setChecking]=useState(true);
  useEffect(()=>{(async()=>{const s=supabase();const {data:{user}}=await s.auth.getUser();if(!user){location.href="/login";return}const {data:admin}=await s.from("admin_users").select("id,status,role_id").eq("user_id",user.id).eq("status","active").maybeSingle();if(!admin){await s.auth.signOut();location.href="/login";return}setChecking(false)})()},[]);
  const logout=async()=>{await supabase().auth.signOut();location.href="/login"};
  if(checking)return <div className="shell"><main className="main"><div className="card">Checking admin access...</div></main></div>;
  return <div className="shell"><aside className="sidebar"><div className="brand">Vyapar Analytics</div><nav className="nav">{links.map(([href,label])=><a key={href} className={active===href?"active":""} href={href}>{label}</a>)}</nav></aside><main className="main"><div className="top"><div><div className="title">{active==="/customers"?"Customers":active==="/finance"?"Finance & Growth":active==="/organization"?"Organization":active==="/settings"?"Settings & Platform":"Admin Dashboard"}</div><div className="muted">{active==="/customers"?"Customer lifecycle and account control":active==="/finance"?"Commercial performance, plans and acquisition":active==="/organization"?"Admin team, roles and operational ownership":active==="/settings"?"Platform configuration, permissions and audit": "Business and platform control center"}</div></div><button className="button topButton" onClick={logout}>Sign out</button></div>{children}</main></div>
}