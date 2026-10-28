export interface NewsPost {
    id: string;
    title: string;
    source: string;
    date: string; // ISO 8601, e.g. "2026-10-27T03:15:00Z"
    url?: string;
}

export interface NewsSource {
    title: string;
    fetchPosts: (offset: number, limit: number) => Promise<NewsPost[]>;
}

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

export const NEWS_SOURCES = {
    clubs: {
        title: "From The Clubs",
        fetchPosts: async (offset, limit) => {
            await delay(600);
            return CLUB_POSTS.slice(offset, offset + limit);
        },
    },
    korfballAustralia: {
        title: "From Korfball Australia",
        fetchPosts: async (offset, limit) => {
            const res = await fetch(`/api/news/korfball-australia?offset=${offset}&limit=${limit}`);
            if (!res.ok) throw new Error("Failed to load news");
            return res.json();
        },
    },

    ikf: {
        title: "From IKF",
        fetchPosts: async (offset, limit) => {
            const res = await fetch(`/api/news/ikf?offset=${offset}&limit=${limit}`);
            if (!res.ok) throw new Error("Failed to load news");
            return res.json();
        },
    },
} satisfies Record<string, NewsSource>;

export type NewsSourceKey = keyof typeof NEWS_SOURCES;

// Move your existing ALL_NEWS_POSTS array here as CLUB_POSTS,
// and add a KA_POSTS array for the new source.