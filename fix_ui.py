import re

with open("NeonMythosCity_Start.html", "r") as f:
    content = f.read()

# 1. Add Radar Chart component
radar_chart_code = """
const RadarChart = ({ stats, color }) => {
  // A simple 5-axis SVG radar chart
  const size = 60;
  const center = size / 2;
  const radius = size / 2 - 5;

  // JoJo Stand Style Axes: Power, Speed, Range, Durability, Precision/Intelligence
  const axes = ["PWR", "SPD", "RNG", "DUR", "INT"];
  const vals = stats || [Math.random()*10, Math.random()*10, Math.random()*10, Math.random()*10, Math.random()*10];

  const points = vals.map((v, i) => {
    const angle = (Math.PI * 2 * i) / 5 - Math.PI / 2;
    const r = (v / 10) * radius;
    return `${center + Math.cos(angle) * r},${center + Math.sin(angle) * r}`;
  }).join(" ");

  const bgPoints = [0,1,2,3,4].map((i) => {
    const angle = (Math.PI * 2 * i) / 5 - Math.PI / 2;
    return `${center + Math.cos(angle) * radius},${center + Math.sin(angle) * radius}`;
  }).join(" ");

  return (
    <div style={{display: 'flex', flexDirection: 'column', alignItems: 'center'}}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <polygon points={bgPoints} fill="rgba(255,255,255,0.05)" stroke="#333" strokeWidth="0.5" />
        {[1, 2, 3].map(level => (
           <polygon key={level} points={[0,1,2,3,4].map(i => {
             const angle = (Math.PI * 2 * i) / 5 - Math.PI / 2;
             const r = (level / 3) * radius;
             return `${center + Math.cos(angle) * r},${center + Math.sin(angle) * r}`;
           }).join(" ")} fill="none" stroke="#222" strokeWidth="0.5" />
        ))}
        {axes.map((ax, i) => {
             const angle = (Math.PI * 2 * i) / 5 - Math.PI / 2;
             return <line key={`l${i}`} x1={center} y1={center} x2={center + Math.cos(angle)*radius} y2={center + Math.sin(angle)*radius} stroke="#333" strokeWidth="0.5" />
        })}
        <polygon points={points} fill={`${color}55`} stroke={color} strokeWidth="1" />
      </svg>
      <div style={{display:'flex', gap:'2px', fontSize:'5px', color:'#777', marginTop:'2px', fontFamily:"'Courier New', monospace"}}>
         {axes.map(ax=><span key={ax}>{ax}</span>)}
      </div>
    </div>
  );
};
"""

# Insert Radar Chart before InfoPanel
content = content.replace("const MarketBoard = ({ tick, paused }) => {", radar_chart_code + "\nconst MarketBoard = ({ tick, paused }) => {")

# 2. Modify InfoPanel to include Radar Chart and Evolution Image
# First, let's find the InfoPanel code
info_panel_search = """const InfoPanel=()=>(<div className="data-font" style={{background:"#0a0c1a",border:"1px solid #1a1a3e",borderRadius:"6px",padding:"10px",flex:isMobile?1:0,display:"flex",flexDirection:"column"}}>
    <h3 style={{fontSize:"10px",color:"#00E5FF",margin:"0 0 10px 0",textShadow:"0 0 5px #00e5ff55"}}>⬢ NEON CITY C-OS v1.0</h3>
    {selA?(
      <div style={{display:"flex",gap:"10px"}}>
        <div style={{width:"32px",height:"32px",background:"#111",border:`1px solid ${selA.c}`,borderRadius:"4px",display:"flex",justifyContent:"center",alignItems:"center",fontSize:"16px"}}>{selA.e}</div>
        <div style={{flex:1}}>
          <div style={{fontSize:"10px",fontWeight:"bold",color:selA.c}}>{selA.n} <span style={{fontSize:"7px",color:"#666"}}>Lv.{selA.lv}</span></div>
          <div style={{fontSize:"8px",color:"#aaa",marginBottom:"4px",fontStyle:"italic"}}>{selA.id}</div>
          <div style={{fontSize:"9px",display:"grid",gridTemplateColumns:"1fr 1fr",gap:"2px",color:"#ddd"}}>
            <div>💰 ${(selA.m||0).toFixed(2)}</div>
            <div>💼 {selA.role}</div>
            <div>⭐ EXP: {Math.floor(selA.xp||0)}</div>
          </div>
        </div>
      </div>
    ):<div style={{fontSize:"9px",color:"#555",fontStyle:"italic"}}>NO TARGET SELECTED. Click a map entity.</div>}"""

