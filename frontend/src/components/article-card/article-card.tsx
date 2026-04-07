import { component$, useSignal, useVisibleTask$, useOnWindow, $ } from "@builder.io/qwik";

interface Slide {
    image?: string;
    video?: string;
    youtubeId?: string;
    title?: string;
}

interface ArticleCardProps {
    id: number;
    title: string;
    category: string;
    image: string;
    source?: string;
    timeAgo?: string;
    views?: number;
    likes?: number;
    categoryUrl?: string;
    sourceUrl?: string;
    articleUrl?: string;
    variant?: "wide" | "tall" | "square" | "large";
    slides?: Slide[]; // For slideshow functionality in wide variant
    isVideo?: boolean; // Indicates if this is a video post
    videoUrl?: string; // Video URL for video posts
    youtubeId?: string; // YouTube video ID
    textContent?: string; // Text content for text-only posts (no image)
    isAuthenticated?: boolean; // Whether user is logged in (for showing edit/delete)
    slideIds?: number[]; // Array of article IDs for each slide (for slideshow edits)
    onEdit?: (articleId: number) => void; // Edit callback with article ID
    onDelete?: (articleId: number) => void; // Delete callback with article ID
    isLoved?: boolean; // Whether the article is loved
    onLoveToggle?: () => void; // Love toggle callback
}

