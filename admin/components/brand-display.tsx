"use client";
import {useEffect,useState} from "react";
import {supabase} from "../lib/supabase";
type Brand={name:string;subtitle:string;logo:string|null;favicon:string|null};
const defaults:Brand={name:"Vyapar Analytics",subtitle:"Business Control Center",logo:null,favicon:null};
export default function AdminBrand(){
 const [brand,setBrand]=useState(defaults);
 useEffect(()=>{const load=async()=>{const {data}=await supabase().from("platform_settings").select("key,value").in("key",["brand_name","brand_admin_subtitle","brand_logo_url","brand_favicon_url"]);if(!data)return;const m:any={};data.forEach((x:any)=>m[x.key]=x.value);const name=typeof m.brand_name==="string"?m.brand_name:defaults.name;const subtitle=typeof m.brand_admin_subtitle==="string"?m.brand_admin_subtitle:defaults.subtitle;const logo=typeof m.brand_logo_url==="string"?m.brand_logo_url:null;const favicon=typeof m.brand_favicon_url==="string"?m.brand_favicon_url:null;setBrand({name,subtitle,logo,favicon});if(favicon){let link=document.querySelector<HTMLLinkElement>('link[rel="icon"]');if(!link){link=document.createElement("link");link.rel="icon";document.head.appendChild(link)}link.href=favicon}document.title=name+" · Business Control Center"};load();window.addEventListener("brand-settings-updated",load);return()=>window.removeEventListener("brand-settings-updated",load)},[]);
 return <div className="brand brandManaged">{brand.logo?<img src={brand.logo} alt={brand.name}/>:<><strong>{brand.name}</strong><span>{brand.subtitle}</span></>}</div>;
}