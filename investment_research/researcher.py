"""
AI 投研分析模块
使用 Claude API 对每家公司进行信息搜索和总结
"""

import os
import time
from dataclasses import dataclass, field
from anthropic import Anthropic

from .scraper import InvestEvent


@dataclass
class CompanyResearch:
    """公司研究结果"""
    event: InvestEvent
    summary: str = ""
    business_description: str = ""   # 业务描述
    core_products: str = ""          # 核心产品/服务
    competitive_advantage: str = ""  # 竞争优势
    founding_team: str = ""          # 创始团队
    market_analysis: str = ""        # 市场分析
    risk_factors: str = ""           # 风险因素
    investment_highlights: str = ""  # 投资亮点
    raw_response: str = ""           # 原始AI回复


def build_research_prompt(event: InvestEvent) -> str:
    """构建公司研究的 prompt"""
    return f"""你是一个专业的投资研究分析师。请根据以下投资事件信息，对该公司进行深入的研究分析。

## 投资事件信息
- **公司名称**: {event.company}
- **所属行业**: {event.industry}
- **融资轮次**: {event.round}
- **融资金额**: {event.amount}
- **投资方**: {event.investors}
- **最新估值(估算)**: {event.valuation}
- **事件日期**: {event.date}

## 请提供以下分析（用中文回答）

### 1. 公司概述
简要介绍公司的背景、成立时间、总部位置等基本信息。

### 2. 核心业务与产品
详细描述公司的主要产品或服务，商业模式是什么。

### 3. 竞争优势
分析公司相对于竞争对手的核心优势，包括技术壁垒、市场份额、品牌优势等。

### 4. 创始团队
介绍主要创始人和管理团队的背景（如果信息可用）。

### 5. 市场分析
分析公司所在市场的规模、增长趋势、竞争格局。

### 6. 本轮融资分析
分析本轮融资的意义，资金可能的用途，以及投资方的投资逻辑。

### 7. 风险因素
指出潜在的风险和挑战。

### 8. 投资亮点总结
用3-5个要点概括该公司的投资价值。

请基于你的知识进行分析。如果对某家公司不太了解，请如实说明并基于行业信息和融资信息进行合理推断。"""


def research_company(
    event: InvestEvent,
    client: Anthropic,
    model: str = "claude-sonnet-4-20250514",
) -> CompanyResearch:
    """
    使用 Claude API 研究单个公司

    Args:
        event: 投资事件数据
        client: Anthropic客户端
        model: 使用的模型

    Returns:
        CompanyResearch 研究结果
    """
    prompt = build_research_prompt(event)

    message = client.messages.create(
        model=model,
        max_tokens=4096,
        messages=[{"role": "user", "content": prompt}],
    )

    response_text = message.content[0].text

    research = CompanyResearch(
        event=event,
        raw_response=response_text,
        summary=response_text,
    )

    # 尝试从结构化回复中提取各部分
    sections = _parse_sections(response_text)
    research.business_description = sections.get("公司概述", "")
    research.core_products = sections.get("核心业务与产品", "")
    research.competitive_advantage = sections.get("竞争优势", "")
    research.founding_team = sections.get("创始团队", "")
    research.market_analysis = sections.get("市场分析", "")
    research.risk_factors = sections.get("风险因素", "")
    research.investment_highlights = sections.get("投资亮点总结", "")

    return research


def _parse_sections(text: str) -> dict:
    """从AI回复中解析各个章节"""
    sections = {}
    current_key = None
    current_lines = []

    for line in text.split("\n"):
        stripped = line.strip()
        # 检测标题行 (### 1. xxx 或 ## xxx)
        if stripped.startswith("#"):
            # 保存上一个section
            if current_key:
                sections[current_key] = "\n".join(current_lines).strip()
            # 提取标题关键词
            title = stripped.lstrip("#").strip()
            # 移除编号如 "1. "
            for prefix_pattern in ["1.", "2.", "3.", "4.", "5.", "6.", "7.", "8."]:
                if title.startswith(prefix_pattern):
                    title = title[len(prefix_pattern):].strip()
                    break
            current_key = title
            current_lines = []
        elif current_key:
            current_lines.append(line)

    # 保存最后一个section
    if current_key:
        sections[current_key] = "\n".join(current_lines).strip()

    return sections


def research_all_companies(
    events: list[InvestEvent],
    api_key: str | None = None,
    model: str = "claude-sonnet-4-20250514",
    delay: float = 1.0,
) -> list[CompanyResearch]:
    """
    批量研究所有公司

    Args:
        events: 投资事件列表
        api_key: Anthropic API Key (默认从环境变量获取)
        model: 使用的模型
        delay: 每次请求之间的延迟(秒)

    Returns:
        研究结果列表
    """
    from rich.console import Console
    from rich.progress import Progress, SpinnerColumn, TextColumn, BarColumn

    console = Console()

    if api_key:
        client = Anthropic(api_key=api_key)
    else:
        client = Anthropic()  # 自动从 ANTHROPIC_API_KEY 环境变量获取

    results = []

    # 去重：按公司名去重
    seen = set()
    unique_events = []
    for e in events:
        if e.company and e.company not in seen:
            seen.add(e.company)
            unique_events.append(e)

    console.print(f"[cyan]共 {len(unique_events)} 家公司待分析（已去重）[/cyan]\n")

    with Progress(
        SpinnerColumn(),
        TextColumn("[progress.description]{task.description}"),
        BarColumn(),
        TextColumn("[progress.percentage]{task.percentage:>3.0f}%"),
        console=console,
    ) as progress:
        task = progress.add_task("分析中...", total=len(unique_events))

        for i, event in enumerate(unique_events):
            progress.update(
                task,
                description=f"[cyan]正在分析: {event.company} ({i+1}/{len(unique_events)})[/cyan]"
            )

            try:
                research = research_company(event, client, model)
                results.append(research)
                console.print(f"  [green]✓[/green] {event.company}")
            except Exception as e:
                console.print(f"  [red]✗ {event.company}: {e}[/red]")
                # 创建一个带错误信息的结果
                results.append(CompanyResearch(
                    event=event,
                    summary=f"分析失败: {e}",
                ))

            progress.advance(task)

            # 请求间延迟，避免限流
            if i < len(unique_events) - 1:
                time.sleep(delay)

    console.print(f"\n[bold green]✓ 分析完成: {len(results)} 家公司[/bold green]\n")
    return results
