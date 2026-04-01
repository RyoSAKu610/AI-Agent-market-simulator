import re

with open("NeonMythosCity_Start.html", "r") as f:
    content = f.read()

# Remove the inner MarketBoard component again since the regex failed
# We will use string search this time to be safer
start_idx = content.find("  // ===== MARKET BOARD =====")
end_idx = content.find("  const InfoPanel=()=>(<div")

if start_idx != -1 and end_idx != -1:
    content = content[:start_idx] + content[end_idx:]

with open("NeonMythosCity_Start.html", "w") as f:
    f.write(content)
