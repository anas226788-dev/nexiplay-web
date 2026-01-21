export interface Ad {
    id: string;
    title: string;
    placement: 'home_top' | 'home_bottom' | 'movie_sidebar' | 'popup_global' | 'download_bottom' | 'episode_list';
    ad_type: 'image' | 'script';
    image_url: string | null;
    script_code: string | null;
    destination_url: string | null;
    device_target: 'desktop' | 'mobile' | 'both';
    is_active: boolean;
    created_at?: string;
}

export interface Notice {
    id: string;
    content: string;
    type: 'top_bar' | 'popup' | 'inline';
    pages: 'all' | 'home' | 'movie';
    is_active: boolean;
    bg_color: string;
    text_color: string;
    created_at?: string;
}
