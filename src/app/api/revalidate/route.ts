import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';

// Secret token for securing the revalidation endpoint
const REVALIDATE_SECRET = process.env.REVALIDATE_SECRET || 'nexiplay-revalidate-2026';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { secret, paths } = body;

        // Validate secret
        if (secret !== REVALIDATE_SECRET) {
            return NextResponse.json({ error: 'Invalid secret' }, { status: 401 });
        }

        // If specific paths are provided, revalidate those
        if (paths && Array.isArray(paths) && paths.length > 0) {
            for (const path of paths) {
                revalidatePath(path);
            }
            return NextResponse.json({
                revalidated: true,
                paths,
                timestamp: new Date().toISOString(),
            });
        }

        // Default: revalidate all main pages
        const defaultPaths = [
            '/',
            '/movies',
            '/series',
            '/anime',
            '/upcoming',
        ];

        for (const path of defaultPaths) {
            revalidatePath(path);
        }

        return NextResponse.json({
            revalidated: true,
            paths: defaultPaths,
            timestamp: new Date().toISOString(),
        });
    } catch (error) {
        console.error('Revalidation error:', error);
        return NextResponse.json({ error: 'Failed to revalidate' }, { status: 500 });
    }
}
