import { NextResponse } from 'next/server';
import { fetchPublicContributions } from '@/lib/db/contributions';
import { rankContributors } from '@/utils/ranking';

/**
 * GET /api/contributions
 *
 * Public endpoint returning verified confirmed contributions for the 3D globe and leaderboard.
 * Excludes private payment references, customer emails, and webhook signatures.
 */
export async function GET() {
  try {
    const result = await fetchPublicContributions();
    const ranked = rankContributors(result.contributions);

    return NextResponse.json(
      {
        success: true,
        source: result.source,
        isDatabaseConnected: result.isDatabaseConnected,
        isEmpty: result.isEmpty ?? false,
        dbError: result.dbError || null,
        count: ranked.length,
        contributions: ranked,
      },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=15, stale-while-revalidate=45',
        },
      }
    );
  } catch (err: any) {
    console.error('Failed to retrieve contributions:', err);
    return NextResponse.json(
      { success: false, error: 'Failed to retrieve contributions.' },
      { status: 500 }
    );
  }
}
