import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { Tweet } from '@/lib/types';

export async function POST(req: NextRequest) {
  try {
    const { tweets, authorHandle, authorName, claudeApiKey } = await req.json();

    if (!tweets || !claudeApiKey) {
      return NextResponse.json(
        { error: '缺少必要参数' },
        { status: 400 }
      );
    }

    if (tweets.length === 0) {
      return NextResponse.json(
        { error: '没有推文可以总结' },
        { status: 400 }
      );
    }

    const client = new Anthropic({ apiKey: claudeApiKey });

    const tweetsText = tweets
      .map(
        (t: Tweet, i: number) =>
          `[${i + 1}] (${new Date(t.createdAt).toLocaleDateString('zh-CN')}) ${t.text}`
      )
      .join('\n\n');

    const message = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2000,
      messages: [
        {
          role: 'user',
          content: `你是一个内容分析助手。请分析以下来自 X (Twitter) 用户 @${authorHandle}（${authorName || authorHandle}）的近期推文，并提供：

1. **综合摘要**：用2-4段话总结这些推文的核心内容和主要观点
2. **核心观点**：提取3-5个关键观点或主题（每个用一句话概括）
3. **扩展研究**：基于这些推文涉及的主题，提供轻度的扩展性研究和背景信息，帮助读者更好地理解内容

推文内容：
${tweetsText}

请用以下 JSON 格式回复（不要包含 markdown 代码块标记）：
{
  "summary": "综合摘要文本...",
  "keyInsights": ["观点1", "观点2", "观点3"],
  "research": "扩展研究文本..."
}`,
        },
      ],
    });

    const responseText =
      message.content[0].type === 'text' ? message.content[0].text : '';

    // Parse JSON from response
    let parsed;
    try {
      // Try to extract JSON from the response
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      parsed = JSON.parse(jsonMatch ? jsonMatch[0] : responseText);
    } catch {
      // If JSON parsing fails, use the raw text
      parsed = {
        summary: responseText,
        keyInsights: [],
        research: '',
      };
    }

    return NextResponse.json({
      summary: parsed.summary || '',
      keyInsights: parsed.keyInsights || [],
      research: parsed.research || '',
    });
  } catch (error) {
    console.error('Summarize error:', error);
    const errMsg =
      error instanceof Error ? error.message : '总结时发生错误';
    return NextResponse.json({ error: errMsg }, { status: 500 });
  }
}
