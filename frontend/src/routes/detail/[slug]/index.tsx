import { component$, useSignal, useVisibleTask$, $ } from "@builder.io/qwik";
import { useLocation, type DocumentHead, Link } from "@builder.io/qwik-city";
import { Navigation } from "~/components/navigation/navigation";
import { ArticleCard } from "~/components/article-card/article-card";
import { contentApi, ContentTypeChoice, type Content } from "~/services/api";
import { ScrollToTop } from "~/components/scroll-to-top/scroll-to-top";
import { Footer } from "~/components/footer/footer";

export default component$(() => {
    const loc = useLocation();
    const content = useSignal<Content | null>(null);
    const relatedArticles = useSignal<Content[]>([]);
    const banners = useSignal<Content[]>([]);
    const newsHighlights = useSignal<Content[]>([]);  // For the news card
    const isLoading = useSignal(true);
    const error = useSignal<string | null>(null);

    // Lightbox state
    const lightboxOpen = useSignal(false);
    const lightboxImage = useSignal<string>('');
    const isYoutubePlaying = useSignal(false);  // Track if YouTube video is playing

    // Get the slug from URL parameter
    const slug = loc.params.slug;

    useVisibleTask$(async () => {
        if (!slug) {
            error.value = "No content slug provided";
            isLoading.value = false;
            return;
        }

        try {
            // Fetch main content by slug
            const data = await contentApi.getContentBySlug(slug);
            content.value = data;

            // Fetch related articles (same content_type, exclude current)
            if (data) {
                const allContentResponse = await contentApi.getContents({
                    content_type: ContentTypeChoice.CONTENT,
                    is_active: true
                });
                // Handle paginated response
                const allContent = (allContentResponse as any).results || allContentResponse;
                relatedArticles.value = Array.isArray(allContent)
                    ? allContent.filter((c: Content) => c.slug !== slug).slice(0, 6)
                    : [];

                // Fetch banners
                const bannerResponse = await contentApi.getContents({
                    content_type: ContentTypeChoice.BANNER,
                    is_active: true
                });
                const bannerContent = (bannerResponse as any).results || bannerResponse;
                banners.value = Array.isArray(bannerContent) ? bannerContent.slice(0, 3) : [];

                // Fetch navigation/news highlights for the sidebar card
                const newsResponse = await contentApi.getContents({
                    content_type: ContentTypeChoice.NAVIGATION,
                    is_active: true
                });
                const newsContent = (newsResponse as any).results || newsResponse;
                newsHighlights.value = Array.isArray(newsContent) ? newsContent.slice(0, 3) : [];
            }
        } catch (err) {
            console.error("Error loading content:", err);
            error.value = "Failed to load content";
        } finally {
            isLoading.value = false;
        }
    });

    return (
        <>
            <Navigation />

            {/* <div class="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-900 dark:to-slate-800"> */}
            <div class="container mx-auto px-6 pt-24">
                {/* Breadcrumb */}
                {content.value && !isLoading.value && (
                    <nav class="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400 mb-6">
                        <Link href="/#breakingnews" class="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                            Home
                        </Link>
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
                        </svg>
                        <span class="text-slate-900 dark:text-white font-medium truncate max-w-md">
                            {content.value.value_text || "Article"}
                        </span>
                    </nav>
                )}

                {/* Loading State */}
                {isLoading.value && (
                    <div class="flex items-center justify-center py-20">
                        <div class="flex flex-col items-center gap-4">
                            <svg class="animate-spin h-12 w-12 text-blue-600 dark:text-blue-400" fill="none" viewBox="0 0 24 24">
                                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            <span class="text-slate-600 dark:text-slate-400 font-medium">Loading content...</span>
                        </div>
                    </div>
                )}

                {/* Error State */}
                {error.value && (
                    <div class="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6 text-center">
                        <svg class="w-12 h-12 text-red-600 dark:text-red-400 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                        <p class="text-red-700 dark:text-red-300 font-semibold text-lg">{error.value}</p>
                    </div>
                )}

                {/* Two-Column Layout */}
                {content.value && !isLoading.value && (
                    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-12">
                        {/* Main Content Column (Left) */}
                        <div class="lg:col-span-2">
                            <article class="overflow-hidden mb-6">
                                {/* Featured Video or Image */}
                                {content.value.value_type === 3 && content.value.value_video ? (
                                    /* Video Content */
                                    <div class="relative h-96 rounded-md overflow-hidden bg-slate-700">
                                        {content.value.value_video.includes('youtube.com') || content.value.value_video.includes('youtu.be') ? (
                                            /* YouTube Video */
                                            <>
                                                {isYoutubePlaying.value ? (
                                                    <iframe
                                                        src={`https://www.youtube.com/embed/${content.value.value_video.split('v=')[1]?.split('&')[0] || content.value.value_video.split('/').pop()}?autoplay=1&controls=1`}
                                                        class="w-full h-full object-cover"
                                                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                                        allowFullscreen
                                                        title={content.value.value_text || 'Video'}
                                                    />
                                                ) : (
                                                    <>
                                                        <div
                                                            class="absolute inset-0 bg-cover bg-center"
                                                            style={`background-image: url('https://img.youtube.com/vi/${content.value.value_video.split('v=')[1]?.split('&')[0] || content.value.value_video.split('/').pop()}/maxresdefault.jpg')`}
                                                        />
                                                        <button
                                                            class="absolute inset-0 flex items-center justify-center bg-black/30 hover:bg-black/40 transition-colors cursor-pointer"
                                                            onClick$={$(() => {
                                                                isYoutubePlaying.value = true;
                                                            })}
                                                            aria-label="Play Video"
                                                        >
                                                            <div class="w-24 h-24 rounded-full bg-white/95 flex items-center justify-center pl-1 shadow-2xl hover:scale-110 transition-transform duration-300">
                                                                <svg class="w-12 h-12 text-slate-900" fill="currentColor" viewBox="0 0 24 24">
                                                                    <path d="M8 5v14l11-7z" />
                                                                </svg>
                                                            </div>
                                                        </button>
                                                    </>
                                                )}
                                            </>
                                        ) : (
                                            /* Direct Video URL */
                                            <video
                                                src={content.value.value_video}
                                                class="w-full h-full object-cover"
                                                controls
                                                preload="metadata"
                                            />
                                        )}
                                    </div>
                                ) : content.value.images && content.value.images.length > 0 && (
                                    /* Image Content */
                                    <div
                                        class="relative h-96 rounded-md overflow-hidden cursor-pointer group"
                                        onClick$={() => {
                                            lightboxImage.value = content.value!.images![0].image_url || content.value!.images![0].image;
                                            lightboxOpen.value = true;
                                        }}
                                    >
                                        <img
                                            src={content.value.images[0].image_url || content.value.images[0].image}
                                            alt={content.value.images[0].alt_text || content.value.value_text || "Content image"}
                                            class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                        />
                                        <div class="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
                                        <div class="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                                            <div class="bg-white/20 backdrop-blur-sm rounded-full p-4">
                                                <svg class="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
                                                </svg>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Content Body */}
                                <div class="p-8">
                                    {/* Metadata */}
                                    <div class="flex flex-wrap items-center gap-3 mb-4 text-sm">
                                        {content.value.content_type_display && (
                                            <span class="px-3 py-1 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded-full font-medium">
                                                {content.value.content_type_display}
                                            </span>
                                        )}
                                        {content.value.value_type_display && (
                                            <span class="px-3 py-1 bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300 rounded-full font-medium">
                                                {content.value.value_type_display}
                                            </span>
                                        )}
                                        {content.value.created_at && (
                                            <span class="text-slate-600 dark:text-slate-400">
                                                {new Date(content.value.created_at).toLocaleDateString('en-US', {
                                                    year: 'numeric',
                                                    month: 'long',
                                                    day: 'numeric'
                                                })}
                                            </span>
                                        )}
                                    </div>

                                    {/* Title */}
                                    {content.value.value_text && (
                                        <h1 class="text-4xl font-bold text-slate-900 dark:text-white mb-6 leading-tight">
                                            {content.value.value_text}
                                        </h1>
                                    )}

                                    {/* Template Info */}
                                    {content.value.template_name && (
                                        <div class="flex items-center gap-2 mb-6 text-slate-600 dark:text-slate-400">
                                            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                                            </svg>
                                            <span>Template: {content.value.template_name}</span>
                                        </div>
                                    )}

                                    {/* Content Body */}
                                    {content.value.value_textarea && (
                                        <div
                                            class="prose prose-lg dark:prose-invert max-w-none mb-8"
                                            dangerouslySetInnerHTML={content.value.value_textarea}
                                        />
                                    )}

                                    {/* Additional Images Gallery */}
                                    {content.value.images && content.value.images.length > 1 && (
                                        <div class="mt-8">
                                            <h2 class="text-2xl font-bold text-slate-900 dark:text-white mb-4">Image Gallery</h2>
                                            <div class="grid grid-cols-2 md:grid-cols-3 gap-4">
                                                {content.value.images.slice(1).map((img, idx) => (
                                                    <div
                                                        key={idx}
                                                        class="relative aspect-video rounded-lg overflow-hidden group cursor-pointer"
                                                        onClick$={() => {
                                                            lightboxImage.value = img.image_url || img.image;
                                                            lightboxOpen.value = true;
                                                        }}
                                                    >
                                                        <img
                                                            src={img.image_url || img.image}
                                                            alt={img.alt_text || `Gallery image ${idx + 1}`}
                                                            class="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                                                        />
                                                        <div class="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-black/20">
                                                            <svg class="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
                                                            </svg>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </article>

                            {/* Related Articles Section */}
                            {relatedArticles.value.length > 0 && (
                                <>
                                    <h2 class="text-2xl font-bold text-slate-900 dark:text-white mb-6">More Articles to Read</h2>
                                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {relatedArticles.value.map((article) => (
                                            <ArticleCard
                                                key={article.slug}
                                                id={article.id || 0}
                                                title={article.value_text || 'Untitled'}
                                                category={article.content_type_display || 'General'}
                                                image={article.images?.[0]?.image_url || article.images?.[0]?.image || ''}
                                                source="Database"
                                                timeAgo={new Date(article.created_at || '').toLocaleDateString()}
                                                variant="square"
                                                articleUrl={`/detail/${article.slug}`}
                                            />
                                        ))}
                                    </div>
                                </>
                            )}
                        </div>

                        {/* Sidebar Column (Right) */}
                        <div class="lg:col-span-1">
                            <div class="sticky top-24 space-y-6">
                                {/* News Highlights Card */}
                                {newsHighlights.value.length > 0 && (
                                    <div class="bg-white dark:bg-slate-800 rounded-xl shadow-lg overflow-hidden p-4">
                                        <div class="flex items-center gap-2 mb-4 pb-3 border-b border-slate-200 dark:border-slate-700">
                                            <svg class="w-5 h-5 text-blue-600 dark:text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                                                <path d="M2 5a2 2 0 012-2h7a2 2 0 012 2v4a2 2 0 01-2 2H9l-3 3v-3H4a2 2 0 01-2-2V5z"></path>
                                                <path d="M15 7v2a4 4 0 01-4 4H9.828l-1.766 1.767c.28.149.599.233.938.233h2l3 3v-3h2a2 2 0 002-2V9a2 2 0 00-2-2h-1z"></path>
                                            </svg>
                                            <h3 class="font-bold text-slate-900 dark:text-white">Latest News</h3>
                                            <a href="/" class="ml-auto text-blue-600 dark:text-blue-400 hover:text-blue-700">
                                                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                                </svg>
                                            </a>
                                        </div>
                                        <div class="space-y-3">
                                            {newsHighlights.value.map((news) => (
                                                <Link
                                                    key={news.slug}
                                                    href={`/detail/${news.slug}`}
                                                    class="block text-sm text-slate-700 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors line-clamp-2"
                                                >
                                                    {news.value_text}
                                                </Link>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Banners */}
                                {banners.value.map((banner, idx) => (
                                    <div key={idx} class="bg-white dark:bg-slate-800 rounded-xl shadow-lg overflow-hidden">
                                        {banner.images && banner.images.length > 0 && (
                                            <img
                                                src={banner.images[0].image_url || banner.images[0].image}
                                                alt={banner.value_text || 'Banner'}
                                                class="w-full h-auto"
                                            />
                                        )}
                                        {banner.value_text && (
                                            <div class="p-4">
                                                <h3 class="font-bold text-slate-900 dark:text-white">{banner.value_text}</h3>
                                                {banner.value_textarea && (
                                                    <div
                                                        class="prose prose-sm dark:prose-invert mt-2"
                                                        dangerouslySetInnerHTML={banner.value_textarea}
                                                    />
                                                )}
                                            </div>
                                        )}
                                    </div>
                                ))}

                                {/* Empty state if no banners */}
                                {banners.value.length === 0 && (
                                    <div class="bg-slate-100 dark:bg-slate-700/50 rounded-xl p-6 text-center">
                                        <p class="text-slate-600 dark:text-slate-400 text-sm">No banners available</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* Lightbox Modal */}
                {lightboxOpen.value && (
                    <div
                        class="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4"
                        onClick$={() => lightboxOpen.value = false}
                    >
                        <button
                            class="absolute top-4 right-4 text-white hover:text-gray-300 p-2 cursor-pointer"
                            onClick$={() => lightboxOpen.value = false}
                        >
                            <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                        <img
                            src={lightboxImage.value}
                            alt="Full screen"
                            class="max-w-full max-h-full object-contain"
                        />
                    </div>
                )}

                {/* Footer */}
                <Footer />

                {/* Scroll to Top Button */}
                <ScrollToTop />
            </div>
            {/* </div> */}
        </>
    );
});

export const head: DocumentHead = ({ params, resolveValue }) => {
    // const site = resolveValue(useSiteData);
    const slug = params.slug || '';
    const title = slug.split('-').map(word =>
        word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');

    return {
        title: title || "Article Detail",
        meta: [
            {
                name: "description",
                content: "Read the full article",
            },
        ],
    };
};
