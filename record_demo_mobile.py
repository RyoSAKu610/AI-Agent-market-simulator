import os
import time
from playwright.sync_api import sync_playwright

def inject_overlay(page, text, duration_ms=2000):
    """Injects an English overlay annotation and waits (Mobile Optimized)."""
    page.evaluate(f"""
        (text) => {{
            let overlay = document.getElementById('demo-overlay');
            if (!overlay) {{
                overlay = document.createElement('div');
                overlay.id = 'demo-overlay';
                overlay.style.position = 'fixed';
                overlay.style.bottom = '15%';
                overlay.style.left = '50%';
                overlay.style.transform = 'translateX(-50%)';
                overlay.style.backgroundColor = 'rgba(0, 0, 0, 0.85)';
                overlay.style.color = '#00E5FF';
                overlay.style.padding = '10px 15px';
                overlay.style.borderRadius = '8px';
                overlay.style.border = '2px solid #00E5FF';
                overlay.style.fontSize = '16px'; // Smaller font for mobile
                overlay.style.fontFamily = "'Courier New', monospace";
                overlay.style.fontWeight = 'bold';
                overlay.style.zIndex = '9999';
                overlay.style.boxShadow = '0 0 20px rgba(0, 229, 255, 0.5)';
                overlay.style.textAlign = 'center';
                overlay.style.width = '80%'; // Constrain width on mobile
                document.body.appendChild(overlay);
            }}
            overlay.innerText = text;
            overlay.style.display = 'block';
        }}
    """, text)
    page.wait_for_timeout(duration_ms)

def clear_overlay(page):
    page.evaluate("""
        () => {
            const overlay = document.getElementById('demo-overlay');
            if (overlay) overlay.style.display = 'none';
        }
    """)

def run_cuj(page):
    current_dir = os.getcwd()
    file_url = f"file://{current_dir}/NeonMythosCity_Start.html"

    print("Loading page in mobile view...")
    page.goto(file_url)
    page.wait_for_timeout(1000)

    # 1. Avatar Selection
    inject_overlay(page, "Neon Mythos City Mobile", 2000)
    inject_overlay(page, "Select Avatar to start", 1500)
    clear_overlay(page)

    try:
        page.locator("text=Hinata").click()
    except Exception:
        pass
    page.wait_for_timeout(1000)

    inject_overlay(page, "Entering the City...", 2000)

    # 2. Main View
    inject_overlay(page, "Optimized Mobile Terminal", 2500)

    # 3. Agents and Map interactions
    inject_overlay(page, "Tap agents to view stats", 2500)
    clear_overlay(page)

    page.wait_for_timeout(1000)

    try:
        page.locator("text=KANE-KAMI").click()
    except Exception:
        pass

    page.wait_for_timeout(500)
    inject_overlay(page, "View Radar & Evolution UI", 3000)

    try:
        page.locator("text=ORACLE-01").click()
    except Exception:
        pass

    page.wait_for_timeout(2000)

    # 4. QTE Event
    inject_overlay(page, "Random Events & Ledger", 2500)
    clear_overlay(page)

    page.wait_for_timeout(1500)

    # 5. Fast Forward
    inject_overlay(page, "Adjust simulation speed", 2500)

    try:
        page.locator("text=×3").click()
    except Exception:
        pass

    page.wait_for_timeout(2500)

    inject_overlay(page, "Enjoy the City on Mobile!", 3000)

    page.wait_for_timeout(2000)

if __name__ == "__main__":
    os.makedirs("/home/jules/verification/videos_mobile", exist_ok=True)
    with sync_playwright() as p:
        # Simulate an iPhone-like screen size for the mobile demo
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(
            record_video_dir="/home/jules/verification/videos_mobile",
            record_video_size={"width": 390, "height": 844},
            viewport={"width": 390, "height": 844},
            is_mobile=True,
            has_touch=True
        )
        page = context.new_page()
        try:
            run_cuj(page)
        finally:
            context.close()
            browser.close()
