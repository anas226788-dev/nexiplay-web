export interface Movie {
    id: string;
    title: string;
    slug: string;
    poster_url: string | null;
    description: string | null;
    type: 'movie' | 'series' | 'anime';
    release_year: number | null;
    language?: string;
    source?: string;
    cast_members?: string;
    format?: string;
    subtitle?: string;
    trailer_url?: string;
    created_at: string;
}

export interface Download {
    id: string;
    movie_id: string;
    quality: '480p' | '720p' | '1080p';
    file_size: string | null;
    file_url: string | null;
    created_at?: string;
}

export interface Category {
    id: string;
    name: string;
    slug: string;
    created_at?: string;
}

export interface AppSettings {
    id: number;
    is_ads_enabled: boolean;
    popunder_url: string;
    direct_link_url: string;
    updated_at: string;
}

export interface MovieWithDownloads extends Movie {
    downloads: Download[];
    screenshots?: Screenshot[];
}

export interface MovieWithCategories extends Movie {
    movie_categories: {
        categories: Category;
    }[];
}

export interface FullMovie extends Movie {
    downloads: Download[];
    screenshots?: Screenshot[];
    movie_categories: {
        categories: Category;
    }[];
}

export interface Screenshot {
    id: string;
    movie_id: string;
    image_url: string;
    created_at?: string;
}

export interface Ad {
    id: string;
    title: string;
    placement: 'home_top' | 'home_bottom' | 'movie_sidebar' | 'popup_global';
    ad_type: 'image' | 'script';
    image_url: string | null;
    script_code: string | null;
    destination_url: string | null;
    is_active: boolean;
    created_at?: string;
}

export interface ContentRequest {
    id: string;
    content_name: string;
    status: 'pending' | 'added' | 'rejected';
    created_at: string;
}

export interface Comment {
    id: string;
    movie_id: string;
    name: string;
    email: string;
    message: string;
    created_at: string;
    is_approved: boolean;
}

export interface TelegramSettings {
    id: number;
    telegram_type: 'group' | 'channel';
    telegram_url: string;
    is_active: boolean;
    updated_at: string;
}

export interface DownloadLink {
    id: string;
    movie_id: string;
    resolution: '360p' | '480p' | '720p' | '1080p';
    file_size?: string;
    mega_link?: string;
    gdrive_link?: string;
    mediafire_link?: string;
    terabox_link?: string;
    pcloud_link?: string;
    youtube_link?: string;
    link_status?: Record<string, 'ACTIVE' | 'EXPIRED'>;
    created_at?: string;
}

export interface Season {
    id: string;
    movie_id: string;
    season_number: number;
    season_title?: string;
    poster_url?: string;
    season_zip_link?: string;
    episodes?: Episode[];
    created_at?: string;
}

export interface Episode {
    id: string;
    season_id: string;
    episode_number: number;
    episode_title?: string;
    download_links?: EpisodeDownloadLink[];
    created_at?: string;
}

export interface EpisodeDownloadLink {
    id?: string;
    episode_id?: string;
    resolution: '360p' | '480p' | '720p' | '1080p';
    file_size?: string;
    mega_link?: string;
    gdrive_link?: string;
    mediafire_link?: string;
    terabox_link?: string;
    pcloud_link?: string;
    youtube_link?: string;
    link_status?: Record<string, 'ACTIVE' | 'EXPIRED'>;
    created_at?: string;
}

export interface FAQ {
    question: string;
    answer: string;
    keywords: string;
}

export interface ChatbotSettings {
    id: number;
    welcome_message: string;
    faqs: FAQ[];
    is_enabled: boolean;
    updated_at: string;
}