info_panel_replace = """const InfoPanel=()=>(<div className="data-font" style={{background:"#0a0c1a",border:"1px solid #1a1a3e",borderRadius:"6px",padding:"10px",flex:isMobile?1:0,display:"flex",flexDirection:"column"}}>
    <h3 style={{fontSize:"10px",color:"#00E5FF",margin:"0 0 10px 0",textShadow:"0 0 5px #00e5ff55"}}>⬢ NEON CITY C-OS v1.0</h3>
    {selA?(
      <div style={{display:"flex",flexDirection:"column",gap:"8px"}}>
        <div style={{display:"flex",gap:"10px"}}>
          <div style={{width:"32px",height:"32px",background:"#111",border:`1px solid ${selA.c}`,borderRadius:"4px",display:"flex",justifyContent:"center",alignItems:"center",fontSize:"16px"}}>{selA.e}</div>
          <div style={{flex:1}}>
            <div style={{fontSize:"10px",fontWeight:"bold",color:selA.c}}>{selA.n} <span style={{fontSize:"7px",color:"#666"}}>Lv.{selA.lv}</span></div>
            <div style={{fontSize:"8px",color:"#aaa",marginBottom:"2px",fontStyle:"italic"}}>{selA.id}</div>
            <div style={{fontSize:"9px",display:"grid",gridTemplateColumns:"1fr 1fr",gap:"2px",color:"#ddd"}}>
              <div>💰 ${(selA.m||0).toFixed(2)}</div>
              <div>💼 {selA.role}</div>
              <div>⭐ EXP: {Math.floor(selA.xp||0)}</div>
            </div>
          </div>
        </div>

        {/* JoJo Radar Chart & Evolution Box */}
        <div style={{display:"flex", gap:"10px", padding:"6px", background:"rgba(0,0,0,0.3)", borderRadius:"4px", border:"1px solid #1a1a3e", alignItems:"center"}}>
           <RadarChart stats={selA.stats || [8,4,7,3,9]} color={selA.c} />
           <div style={{flex:1, display:"flex", flexDirection:"column", alignItems:"center"}}>
             <div style={{fontSize:"6px", color:"#888", letterSpacing:"1px", marginBottom:"2px"}}>EVOLUTION PHASE</div>
             <div style={{display:"flex", alignItems:"center", gap:"4px"}}>
                <span style={{fontSize:"16px", filter:"grayscale(100%) blur(1px)", opacity:0.5}}>{selA.e}</span>
                <span style={{color:"#444", fontSize:"10px"}}>→</span>
                <span style={{fontSize:"20px", filter:"drop-shadow(0 0 4px "+selA.c+"88)"}}>{selA.e}</span>
             </div>
             <div style={{fontSize:"5px", color:selA.c, marginTop:"2px"}}>{selA.lv < 5 ? "LOW POLY" : "REALISTIC AWS"}</div>
           </div>
        </div>
      </div>
    ):<div style={{fontSize:"9px",color:"#555",fontStyle:"italic"}}>NO TARGET SELECTED. Click a map entity.</div>}"""

content = content.replace(info_panel_search, info_panel_replace)


# 3. Fix FeedPanel
feed_panel_search = """const FeedPanel=()=>(<div className="data-font" style={{background:"#0c0f1f",border:"1px solid #1a1a3e",borderRadius:"5px",padding:"5px",flex:1,minHeight:"80px",maxHeight:isMobile?"none":"160px",overflow:"auto",display:"flex",flexDirection:"column"}}>
    <div style={{fontSize:"8px",color:"#444",letterSpacing:"1.5px",marginBottom:"3px"}}>📜 LIVE FEED</div>
    <div style={{flex:1,overflow:"auto",display:"flex",flexDirection:"column",gap:"1px",WebkitOverflowScrolling:"touch"}}>
      {logs.slice(0,40).map((l,i)=>(<div key={i} style={{fontSize:"8px",lineHeight:"1.4",opacity:Math.max(.2,1-i*.04),padding:"2px 0",borderBottom:"1px solid #0d0d2022"}}>
        <span style={{color:l.col,fontWeight:"bold"}}>{l.ch}</span><span style={{color:"#333"}}> · </span><span style={{color:"#aaa"}}>{l.msg}</span>
      </div>))}
    </div>
  </div>);"""

feed_panel_replace = """const FeedPanel=()=>(<div className="data-font" style={{background:"#0c0f1f",border:"1px solid #1a1a3e",borderRadius:"5px",padding:"5px",flex:1,minHeight:"80px",maxHeight:isMobile?"none":"250px",overflow:"hidden",display:"flex",flexDirection:"column"}}>
    <div style={{fontSize:"8px",color:"#444",letterSpacing:"1.5px",marginBottom:"3px"}}>📜 LIVE FEED (LATEST 15)</div>
    <div style={{flex:1,overflowY:"auto",overflowX:"hidden",display:"flex",flexDirection:"column",gap:"1px",WebkitOverflowScrolling:"touch"}}>
      {logs.slice(0,15).map((l,i)=>(<div key={i} style={{fontSize:"8px",lineHeight:"1.4",opacity:Math.max(.2,1-i*.06),padding:"2px 0",borderBottom:"1px solid #0d0d2022"}}>
        <span style={{color:l.col,fontWeight:"bold"}}>{l.ch}</span><span style={{color:"#333"}}> · </span><span style={{color:"#aaa"}}>{l.msg}</span>
      </div>))}
    </div>
  </div>);"""

content = content.replace(feed_panel_search, feed_panel_replace)

with open("NeonMythosCity_Start.html", "w") as f:
    f.write(content)
