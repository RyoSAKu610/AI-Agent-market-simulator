import re

with open("NeonMythosCity_Start.html", "r") as f:
    content = f.read()

# 1. Remove the MarketBoard component defined inside NeonMythosCity
old_marketboard = r"""  // ===== MARKET BOARD =====
  const MarketBoard = \(\) => \{.*?Awaiting transactions\.\.\.<\/div>\s*<\/div>\s*<\/div>\s*\};"""
content = re.sub(old_marketboard, "", content, flags=re.DOTALL)

# 2. Add the MarketBoard component outside NeonMythosCity
new_marketboard = """
const MarketBoard = ({ tick, paused }) => {
  // Generate a scrolling list of fake economy transactions based on the tick
  const [txs, setTxs] = useState([]);
  const scrollRef = useRef(null);

  useEffect(() => {
    if (paused) return;
    if (tick % 5 === 0 && Math.random() < 0.95) {
      const assets = ["SOL", "USDC", "NEON", "DATA", "JUP"];
      const types = ["BUY", "SELL", "SWAP", "FEE"];
      const amt = (Math.random() * 50).toFixed(2);
      const a = assets[Math.floor(Math.random()*assets.length)];
      const t = types[Math.floor(Math.random()*types.length)];
      const hash = "0x" + Math.random().toString(16).substr(2,6);
      setTxs(p => [...p, {id: tick, t, amt, a, hash, time: new Date().toISOString().substring(11,19)}].slice(-100));
    }
  }, [tick, paused]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [txs]);

  return (
    <div className="data-font" style={{background:"#080a14",border:"1px solid #1a1a3e",borderRadius:"5px",padding:"8px",display:"flex",flexDirection:"column",height:"100%"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"6px",borderBottom:"1px solid #ffffff11",paddingBottom:"4px"}}>
         <span style={{fontSize:"10px",color:"#FFD700",fontWeight:"800",letterSpacing:"1px"}}>📈 LIVE MARKET LEDGER</span>
         <span style={{fontSize:"8px",color:"#00FF88",animation:"blink 1.5s infinite"}}>● SYNCED</span>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"50px 30px 45px 1fr",color:"#666",marginBottom:"4px",borderBottom:"1px dotted #333",paddingBottom:"2px",fontSize:"9px",fontFamily:"'Courier New', monospace"}}>
         <span>TIME</span><span>TYPE</span><span>AMOUNT</span><span style={{textAlign:"right"}}>TX HASH</span>
      </div>
      <div ref={scrollRef} style={{flex:1,overflow:"auto",display:"flex",flexDirection:"column",gap:"2px",fontSize:"9px",fontFamily:"'Courier New', monospace"}}>
         {txs.map((tx, i) => (
           <div key={tx.id} style={{display:"grid",gridTemplateColumns:"50px 30px 45px 1fr",color:"#ccc",padding:"2px 0",alignItems:"center"}}>
             <span style={{color:"#555"}}>{tx.time}</span>
             <span style={{color:tx.t==="BUY"?"#0F8":tx.t==="SELL"?"#F44":tx.t==="SWAP"?"#0EF":"#FD0",fontWeight:"bold"}}>{tx.t}</span>
             <span>{tx.amt} <span style={{fontSize:"7px",color:"#777"}}>{tx.a}</span></span>
             <span style={{textAlign:"right",color:"#48F"}}>{tx.hash}</span>
           </div>
         ))}
         {txs.length === 0 && <div style={{color:"#555",textAlign:"center",marginTop:"20px"}}>Awaiting transactions...</div>}
      </div>
    </div>
  );
};
"""

content = content.replace("function NeonMythosCity(){", new_marketboard + "\nfunction NeonMythosCity(){")

# 3. Update the call to pass props
content = content.replace("<MarketBoard />", "<MarketBoard tick={tick} paused={paused} />")

with open("NeonMythosCity_Start.html", "w") as f:
    f.write(content)
