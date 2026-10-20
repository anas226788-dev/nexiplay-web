import { NextResponse } from 'next/server';
import https from 'https';
import localGames from '@/data/games.json';

interface GamePixGame {
    id: string;
    title: string;
    category: string;
    categories: string[];
    thumbnailUrl: string;
    thumbnailUrl100?: string;
    url: string;
    description: string;
    orientation?: string;
    rkScore?: number;
    featured?: boolean;
}

// In-memory cache pre-seeded with 1,000 verified games from local data
let cachedGames: GamePixGame[] = Array.isArray(localGames) && localGames.length > 0
    ? (localGames as GamePixGame[])
    : [];

let lastFetchTime = Date.now();
const CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6 hours
let isRefreshing = false;

function fetchViaHttps(url: string): Promise<any> {
    return new Promise((resolve, reject) => {
        const req = https.get(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'application/json, text/plain, */*'
            },
            timeout: 12000
        }, res => {
            if (res.statusCode && res.statusCode >= 400) {
                return reject(new Error(`GamePix status ${res.statusCode}`));
            }
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    const json = JSON.parse(data);
                    resolve(json);
                } catch (e) {
                    reject(e);
                }
            });
        });
        req.on('error', reject);
        req.on('timeout', () => {
            req.destroy();
            reject(new Error('GamePix request timed out'));
        });
    });
}

async function refreshGamesCatalogInBackground() {
    if (isRefreshing) return;
    isRefreshing = true;
    try {
        const json = await fetchViaHttps('https://games.gamepix.com/games');
        if (json && Array.isArray(json.data) && json.data.length > 0) {
            const mapped: GamePixGame[] = json.data.map((item: any) => ({
                id: String(item.id || item.sid || Math.random()),
                title: String(item.title || 'Game').trim(),
                category: String(item.category || 'Arcade').trim(),
                categories: Array.isArray(item.categories) ? item.categories : [String(item.category || 'Arcade')],
                thumbnailUrl: item.thumbnailUrl || item.thumbnailUrl100 || '',
                thumbnailUrl100: item.thumbnailUrl100 || item.thumbnailUrl || '',
                url: item.url || `https://play.gamepix.com/${item.id}/embed?sid=1`,
                description: item.description || item.desc_en || '',
                orientation: item.orientation || 'landscape',
                rkScore: Number(item.rkScore || item.rks) || 0.75,
                featured: !!item.featured,
            }));
            cachedGames = mapped;
            lastFetchTime = Date.now();
        }
    } catch (err) {
        console.warn('GamePix background refresh notice:', err);
    } finally {
        isRefreshing = false;
    }
}

async function getGamePixCatalog(): Promise<GamePixGame[]> {
    if (cachedGames.length === 0 && Array.isArray(localGames) && localGames.length > 0) {
        cachedGames = localGames as GamePixGame[];
    }
    const now = Date.now();
    if (now - lastFetchTime > CACHE_TTL_MS && !isRefreshing) {
        refreshGamesCatalogInBackground().catch(() => {});
    }
    return cachedGames;
}

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category') || searchParams.get('cat') || '';
    const orientation = (searchParams.get('orientation') || searchParams.get('or') || '').toLowerCase().trim();
    const query = (searchParams.get('q') || searchParams.get('search') || '').toLowerCase().trim();
    const sort = searchParams.get('sort') || 'popular'; // 'popular' | 'featured' | 'name'
    const limit = Math.min(Number(searchParams.get('limit')) || 60, 1000);
    const page = Math.max(Number(searchParams.get('page')) || 1, 1);

    const rawGames = await getGamePixCatalog();

    // Deduplicate games by id and url to guarantee zero duplicate games
    const seenIds = new Set<string>();
    const seenUrls = new Set<string>();
    const allGames: GamePixGame[] = [];
    for (const g of rawGames) {
        if (!g.id || !g.url || seenIds.has(g.id) || seenUrls.has(g.url)) continue;
        seenIds.add(g.id);
        seenUrls.add(g.url);
        allGames.push(g);
    }

    // 1. Filter by category
    let filtered = allGames;
    if (category && category.toLowerCase() !== 'all') {
        const catLower = category.toLowerCase();
        filtered = filtered.filter(g =>
            g.category.toLowerCase() === catLower ||
            g.categories.some(c => c.toLowerCase() === catLower)
        );
    }

    // 2. Filter by orientation (portrait vs landscape)
    if (orientation && orientation !== 'all') {
        filtered = filtered.filter(g => (g.orientation || 'landscape').toLowerCase() === orientation);
    }

    // 2. Filter by search query
    if (query) {
        filtered = filtered.filter(g =>
            g.title.toLowerCase().includes(query) ||
            g.description.toLowerCase().includes(query) ||
            g.category.toLowerCase().includes(query) ||
            g.categories.some(c => c.toLowerCase().includes(query))
        );
    }

    // 3. Sort
    if (sort === 'popular') {
        filtered.sort((a, b) => (b.rkScore || 0) - (a.rkScore || 0));
    } else if (sort === 'featured') {
        filtered.sort((a, b) => (b.featured ? 1 : 0) - (a.featured ? 1 : 0));
    } else if (sort === 'name') {
        filtered.sort((a, b) => a.title.localeCompare(b.title));
    }

    // 4. Pagination
    const total = filtered.length;
    const startIndex = (page - 1) * limit;
    const paginated = filtered.slice(startIndex, startIndex + limit);

    // Available categories list
    const categories = ['All', 'Adventure', 'Arcade', 'Puzzles', 'Strategy', 'Sports', 'Board', 'Classics', 'Junior'];

    // Category breakdown counts across whole catalog
    const categoryCounts: Record<string, number> = {
        All: allGames.length,
        Adventure: allGames.filter(g => g.category.toLowerCase() === 'adventure' || g.categories.some(c => c.toLowerCase() === 'adventure')).length,
        Arcade: allGames.filter(g => g.category.toLowerCase() === 'arcade' || g.categories.some(c => c.toLowerCase() === 'arcade')).length,
        Puzzles: allGames.filter(g => g.category.toLowerCase() === 'puzzles' || g.categories.some(c => c.toLowerCase() === 'puzzles')).length,
        Strategy: allGames.filter(g => g.category.toLowerCase() === 'strategy' || g.categories.some(c => c.toLowerCase() === 'strategy')).length,
        Sports: allGames.filter(g => g.category.toLowerCase() === 'sports' || g.categories.some(c => c.toLowerCase() === 'sports')).length,
        Board: allGames.filter(g => g.category.toLowerCase() === 'board' || g.categories.some(c => c.toLowerCase() === 'board')).length,
        Classics: allGames.filter(g => g.category.toLowerCase() === 'classics' || g.categories.some(c => c.toLowerCase() === 'classics')).length,
        Junior: allGames.filter(g => g.category.toLowerCase() === 'junior' || g.categories.some(c => c.toLowerCase() === 'junior')).length,
    };

    // Orientation breakdown counts across whole catalog
    const orientationCounts = {
        all: allGames.length,
        portrait: allGames.filter(g => (g.orientation || '').toLowerCase() === 'portrait').length,
        landscape: allGames.filter(g => (g.orientation || '').toLowerCase() !== 'portrait').length,
    };

    return NextResponse.json({
        success: true,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        categories,
        categoryCounts,
        orientationCounts,
        games: paginated,
    });
}
