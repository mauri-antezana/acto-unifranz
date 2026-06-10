import { useState } from "react";
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, ReferenceLine,
  ResponsiveContainer, Cell, PieChart, Pie, Legend
} from "recharts";

// ── DATA ─────────────────────────────────────────────────────────────────────
const ALL_LAPS = {
  1:31.06,2:35.38,3:36.08,4:37.13,5:35.53,6:33.91,
  7:10.35,8:34.34,9:10.01,10:38.51,11:34.74,12:34.36,
  13:9.33,14:34.00,15:35.74,16:38.11,17:27.03,18:9.16,
  19:10.48,20:40.75,21:35.88,22:38.83,23:33.21,24:32.83,
  25:44.17,26:34.71,27:37.00,28:32.25,29:33.23,30:29.23,
  31:35.83,32:33.40,33:39.98,34:34.93,35:37.70,36:9.28,
  37:36.40,38:30.83,39:43.60,40:39.97
};

const TOTAL = 108;
const PRESENT_LAPS = Object.entries(ALL_LAPS).filter(([,v])=>v>=15).map(([k,v])=>[+k,v]);
const ABSENT_LAPS  = Object.entries(ALL_LAPS).filter(([,v])=>v<15).map(([k,v])=>[+k,v]);
const TIMES = PRESENT_LAPS.map(([,v])=>v);

const MEAN   = 35.607;
const MEDIAN = 35.455;
const STDEV  = 3.652;
const P25    = 33.527;
const P75    = 37.558;
const IQR    = 4.03;
const LF     = 27.482;
const UF     = 43.603;
const CV     = 10.26;
const ELAPSED_SEC = 1269.26;  // real stopwatch for 40 students
const PACE   = 31.732;        // avg sec per turn including absences

// 108 projections
const EST_PRESENT = 92;  // 85% of 108
const EST_ABSENT  = 16;
const EST_UNOBS   = 68;
const PROJ_OPT_MIN  = 54.86;
const PROJ_BASE_MIN = 57.12;
const PROJ_PES_MIN  = 63.26;

const fmtTime = (sec) => {
  const m = Math.floor(sec/60);
  const s = (sec%60).toFixed(2).padStart(5,"0");
  return `${m}:${s}`;
};

const CHART_DATA = PRESENT_LAPS.map(([lap,time])=>({
  lap, time,
  isLow:  time < LF,
  isHigh: time > UF,
  diff:   +(time - MEAN).toFixed(2)
}));

// 5-point moving average
const MA = CHART_DATA.map((_,i,arr)=>{
  if(i<4) return null;
  return +(arr.slice(i-4,i+1).reduce((a,b)=>a+b.time,0)/5).toFixed(3);
});
const CHART_WITH_MA = CHART_DATA.map((d,i)=>({...d, ma: MA[i]}));

const DIST = [
  {range:"25–30s", count:2,  pct:5.9,  color:"#34d399"},
  {range:"30–35s", count:14, pct:41.2, color:"#60a5fa"},
  {range:"35–40s", count:15, pct:44.1, color:"#818cf8"},
  {range:"40–45s", count:3,  pct:8.8,  color:"#f87171"},
];

const PIE_DATA = [
  {name:"Presentes (obs.)", value:34,  fill:"#60a5fa"},
  {name:"Ausentes (obs.)",  value:6,   fill:"#f87171"},
  {name:"Sin observar",     value:68,  fill:"#334155"},
];

// ── COMPONENTS ────────────────────────────────────────────────────────────────
const C = {
  bg:      "#07101f",
  surface: "rgba(255,255,255,0.04)",
  border:  "rgba(255,255,255,0.08)",
  muted:   "#475569",
  sub:     "#64748b",
  text:    "#e2e8f0",
  bright:  "#f8fafc",
  blue:    "#60a5fa",
  green:   "#34d399",
  red:     "#f87171",
  amber:   "#fbbf24",
  purple:  "#a78bfa",
};

