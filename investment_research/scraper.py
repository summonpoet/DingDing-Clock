"""
ITJuzi 投资事件数据抓取模块
使用 Playwright 浏览器自动化，支持手动登录后自动采集数据
"""

import json
import time
from dataclasses import dataclass, asdict
from playwright.sync_api import sync_playwright, Page


@dataclass
class InvestEvent:
    """投资事件数据结构"""
    date: str = ""           # 时间
    company: str = ""        # 公司名
    industry: str = ""       # 行业
    round: str = ""          # 轮次
    amount: str = ""         # 金额
    investors: str = ""      # 投资方
    valuation: str = ""      # 最新估值(估算)

    def to_dict(self):
        return asdict(self)


def wait_for_login(page: Page, timeout: int = 300):
    """等待用户手动登录，通过检测页面元素判断登录状态"""
    from rich.console import Console
    console = Console()

    console.print("\n[bold yellow]>>> 请在弹出的浏览器窗口中手动登录 IT桔子 <<<[/bold yellow]")
    console.print("[dim]登录完成后，脚本会自动检测并继续执行...[/dim]\n")

    start = time.time()
    while time.time() - start < timeout:
        # 检查是否已登录：登录后页面上通常不会有 "登录" 按钮
        try:
            # 如果能找到投资事件的数据表格，说明已经登录且在正确页面
            table = page.query_selector("table, .list-main, .event-list, [class*='invest']")
            if table:
                console.print("[bold green]✓ 检测到页面数据，继续执行...[/bold green]\n")
                return True
        except Exception:
            pass
        time.sleep(2)

    console.print("[bold red]✗ 登录等待超时[/bold red]")
    return False


def parse_invest_events_from_page(page: Page) -> list[InvestEvent]:
    """从当前页面解析投资事件数据"""
    events = []

    # IT桔子投资事件列表通常是表格或列表结构
    # 尝试多种选择器来适配页面结构
    rows = page.query_selector_all("table tbody tr")

    if not rows:
        # 尝试其他可能的选择器
        rows = page.query_selector_all(".list-main .list-item, .event-list-item, [class*='table'] [class*='row']")

    if not rows:
        # 最后尝试通用方式：直接获取页面内容用JS解析
        data = page.evaluate("""
            () => {
                const results = [];
                // 尝试找到表格行
                const rows = document.querySelectorAll('table tbody tr, .ant-table-tbody tr');
                for (const row of rows) {
                    const cells = row.querySelectorAll('td');
                    if (cells.length >= 5) {
                        results.push({
                            date: cells[0]?.innerText?.trim() || '',
                            company: cells[1]?.innerText?.trim() || '',
                            industry: cells[2]?.innerText?.trim() || '',
                            round: cells[3]?.innerText?.trim() || '',
                            amount: cells[4]?.innerText?.trim() || '',
                            investors: cells[5]?.innerText?.trim() || '',
                            valuation: cells[6]?.innerText?.trim() || ''
                        });
                    }
                }
                return results;
            }
        """)
        for item in data:
            events.append(InvestEvent(**item))
        return events

    for row in rows:
        cells = row.query_selector_all("td")
        if len(cells) >= 5:
            event = InvestEvent(
                date=cells[0].inner_text().strip() if len(cells) > 0 else "",
                company=cells[1].inner_text().strip() if len(cells) > 1 else "",
                industry=cells[2].inner_text().strip() if len(cells) > 2 else "",
                round=cells[3].inner_text().strip() if len(cells) > 3 else "",
                amount=cells[4].inner_text().strip() if len(cells) > 4 else "",
                investors=cells[5].inner_text().strip() if len(cells) > 5 else "",
                valuation=cells[6].inner_text().strip() if len(cells) > 6 else "",
            )
            events.append(event)

    return events


def scrape_invest_events(
    url: str = "https://www.itjuzi.com/investevent",
    max_pages: int = 1,
    headless: bool = False,
) -> list[InvestEvent]:
    """
    主抓取函数：启动浏览器，等待登录，抓取投资事件数据

    Args:
        url: IT桔子投资事件页面URL
        max_pages: 最多抓取页数
        headless: 是否无头模式（需要登录时必须设为False）

    Returns:
        投资事件列表
    """
    from rich.console import Console
    from rich.progress import Progress

    console = Console()
    all_events = []

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=headless)
        context = browser.new_context(
            viewport={"width": 1440, "height": 900},
            user_agent="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        )
        page = context.new_page()

        console.print(f"[cyan]正在打开页面: {url}[/cyan]")
        page.goto(url, wait_until="networkidle", timeout=30000)

        # 等待用户登录
        if not wait_for_login(page):
            browser.close()
            return []

        # 给页面额外加载时间
        time.sleep(2)

        with Progress() as progress:
            task = progress.add_task("[cyan]抓取投资事件数据...", total=max_pages)

            for page_num in range(max_pages):
                progress.update(task, description=f"[cyan]抓取第 {page_num + 1} 页...")

                events = parse_invest_events_from_page(page)
                all_events.extend(events)

                console.print(f"  第 {page_num + 1} 页: 获取到 {len(events)} 条记录")

                if page_num < max_pages - 1:
                    # 尝试翻页
                    next_btn = page.query_selector(
                        "button.ant-pagination-item-link >> nth=-1, "
                        ".next-page, .pagination .next, "
                        "[class*='next'], li.ant-pagination-next"
                    )
                    if next_btn and next_btn.is_enabled():
                        next_btn.click()
                        page.wait_for_load_state("networkidle", timeout=10000)
                        time.sleep(1)
                    else:
                        console.print("[yellow]没有更多页面了[/yellow]")
                        break

                progress.advance(task)

        browser.close()

    console.print(f"\n[bold green]✓ 共抓取到 {len(all_events)} 条投资事件[/bold green]\n")
    return all_events


def save_events_json(events: list[InvestEvent], filepath: str = "events.json"):
    """将事件数据保存为JSON"""
    data = [e.to_dict() for e in events]
    with open(filepath, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    return filepath


def load_events_json(filepath: str = "events.json") -> list[InvestEvent]:
    """从JSON文件加载事件数据"""
    with open(filepath, "r", encoding="utf-8") as f:
        data = json.load(f)
    return [InvestEvent(**item) for item in data]
