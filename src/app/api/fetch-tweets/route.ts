import { NextRequest, NextResponse } from 'next/server';
import { Tweet } from '@/lib/types';

export async function POST(req: NextRequest) {
  try {
    const { handle, bearerToken } = await req.json();

    if (!handle || !bearerToken) {
      return NextResponse.json(
        { error: '缺少必要参数: handle 或 bearerToken' },
        { status: 400 }
      );
    }

    // Step 1: Get user ID from handle
    const userRes = await fetch(
      `https://api.twitter.com/2/users/by/username/${handle}?user.fields=name,profile_image_url`,
      {
        headers: { Authorization: `Bearer ${bearerToken}` },
      }
    );

    if (!userRes.ok) {
      const errBody = await userRes.text();
      return NextResponse.json(
        {
          error: `X API 错误 (用户查询): ${userRes.status}`,
          details: errBody,
        },
        { status: userRes.status }
      );
    }

    const userData = await userRes.json();
    if (!userData.data) {
      return NextResponse.json(
        { error: `未找到用户 @${handle}` },
        { status: 404 }
      );
    }

    const userId = userData.data.id;
    const userName = userData.data.name;
    const profileImageUrl = userData.data.profile_image_url;

    // Step 2: Fetch recent tweets
    const tweetsRes = await fetch(
      `https://api.twitter.com/2/users/${userId}/tweets?max_results=20&tweet.fields=created_at,public_metrics,text&exclude=retweets,replies`,
      {
        headers: { Authorization: `Bearer ${bearerToken}` },
      }
    );

    if (!tweetsRes.ok) {
      const errBody = await tweetsRes.text();
      return NextResponse.json(
        {
          error: `X API 错误 (推文获取): ${tweetsRes.status}`,
          details: errBody,
        },
        { status: tweetsRes.status }
      );
    }

    const tweetsData = await tweetsRes.json();
    const tweets: Tweet[] = (tweetsData.data || []).map(
      (t: {
        id: string;
        text: string;
        created_at?: string;
        public_metrics?: {
          like_count: number;
          retweet_count: number;
          reply_count: number;
        };
      }) => ({
        id: t.id,
        text: t.text,
        authorHandle: handle,
        authorName: userName,
        createdAt: t.created_at || new Date().toISOString(),
        url: `https://x.com/${handle}/status/${t.id}`,
        metrics: t.public_metrics
          ? {
              likes: t.public_metrics.like_count,
              retweets: t.public_metrics.retweet_count,
              replies: t.public_metrics.reply_count,
            }
          : undefined,
      })
    );

    return NextResponse.json({
      tweets,
      user: {
        id: userId,
        handle,
        name: userName,
        profileImageUrl,
      },
    });
  } catch (error) {
    console.error('Fetch tweets error:', error);
    return NextResponse.json(
      { error: '获取推文时发生错误' },
      { status: 500 }
    );
  }
}