export const ArticleCard = component$<ArticleCardProps>(({
    id,
    title,
    category,
    image,
    source,
    timeAgo,
    views,
    likes,
    categoryUrl,
    sourceUrl,
    articleUrl,
    variant = "square",
    slides,
    isVideo,
    videoUrl,
    youtubeId,
    textContent,
    isAuthenticated = false,
    slideIds,
    onEdit,
    onDelete,
    isLoved = false,
    onLoveToggle
}) => {
    // Video ref and visibility state
    // Slideshow state
    const currentSlide = useSignal(0); // FIXED: Start from 0, not 3 (out of bounds!)
    const isPaused = useSignal(false);
    const hasSlides = slides && slides.length > 0;
    const displaySlides = slides && slides.length > 0 ? slides : [{ image, title }];

    // Card-level Intersection Observer to pause videos when not visible
    const cardRef = useSignal<HTMLElement>();
    const hasBeenPaused = useSignal(false); // Track if video has been paused by scrolling
    const isYoutubePlaying = useSignal(false);

    useVisibleTask$(({ cleanup }) => {
        if (!cardRef.value) return;

        let isFirstIntersection = true; // Track if this is the first time card becomes visible

        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    const card = entry.target as HTMLElement;

                    if (!entry.isIntersecting) {
                        // Mark that video has been paused
                        hasBeenPaused.value = true;

                        // Pause all videos in this card when scrolled out of view
                        const videos = card.querySelectorAll('video');
                        videos.forEach(video => {
                            video.pause();
                            video.setAttribute('data-manual-control', 'true');
                        });

                        // Pause YouTube (unmount iframe)
                        isYoutubePlaying.value = false;

                    } else {
                        // Auto-play on first intersection (initial load)
                        if (isFirstIntersection) {
                            isFirstIntersection = false;

                            // Resume YouTube (mount iframe)
                            isYoutubePlaying.value = true;

                            // Auto-play videos on initial load
                            const videos = card.querySelectorAll('video');
                            videos.forEach(video => {
                                video.play()?.catch(() => {
                                    // Auto-play might be blocked
                                });
                            });
                        }
                        // Don't auto-play on subsequent intersections (user scrolled back)
                        // Note: Play button handles manual resume for YouTube
                    }
                });
            },
            { threshold: 0.1 } // Pause when less than 10% visible
        );

        observer.observe(cardRef.value);
        cleanup(() => observer.disconnect());
    });

    // Auto-rotate slideshow for wide variant with slides
    useVisibleTask$(({ cleanup }) => {
        if (!hasSlides || variant !== 'wide') return;

        const interval = setInterval(() => {
            if (!isPaused.value) {
                currentSlide.value = (currentSlide.value + 1) % displaySlides.length;
            }
        }, 5000); // Change slide every 5 seconds

        cleanup(() => clearInterval(interval));
    });

    // Define height/aspect classes based on variant
    const variantClasses = {
        wide: "col-span-2 h-80", // Fixed height 256px
        tall: "col-span-1 row-span-2 h-full", // Tall cards span 2 rows, use full height
        square: "col-span-1 h-80", // Same height as wide
        large: "col-span-2 h-80" // Same height as wide
    };

    return (
        <article
            ref={cardRef}
            class={`group rounded-md overflow-hidden shadow-lg hover:shadow-xl 
            hover:shadow-blue-500/20 transition-all duration-300 ease-out 
            border border-slate-200/50 dark:border-slate-700/50
            ${variantClasses[variant]} ${variant === 'square' ? 'flex flex-col w-full' : 'relative'}`}>

            {variant === 'square' ? (
                <>
                    {/* Square Variant: Top Section - Image with Source/Time/Views Only */}
                    <div class={`relative flex-grow overflow-hidden bg-slate-700 dark:bg-slate-700`} style="height: 70%;">
                        {isAuthenticated && (
                            <div class="absolute top-2 right-2 z-20 flex gap-2">
                                <button
                                    onClick$={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        console.log('Edit clicked - currentSlide:', currentSlide.value, 'hasSlides:', hasSlides, 'slideIds:', slideIds);
                                        const articleId = slideIds && hasSlides ? slideIds[currentSlide.value] : id;
                                        console.log('Calculated articleId:', articleId);
                                        if (onEdit) onEdit(articleId);
                                    }}
                                    class="p-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow-lg transition-colors cursor-pointer"
                                    title="Edit article"
                                >
                                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                    </svg>
                                </button>
                                <button
                                    onClick$={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        const articleId = slideIds && hasSlides ? slideIds[currentSlide.value] : id;
                                        if (onDelete) onDelete(articleId);
                                    }}
                                    class="p-2 bg-red-600 hover:bg-red-700 text-white rounded-lg shadow-lg transition-colors cursor-pointer"
                                    title="Delete article"
                                >
                                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                    </svg>
                                </button>
                            </div>
                        )}
                        {textContent ? (
                            <>
                                {/* Text-only: Full gradient background */}
                                <div class="absolute inset-0 bg-gradient-to-br from-blue-500 via-blue-600 to-cyan-600"></div>

                                {/* Centered title overlay */}
                                <div class="absolute inset-0 flex items-center justify-center p-6 pointer-events-none">
                                    <a href={articleUrl || `#article-${id}`} class="pointer-events-auto cursor-pointer">
                                        <h2 class="text-white text-xl md:text-2xl lg:text-3xl font-bold leading-tight text-center drop-shadow-lg line-clamp-3">
                                            {title}
                                        </h2>
                                    </a>
                                </div>

                                {/* Top metadata overlay (same as image version) */}
                                {/* <div class="absolute top-0 left-0 right-0 p-3 bg-gradient-to-b from-black/50 to-transparent">
                                    <div class="flex items-start gap-2">
                                        {source && (
                                            <a href={sourceUrl || "#"} class="flex items-center gap-1 text-xs text-white/90 hover:text-white transition-colors cursor-pointer">
                                                <span class="text-sm">📰</span>
                                                <span class="font-medium">{source}</span>
                                                {timeAgo && (
                                                    <>
                                                        <span>·</span>
                                                        <span>{timeAgo}</span>
                                                    </>
                                                )}
                                                {views !== undefined && (
                                                    <>
                                                        <span>·</span>
                                                        <span>👁️ {views.toLocaleString()}</span>
                                                    </>
                                                )}
                                            </a>
                                        )}
                                    </div>
                                </div> */}
                            </>

                        ) : isVideo && videoUrl ? (
                            <a href={articleUrl || `#article-${id}`} class="absolute inset-0 cursor-pointer">
                                {videoUrl.includes('youtube.com') || videoUrl.includes('youtu.be') ? (
                                    <div class="relative w-full h-full bg-slate-700">
                                        <div class="absolute inset-0 bg-cover bg-center"
                                            style={`background-image: url('https://img.youtube.com/vi/${videoUrl.split('v=')[1]?.split('&')[0] || videoUrl.split('/').pop()}/maxresdefault.jpg')`}
                                        />
                                        <div class="absolute inset-0 flex items-center justify-center bg-black/20 hover:bg-black/30 transition-colors">
                                            <div class="w-16 h-16 rounded-full bg-white/90 flex items-center justify-center pl-1 shadow-lg hover:scale-110 transition-transform">
                                                <svg class="w-8 h-8 text-slate-900" fill="currentColor" viewBox="0 0 24 24">
                                                    <path d="M8 5v14l11-7z" />
                                                </svg>
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div class="relative w-full h-full">
                                        <video src={videoUrl} class="w-full h-full object-cover" preload="metadata" />
                                        <div class="absolute inset-0 flex items-center justify-center bg-black/20 hover:bg-black/30 transition-colors">
                                            <div class="w-16 h-16 rounded-full bg-white/90 flex items-center justify-center pl-1 shadow-lg hover:scale-110 transition-transform">
                                                <svg class="w-8 h-8 text-slate-900" fill="currentColor" viewBox="0 0 24 24">
                                                    <path d="M8 5v14l11-7z" />
                                                </svg>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </a>
                        ) : (
                            <a href={articleUrl || `#article-${id}`} class="absolute inset-0 cursor-pointer">
                                {/* Check if image is a URL or emoji */}
                                {image.startsWith('http') ? (
                                    <img
                                        src={image}
                                        alt={title}
                                        class="w-full h-full object-cover transition-all duration-300 ease-out group-hover:scale-102 group-hover:brightness-110"
                                        loading="lazy"
                                    />
                                ) : (
                                    <div class="w-full h-full flex items-center justify-center text-6xl bg-gradient-to-br from-slate-300 to-slate-400 dark:from-slate-700 dark:to-slate-800 transition-all duration-300 ease-out group-hover:scale-102 group-hover:brightness-110">
                                        {image}
                                    </div>
                                )}
                            </a>
                        )}
                    </div>

                    {/* Square Variant: Bottom Section - Source/Time/Views, Title, Love, Category */}
                    <div class="bg-slate-100 dark:bg-slate-800 p-3 overflow-hidden flex flex-col" style="height: 70%;">
                        {/* Top: Source, Time, Views */}
                        <div class="flex items-start gap-2 mb-2 flex-shrink-0">
                            {source && (
                                <a href={sourceUrl || "#"} class="flex items-center gap-1 text-xs text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 transition-colors cursor-pointer">
                                    <span class="text-sm">📰</span>
                                    <span class="font-medium">{source}</span>
                                    {timeAgo && (
                                        <>
                                            <span>·</span>
                                            <span>{timeAgo}</span>
                                        </>
                                    )}
                                    {views !== undefined && (
                                        <>
                                            <span>·</span>
                                            <span>👁️ {views.toLocaleString()}</span>
                                        </>
                                    )}
                                </a>
                            )}
                        </div>

                        {/* Middle: Title */}
                        <a href={articleUrl || `#article-${id}`} class="cursor-pointer block hover:opacity-80 transition-opacity flex-grow mb-2" title="Read full article">
                            <h3 class="font-bold text-slate-700 dark:text-slate-300 leading-snug group-hover:text-slate-900 dark:group-hover:text-slate-100 transition-colors duration-200 line-clamp-3">
                                {title}
                            </h3>
                        </a>

                        {/* Bottom: Love Icon and Category */}
                        <div class="flex items-center justify-between flex-shrink-0">
                            {/* Love Icon - Bottom Left */}
                            {likes !== undefined && (
                                <button class="flex items-center gap-1 px-2 py-1 bg-slate-200/80 dark:bg-white/10 hover:bg-slate-300 dark:hover:bg-white/20 backdrop-blur-sm rounded-full text-xs text-slate-700 dark:text-white/90 hover:text-slate-900 dark:hover:text-white transition-all cursor-pointer" title="Like this article">
                                    <span class="text-sm">❤️</span>
                                    <span class="font-medium">{likes.toLocaleString()}</span>
                                </button>
                            )}

                            {/* Category - Bottom Right */}
                            <a href={categoryUrl || `#category-${category}`} class="text-xs text-slate-600 dark:text-white/70 hover:text-slate-900 dark:hover:text-white font-medium transition-colors cursor-pointer" title={`View all ${category} articles`}>
                                {category}
                            </a>
                        </div>
                    </div>
                </>
            ) : (
                <>
                    {/* Other Variants: Original Layout */}

                    {/* Edit/Delete Buttons - Show when authenticated (Other Variants) */}
                    {isAuthenticated && (
                        <div class="absolute top-2 right-2 z-20 flex gap-2">
                            <button
                                onClick$={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    const articleId = slideIds && hasSlides ? slideIds[currentSlide.value] : id;
                                    if (onEdit) onEdit(articleId);
                                }}
                                class="p-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow-lg transition-colors cursor-pointer"
                                title="Edit article"
                            >
                                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                </svg>
                            </button>
                            <button
                                onClick$={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    const articleId = slideIds && hasSlides ? slideIds[currentSlide.value] : id;
                                    if (onDelete) onDelete(articleId);
                                }}
                                class="p-2 bg-red-600 hover:bg-red-700 text-white rounded-lg shadow-lg transition-colors cursor-pointer"
                                title="Delete article"
                            >
                                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                            </button>
                        </div>
                    )}

                    {textContent ? (
                        <a
                            href={articleUrl || `#article-${id}`}
                            class="absolute inset-0 flex items-center justify-center p-8 bg-gradient-to-br from-blue-500 via-blue-600 to-cyan-600 cursor-pointer hover:brightness-110 transition-[filter]"
                        >
                            <h2 class="text-white text-2xl md:text-3xl lg:text-4xl font-bold leading-tight text-center">
                                {title}
                            </h2>
                        </a>
                    ) : youtubeId || (slides && slides.length > 0 && slides[0].youtubeId) ? (
                        <a
                            href={articleUrl || `#article-${id}`}
                            class="absolute inset-0 bg-cover bg-center group/video cursor-pointer"
                            style={`background-image: url('https://img.youtube.com/vi/${youtubeId || slides![0].youtubeId}/maxresdefault.jpg')`}
                        >
                            <div class="absolute inset-0 flex items-center justify-center bg-black/20 group-hover/video:bg-black/30 transition-colors">
                                <div class="w-16 h-16 rounded-full bg-white/90 flex items-center justify-center pl-1 shadow-lg transform group-hover/video:scale-110 transition-transform duration-300">
                                    <svg class="w-8 h-8 text-slate-900" fill="currentColor" viewBox="0 0 24 24">
                                        <path d="M8 5v14l11-7z" />
                                    </svg>
                                </div>
                            </div>
                        </a>
                    ) : (
                        <a
                            href={articleUrl || `#article-${id}`}
                            class="absolute inset-0 overflow-hidden bg-slate-300 dark:bg-slate-700 cursor-pointer"
                            onMouseEnter$={() => { if (hasSlides) isPaused.value = true; }}
                            onMouseLeave$={() => { if (hasSlides) isPaused.value = false; }}
                        >
                            {/* Slideshow Images/Videos/Text */}
                            {displaySlides.map((slide, index) => (
                                <div
                                    key={index}
                                    class={`absolute inset-0 transition-opacity duration-500 ${index === currentSlide.value ? 'opacity-100' : 'opacity-0'
                                        }`}
                                >
                                    {slide.youtubeId ? (
                                        <div class="relative w-full h-full">
                                            <div class="absolute inset-0 bg-cover bg-center"
                                                style={`background-image: url('https://img.youtube.com/vi/${slide.youtubeId}/maxresdefault.jpg')`}
                                            />
                                            <div class="absolute inset-0 flex items-center justify-center bg-black/20 hover:bg-black/30 transition-colors pointer-events-none">
                                                <div class="w-16 h-16 rounded-full bg-white/90 flex items-center justify-center pl-1 shadow-lg hover:scale-110 transition-transform">
                                                    <svg class="w-8 h-8 text-slate-900" fill="currentColor" viewBox="0 0 24 24">
                                                        <path d="M8 5v14l11-7z" />
                                                    </svg>
                                                </div>
                                            </div>
                                        </div>
                                    ) : slide.video ? (
                                        <div class="relative w-full h-full bg-slate-700">
                                            <video
                                                src={slide.video}
                                                class="w-full h-full object-cover"
                                                preload="metadata"
                                            />
                                            <div class="absolute inset-0 flex items-center justify-center bg-black/20 hover:bg-black/30 transition-colors pointer-events-none">
                                                <div class="w-16 h-16 rounded-full bg-white/90 flex items-center justify-center pl-1 shadow-lg hover:scale-110 transition-transform">
                                                    <svg class="w-8 h-8 text-slate-900" fill="currentColor" viewBox="0 0 24 24">
                                                        <path d="M8 5v14l11-7z" />
                                                    </svg>
                                                </div>
                                            </div>
                                        </div>
                                    ) : slide.image?.startsWith('http') ? (
                                        <img
                                            src={slide.image}
                                            alt={slide.title || title}
                                            class="w-full h-full object-cover transition-all duration-300 ease-out group-hover:scale-102 group-hover:brightness-110"
                                            loading="lazy"
                                        />
                                    ) : (
                                        <div class="w-full h-full flex items-center justify-center text-6xl bg-gradient-to-br from-slate-300 to-slate-400 dark:from-slate-700 dark:to-slate-800 transition-all duration-300 ease-out group-hover:scale-102 group-hover:brightness-110">
                                            {slide.image}
                                        </div>
                                    )}
                                </div>
                            ))}
                            {/* Dark gradient overlay for text readability */}
                            <div class="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent"></div>
                            {/* Slideshow Arrow Controls - Only show if has multiple slides */}
                            {hasSlides && displaySlides.length > 1 && (
                                <>
                                    <button
                                        onClick$={(e) => {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            isPaused.value = true;
                                            currentSlide.value = (currentSlide.value - 1 + displaySlides.length) % displaySlides.length;
                                            setTimeout(() => { isPaused.value = false; }, 3000); // Resume after 3 seconds
                                        }}
                                        class="absolute left-4 top-1/2 -translate-y-1/2 bg-black/30 hover:bg-black/50 text-white p-2 rounded-full transition-all z-10 pointer-events-auto cursor-pointer"
                                        aria-label="Previous slide"
                                    >
                                        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
                                        </svg>
                                    </button>
                                    <button
                                        onClick$={(e) => {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            isPaused.value = true;
                                            currentSlide.value = (currentSlide.value + 1) % displaySlides.length;
                                            setTimeout(() => { isPaused.value = false; }, 3000); // Resume after 3 seconds
                                        }}
                                        class="absolute right-4 top-1/2 -translate-y-1/2 bg-black/30 hover:bg-black/50 text-white p-2 rounded-full transition-all z-10 pointer-events-auto cursor-pointer"
                                        aria-label="Next slide"
                                    >
                                        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
                                        </svg>
                                    </button>
                                </>
                            )}
                        </a>
                    )}

                    {/* Content Overlay - Only show for regular image cards */}
                    {!textContent && !youtubeId && !(slides && slides.length > 0 && slides[0].youtubeId) && (
                        <div class="relative h-full flex flex-col justify-end p-4 pointer-events-none">
                            {/* Source/Views Section - Above Title */}
                            <div class="flex items-start gap-2 mb-2 pointer-events-auto">
                                {source && (
                                    <a href={sourceUrl || "#"} class="flex items-center gap-1 text-xs text-white/80 hover:text-white transition-colors cursor-pointer" title={`Visit ${source}`}>
                                        <span class="text-sm">📰</span>
                                        <span class="font-medium">{source}</span>
                                        {timeAgo && (
                                            <>
                                                <span>{variant === 'wide' ? '·' : ''}<span class={variant !== 'wide' ? 'hidden md:inline' : ''}>·</span></span>
                                                <span class={variant !== 'wide' ? 'hidden md:inline' : ''} title="Published time">{timeAgo}</span>
                                            </>
                                        )}
                                        {views !== undefined && (
                                            <>
                                                <span class={variant !== 'wide' ? 'hidden md:inline' : ''}>{variant === 'wide' ? '·' : '·'}</span>
                                                <span class={variant !== 'wide' ? 'hidden md:inline' : ''} title="Total views">👁️ {views.toLocaleString()}</span>
                                            </>
                                        )}
                                    </a>
                                )}
                            </div>

                            {/* Title Section - At Bottom */}
                            <a href={articleUrl || `#article-${id}`} class="pointer-events-auto cursor-pointer" title="Read full article">
                                <h3 class="font-bold text-slate-100 dark:text-slate-300 leading-tight group-hover:text-white dark:group-hover:text-slate-100 transition-colors duration-200 line-clamp-3">
                                    {title}
                                </h3>
                            </a>

                            {/* Bottom Section: Love Icon (Left), Dots (Center), Category (Right) */}
                            <div class="flex items-center justify-between mt-3 pointer-events-auto">
                                {/* Love Icon - Bottom Left */}
                                {likes !== undefined && (
                                    <button class="flex items-center gap-1 px-2 py-1 bg-white/10 hover:bg-white/20 backdrop-blur-sm rounded-full text-xs text-white/90 hover:text-white transition-all cursor-pointer" title="Like this article">
                                        <span class="text-sm">❤️</span>
                                        <span class="font-medium">{likes.toLocaleString()}</span>
                                    </button>
                                )}

                                {/* Slideshow Navigation Dots - Center (only for wide variant with slides) */}
                                {hasSlides && displaySlides.length > 1 && variant === 'wide' && (
                                    <div class="flex gap-2">
                                        {displaySlides.map((_, index) => (
                                            <button
                                                key={index}
                                                onClick$={(e) => {
                                                    e.preventDefault();
                                                    e.stopPropagation();
                                                    isPaused.value = true;
                                                    currentSlide.value = index;
                                                    setTimeout(() => { isPaused.value = false; }, 3000);
                                                }}
                                                class={`w-2 h-2 rounded-full transition-all cursor-pointer ${index === currentSlide.value
                                                    ? 'bg-white w-6'
                                                    : 'bg-white/50 hover:bg-white/75'
                                                    }`}
                                                aria-label={`Go to slide ${index + 1}`}
                                            />
                                        ))}
                                    </div>
                                )}

                                {/* Category - Bottom Right */}
                                <a href={categoryUrl || `#category-${category}`} class="text-xs text-white/70 hover:text-white dark:text-white/70 dark:hover:text-white font-medium transition-colors cursor-pointer" title={`View all ${category} articles`}>
                                    {category}
                                </a>
                            </div>
                        </div>
                    )}
                </>
            )
            }
        </article >
    );
});
