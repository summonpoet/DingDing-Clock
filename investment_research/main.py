#!/usr/bin/env python3
"""
投研工具 - 主入口
从 IT桔子 抓取投资事件，使用 Claude AI 分析并生成报告
"""

import argparse
import json
import os
import sys

from rich.console import Console
from rich.panel import Panel
from rich.table import Table

from .scraper import scrape_invest_events, save_events_json, load_events_json, InvestEvent
from .researcher import research_all_companies
from .reporter import generate_markdown_report, generate_excel_report


console = Console()


def print_banner():
    console.print(Panel.fit(
        "[bold cyan]投研助手 - Investment Research Summarizer[/bold cyan]\n"
        "[dim]从 IT桔子 抓取投资事件 → Claude AI 分析 → 生成投研报告[/dim]",
        border_style="cyan",
    ))


def print_events_table(events: list[InvestEvent]):
    """以表格形式展示抓取到的事件"""
    table = Table(title="抓取到的投资事件", show_lines=True)
    table.add_column("#", style="dim", width=4)
    table.add_column("日期", width=12)
    table.add_column("公司", style="cyan", width=20)
    table.add_column("行业", width=15)
    table.add_column("轮次", width=10)
    table.add_column("金额", style="green", width=15)
    table.add_column("投资方", width=30)
    table.add_column("估值", width=15)

    for i, e in enumerate(events, 1):
        table.add_row(
            str(i), e.date, e.company, e.industry,
            e.round, e.amount, e.investors, e.valuation
        )

    console.print(table)


def cmd_scrape(args):
    """执行抓取命令"""
    console.print("\n[bold]Step 1: 抓取投资事件数据[/bold]\n")

    events = scrape_invest_events(
        url=args.url,
        max_pages=args.pages,
        headless=False,
    )

    if not events:
        console.print("[red]未抓取到任何数据，请检查页面结构或登录状态[/red]")
        return []

    print_events_table(events)

    # 保存原始数据
    json_path = save_events_json(events, os.path.join(args.output, "events.json"))
    console.print(f"[dim]原始数据已保存: {json_path}[/dim]")

    return events


def cmd_analyze(args, events: list[InvestEvent] | None = None):
    """执行AI分析命令"""
    console.print("\n[bold]Step 2: AI 分析公司信息[/bold]\n")

    if events is None:
        # 从JSON文件加载
        json_path = os.path.join(args.output, "events.json")
        if not os.path.exists(json_path):
            console.print(f"[red]未找到数据文件: {json_path}[/red]")
            console.print("[yellow]请先运行 scrape 命令抓取数据，或使用 run 命令一步完成[/yellow]")
            return []
        events = load_events_json(json_path)
        console.print(f"[dim]从 {json_path} 加载了 {len(events)} 条记录[/dim]\n")

    results = research_all_companies(
        events=events,
        api_key=args.api_key,
        model=args.model,
        delay=args.delay,
    )

    return results


def cmd_report(args, results=None):
    """生成报告"""
    console.print("\n[bold]Step 3: 生成投研报告[/bold]\n")

    if results is None:
        console.print("[red]没有分析结果，请先执行分析[/red]")
        return

    md_path = generate_markdown_report(results, args.output)
    console.print(f"[green]✓ Markdown 报告: {md_path}[/green]")

    xlsx_path = generate_excel_report(results, args.output)
    console.print(f"[green]✓ Excel 报告: {xlsx_path}[/green]")

    console.print(f"\n[bold green]报告生成完成！请查看 {args.output}/ 目录[/bold green]")


def cmd_run(args):
    """一键运行全部流程"""
    print_banner()

    # Step 1: 抓取
    events = cmd_scrape(args)
    if not events:
        return

    # Step 2: AI分析
    results = cmd_analyze(args, events)
    if not results:
        return

    # Step 3: 生成报告
    cmd_report(args, results)


def cmd_demo(args):
    """使用示例数据演示（不需要浏览器和登录）"""
    print_banner()
    console.print("\n[yellow]演示模式：使用示例数据[/yellow]\n")

    # 示例数据
    demo_events = [
        InvestEvent(
            date="2024-12-20",
            company="月之暗面",
            industry="人工智能",
            round="B轮",
            amount="3亿美元",
            investors="腾讯投资, 高瓴资本",
            valuation="33亿美元",
        ),
        InvestEvent(
            date="2024-12-19",
            company="智谱AI",
            industry="人工智能",
            round="C轮",
            amount="数亿美元",
            investors="中关村科学城, 君联资本",
            valuation="百亿人民币",
        ),
    ]

    print_events_table(demo_events)

    console.print("\n[bold]开始 AI 分析...[/bold]\n")
    results = cmd_analyze(args, demo_events)

    if results:
        cmd_report(args, results)


def main():
    parser = argparse.ArgumentParser(
        description="投研助手 - 从IT桔子抓取投资事件并用AI生成研究报告",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
使用示例:
  # 一键运行（抓取 + AI分析 + 生成报告）
  python -m investment_research run

  # 仅抓取数据（不分析）
  python -m investment_research scrape --pages 3

  # 从已保存的数据生成报告
  python -m investment_research analyze

  # 使用示例数据演示（不需要登录）
  python -m investment_research demo
        """
    )

    parser.add_argument("--output", "-o", default="output", help="输出目录 (默认: output)")
    parser.add_argument("--api-key", help="Anthropic API Key (默认从 ANTHROPIC_API_KEY 环境变量获取)")
    parser.add_argument("--model", default="claude-sonnet-4-20250514", help="Claude 模型 (默认: claude-sonnet-4-20250514)")
    parser.add_argument("--delay", type=float, default=1.0, help="API请求间隔秒数 (默认: 1.0)")

    subparsers = parser.add_subparsers(dest="command", help="子命令")

    # run 命令
    run_parser = subparsers.add_parser("run", help="一键运行全部流程")
    run_parser.add_argument("--url", default="https://www.itjuzi.com/investevent", help="IT桔子投资事件页面URL")
    run_parser.add_argument("--pages", type=int, default=1, help="抓取页数 (默认: 1)")

    # scrape 命令
    scrape_parser = subparsers.add_parser("scrape", help="仅抓取数据")
    scrape_parser.add_argument("--url", default="https://www.itjuzi.com/investevent", help="IT桔子投资事件页面URL")
    scrape_parser.add_argument("--pages", type=int, default=1, help="抓取页数 (默认: 1)")

    # analyze 命令
    subparsers.add_parser("analyze", help="从已保存数据进行AI分析并生成报告")

    # demo 命令
    subparsers.add_parser("demo", help="使用示例数据演示")

    args = parser.parse_args()

    if args.command == "run":
        cmd_run(args)
    elif args.command == "scrape":
        cmd_scrape(args)
    elif args.command == "analyze":
        events_path = os.path.join(args.output, "events.json")
        if not os.path.exists(events_path):
            console.print(f"[red]未找到 {events_path}，请先运行 scrape 命令[/red]")
            sys.exit(1)
        results = cmd_analyze(args)
        if results:
            cmd_report(args, results)
    elif args.command == "demo":
        cmd_demo(args)
    else:
        parser.print_help()


if __name__ == "__main__":
    main()