const Card = ({children, style={}}) => (
  <div style={{background:C.surface, border:`1px solid ${C.border}`, borderRadius:14, padding:"16px 18px", ...style}}>
    {children}
  </div>
);

const Label = ({children}) => (
  <div style={{fontSize:10, color:C.sub, letterSpacing:"0.09em", textTransform:"uppercase", marginBottom:8}}>
    {children}
  </div>
);

const BigNum = ({value, unit="", color=C.bright, size=28}) => (
  <span style={{fontSize:size, fontWeight:800, color, letterSpacing:"-0.03em", fontVariantNumeric:"tabular-nums"}}>
    {value}<span style={{fontSize:size*0.5, fontWeight:500, color:C.sub, marginLeft:3}}>{unit}</span>
  </span>
);

const Badge = ({children, color}) => (
  <span style={{
    background:`${color}1a`, border:`1px solid ${color}40`,
    borderRadius:20, padding:"2px 9px", fontSize:11, color,
  }}>{children}</span>
);

const CustomDot = ({cx,cy,payload}) => {
  const color = payload.isLow ? C.green : payload.isHigh ? C.red : C.blue;
  const r = (payload.isLow||payload.isHigh) ? 5 : 3;
  return <circle cx={cx} cy={cy} r={r} fill={color} stroke={C.bg} strokeWidth={1.5}/>;
};

const TooltipStyle = {
  contentStyle:{background:"#1e293b",border:`1px solid ${C.border}`,borderRadius:8,fontSize:12},
  labelStyle:{color:C.sub},
};

