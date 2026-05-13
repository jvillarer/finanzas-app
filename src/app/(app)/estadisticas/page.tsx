"use client";

import { useEffect, useState, useMemo } from "react";
import { obtenerTransacciones } from "@/lib/transacciones";
import type { Transaccion } from "@/lib/supabase";

// ─── Paleta ───────────────────────────────────────────────────────────────────
const INK       = "#0F2F2F";
const PAPER     = "#FBF9F4";
const CARD      = "#FFFFFF";
const ACCENT    = "#7dd3a8";
const ACCENT_DK = "#3F8C66";
const RUST      = "#C8503E";
const HAIR      = "rgba(15,47,47,0.08)";
const HAIR_DK   = "rgba(15,47,47,0.14)";
const MUTED     = "rgba(15,47,47,0.50)";

const CAT_COLORES = [
  "#E89B2A","#2E78D2","#5B8C7A","#D9534F",
  "#8B5CF6","#E5557A","#16A34A","#F97316",
];
const CAT_ICONOS: Record<string,string> = {
  Comida:"🍽️", Supermercado:"🛒", Transporte:"🚗",
  Entretenimiento:"🎬", Salud:"💊", Servicios:"⚡",
  Ropa:"👕", Hogar:"🏠", Educación:"📚", Otros:"📦",
};
const DIAS_SEMANA = ["Dom","Lun","Mar","Mié","Jue","Vie","Sáb"];
const MESES_LARGO = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];

type Periodo = "Mes" | "3M" | "6M" | "Todo";

