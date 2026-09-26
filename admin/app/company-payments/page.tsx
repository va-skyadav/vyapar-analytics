"use client";

import {useEffect} from "react";

export default function CompanyPayments(){
  useEffect(()=>{ window.location.replace("/subscription?tab=payments"); },[]);
  return <div className="adminLoading"><div className="card">Opening Company & Payments…</div></div>;
}
