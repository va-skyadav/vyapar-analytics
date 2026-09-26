"use client";

import {useEffect,useState} from "react";
import {createBrowserClient} from "@supabase/ssr";

type BrandProps={admin?:boolean};
type BrandSettings={name:string;subtitle:string;logo:string|null;favicon:string|null};
const defaults:BrandSettings={name:"Vyapar Analytics",subtitle:"Business Control Center",logo:null,favicon:null};

export default function BrandDisplay({admin=false}:BrandProps){
 const [brand,setBrand]=useState<BrandSettings>(defaults);
 useEffect(()=>{
  const s=createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!,process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
  const load=async()=>{
   const {data}=await s.from("platform_settings").select("key,value").in("key",["brand_name","brand_admin_subtitle","brand_app_subtitle","brand_logo_url","brand_favicon_url"]);
   if(!data)return;
   const m:any={};data.forEach((x:any)=>m[x.key]=x.value);
   const name=typeof m.brand_name==="string"?m.brand_name:defaults.name;
   const subtitle=typeof (admin?m.brand_admin_subtitle:m.brand_app_subtitle)==="string"?(admin?m.brand_admin_subtitle:m.brand_app_subtitle):defaults.subtitle;
   const logo=typeof m.brand_logo_url==="string"?m.brand_logo_url:null;
   const favicon=typeof m.brand_favicon_url==="string"?m.brand_favicon_url:null;
   setBrand({name,subtitle,logo,favicon});
   if(favicon){let link=document.querySelector<HTMLLinkElement>('link[rel="icon"]');if(!link){link=document.createElement("link");link.rel="icon";document.head.appendChild(link)}link.href=favicon}
   document.title=admin?name+" · Business Control Center":name;
  };
  load();
  const handler=()=>load();
  window.addEventListener("brand-settings-updated",handler);
  return()=>window.removeEventListener("brand-settings-updated",handler);
 },[admin]);
 return <div className="brand brandManaged">{brand.logo?<img src={brand.logo} alt={brand.name}/>:<strong>{brand.name}</strong>}<span>{brand.subtitle}</span></div>;
}