// ─── Helpers ──────────────────────────────────────────────────────────────────
function hoy() { return new Date(); }
function fechaStr(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
}
function mesLabel(d: Date) {
  return d.toLocaleDateString("es-MX",{month:"short"}).replace(".","").replace(/^\w/,c=>c.toUpperCase());
}
function fmt(n: number) {
  if (n >= 1_000_000) return `$${(n/1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `$${(n/1_000).toFixed(0)}k`;
  return `$${n.toFixed(0)}`;
}
function fmtSig(n: number) { return n>=0 ? `+${fmt(n)}` : `-${fmt(Math.abs(n))}`; }

function iniciosPeriodo(periodo: Periodo) {
  const ahora = hoy();
  const hasta = new Date(ahora.getFullYear(), ahora.getMonth()+1, 0);
  let desde: Date, desdePrev: Date, hastaPrev: Date;
  if (periodo==="Mes") {
    desde=new Date(ahora.getFullYear(),ahora.getMonth(),1);
    hastaPrev=new Date(desde.getTime()-1);
    desdePrev=new Date(hastaPrev.getFullYear(),hastaPrev.getMonth(),1);
  } else if (periodo==="3M") {
    desde=new Date(ahora.getFullYear(),ahora.getMonth()-2,1);
    hastaPrev=new Date(desde.getTime()-1);
    desdePrev=new Date(hastaPrev.getFullYear(),hastaPrev.getMonth()-2,1);
  } else if (periodo==="6M") {
    desde=new Date(ahora.getFullYear(),ahora.getMonth()-5,1);
    hastaPrev=new Date(desde.getTime()-1);
    desdePrev=new Date(hastaPrev.getFullYear(),hastaPrev.getMonth()-5,1);
  } else {
    desde=new Date(2000,0,1);
    desdePrev=hastaPrev=new Date(2000,0,1);
  }
  return {desde,hasta,desdePrev,hastaPrev};
}

// ─── Gráfica hero — responde al periodo ──────────────────────────────────────
interface DatoMes { m: string; ingreso: number; gasto: number }

function GraficaHero({ meses }: { meses: DatoMes[] }) {
  if (meses.length===0) return null;
  const W=350, H=120, P={l:8,r:8,t:14,b:18};
  const maxV = Math.max(...meses.flatMap(m=>[m.ingreso,m.gasto]),1)*1.08;
  const xs   = meses.map((_,i)=>P.l+(i/Math.max(meses.length-1,1))*(W-P.l-P.r));
  const yIn  = meses.map(m=>P.t+(1-m.ingreso/maxV)*(H-P.t-P.b));
  const yOut = meses.map(m=>P.t+(1-m.gasto/maxV)*(H-P.t-P.b));

  function curva(xs:number[],ys:number[]) {
    if (xs.length===1) return `M ${xs[0]} ${ys[0]}`;
    let d=`M ${xs[0]} ${ys[0]}`;
    for (let i=1;i<xs.length;i++) {
      const xc=(xs[i-1]+xs[i])/2;
      d+=` Q ${xc} ${ys[i-1]} ${xc} ${(ys[i-1]+ys[i])/2} Q ${xc} ${ys[i]} ${xs[i]} ${ys[i]}`;
    }
    return d;
  }
  function area(xs:number[],ys:number[]) {
    return curva(xs,ys)+` L ${xs[xs.length-1]} ${H-P.b} L ${xs[0]} ${H-P.b} Z`;
  }

  // Mostrar máx 7 labels distribuidos uniformemente
  const stride = Math.max(1, Math.ceil(meses.length/7));

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" preserveAspectRatio="none" style={{display:"block"}}>
      <defs>
        <linearGradient id="inGrad" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#7dd3a8" stopOpacity="0.4"/>
          <stop offset="100%" stopColor="#7dd3a8" stopOpacity="0"/>
        </linearGradient>
        <linearGradient id="outGrad" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.12"/>
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0"/>
        </linearGradient>
      </defs>
      {/* Referencia Y */}
      <text x={P.l} y={P.t-2} fontSize="8" fill="rgba(255,255,255,0.3)" fontFamily="Inter,sans-serif">{fmt(maxV/1.08)}</text>
      {/* Gridlines */}
      {[0.33,0.66].map((t,i)=>(
        <line key={i} x1={P.l} x2={W-P.r}
          y1={P.t+t*(H-P.t-P.b)} y2={P.t+t*(H-P.t-P.b)}
          stroke="rgba(255,255,255,0.06)" strokeDasharray="2 5"/>
      ))}
      {/* Gastos */}
      <path d={area(xs,yOut)} fill="url(#outGrad)"/>
      <path d={curva(xs,yOut)} fill="none" stroke="rgba(255,255,255,0.35)" strokeWidth="1.5" strokeLinecap="round" strokeDasharray="3 4"/>
      {/* Ingresos */}
      <path d={area(xs,yIn)} fill="url(#inGrad)"/>
      <path d={curva(xs,yIn)} fill="none" stroke="#7dd3a8" strokeWidth="2.2" strokeLinecap="round"/>
      {/* Punto actual */}
      <circle cx={xs[xs.length-1]} cy={yIn[yIn.length-1]} r="4.5" fill="#7dd3a8" stroke="#0F2F2F" strokeWidth="2"/>
      {/* Labels */}
      {meses.map((m,i)=> {
        const mostrar = i===0 || i===meses.length-1 || i%stride===0;
        if (!mostrar) return null;
        return (
          <text key={i} x={xs[i]} y={H-3}
            fontSize="9" fontWeight={i===meses.length-1?"700":"500"}
            fill={i===meses.length-1?"#7dd3a8":"rgba(255,255,255,0.4)"}
            textAnchor="middle" fontFamily="Inter,sans-serif">{m.m}</text>
        );
      })}
    </svg>
  );
}

// ─── Donut ────────────────────────────────────────────────────────────────────
interface DatoDonut { valor: number; color: string; label: string }

function Donut({ datos, tamaño=130, trazo=18 }: { datos:DatoDonut[]; tamaño?:number; trazo?:number }) {
  const total = datos.reduce((s,d)=>s+d.valor,0)||1;
  const cx=tamaño/2, r=cx-trazo/2-2, circ=2*Math.PI*r;
  const gapGrados = datos.length>1?1.8:0;
  let rotActual=-90;
  return (
    <div style={{position:"relative",width:tamaño,height:tamaño,flexShrink:0}}>
      <svg width={tamaño} height={tamaño}>
        <circle cx={cx} cy={cx} r={r} fill="none" stroke={HAIR} strokeWidth={trazo}/>
        {datos.map((d,i)=>{
          const pct=d.valor/total, grados=pct*360-gapGrados;
          const dashLen=(grados/360)*circ, rot=rotActual+gapGrados/2;
          rotActual+=pct*360;
          if (dashLen<=0) return null;
          return <circle key={i} cx={cx} cy={cx} r={r} fill="none" stroke={d.color} strokeWidth={trazo}
            strokeDasharray={`${dashLen} ${circ}`} strokeDashoffset={0} strokeLinecap="butt"
            transform={`rotate(${rot},${cx},${cx})`}/>;
        })}
      </svg>
      <div style={{position:"absolute",inset:0,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center"}}>
        <span style={{fontSize:"9px",fontWeight:700,color:MUTED,letterSpacing:"1px",textTransform:"uppercase"}}>Top cat.</span>
        <span style={{fontSize:"12px",fontWeight:700,color:INK,marginTop:"2px",textAlign:"center",padding:"0 6px",lineHeight:1.2}}>{datos[0]?.label??"—"}</span>
        <span style={{fontSize:"22px",fontWeight:800,color:datos[0]?.color??INK,lineHeight:1,marginTop:"3px"}}>
          {Math.round((datos[0]?.valor??0)/total*100)}<span style={{fontSize:"13px"}}>%</span>
        </span>
      </div>
    </div>
  );
}

// ─── Barras día de semana ─────────────────────────────────────────────────────
function BarrasDiaSemana({ gastosPorDia }: { gastosPorDia: number[] }) {
  const max=Math.max(...gastosPorDia,1);
  const maxIdx=gastosPorDia.indexOf(Math.max(...gastosPorDia));
  return (
    <div style={{display:"flex",gap:6,alignItems:"flex-end",height:72}}>
      {gastosPorDia.map((v,i)=>{
        const esMax=i===maxIdx&&v>0;
        return (
          <div key={i} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:4}}>
            <div style={{
              width:"100%",height:`${Math.max((v/max)*56,v>0?4:2)}px`,
              borderRadius:"4px 4px 0 0",
              background:esMax?ACCENT_DK:v>0?ACCENT+"99":HAIR,
              transition:"height 0.4s cubic-bezier(0.34,1.56,0.64,1)",
            }}/>
            <span style={{fontSize:9,fontWeight:esMax?800:600,color:esMax?INK:MUTED}}>{DIAS_SEMANA[i]}</span>
          </div>
        );
      })}
    </div>
  );
}

// ─── PÁGINA ───────────────────────────────────────────────────────────────────
const TITULO_PERIODO: Record<Periodo,string> = {
  Mes:"Tu mes", "3M":"3 meses", "6M":"6 meses", Todo:"Todo el tiempo",
};
const PERIODOS: Periodo[] = ["Mes","3M","6M","Todo"];

export default function EstadisticasPage() {
  const [transacciones,setTransacciones] = useState<Transaccion[]>([]);
  const [cargando,setCargando]           = useState(true);
  const [periodo,setPeriodo]             = useState<Periodo>("Mes");

  useEffect(()=>{
    obtenerTransacciones().then(setTransacciones).finally(()=>setCargando(false));
    const h=()=>obtenerTransacciones().then(setTransacciones);
    window.addEventListener("lani:transaccion-guardada",h);
    return ()=>window.removeEventListener("lani:transaccion-guardada",h);
  },[]);

  const {desde,hasta,desdePrev,hastaPrev}=useMemo(()=>iniciosPeriodo(periodo),[periodo]);

  const enPeriodo=useMemo(()=>
    transacciones.filter(t=>t.fecha>=fechaStr(desde)&&t.fecha<=fechaStr(hasta)),
    [transacciones,desde,hasta]);

  const enPrev=useMemo(()=>
    periodo==="Todo"?[]:
    transacciones.filter(t=>t.fecha>=fechaStr(desdePrev)&&t.fecha<=fechaStr(hastaPrev)),
    [transacciones,desdePrev,hastaPrev,periodo]);

  // Métricas base
  const ingresos=useMemo(()=>enPeriodo.filter(t=>t.tipo==="ingreso").reduce((s,t)=>s+Number(t.monto),0),[enPeriodo]);
  const gastos  =useMemo(()=>enPeriodo.filter(t=>t.tipo==="gasto").reduce((s,t)=>s+Number(t.monto),0),[enPeriodo]);
  const balance =ingresos-gastos;
  const pctGastado=ingresos>0?Math.round((gastos/ingresos)*100):0;

  const ingresosPrev=useMemo(()=>enPrev.filter(t=>t.tipo==="ingreso").reduce((s,t)=>s+Number(t.monto),0),[enPrev]);
  const gastosPrev  =useMemo(()=>enPrev.filter(t=>t.tipo==="gasto").reduce((s,t)=>s+Number(t.monto),0),[enPrev]);
  const balancePrev =ingresosPrev-gastosPrev;
  const pctBalance  =balancePrev!==0?Math.round(((balance-balancePrev)/Math.abs(balancePrev))*100):0;
  const difBalance  =balance-balancePrev;

  const tasaAhorro    =ingresos>0?Math.round(((ingresos-gastos)/ingresos)*100):0;
  const tasaAhorroPrev=ingresosPrev>0?Math.round(((ingresosPrev-gastosPrev)/ingresosPrev)*100):0;
  const difTasa       =tasaAhorro-tasaAhorroPrev;

  const diasPeriodo    =Math.max(1,Math.round((hasta.getTime()-desde.getTime())/86400000));
  const gastoDiario    =Math.round(gastos/diasPeriodo);
  const ingresoDiario  =ingresos>0?Math.round(ingresos/diasPeriodo):0;
  const diasPrev       =Math.max(1,Math.round((hastaPrev.getTime()-desdePrev.getTime())/86400000));
  const gastoDiarioPrev=Math.round(gastosPrev/diasPrev);
  const pctDiario      =gastoDiarioPrev>0?Math.round(((gastoDiario-gastoDiarioPrev)/gastoDiarioPrev)*100):0;

  // ── 1. Gráfica que responde al periodo ────────────────────────────────────────
  const datosMeses: DatoMes[] = useMemo(()=>{
    const ahora=hoy();

    if (periodo==="Mes") {
      // Semanas del mes actual
      const diasMes=new Date(ahora.getFullYear(),ahora.getMonth()+1,0).getDate();
      const semanas: DatoMes[]=[];
      let ing=0, gas=0, semNum=1, diasEnSemana=0;
      for (let d=1;d<=diasMes;d++) {
        const dStr=fechaStr(new Date(ahora.getFullYear(),ahora.getMonth(),d));
        const txs=transacciones.filter(t=>t.fecha===dStr);
        ing+=txs.filter(t=>t.tipo==="ingreso").reduce((s,t)=>s+Number(t.monto),0);
        gas+=txs.filter(t=>t.tipo==="gasto").reduce((s,t)=>s+Number(t.monto),0);
        diasEnSemana++;
        if (diasEnSemana===7||d===diasMes) {
          semanas.push({m:`S${semNum}`,ingreso:ing,gasto:gas});
          ing=0;gas=0;semNum++;diasEnSemana=0;
        }
      }
      return semanas;
    }

    if (periodo==="Todo") {
      // Todos los meses desde la primera transacción
      if (transacciones.length===0) return [];
      const primera=transacciones.map(t=>t.fecha).sort()[0];
      const d0=new Date(primera+"T12:00:00");
      let cursor=new Date(d0.getFullYear(),d0.getMonth(),1);
      const resultado: DatoMes[]=[];
      while (cursor<=ahora) {
        const fin=new Date(cursor.getFullYear(),cursor.getMonth()+1,0);
        const ini=fechaStr(cursor), fn=fechaStr(fin);
        const txs=transacciones.filter(t=>t.fecha>=ini&&t.fecha<=fn);
        resultado.push({
          m:mesLabel(cursor),
          ingreso:txs.filter(t=>t.tipo==="ingreso").reduce((s,t)=>s+Number(t.monto),0),
          gasto:txs.filter(t=>t.tipo==="gasto").reduce((s,t)=>s+Number(t.monto),0),
        });
        cursor=new Date(cursor.getFullYear(),cursor.getMonth()+1,1);
      }
      return resultado;
    }

    // 3M o 6M — meses individuales
    const n=periodo==="3M"?3:6;
    return Array.from({length:n},(_,i)=>{
      const d=new Date(ahora.getFullYear(),ahora.getMonth()-(n-1-i),1);
      const fin=new Date(d.getFullYear(),d.getMonth()+1,0);
      const txs=transacciones.filter(t=>t.fecha>=fechaStr(d)&&t.fecha<=fechaStr(fin));
      return {
        m:mesLabel(d),
        ingreso:txs.filter(t=>t.tipo==="ingreso").reduce((s,t)=>s+Number(t.monto),0),
        gasto:txs.filter(t=>t.tipo==="gasto").reduce((s,t)=>s+Number(t.monto),0),
      };
    });
  },[transacciones,periodo]);

  // Categorías
  const categorias=useMemo(()=>{
    const mapa: Record<string,number>={};
    enPeriodo.filter(t=>t.tipo==="gasto").forEach(t=>{
      mapa[t.categoria]=(mapa[t.categoria]??0)+Number(t.monto);
    });
    return Object.entries(mapa).sort((a,b)=>b[1]-a[1])
      .map(([nombre,monto],i)=>({
        nombre,monto,
        icono:CAT_ICONOS[nombre]??"📦",
        color:CAT_COLORES[i%CAT_COLORES.length],
        pct:gastos>0?Math.round((monto/gastos)*100):0,
      }));
  },[enPeriodo,gastos]);

  const datosDonut: DatoDonut[]=categorias.map(c=>({valor:c.monto,color:c.color,label:c.nombre}));

  // Gastos por día de semana
  const gastosPorDiaSemana: number[]=useMemo(()=>{
    const totales=[0,0,0,0,0,0,0];
    enPeriodo.filter(t=>t.tipo==="gasto").forEach(t=>{
      totales[new Date(t.fecha+"T12:00:00").getDay()]+=Number(t.monto);
    });
    return totales;
  },[enPeriodo]);

  // Top 5
  const top5=useMemo(()=>
    enPeriodo.filter(t=>t.tipo==="gasto")
      .sort((a,b)=>Number(b.monto)-Number(a.monto)).slice(0,5),
    [enPeriodo]);

  // ── 3. MSI comprometido (futuro) ──────────────────────────────────────────────
  const msiProximos=useMemo(()=>{
    const hoyStr=fechaStr(hoy());
    const futuras=transacciones.filter(t=>t.grupo_msi&&t.fecha>hoyStr&&t.tipo==="gasto");
    const porMes: Record<string,number>={};
    futuras.forEach(t=>{
      const mes=t.fecha.substring(0,7);
      porMes[mes]=(porMes[mes]??0)+Number(t.monto);
    });
    return Object.entries(porMes).sort(([a],[b])=>a.localeCompare(b)).slice(0,6)
      .map(([mes,monto])=>{
        const [y,m]=mes.split("-").map(Number);
        return {label:`${MESES_LARGO[m-1]} ${y}`,monto};
      });
  },[transacciones]);
  const totalMsi=msiProximos.reduce((s,m)=>s+m.monto,0);

  // Header label
  const ahora=hoy();
  const labelPeriodo=periodo==="Mes"
    ?ahora.toLocaleDateString("es-MX",{month:"long",year:"numeric"}).replace(/^\w/,c=>c.toUpperCase())
    :periodo==="Todo"?"Histórico":`Últimos ${periodo}`;

  if (cargando) return (
    <div style={{height:"100dvh",display:"flex",alignItems:"center",justifyContent:"center",background:INK}}>
      <div style={{color:ACCENT,fontSize:14,fontWeight:600}}>Cargando...</div>
    </div>
  );

  return (
    <div style={{width:"100%",height:"100dvh",background:PAPER,display:"flex",flexDirection:"column",overflow:"hidden",fontFamily:"-apple-system,BlinkMacSystemFont,'SF Pro Display','Inter',sans-serif"}}>

      {/* ══ HEADER ══ */}
      <div style={{flexShrink:0,background:INK,color:"#fff",paddingTop:"calc(env(safe-area-inset-top) + 16px)",paddingLeft:22,paddingRight:22,paddingBottom:16,position:"relative"}}>
        <div style={{position:"absolute",inset:0,opacity:0.03,backgroundImage:"radial-gradient(circle at 1px 1px,#fff 1px,transparent 0)",backgroundSize:"16px 16px",pointerEvents:"none"}}/>

        {/* Título */}
        <div style={{position:"relative",marginBottom:14}}>
          <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:4}}>
            <span style={{width:6,height:6,borderRadius:"50%",background:ACCENT,display:"inline-block"}}/>
            <p style={{fontSize:10.5,color:"rgba(255,255,255,0.5)",fontWeight:700,letterSpacing:"1.4px",textTransform:"uppercase"}}>Análisis · {labelPeriodo}</p>
          </div>
          <h1 style={{fontSize:32,color:"#fff",fontWeight:800,letterSpacing:"-0.8px",lineHeight:1,fontStyle:"italic"}}>{TITULO_PERIODO[periodo]}</h1>
        </div>

        {/* Balance */}
        <div style={{position:"relative"}}>
          <p style={{fontSize:10,color:"rgba(255,255,255,0.4)",fontWeight:700,letterSpacing:"1.2px",textTransform:"uppercase",marginBottom:4}}>Balance neto</p>
          <div style={{display:"flex",alignItems:"baseline",gap:10,flexWrap:"wrap",marginBottom:10}}>
            <h2 style={{fontSize:46,fontWeight:800,color:balance>=0?ACCENT:RUST,letterSpacing:"-1.8px",lineHeight:0.95,fontStyle:"italic"}}>
              {balance>=0?"+":""}{fmt(balance)}
            </h2>
            {periodo!=="Todo"&&balancePrev!==0&&(
              <div style={{display:"inline-flex",alignItems:"center",gap:3,background:pctBalance>=0?"rgba(125,211,168,0.18)":"rgba(200,80,62,0.2)",color:pctBalance>=0?ACCENT:RUST,padding:"4px 8px",borderRadius:8,fontSize:11,fontWeight:700}}>
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" style={{transform:pctBalance>=0?"none":"rotate(180deg)"}}>
                  <polyline points="18 15 12 9 6 15"/>
                </svg>
                {Math.abs(pctBalance)}%
              </div>
            )}
          </div>

          {/* Pills ingresos / gastos */}
          <div style={{display:"flex",gap:8,marginBottom:12}}>
            <div style={{display:"flex",alignItems:"center",gap:5,background:"rgba(125,211,168,0.12)",borderRadius:8,padding:"5px 10px"}}>
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke={ACCENT} strokeWidth="3" strokeLinecap="round"><polyline points="18 15 12 9 6 15"/></svg>
              <span style={{fontSize:11,fontWeight:700,color:ACCENT}}>{fmt(ingresos)}</span>
              <span style={{fontSize:10,color:"rgba(255,255,255,0.35)",fontWeight:500}}>ingresos</span>
            </div>
            <div style={{display:"flex",alignItems:"center",gap:5,background:"rgba(200,80,62,0.12)",borderRadius:8,padding:"5px 10px"}}>
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke={RUST} strokeWidth="3" strokeLinecap="round" style={{transform:"rotate(180deg)"}}><polyline points="18 15 12 9 6 15"/></svg>
              <span style={{fontSize:11,fontWeight:700,color:RUST}}>{fmt(gastos)}</span>
              <span style={{fontSize:10,color:"rgba(255,255,255,0.35)",fontWeight:500}}>gastos</span>
            </div>
          </div>

          {/* ── 2. Barra % de ingresos gastado ── */}
          {ingresos>0&&gastos>0&&(
            <div style={{marginBottom:14}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"baseline",marginBottom:6}}>
                <span style={{fontSize:11,color:"rgba(255,255,255,0.55)",fontWeight:600}}>
                  {pctGastado<=100
                    ?`Gastaste el ${pctGastado}% de lo que ganaste`
                    :`Gastaste ${pctGastado-100}% más de lo que ganaste`}
                </span>
                <span style={{fontSize:11,fontWeight:800,color:pctGastado>100?RUST:ACCENT}}>{pctGastado}%</span>
              </div>
              <div style={{height:6,background:"rgba(255,255,255,0.1)",borderRadius:3,overflow:"hidden"}}>
                <div style={{height:"100%",width:`${Math.min(pctGastado,100)}%`,background:pctGastado>90?RUST:pctGastado>70?"#f59e0b":ACCENT,borderRadius:3,transition:"width 0.7s cubic-bezier(0.4,0,0.2,1)"}}/>
              </div>
              {/* Micro escala */}
              <div style={{display:"flex",justifyContent:"space-between",marginTop:3}}>
                <span style={{fontSize:8.5,color:"rgba(255,255,255,0.25)",fontWeight:600}}>$0</span>
                <span style={{fontSize:8.5,color:"rgba(255,255,255,0.25)",fontWeight:600}}>{fmt(ingresos)}</span>
              </div>
            </div>
          )}
        </div>

        {/* Gráfica */}
        <div style={{marginLeft:-6,marginRight:-6}}>
          <GraficaHero meses={datosMeses}/>
        </div>

        {/* Leyenda */}
        <div style={{display:"flex",gap:14,marginTop:4,marginBottom:8}}>
          <div style={{display:"flex",alignItems:"center",gap:4}}>
            <div style={{width:16,height:2,background:ACCENT,borderRadius:1}}/>
            <span style={{fontSize:9,color:"rgba(255,255,255,0.4)",fontWeight:600}}>Ingresos</span>
          </div>
          <div style={{display:"flex",alignItems:"center",gap:4}}>
            <div style={{width:16,height:0,borderTop:"1.5px dashed rgba(255,255,255,0.35)"}}/>
            <span style={{fontSize:9,color:"rgba(255,255,255,0.4)",fontWeight:600}}>Gastos</span>
          </div>
        </div>

        {/* Selector periodo */}
        <div style={{background:"rgba(255,255,255,0.07)",borderRadius:12,padding:"3px",display:"flex",gap:2}}>
          {PERIODOS.map(p=>(
            <button key={p} onClick={()=>setPeriodo(p)} style={{flex:1,height:32,border:"none",cursor:"pointer",borderRadius:10,background:periodo===p?ACCENT:"transparent",color:periodo===p?INK:"rgba(255,255,255,0.6)",fontSize:12,fontWeight:700,transition:"all 0.2s"}}>{p}</button>
          ))}
        </div>
      </div>

      {/* ══ BODY ══ */}
      <div style={{flex:1,overflowY:"auto",WebkitOverflowScrolling:"touch",paddingBottom:96} as React.CSSProperties}>

        {/* KPI CARDS */}
        <div style={{padding:"18px 20px 0",display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
          {/* Tasa de ahorro */}
          <div style={{background:CARD,borderRadius:18,padding:16,border:`1px solid ${HAIR}`,boxShadow:"0 1px 3px rgba(15,47,47,0.05)"}}>
            <p style={{fontSize:10,color:MUTED,fontWeight:700,letterSpacing:"0.8px",textTransform:"uppercase",marginBottom:8}}>Tasa de ahorro</p>
            <p style={{fontSize:34,fontWeight:800,color:ACCENT_DK,letterSpacing:"-1px",lineHeight:1,fontStyle:"italic",marginBottom:8}}>
              {tasaAhorro}<span style={{fontSize:18}}>%</span>
            </p>
            <div style={{height:4,background:HAIR,borderRadius:4,overflow:"hidden",marginBottom:8}}>
              <div style={{height:"100%",width:`${Math.min(tasaAhorro,100)}%`,background:ACCENT_DK,borderRadius:4,transition:"width 0.6s ease"}}/>
            </div>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <span style={{fontSize:10.5,color:MUTED,fontWeight:600}}>{tasaAhorro>=20?"¡Excelente!":tasaAhorro>=10?"Bien":"Mejorable"}</span>
              {periodo!=="Todo"&&difTasa!==0&&(
                <span style={{fontSize:10,fontWeight:700,color:difTasa>0?ACCENT_DK:RUST}}>{difTasa>0?"+":""}{difTasa}pp vs ant.</span>
              )}
            </div>
          </div>

          {/* Gasto diario */}
          <div style={{background:CARD,borderRadius:18,padding:16,border:`1px solid ${HAIR}`,boxShadow:"0 1px 3px rgba(15,47,47,0.05)"}}>
            <p style={{fontSize:10,color:MUTED,fontWeight:700,letterSpacing:"0.8px",textTransform:"uppercase",marginBottom:8}}>Gasto diario</p>
            <p style={{fontSize:34,fontWeight:800,color:INK,letterSpacing:"-1px",lineHeight:1,fontStyle:"italic",marginBottom:8}}>{fmt(gastoDiario)}</p>
            {ingresoDiario>0&&(
              <>
                <div style={{height:4,background:HAIR,borderRadius:4,overflow:"hidden",marginBottom:8}}>
                  <div style={{height:"100%",width:`${Math.min((gastoDiario/ingresoDiario)*100,100)}%`,background:gastoDiario>ingresoDiario?RUST:ACCENT_DK,borderRadius:4,transition:"width 0.6s ease"}}/>
                </div>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                  <span style={{fontSize:10.5,color:MUTED,fontWeight:600}}>promedio/día</span>
                  {periodo!=="Todo"&&pctDiario!==0&&(
                    <span style={{fontSize:10,fontWeight:700,color:pctDiario<0?ACCENT_DK:RUST}}>{pctDiario>0?"+":""}{pctDiario}% vs ant.</span>
                  )}
                </div>
              </>
            )}
            {ingresoDiario===0&&<span style={{fontSize:10.5,color:MUTED,fontWeight:600}}>promedio/día</span>}
          </div>
        </div>

        {/* ── 3. MSI COMPROMETIDO ── */}
        {msiProximos.length>0&&(
          <div style={{padding:"22px 20px 0"}}>
            <p style={{fontSize:10,color:MUTED,fontWeight:700,letterSpacing:"1.4px",textTransform:"uppercase",marginBottom:2}}>Compromisos</p>
            <h2 style={{fontSize:22,color:INK,fontWeight:700,letterSpacing:"-0.6px",marginBottom:12,fontStyle:"italic"}}>Meses sin intereses</h2>

            <div style={{background:CARD,borderRadius:22,padding:18,border:`1px solid ${HAIR}`,boxShadow:"0 1px 3px rgba(15,47,47,0.05)"}}>
              {/* Total comprometido */}
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16,paddingBottom:14,borderBottom:`1px solid ${HAIR}`}}>
                <div>
                  <p style={{fontSize:11,color:MUTED,fontWeight:600,marginBottom:2}}>Total comprometido</p>
                  <p style={{fontSize:11,color:MUTED,fontWeight:500}}>próximos {msiProximos.length} {msiProximos.length===1?"mes":"meses"}</p>
                </div>
                <p style={{fontSize:26,fontWeight:800,color:RUST,letterSpacing:"-0.8px",fontStyle:"italic"}}>{fmt(totalMsi)}</p>
              </div>

              {/* Desglose por mes */}
              <div style={{display:"flex",flexDirection:"column",gap:10}}>
                {msiProximos.map((m,i)=>{
                  const pct=totalMsi>0?m.monto/totalMsi:0;
                  return (
                    <div key={i}>
                      <div style={{display:"flex",justifyContent:"space-between",alignItems:"baseline",marginBottom:4}}>
                        <span style={{fontSize:12,color:INK,fontWeight:600}}>{m.label}</span>
                        <span style={{fontSize:13,fontWeight:700,color:INK,fontStyle:"italic"}}>{fmt(m.monto)}</span>
                      </div>
                      <div style={{height:4,background:HAIR,borderRadius:3,overflow:"hidden"}}>
                        <div style={{height:"100%",width:`${pct*100}%`,background:RUST+"99",borderRadius:3}}/>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* DISTRIBUCIÓN */}
        {categorias.length>0&&(
          <div style={{padding:"22px 20px 0"}}>
            <p style={{fontSize:10,color:MUTED,fontWeight:700,letterSpacing:"1.4px",textTransform:"uppercase",marginBottom:2}}>Distribución</p>
            <h2 style={{fontSize:22,color:INK,fontWeight:700,letterSpacing:"-0.6px",marginBottom:12,fontStyle:"italic"}}>A dónde se va</h2>
            <div style={{background:CARD,borderRadius:22,padding:18,border:`1px solid ${HAIR}`,boxShadow:"0 1px 3px rgba(15,47,47,0.05)"}}>
              <div style={{display:"flex",gap:16,alignItems:"center"}}>
                <Donut datos={datosDonut} tamaño={128}/>
                <div style={{flex:1,display:"flex",flexDirection:"column",gap:8}}>
                  {categorias.slice(0,4).map(c=>(
                    <div key={c.nombre} style={{display:"flex",alignItems:"center",gap:8}}>
                      <div style={{width:3,minHeight:18,borderRadius:2,background:c.color,flexShrink:0}}/>
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{display:"flex",justifyContent:"space-between",alignItems:"baseline"}}>
                          <p style={{fontSize:12,color:INK,fontWeight:700,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis",maxWidth:86}}>{c.nombre}</p>
                          <span style={{fontSize:12,fontWeight:700,color:c.color,fontStyle:"italic",flexShrink:0,marginLeft:4}}>{c.pct}%</span>
                        </div>
                        <div style={{height:3,background:HAIR,borderRadius:2,marginTop:3,overflow:"hidden"}}>
                          <div style={{height:"100%",width:`${c.pct}%`,background:c.color,borderRadius:2}}/>
                        </div>
                      </div>
                    </div>
                  ))}
                  {categorias.length>4&&(
                    <div style={{paddingTop:6,borderTop:`1px dashed ${HAIR_DK}`,display:"flex",justifyContent:"space-between"}}>
                      <span style={{fontSize:10,color:MUTED,fontWeight:600}}>+{categorias.length-4} más</span>
                      <span style={{fontSize:10,color:INK,fontWeight:700}}>{fmt(categorias.slice(4).reduce((s,c)=>s+c.monto,0))}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* CUÁNDO GASTAS */}
        {enPeriodo.filter(t=>t.tipo==="gasto").length>0&&(
          <div style={{padding:"22px 20px 0"}}>
            <p style={{fontSize:10,color:MUTED,fontWeight:700,letterSpacing:"1.4px",textTransform:"uppercase",marginBottom:2}}>Patrones</p>
            <h2 style={{fontSize:22,color:INK,fontWeight:700,letterSpacing:"-0.6px",marginBottom:12,fontStyle:"italic"}}>Cuándo gastas</h2>
            <div style={{background:CARD,borderRadius:22,padding:18,border:`1px solid ${HAIR}`,boxShadow:"0 1px 3px rgba(15,47,47,0.05)"}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"baseline",marginBottom:16}}>
                <div>
                  <p style={{fontSize:13,fontWeight:700,color:INK}}>Por día de la semana</p>
                  <p style={{fontSize:11,color:MUTED,marginTop:2}}>Total acumulado del periodo</p>
                </div>
                <span style={{fontSize:11,fontWeight:700,color:ACCENT_DK}}>
                  Más: {DIAS_SEMANA[gastosPorDiaSemana.indexOf(Math.max(...gastosPorDiaSemana))]}
                </span>
              </div>
              <BarrasDiaSemana gastosPorDia={gastosPorDiaSemana}/>
            </div>
          </div>
        )}

        {/* TOP GASTOS */}
        {top5.length>0&&(
          <div style={{padding:"22px 20px 0"}}>
            <p style={{fontSize:10,color:MUTED,fontWeight:700,letterSpacing:"1.4px",textTransform:"uppercase",marginBottom:2}}>Highlights</p>
            <h2 style={{fontSize:22,color:INK,fontWeight:700,letterSpacing:"-0.6px",marginBottom:12,fontStyle:"italic"}}>Top {top5.length} gastos</h2>
            <div style={{background:CARD,borderRadius:22,padding:"4px 18px",border:`1px solid ${HAIR}`,boxShadow:"0 1px 3px rgba(15,47,47,0.05)"}}>
              {top5.map((t,idx)=>{
                const catIdx=categorias.findIndex(c=>c.nombre===t.categoria);
                const color=catIdx>=0?CAT_COLORES[catIdx%CAT_COLORES.length]:CAT_COLORES[0];
                return (
                  <div key={t.id} style={{paddingTop:14,paddingBottom:14,borderBottom:idx<top5.length-1?`1px solid ${HAIR}`:"none",display:"grid",gridTemplateColumns:"26px 38px 1fr auto",gap:12,alignItems:"center"}}>
                    <span style={{fontSize:13,fontWeight:700,color:MUTED,fontStyle:"italic"}}>{String(idx+1).padStart(2,"0")}</span>
                    <div style={{width:38,height:38,borderRadius:11,background:`${color}15`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:18}}>
                      {CAT_ICONOS[t.categoria]??"📦"}
                    </div>
                    <div style={{minWidth:0}}>
                      <p style={{fontSize:13,fontWeight:700,color:INK,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{t.descripcion||t.categoria}</p>
                      <p style={{fontSize:10.5,color:MUTED,fontWeight:500,marginTop:1}}>{t.fecha} · {t.categoria}</p>
                    </div>
                    <span style={{fontSize:15,color:INK,fontWeight:800,letterSpacing:"-0.4px",fontStyle:"italic",flexShrink:0}}>{fmt(Number(t.monto))}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {enPeriodo.length===0&&(
          <div style={{padding:"60px 32px",textAlign:"center"}}>
            <p style={{fontSize:40,marginBottom:12}}>📊</p>
            <p style={{fontSize:17,fontWeight:700,color:INK,marginBottom:6}}>Sin datos todavía</p>
            <p style={{fontSize:14,color:MUTED,lineHeight:1.5}}>Agrega transacciones para ver tus estadísticas</p>
          </div>
        )}

      </div>
    </div>
  );
}