// ── MAIN ──────────────────────────────────────────────────────────────────────
export default function App() {
  const [tab, setTab] = useState("resumen");
  const tabs = [
    {id:"resumen",   label:"Resumen"},
    {id:"proyeccion",label:"Proyección"},
    {id:"tendencia", label:"Tendencia"},
    {id:"detalle",   label:"Detalle"},
  ];

  return (
    <div style={{minHeight:"100vh", background:C.bg, color:C.text,
      fontFamily:"'Inter','SF Pro Display',system-ui,sans-serif", padding:"22px 18px"}}>

      {/* ── HEADER ── */}
      <div style={{marginBottom:22}}>
        <div style={{display:"flex", alignItems:"center", gap:10, marginBottom:8}}>
          <div style={{width:40,height:40,borderRadius:12,
            background:"linear-gradient(135deg,#3b82f6 0%,#8b5cf6 100%)",
            display:"flex",alignItems:"center",justifyContent:"center",fontSize:20}}>🎓</div>
          <div>
            <div style={{fontSize:10,color:C.sub,letterSpacing:"0.1em",textTransform:"uppercase"}}>
              Análisis de Tiempos · Acto Escolar
            </div>
            <h1 style={{margin:0,fontSize:21,fontWeight:800,letterSpacing:"-0.03em"}}>
              108 Alumnos
            </h1>
          </div>
        </div>
        <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
          <Badge color={C.blue}>40 observados</Badge>
          <Badge color={C.green}>34 presentes</Badge>
          <Badge color={C.red}>6 ausentes</Badge>
          <Badge color={C.muted}>68 pendientes</Badge>
        </div>
      </div>

      {/* ── TABS ── */}
      <div style={{display:"flex",gap:3,marginBottom:18,
        background:"rgba(255,255,255,0.04)",borderRadius:10,padding:3}}>
        {tabs.map(t=>(
          <button key={t.id} onClick={()=>setTab(t.id)} style={{
            flex:1,padding:"8px 2px",borderRadius:7,border:"none",cursor:"pointer",
            fontSize:12,fontWeight:600,transition:"all 0.15s",
            background:tab===t.id?"rgba(99,102,241,0.25)":"transparent",
            color:tab===t.id?"#a5b4fc":C.sub,outline:"none",
          }}>{t.label}</button>
        ))}
      </div>

      {/* ══════════ RESUMEN ══════════ */}
      {tab==="resumen" && (
        <div style={{display:"flex",flexDirection:"column",gap:12}}>

          {/* KPI grid */}
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
            {[
              {label:"Tiempo medio / alumno", val:MEAN+"s", sub:"por entrada+salida", color:C.blue},
              {label:"Mediana",               val:MEDIAN+"s", sub:"valor central"},
              {label:"Desv. estándar",        val:STDEV+"s", sub:`CV: ${CV}% → alta consistencia`},
              {label:"Rango observado",       val:`${LF.toFixed(1)}–${UF.toFixed(1)}s`, sub:"rango normal (IQR×1.5)"},
            ].map(({label,val,sub,color})=>(
              <Card key={label}>
                <Label>{label}</Label>
                <BigNum value={val} color={color||C.bright} size={22}/>
                <div style={{fontSize:11,color:C.sub,marginTop:3}}>{sub}</div>
              </Card>
            ))}
          </div>

          {/* Asistencia */}
          <Card>
            <Label>Asistencia observada (40 de 108)</Label>
            <div style={{display:"flex",alignItems:"center",gap:12}}>
              <div style={{flex:1}}>
                {[
                  {label:"Presentes",  n:34, pct:85, color:C.green},
                  {label:"Ausentes",   n:6,  pct:15, color:C.red},
                ].map(({label,n,pct,color})=>(
                  <div key={label} style={{marginBottom:8}}>
                    <div style={{display:"flex",justifyContent:"space-between",fontSize:12,marginBottom:3}}>
                      <span style={{color:C.sub}}>{label}</span>
                      <span style={{color,fontWeight:700}}>{n} <span style={{color:C.muted}}>({pct}%)</span></span>
                    </div>
                    <div style={{background:"rgba(255,255,255,0.05)",borderRadius:4,height:7}}>
                      <div style={{width:`${pct}%`,height:"100%",background:color,borderRadius:4,opacity:0.85}}/>
                    </div>
                  </div>
                ))}
                <div style={{fontSize:11,color:C.muted,marginTop:6}}>
                  68 alumnos aún sin pasar por el acto
                </div>
              </div>
              <div style={{width:110,height:110,flexShrink:0}}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={PIE_DATA} cx="50%" cy="50%" innerRadius={30} outerRadius={50}
                      dataKey="value" paddingAngle={2}>
                      {PIE_DATA.map((e,i)=><Cell key={i} fill={e.fill}/>)}
                    </Pie>
                    <Tooltip {...TooltipStyle} formatter={(v)=>[`${v} alumnos`,""]}/>
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </Card>

          {/* Box-plot visual */}
          <Card>
            <Label>Distribución de tiempos (box plot visual)</Label>
            <div style={{position:"relative",height:44,marginBottom:14}}>
              <div style={{position:"absolute",top:18,left:0,right:0,height:8,
                background:"rgba(255,255,255,0.05)",borderRadius:4}}/>
              {(()=>{
                const lo=25,hi=45,range=hi-lo;
                const px=(v)=>((v-lo)/range*100).toFixed(1)+"%";
                const p25p=px(P25), p75p=px(P75);
                const w=(((P75-P25)/(range))*100).toFixed(1)+"%";
                return(<>
                  <div style={{position:"absolute",top:16,left:p25p,width:w,
                    height:12,background:"rgba(99,102,241,0.35)",borderRadius:3}}/>
                  <div style={{position:"absolute",top:12,left:px(MEDIAN),
                    transform:"translateX(-50%)",width:3,height:20,
                    background:C.blue,borderRadius:2}}/>
                  <div style={{position:"absolute",top:12,left:px(MEAN),
                    transform:"translateX(-50%)",width:3,height:20,
                    background:C.amber,borderRadius:2}}/>
                  <div style={{position:"absolute",top:12,left:px(TIMES.reduce((a,b)=>a<b?a:b,99)),
                    transform:"translateX(-50%)",width:2,height:20,
                    background:C.green,borderRadius:2}}/>
                  <div style={{position:"absolute",top:12,left:px(TIMES.reduce((a,b)=>a>b?a:b,0)),
                    transform:"translateX(-50%)",width:2,height:20,
                    background:C.red,borderRadius:2}}/>
                </>);
              })()}
            </div>
            <div style={{display:"flex",justifyContent:"space-between",fontSize:11}}>
              {[
                {l:"Mín",v:"27.03s",c:C.green},
                {l:"P25",v:"33.53s",c:C.sub},
                {l:"Mediana",v:"35.46s",c:C.blue},
                {l:"Media",v:"35.61s",c:C.amber},
                {l:"P75",v:"37.56s",c:C.sub},
                {l:"Máx",v:"44.17s",c:C.red},
              ].map(({l,v,c})=>(
                <div key={l} style={{textAlign:"center"}}>
                  <div style={{color:c,fontWeight:700,fontSize:12}}>{v}</div>
                  <div style={{color:C.muted,fontSize:10}}>{l}</div>
                </div>
              ))}
            </div>
          </Card>

          {/* Outliers */}
          <Card>
            <Label>Valores atípicos detectados</Label>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
              <div style={{background:"rgba(52,211,153,0.07)",border:"1px solid rgba(52,211,153,0.2)",
                borderRadius:10,padding:"12px 14px"}}>
                <div style={{fontSize:10,color:C.green,letterSpacing:"0.08em",marginBottom:4}}>▼ MÁS RÁPIDO</div>
                <BigNum value="27.03s" color={C.green} size={22}/>
                <div style={{fontSize:12,color:C.sub,marginTop:2}}>Alumno #17</div>
                <div style={{fontSize:11,color:C.muted}}>−8.58s vs media</div>
              </div>
              <div style={{background:"rgba(248,113,113,0.07)",border:"1px solid rgba(248,113,113,0.2)",
                borderRadius:10,padding:"12px 14px"}}>
                <div style={{fontSize:10,color:C.red,letterSpacing:"0.08em",marginBottom:4}}>▲ MÁS LENTO</div>
                <BigNum value="44.17s" color={C.red} size={22}/>
                <div style={{fontSize:12,color:C.sub,marginTop:2}}>Alumno #25</div>
                <div style={{fontSize:11,color:C.muted}}>+8.56s vs media</div>
              </div>
            </div>
          </Card>

          {/* Absent detail */}
          <Card style={{borderStyle:"dashed",borderColor:"rgba(255,255,255,0.06)"}}>
            <Label>Alumnos ausentes durante la observación</Label>
            <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
              {ABSENT_LAPS.map(([lap,t])=>(
                <span key={lap} style={{
                  background:"rgba(248,113,113,0.08)",border:"1px solid rgba(248,113,113,0.2)",
                  borderRadius:6,padding:"4px 10px",fontSize:12,color:C.sub}}>
                  #{lap} <strong style={{color:C.red}}>{t}s</strong>
                </span>
              ))}
            </div>
            <div style={{fontSize:11,color:C.muted,marginTop:8}}>
              Tiempos &lt;15 s = alumno no se presentó al momento del registro
            </div>
          </Card>
        </div>
      )}

      {/* ══════════ PROYECCIÓN ══════════ */}
      {tab==="proyeccion" && (
        <div style={{display:"flex",flexDirection:"column",gap:12}}>

          {/* Hero projection */}
          <Card style={{background:"rgba(99,102,241,0.08)",borderColor:"rgba(99,102,241,0.25)"}}>
            <Label>Duración estimada del acto completo · 108 alumnos</Label>
            <div style={{textAlign:"center",padding:"10px 0 6px"}}>
              <BigNum value={`~${PROJ_BASE_MIN} min`} color={C.purple} size={36}/>
              <div style={{fontSize:12,color:C.sub,marginTop:4}}>
                Escenario base · ritmo observado promedio ({PACE}s/turno)
              </div>
            </div>
          </Card>

          {/* 3 scenarios */}
          <div style={{display:"flex",flexDirection:"column",gap:8}}>
            <Label>Escenarios de duración</Label>
            {[
              {label:"Optimista",  min:PROJ_OPT_MIN,  desc:`Media − ½σ por alumno presente`,  color:C.green,  icon:"🚀"},
              {label:"Base",       min:PROJ_BASE_MIN,  desc:"Ritmo actual exacto (pace real)", color:C.blue,   icon:"📊"},
              {label:"Pesimista",  min:PROJ_PES_MIN,   desc:`Media + 1σ por alumno presente`, color:C.red,    icon:"🐢"},
            ].map(({label,min,desc,color,icon})=>{
              const barPct = ((min - 50)/(70-50)*100);
              const h = Math.floor(min/60);
              const m = (min%60).toFixed(0);
              const timeStr = h>0 ? `${h}h ${m}min` : `${min} min`;
              return(
                <div key={label} style={{background:C.surface,border:`1px solid ${C.border}`,
                  borderRadius:12,padding:"14px 16px"}}>
                  <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:6}}>
                    <div style={{display:"flex",alignItems:"center",gap:7}}>
                      <span style={{fontSize:16}}>{icon}</span>
                      <div>
                        <div style={{fontSize:13,fontWeight:700,color:C.text}}>{label}</div>
                        <div style={{fontSize:11,color:C.muted}}>{desc}</div>
                      </div>
                    </div>
                    <div style={{fontSize:22,fontWeight:800,color,letterSpacing:"-0.02em",
                      fontVariantNumeric:"tabular-nums"}}>{timeStr}</div>
                  </div>
                  <div style={{background:"rgba(255,255,255,0.05)",borderRadius:4,height:5}}>
                    <div style={{width:`${Math.min(100,barPct)}%`,height:"100%",
                      background:color,borderRadius:4,opacity:0.7}}/>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Attendance projection */}
          <Card>
            <Label>Proyección de asistencia · 108 alumnos</Label>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:10}}>
              {[
                {label:"Presentes estimados",color:C.green, val:EST_PRESENT, sub:`(85% × 108)`},
                {label:"Ausentes estimados", color:C.red,   val:EST_ABSENT,  sub:`(15% × 108)`},
              ].map(({label,color,val,sub})=>(
                <div key={label} style={{background:"rgba(255,255,255,0.03)",borderRadius:10,padding:"12px 14px"}}>
                  <div style={{fontSize:10,color:C.sub,marginBottom:4}}>{label}</div>
                  <BigNum value={val} color={color} size={30}/>
                  <div style={{fontSize:11,color:C.muted,marginTop:2}}>{sub}</div>
                </div>
              ))}
            </div>
            <div style={{fontSize:12,color:C.sub,lineHeight:1.6,
              borderTop:`1px solid ${C.border}`,paddingTop:10}}>
              Basado en la tasa observada: <strong style={{color:C.text}}>34/40 = 85% presentes</strong>.<br/>
              Con 92 presentes × 35.6s = <strong style={{color:C.blue}}>~54.5 min</strong> solo tiempo de paso.<br/>
              Incluyendo el tiempo de los turnos vacíos: <strong style={{color:C.blue}}>~57 min totales</strong>.
            </div>
          </Card>

          {/* Time breakdown */}
          <Card>
            <Label>Desglose de tiempo proyectado</Label>
            {[
              {label:"Tiempo activo (92 presentes × 35.6s)", sec:92*35.607, color:C.blue},
              {label:"Tiempo vacío (16 ausentes × 10.3s)",   sec:16*10.28,  color:C.red},
              {label:"Total proyectado",                      sec:92*35.607+16*10.28, color:C.purple, bold:true},
            ].map(({label,sec,color,bold})=>(
              <div key={label} style={{display:"flex",justifyContent:"space-between",
                alignItems:"center",padding:"7px 0",
                borderBottom:`1px solid rgba(255,255,255,0.04)`}}>
                <span style={{fontSize:12,color:bold?C.text:C.sub,fontWeight:bold?700:400}}>{label}</span>
                <span style={{fontSize:14,fontWeight:700,color,fontVariantNumeric:"tabular-nums"}}>
                  {fmtTime(sec)}
                </span>
              </div>
            ))}
          </Card>

          <div style={{fontSize:11,color:C.muted,textAlign:"center",lineHeight:1.7}}>
            * La proyección asume que el ritmo de los 40 alumnos observados<br/>
            es representativo de los 108 totales.
          </div>
        </div>
      )}

      {/* ══════════ TENDENCIA ══════════ */}
      {tab==="tendencia" && (
        <div style={{display:"flex",flexDirection:"column",gap:12}}>
          <Card style={{padding:"14px 12px 10px"}}>
            <Label>Tiempo por alumno (orden de paso)</Label>
            <div style={{display:"flex",gap:12,marginBottom:10,fontSize:11,color:C.muted,flexWrap:"wrap"}}>
              <span><span style={{color:C.blue}}>●</span> Normal</span>
              <span><span style={{color:C.green}}>●</span> Atípico bajo</span>
              <span><span style={{color:C.red}}>●</span> Atípico alto</span>
              <span><span style={{color:C.amber}}>—</span> Media móvil (5)</span>
            </div>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={CHART_WITH_MA} margin={{top:6,right:6,bottom:0,left:-22}}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)"/>
                <XAxis dataKey="lap" tick={{fill:C.muted,fontSize:10}}
                  label={{value:"Alumno #",position:"insideBottomRight",fill:C.muted,fontSize:10}}/>
                <YAxis domain={[24,47]} tick={{fill:C.muted,fontSize:10}} tickFormatter={v=>`${v}s`}/>
                <Tooltip {...TooltipStyle}
                  formatter={(v,n)=>[`${v}s`, n==="time"?"Tiempo":"Media Móvil"]}
                  labelFormatter={v=>`Alumno #${v}`}/>
                <ReferenceLine y={MEAN} stroke={C.amber} strokeDasharray="4 4" strokeOpacity={0.7}/>
                <ReferenceLine y={UF}   stroke={C.red}   strokeDasharray="3 3" strokeOpacity={0.4}/>
                <ReferenceLine y={LF}   stroke={C.green} strokeDasharray="3 3" strokeOpacity={0.4}/>
                <Line type="monotone" dataKey="time" stroke="transparent"
                  dot={<CustomDot/>} strokeWidth={1}/>
                <Line type="monotone" dataKey="ma" stroke={C.amber} strokeWidth={2}
                  dot={false} connectNulls={false} strokeOpacity={0.9}/>
              </LineChart>
            </ResponsiveContainer>
          </Card>

          {/* Distribution bars */}
          <Card style={{padding:"14px 12px 10px"}}>
            <Label>Distribución de frecuencias</Label>
            <ResponsiveContainer width="100%" height={150}>
              <BarChart data={DIST} margin={{top:4,right:4,bottom:4,left:-22}}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false}/>
                <XAxis dataKey="range" tick={{fill:C.muted,fontSize:11}}/>
                <YAxis tick={{fill:C.muted,fontSize:11}}/>
                <Tooltip {...TooltipStyle} formatter={v=>[`${v} alumnos`,"Frecuencia"]}/>
                <Bar dataKey="count" radius={[6,6,0,0]}>
                  {DIST.map((e,i)=><Cell key={i} fill={e.color}/>)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </Card>

          {/* Insights */}
          <Card>
            <Label>Observaciones clave</Label>
            {[
              {icon:"⚡",t:"Alta consistencia",d:`CV del ${CV}% — el ritmo del acto es muy regular. Casi todos los alumnos tardan entre 30 y 40 segundos.`},
              {icon:"📈",t:"Ligera fatiga al final",d:"La media móvil sube ~2s en los últimos 10 alumnos observados (laps 31–40), posible cansancio acumulado de organizadores o alumnos."},
              {icon:"🎯",t:"85.3% en franja 30–40s",d:"Solo 5 alumnos (14.7%) salen de esa franja: 2 rápidos (25–30s) y 3 lentos (40–45s)."},
              {icon:"👤",t:"Alumnos sin registrar",d:"68 alumnos aún no pasaron. Si mantienen el ritmo actual, el acto completo toma ~57 minutos."},
            ].map(({icon,t,d})=>(
              <div key={t} style={{display:"flex",gap:10,marginBottom:10}}>
                <span style={{fontSize:16,flexShrink:0}}>{icon}</span>
                <div>
                  <div style={{fontSize:13,fontWeight:600,color:C.text,marginBottom:2}}>{t}</div>
                  <div style={{fontSize:12,color:C.sub,lineHeight:1.55}}>{d}</div>
                </div>
              </div>
            ))}
          </Card>
        </div>
      )}

      {/* ══════════ DETALLE ══════════ */}
      {tab==="detalle" && (
        <div style={{display:"flex",flexDirection:"column",gap:12}}>
          <Card style={{padding:0,overflow:"hidden"}}>
            <div style={{padding:"11px 16px",borderBottom:`1px solid ${C.border}`,
              display:"grid",gridTemplateColumns:"44px 40px 1fr 68px 76px",gap:6,
              fontSize:10,color:C.sub,letterSpacing:"0.08em",textTransform:"uppercase"}}>
              <span>#</span><span>Est.</span><span>Barra</span><span>Tiempo</span><span>vs Media</span>
            </div>
            <div style={{maxHeight:430,overflowY:"auto"}}>
              {PRESENT_LAPS.map(([lap,time])=>{
                const diff = +(time-MEAN).toFixed(2);
                const isLow = time<LF, isHigh = time>UF;
                const pct = Math.min(100,((time-24)/(46-24))*100);
                const barC = isLow ? C.green : isHigh ? C.red : diff<0 ? C.blue : "#94a3b8";
                const rowBg = isLow?"rgba(52,211,153,0.05)":isHigh?"rgba(248,113,113,0.05)":"transparent";
                return(
                  <div key={lap} style={{
                    padding:"8px 16px",borderBottom:`1px solid rgba(255,255,255,0.04)`,
                    display:"grid",gridTemplateColumns:"44px 40px 1fr 68px 76px",gap:6,
                    alignItems:"center",background:rowBg}}>
                    <span style={{fontSize:11,fontWeight:600,
                      color:isLow?C.green:isHigh?C.red:"#94a3b8"}}>
                      {(isLow||isHigh)?"★":""} {lap}
                    </span>
                    <span style={{fontSize:11,color:C.muted}}>#{lap}</span>
                    <div style={{background:"rgba(255,255,255,0.05)",borderRadius:3,height:5}}>
                      <div style={{width:`${pct}%`,height:"100%",background:barC,
                        borderRadius:3,opacity:0.75}}/>
                    </div>
                    <span style={{fontSize:13,fontWeight:700,color:C.text,
                      fontVariantNumeric:"tabular-nums"}}>{time}s</span>
                    <span style={{fontSize:12,fontVariantNumeric:"tabular-nums",
                      color:diff<0?C.blue:"#f87171"}}>
                      {diff>0?"+":""}{diff}s
                    </span>
                  </div>
                );
              })}
            </div>
          </Card>

          {/* Summary row */}
          <Card>
            <Label>Resumen del lote observado</Label>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8}}>
              {[
                {l:"Tiempo total medido",v:fmtTime(TIMES.reduce((a,b)=>a+b,0)),c:C.blue},
                {l:"Tiempo cronómetro",  v:fmtTime(ELAPSED_SEC),c:C.purple},
                {l:"Pace real/turno",    v:PACE+"s",c:C.amber},
              ].map(({l,v,c})=>(
                <div key={l} style={{background:"rgba(255,255,255,0.03)",borderRadius:8,padding:"10px 12px"}}>
                  <div style={{fontSize:10,color:C.muted,marginBottom:4}}>{l}</div>
                  <div style={{fontSize:16,fontWeight:700,color:c,fontVariantNumeric:"tabular-nums"}}>{v}</div>
                </div>
              ))}
            </div>
          </Card>

          <div style={{fontSize:11,color:C.muted,textAlign:"center"}}>
            ★ = valor atípico · azul = bajo la media · rojo = sobre la media
          </div>
        </div>
      )}

    </div>
  );
}
