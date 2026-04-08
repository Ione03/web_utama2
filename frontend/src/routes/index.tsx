import { component$, useContext, useVisibleTask$, useSignal, $ } from "@builder.io/qwik";
import type { DocumentHead } from "@builder.io/qwik-city";
import { routeLoader$, useLocation } from "@builder.io/qwik-city";
import { Navigation } from "~/components/navigation/navigation";
import { siteApi, siteMetadataApi, authApi, contentApi, userSettingsApi, ContentTypeChoice, type AuthUser } from "~/services/api";
import { AuthModal } from "~/components/authModal";
import { ContentModal } from "~/components/content-modal/content-modal";
// import type { Site } from "~/services/api";
import { GlobalContext } from "~/services/global-context";
import { Hero } from "~/components/hero/hero";
import { BreakingNews } from "~/components/breaking-news/breaking-news";
import { ArticleCard } from "~/components/article-card/article-card";
import { ScrollToTop } from "~/components/scroll-to-top/scroll-to-top";
import { useIdleTimer } from "~/hooks/useIdleTimer";
import { Footer } from "~/components/footer/footer";
import { WelcomeModal } from "~/components/welcome-modal/welcome-modal";
import { SettingsModal } from "~/components/settings-modal/settings-modal";
import { MenuManagerModal } from "~/components/navigation/menu-manager-modal";

/**
 * Helper function to format date as relative time in Indonesian
 */
const getRelativeTime = (dateString: string): string => {
  const now = new Date();
  const date = new Date(dateString);
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffSec < 60) {
    return `${diffSec} detik`;
  } else if (diffMin < 60) {
    return `${diffMin} menit`;
  } else if (diffHour < 24) {
    return `${diffHour} jam`;
  } else if (diffDay < 7) {
    return `${diffDay} hari`;
  } else {
    return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
  }
};

/**
 * Route loader - runs on server and client
 * This loads site data and makes it available for both the component and head
 */
export const useSiteData = routeLoader$(async (requestEvent) => {
  try {
    // Get domain from request
    const domain = requestEvent.url.hostname;
    // console.log('Loading site data for:', domain);

    // Fetch site data
    const site = await siteApi.getSiteByDomain(domain);
    // console.log('Loaded site data:', site);
    // site['test'] = 'This is a test value';    


    const siteMetaData = await siteMetadataApi.getMetadata(site.id);
    // console.log('Loaded site metadata:', siteMetaData);

    // Combine site and metadata
    const combinedSite = {
      ...site,
      metadata: siteMetaData
    };

    return combinedSite;

  } catch (error) {
    console.error('Error loading site in routeLoader:', error);
    // Return default data on error with metadata
    return {
      id: 1,
      domain: 'localhost',
      name: 'Authbox Site',
      metadata: {
        site_title: 'Authbox Site',
        site_tagline: 'Secure Authentication Platform',
        meta_description: 'Welcome to Authbox - A secure authentication platform'
      }
    }
    // as Site;
  }
});

export default component$(() => {
  // store SITE DATA globally
  const global = useContext(GlobalContext);

  const loc = useLocation();  // Track URL including hash
  const siteData = useSiteData(); // Get data from route loader
  // const siteId = useSignal<Site | null>(null);

  // Infinite scroll state
  const visibleCount = useSignal(0); // Initially show 10 articles
  const sentinelRef = useSignal<Element>();
  const isLoading = useSignal(false);

  // Database content state
  const dbContent = useSignal<any[]>([]);
  const isLoadingContent = useSignal(true);
  const contentError = useSignal<string | null>(null);

  // Edit modal state  
  const editContentCode = useSignal<string | null>(null);
  const editModalVisible = useSignal(false);

  // console.log('Global Context Site ID:', siteData.id, siteData.domain, siteData.name);
  // Sample news articles data with varied layouts
  const articles = [
    {
      id: 1,
      title: "Best PPT Templates - Unlimited Downloads - Choose From A Wide Variety",
      category: "Technology",
      image: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&h=600&fit=crop",
      source: "msn.com",
      timeAgo: "3h",
      views: 12500,
      likes: 1240,
      variant: "wide" as const,
      slides: [
        {
          image: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&h=600&fit=crop",
          title: "Best PPT Templates - Unlimited Downloads"
        },
        {
          image: "https://images.unsplash.com/photo-1542831371-29b0f74f9713?w=800&h=600&fit=crop",
          title: "Coding and Development Templates"
        },
        {
          image: "https://images.unsplash.com/photo-1633265486064-086b219458ec?w=800&h=600&fit=crop",
          title: "Business Presentation Templates"
        }
      ]
    },
    {
      id: 2,
      title: "Harga emas Pegadaian hari ini 30 Desember 2025 turun, UBS dan...",
      category: "Finance",
      image: "https://images.unsplash.com/photo-1610375461246-83df859d849d?w=800&h=600&fit=crop",
      source: "kompas.com",
      timeAgo: "4jam",
      views: 15600,
      likes: 2340,
      variant: "square" as const,
    },
    {
      id: 3,
      title: "Tipu viral jadi maskot daerah, sorotan macam patih...",
      category: "News",
      image: "https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=800&h=600&fit=crop",
      source: "tribunnews.com",
      timeAgo: "2hari",
      views: 8900,
      likes: 890,
      variant: "square" as const,
    },
    {
      id: 4,
      title: "SAR kerahkan drone cari empat WNA di Labuan Bajo",
      category: "Breaking",
      image: "https://images.unsplash.com/photo-1473968512647-3e447244af8f?w=800&h=600&fit=crop",
      source: "Kompas.id",
      timeAgo: "31mnt",
      views: 21000,
      likes: 3200,
      variant: "square" as const,
    },
    {
      id: 5,
      title: "Python learning course - Code Templates included - Python & R...",
      category: "Education",
      image: "https://images.unsplash.com/photo-1542831371-29b0f74f9713?w=800&h=600&fit=crop",
      source: "msn.com",
      timeAgo: "5h",
      views: 5400,
      likes: 620,
      variant: "square" as const,
    },
    {
      id: 6,
      title: "7 hewan imut mengenali emosi manusia, lebih peka dari yang kita kira",
      category: "Science",
      image: "https://images.unsplash.com/photo-1425082661705-1834bfd09dca?w=800&h=600&fit=crop",
      source: "msn.com",
      timeAgo: "6h",
      views: 11200,
      likes: 1560,
      variant: "wide" as const,
    },
    {
      id: 6.5,
      title: "Amazing Wildlife Documentary - Planet Earth",
      category: "Video",
      image: "https://images.unsplash.com/photo-1425082661705-1834bfd09dca?w=800&h=600&fit=crop", // Fallback thumbnail
      source: "YouTube",
      timeAgo: "2h",
      views: 18700,
      likes: 2450,
      variant: "tall" as const,
      slides: [
        {
          youtubeId: "TP5Bh2EVCPo",
          title: "Amazing Wildlife Documentary"
        }
      ]
    },
    {
      id: 6.6,
      title: "Breaking: Epic Nature Moments Caught on Camera",
      category: "Video",
      image: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&h=600&fit=crop",
      source: "National Geographic",
      timeAgo: "1h",
      views: 25300,
      likes: 3200,
      variant: "large" as const,
      youtubeId: "LXb3EKWsInQ"
    },
    {
      id: 6.7,
      title: "Pengumuman Penting dari Diskomdigi - Program Transformasi Digital 2025",
      category: "Announcement",
      image: "", // No image - will show text
      source: "Diskomdigi",
      timeAgo: "23 Jam",
      views: 1234,
      likes: 34,
      variant: "square" as const,
      textContent: "This is header no ellipsis. Lorem ipsum dolor sit amet consectetur adipiscing elit sed do eiusmod. Lorem ipsum dolor sit amet consectetur adipiscing elit sed do"
    },
    {
      id: 6.8,
      title: "BREAKING NEWS: Important Government Announcement on Digital Infrastructure Development",
      category: "Breaking News",
      image: "",
      source: "Gov.id",
      timeAgo: "30 min",
      views: 45600,
      likes: 5200,
      variant: "large" as const,
      textContent: "Major announcement regarding national digital transformation initiative"
    },
    {
      id: 7,
      title: "7 hewan imut mengenali emosi manusia, lebih peka dari yang kita kira",
      category: "Science",
      image: "https://images.unsplash.com/photo-1425082661705-1834bfd09dca?w=800&h=600&fit=crop",
      source: "msn.com",
      timeAgo: "6h",
      views: 11200,
      likes: 1560,
      variant: "square" as const,
    },
    {
      id: 8,
      title: "Ramalan zodiak hari ini 30 Desember 2025, Scorpio perlu kontrol nada bicara",
      category: "Lifestyle",
      image: "https://images.unsplash.com/photo-1532968961962-8a0cb3a2d4f5?w=800&h=600&fit=crop",
      source: "Cumhuriyet",
      timeAgo: "1hari",
      views: 9800,
      likes: 1120,
      variant: "wide" as const,
    },
    {
      id: 8,
      title: "Automatic PC Repair Tool - 2020 PC Repair Software - Trusted P...",
      category: "Tech",
      image: "https://images.unsplash.com/photo-1587831992813-a3161de11320?w=800&h=600&fit=crop",
      source: "techcro.com",
      timeAgo: "8h",
      views: 18500,
      likes: 2670,
      variant: "square" as const,
    },
    {
      id: 9,
      title: "31° Curah Hujan Indeks UV (sore) Muka laut: Peta",
      category: "Weather",
      image: "https://images.unsplash.com/photo-1561484930-998b6a7b22e8?w=800&h=600&fit=crop",
      source: "Garcinq",
      timeAgo: "2h",
      views: 7600,
      likes: 910,
      variant: "tall" as const,
    },
    {
      id: 10,
      title: "Yudo Putra Purihara tempat gaya hidup elit anak pedalat, pilih mx...",
      category: "Lifestyle",
      image: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&h=600&fit=crop",
      source: "Sukra Terbanyak",
      timeAgo: "1hari",
      views: 14300,
      likes: 1980,
      variant: "square" as const,
    },
    {
      id: 11,
      title: "Python learning course - Learn Python For Data Get Certificate Of...",
      category: "Education",
      image: "https://images.unsplash.com/photo-1516116216624-53e697fedbea?w=800&h=600&fit=crop",
      source: "udemy.com",
      timeAgo: "9h",
      views: 6700,
      likes: 720,
      variant: "square" as const,
    },
    {
      id: 12,
      title: "Top 5 parfum lokal wanita terlaris, ada parfum favoritmu?",
      category: "Beauty",
      image: "https://images.unsplash.com/photo-1541643600914-78b084683601?w=800&h=600&fit=crop",
      source: "Heddiva.com",
      timeAgo: "12jam",
      views: 10100,
      likes: 1340,
      variant: "square" as const,
    },
    {
      id: 13,
      title: "Dapatkan rahasia di Microsoft 365",
      category: "Business",
      image: "https://images.unsplash.com/photo-1633265486064-086b219458ec?w=800&h=600&fit=crop",
      source: "Microsoft 365",
      timeAgo: "5h",
      views: 13400,
      likes: 1750,
      variant: "square" as const,
    },
    {
      id: 14,
      title: "Hari Bala digelar di sebagai tanggap kota Universitas",
      category: "Events",
      image: "https://images.unsplash.com/photo-1523580494863-6f3031224c94?w=800&h=600&fit=crop",
      source: "TribunPapua.Com",
      timeAgo: "1hari",
      views: 4800,
      likes: 540,
      variant: "square" as const,
    },
    {
      id: 15,
      title: "Wildlife Conservation Shows Record Success in Endangered Species Recovery",
      category: "Environment",
      image: "https://images.unsplash.com/photo-1564760055775-d63b17a55c44?w=800&h=600&fit=crop",
      source: "nature.com",
      timeAgo: "14h",
      views: 16800,
      likes: 2210,
      variant: "square" as const,
    },
    {
      id: 16,
      title: "Gaming Industry Reveals Next-Generation Console with Revolutionary Features",
      category: "Gaming",
      image: "https://images.unsplash.com/photo-1606144402396-d742a6e2f6d5?w=800&h=600&fit=crop",
      source: "ign.com",
      timeAgo: "18h",
      views: 19200,
      likes: 2890,
      variant: "wide" as const,
    },
    {
      id: 17,
      title: "Space Mission Reaches Critical Milestone in Mars Exploration Program",
      category: "Science",
      image: "https://images.unsplash.com/photo-1446776653964-20c1d3a81b06?w=800&h=600&fit=crop",
      source: "nasa.gov",
      timeAgo: "20h",
      views: 22500,
      likes: 3450,
      variant: "square" as const,
    },
    {
      id: 18,
      title: "Electric Vehicle Market Sees Record Breaking Sales This Quarter",
      category: "Automotive",
      image: "https://images.unsplash.com/photo-1593941707882-a5bba14938c7?w=800&h=600&fit=crop",
      source: "reuters.com",
      timeAgo: "1d",
      views: 11900,
      likes: 1620,
      variant: "square" as const,
    },
  ];

  // Breaking news data
  const breakingNews = [
    {
      id: 1,
      source: "Republika",
      title: "OTT pegawai pajak Jakut, KPK tangkap 8 orang",
      timeAgo: "17jam",
      url: "#breaking-1",
    },
    {
      id: 2,
      source: "Kompas.com",
      title: "Dirobohkan Anies, JPO Sarinah dibangun kembali era Pramono",
      timeAgo: "2jam",
      url: "#breaking-2",
    },
    {
      id: 3,
      source: "CNN Indonesia",
      title: "BMKG: Waspada cuaca ekstrem di beberapa wilayah Indonesia",
      timeAgo: "1jam",
      url: "#breaking-3",
    },
    {
      id: 4,
      source: "Detik.com",
      title: "Pemerintah umumkan kebijakan baru tentang subsidi BBM",
      timeAgo: "45mnt",
      url: "#breaking-4",
    },
  ];

  // const likes = useSignal<number>(0);
  // User authentication state
  const currentUser = useSignal<AuthUser | null>(null);
  const isCheckingAuth = useSignal(true);
  const openLoginModal = useSignal<(() => void) | null>(null);

  // Welcome modal state
  const showWelcomeModal = useSignal(false);
  const welcomeUser = useSignal<AuthUser | null>(null);

  // Content modal visibility state (to hide logout button when modal is open)
  const isContentModalOpen = useSignal(false);

  // Settings modal state
  const settingsModalOpen = useSignal(false);
  const userSettings = useSignal<Record<string, string>>({});

  // Account dropdown state (for mobile click support)
  const accountDropdownOpen = useSignal(false);

  // Menu manager modal state
  const menuManagerOpen = useSignal(false);

  // const global = useContext(GlobalContext);
  useVisibleTask$(async () => {
    console.log('Site Data in component:', siteData.value);
    // store SITE DATA globally
    global.id = siteData.value.id;
    global.domain = siteData.value.domain;
    global.name = siteData.value.name;

    // Check if user is logged in
    try {
      const user = await authApi.getCurrentUser();
      currentUser.value = user;
    } catch (error) {
      // User not logged in
      currentUser.value = null;
    } finally {
      isCheckingAuth.value = false;
    }

    // Load content from database
    try {
      const response = await contentApi.getContents({ content_type: ContentTypeChoice.CONTENT, page_size: 1000 });
      dbContent.value = response.results || [];
      console.log('Loaded content from database:', dbContent.value, 'items');
    } catch (error) {
      console.error('Error loading content:', error);
      contentError.value = 'Failed to load content';
    } finally {
      isLoadingContent.value = false;
    }
  });

  // Handle login success
  const handleLoginSuccess = $((user: AuthUser) => {
    currentUser.value = user;
    console.log('User logged in:', user);

    // Show welcome modal
    welcomeUser.value = user;
    showWelcomeModal.value = true;
  });

  // Load user settings when user logs in
  useVisibleTask$(({ track }) => {
    track(() => currentUser.value);
    if (currentUser.value) {
      userSettingsApi.getUserSettings()
        .then((response) => {
          userSettings.value = response.settings;
        })
        .catch((error) => console.error('Error loading settings:', error));
    }
  });

  // Handle logout (user-initiated - with confirmation)
  const handleLogout = $(async () => {
    // Show confirmation dialog
    const confirmed = confirm('Are you sure you want to logout?');

    if (!confirmed) {
      return; // User cancelled logout
    }

    try {
      await authApi.logout();
      currentUser.value = null;
      console.log('User logged out successfully');
    } catch (error) {
      console.error('Logout failed:', error);
      // Force logout on client even if server fails
      currentUser.value = null;
    }
  });

  // Handle immediate logout (automatic - no confirmation)
  const handleImmediateLogout = $(async () => {
    try {
      await authApi.logout();
      currentUser.value = null;
      console.log('User logged out automatically (session timeout)');
    } catch (error) {
      console.error('Automatic logout failed:', error);
      // Force logout on client even if server fails
      currentUser.value = null;
    }
  });

  // Auto-logout after 10 minutes of inactivity
  useIdleTimer({
    timeout: 10 * 60 * 1000, // 10 minutes in milliseconds
    onIdle: $(() => {
      if (currentUser.value) {
        console.log('Auto-logout triggered after 10 minutes of inactivity');
        handleImmediateLogout();
      }
    })
  });

  // Handle hash scroll on page load (e.g., /#breakingnews)
  useVisibleTask$(({ track }) => {
    // Track location changes to detect hash navigation
    track(() => loc.url.hash);

    if (typeof window !== 'undefined') {
      // Disable browser's automatic scroll restoration
      if ('scrollRestoration' in history) {
        history.scrollRestoration = 'manual';
      }

      const hash = loc.url.hash;
      console.log('Hash detected:', hash);

      if (hash) {
        // Prevent default scroll-to-top on navigation
        window.scrollTo(0, 0);

        // Wait for the DOM to be fully ready, then scroll to the hash target
        setTimeout(() => {
          const element = document.querySelector(hash);
          console.log('Scrolling to element:', element);
          if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
        }, 600); // Increased delay to ensure all content is rendered
      }
    }
  });

  // Slideshow state - Must be declared before use in useVisibleTask
  const lovedSlides = useSignal<Record<number, boolean>>({});

  // Load loved articles from localStorage
  useVisibleTask$(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('lovedArticles');
      if (saved) {
        try {
          lovedSlides.value = JSON.parse(saved);
        } catch (e) {
          console.error('Failed to load loved articles:', e);
        }
      }
    }
  });

  // Save loved articles to localStorage whenever it changes
  useVisibleTask$(({ track }) => {
    track(() => JSON.stringify(lovedSlides.value));

    if (typeof window !== 'undefined' && Object.keys(lovedSlides.value).length > 0) {
      localStorage.setItem('lovedArticles', JSON.stringify(lovedSlides.value));
    }
  });


  // Get visible articles
  // Merge database content with sample articles (db content first)
  const mergedArticles = [
    ...dbContent.value.map((content: any) => {
      const hasImage = content.images?.[0]?.image_url || content.images?.[0]?.image;
      const isVideo = content.value_type === 3 && content.value_video;

      // Debug logging for video content
      // if (isVideo) {
      //   console.log('Video content detected:', {
      //     title: content.value_text,
      //     videoUrl: content.value_video,
      //     value_type: content.value_type
      //   });
      // }

      // console.log('Mapping DB content to article:', content.title, 'Has image:', !!hasImage, content.slug);
      return {
        id: content.encrypted_id,
        title: content.value_text || 'Untitled',
        category: content.categories?.[0] || 'General',
        image: hasImage || '',  // Use image_url for full URL
        videoUrl: isVideo ? content.value_video : undefined,  // Add video URL for video type
        isVideo: isVideo,  // Mark as video content
        textContent: !hasImage && !isVideo ? content.value_text || 'Untitled' : undefined,  // Show as text-only card if no image and no video
        source: 'Database',
        timeAgo: getRelativeTime(content.created_at),
        views: 0,
        likes: 0,
        variant: 'square' as const,
        articleUrl: `/detail/${content.slug || content.encrypted_code}`,  // Link to detail page using slug
        isDbContent: true,
        dbData: content
      };
    }),
    ...articles
  ];

  const visibleArticles = mergedArticles.slice(0, visibleCount.value);

  // Slideshow state
  const slideshowArticles = visibleArticles.slice(0, 5);
  // console.log('Slideshow Articles:', slideshowArticles);

  const gridArticles = visibleArticles.slice(5);
  const currentSlide = useSignal(0);
  const isPaused = useSignal(false);
  const isYoutubePlaying = useSignal(false);  // Track if YouTube video is playing
  const hasMore = visibleCount.value < mergedArticles.length;

  // Auto-rotate slideshow - poll until data is ready
  useVisibleTask$(({ cleanup }) => {
    let rotationInterval: NodeJS.Timeout | null = null;
    let checkInterval: NodeJS.Timeout | null = null;

    // Function to start rotation
    const startRotation = () => {
      if (rotationInterval) return; // Already started

      // Recompute slideshow count from source data
      const initialCount = Math.min(5, mergedArticles.slice(0, visibleCount.value).length);
      console.log('✅ Starting slideshow rotation with', initialCount, 'slides');

      rotationInterval = setInterval(() => {
        // Recompute count each time in case data changes
        const currentCount = Math.min(5, mergedArticles.slice(0, visibleCount.value).length);
        if (!isPaused.value && currentCount > 1) {
          currentSlide.value = (currentSlide.value + 1) % currentCount;
        }
      }, 5000);
    };

    // Check if data is ready, if not poll every 500ms
    const checkForData = () => {
      // Recompute from source - mergedArticles is the array computed from dbContent
      const currentArticles = mergedArticles.slice(0, visibleCount.value);
      const slideshowCount = Math.min(5, currentArticles.length);

      if (slideshowCount > 1) {
        startRotation();
        if (checkInterval) {
          clearInterval(checkInterval);
          checkInterval = null;
        }
      } else {
        console.log('⏳ Waiting for slideshow data...', slideshowCount, 'articles loaded');
      }
    };

    // Initial check
    checkForData();

    // Poll every 500ms until data loads (max 20 seconds)
    checkInterval = setInterval(checkForData, 500);
    setTimeout(() => {
      if (checkInterval) clearInterval(checkInterval);
    }, 20000);

    cleanup(() => {
      console.log('�� Cleaning up slideshow');
      if (rotationInterval) clearInterval(rotationInterval);
      if (checkInterval) clearInterval(checkInterval);
    });
  });

  // Handle edit content
  const handleEdit = $((article: any) => {
    console.log('Edit content:', article);
    console.log('visibleArticles:', visibleArticles);

    if (!article.isDbContent) {
      alert('Cannot edit sample articles');
      return;
    }
    // Set the content code and open modal
    const code = article.dbData?.encrypted_code || article.id;
    editContentCode.value = code;
    editModalVisible.value = true;
  });

  // Handle delete content
  const handleDelete = $(async (article: any) => {
    if (!article.isDbContent) {
      alert('Cannot delete sample articles');
      return;
    }

    // Check if this is a parent content (has children or no parent)
    const hasChildren = article.dbData?.children && article.dbData.children.length > 0;
    const isParent = !article.dbData?.parent;

    if (hasChildren || isParent) {
      alert('Cannot delete parent content!\n\nThis content is a parent item or has children.\nYou can only EDIT parent content.\n\nPlease delete all child items first if you want to remove this content.');
      return;
    }

    if (confirm(`Are you sure you want to delete "${article.title}"?`)) {
      try {
        // Use deleteContentByCode since we have encrypted_code, not numeric ID
        const code = article.dbData?.encrypted_code || article.id;

        // Debug logging
        console.log('=== DELETE DEBUG ===');
        console.log('Article to delete:', article);
        console.log('Code to delete:', code);
        console.log('Article dbData:', article.dbData);
        console.log('===================');

        await contentApi.deleteContentByCode(code);
        // Reload content list
        const response = await contentApi.getContents({ content_type: ContentTypeChoice.CONTENT, page_size: 1000 });
        dbContent.value = response.results || [];
        alert('Content deleted successfully!');
      } catch (error) {
        console.error('Error deleting content:', error);
        alert('Failed to delete content');
      }
    }
  });

  // Intersection Observer for infinite scroll
  useVisibleTask$(({ cleanup }) => {
    if (!sentinelRef.value) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const sentinel = entries[0];
        if (sentinel.isIntersecting && !isLoading.value && visibleCount.value < articles.length) {
          isLoading.value = true;
          // Simulate loading delay for smoother UX
          setTimeout(() => {
            visibleCount.value = Math.min(visibleCount.value + 8, articles.length);
            isLoading.value = false;
          }, 300);
        }
      },
      { rootMargin: '200px' } // Start loading 200px before reaching bottom
    );

    observer.observe(sentinelRef.value);
    cleanup(() => observer.disconnect());
  });

  // useVisibleTask$(async () => {
  //   try {
  //     // Use loader data first (already fetched on server)
  //     // if (siteData.value) {
  //       // siteId.value = siteData.value;
  //       // global.id = siteData.value.id;
  //       // global.domain = siteData.value.domain;
  //       // global.name = siteData.value.name;
  //     console.log('Site Data:', siteData.value);
  //     // }
  //   } catch (error) {
  //     console.error('Error fetching site data:', error);
  //   }
  // });

  return (
    <>
      <Navigation
        currentUser={currentUser.value}
        onOpenLogin$={() => {
          if (openLoginModal.value) {
            openLoginModal.value();
          }
        }}
      />
      <Hero currentUser={currentUser.value} isContentModalOpen={isContentModalOpen} />


      {/* Hidden AuthModal */}
      {!currentUser.value && (
        <AuthModal
          onLoginSuccess$={handleLoginSuccess}
          onOpenModal$={(openModal) => {
            openLoginModal.value = openModal;
          }}
        />
      )}

      {/* Edit Content Modal */}
      {editModalVisible.value && editContentCode.value && (
        <ContentModal
          mode="edit"
          contentCode={editContentCode.value}
          isOpen={editModalVisible.value}
          onClose$={async () => {
            editModalVisible.value = false;
            editContentCode.value = null;
          }}
          onSave$={async () => {
            // Reload content list after save
            try {
              const response = await contentApi.getContents({ content_type: ContentTypeChoice.CONTENT, page_size: 1000 });
              dbContent.value = response.results || [];
            } catch (error) {
              console.error('Error reloading content:', error);
            }
          }}
        >
          <div />
        </ContentModal>
      )}

      {/* Welcome Modal */}
      <WelcomeModal
        user={welcomeUser.value}
        isOpen={showWelcomeModal.value}
        onClose$={() => {
          showWelcomeModal.value = false;
        }}
      />

      {/* Settings Modal */}
      <SettingsModal
        isOpen={settingsModalOpen.value}
        onClose$={() => settingsModalOpen.value = false}
        onSave$={$(async (settings: Record<string, string>) => {
          await userSettingsApi.updateUserSettings(settings);
          userSettings.value = settings;
        })}
        currentSettings={userSettings.value}
      />

      {/* Menu Manager Modal */}
      <MenuManagerModal
        isOpen={menuManagerOpen.value}
        onClose$={() => menuManagerOpen.value = false}
        onUpdate$={$(() => {
          // Refresh navigation if needed
        })}
      />

      {/* Fixed Overlay User Info & Account Menu - Top Right */}
      {currentUser.value && !isContentModalOpen.value && (
        <div class="fixed top-24 right-4 z-30 group">
          <div
            onClick$={() => accountDropdownOpen.value = !accountDropdownOpen.value}
            class="flex items-center gap-3 bg-white/95 backdrop-blur-lg rounded-lg shadow-lg px-4 py-2 border border-gray-200 hover:shadow-xl transition-all cursor-pointer"
          >
            {/* Avatar */}
            {currentUser.value.avatar_url ? (
              <img
                src={currentUser.value.avatar_url}
                alt="User avatar"
                class="w-10 h-10 rounded-full object-cover border-2 border-purple-500"
              />
            ) : (
              <div class="w-10 h-10 rounded-full bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center text-white font-bold text-lg">
                {currentUser.value.username.charAt(0).toUpperCase()}
              </div>
            )}

            <div class="text-sm">
              <p class="font-semibold text-gray-800">{currentUser.value.username}</p>
              <p class="text-xs text-gray-500">{currentUser.value.email}</p>
            </div>
            <svg
              class={`w-4 h-4 text-gray-600 transition-transform ${accountDropdownOpen.value ? 'rotate-180' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
            </svg>
          </div>

          {/* Dropdown Menu - Show on hover OR click */}
          <div class={`absolute top-full right-0 mt-2 min-w-[200px] bg-white rounded-lg shadow-xl transition-all duration-300 z-50 border border-gray-200 ${accountDropdownOpen.value
            ? 'opacity-100 visible translate-y-0'
            : 'opacity-0 invisible -translate-y-2 group-hover:opacity-100 group-hover:visible group-hover:translate-y-0'
            }`}>
            {/* Profile Item */}
            {/* <a
              href="/profile"
              onClick$={() => accountDropdownOpen.value = false}
              class="block w-full text-left px-5 py-3 text-gray-700 hover:bg-gray-100 hover:text-purple-600 transition rounded-t-lg flex items-center gap-3 cursor-pointer"
              title="Profile"
            >
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              <span class="font-medium">Profile</span>
            </a> */}

            {/* Manage Menu Item */}
            <button
              onClick$={() => {
                menuManagerOpen.value = true;
                accountDropdownOpen.value = false;
              }}
              class="w-full text-left px-5 py-3 text-gray-700 hover:bg-gray-100 hover:text-purple-600 transition flex items-center gap-3 cursor-pointer"
              title="Manage Menu"
            >
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
              <span class="font-medium">Manage Menu</span>
            </button>

            <div class="border-t border-gray-100"></div>

            {/* Settings Item */}
            <button
              onClick$={() => {
                settingsModalOpen.value = true;
                accountDropdownOpen.value = false;
              }}
              class="w-full text-left px-5 py-3 text-gray-700 hover:bg-gray-100 hover:text-purple-600 transition flex items-center gap-3 cursor-pointer"
              title="Settings"
            >
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span class="font-medium">Settings</span>
            </button>

            <div class="border-t border-gray-100"></div>

            {/* Logout Item */}
            <button
              onClick$={() => {
                handleLogout();
                accountDropdownOpen.value = false;
              }}
              class="w-full text-left px-5 py-3 text-red-600 hover:bg-red-50 transition rounded-b-lg flex items-center gap-3 cursor-pointer"
              title="Logout"
            >
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              <span class="font-medium">Logout</span>
            </button>
          </div>
        </div>
      )}

      {/* <BreakingNews items={[
        { id: 1, title: "Selamat datang di Authbox!", url: "" },
        { id: 2, title: "Platform autentikasi yang aman dan andal.", url: "" },
        { id: 3, title: "Daftar sekarang untuk pengalaman terbaik.", url: "" },
      ]} />  */}

      <div class="container mx-auto px-6">

        {/* Breaking News Ticker */}
        <BreakingNews items={breakingNews} />

        {/* Loading State */}
        {isLoadingContent.value && (
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

        {/* Compact Masonry Grid - Slideshow + Remaining articles */}
        <div class="grid sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 auto-rows-[200px] gap-x-2.5 gap-y-32 mb-12">
          {/* Article Slideshow - First 5 articles in wide variant */}
          {slideshowArticles.length > 0 && (
            <div class="col-span-2 h-80 relative overflow-hidden rounded-md shadow-lg hover:shadow-xl hover:shadow-blue-500/20 transition-all duration-300 ease-out border border-slate-200/50 dark:border-slate-700/50 group">
              {slideshowArticles.map((article, idx) => (
                <>
                  {!!currentUser.value && idx === currentSlide.value && (
                    <div class="absolute top-2 right-2 z-20 flex gap-2">
                      <button
                        onClick$={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleEdit(article);
                        }}
                        class="p-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow-lg transition-colors cursor-pointer"
                        title="Edit article"
                      >
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      <button
                        onClick$={async (e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          await handleDelete(article);
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

                  <div
                    key={article.id}
                    class={`absolute inset-0 transition-opacity duration-700 ${idx === currentSlide.value
                      ? 'opacity-100 pointer-events-auto z-10'
                      : 'opacity-0 pointer-events-none z-0'
                      }`}
                  >
                    {/* Background - Image or Gradient */}
                    {article.image ? (
                      <a href={article.articleUrl || `#article-${article.id}`} class="pointer-events-auto cursor-pointer">
                        <div class="absolute inset-0">
                          <img
                            src={article.image}
                            alt={article.title}
                            class="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                          />
                          <div class="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent group-hover:via-black/50 transition-colors duration-300"></div>
                        </div>
                      </a>
                    ) : article.isVideo && article.videoUrl ? (
                      <>
                        {article.videoUrl.includes('youtube.com') || article.videoUrl.includes('youtu.be') ? (
                          <div class="absolute inset-0 bg-slate-700">
                            {isYoutubePlaying.value ? (
                              <iframe
                                src={`https://www.youtube.com/embed/${article.videoUrl.split('v=')[1]?.split('&')[0] || article.videoUrl.split('/').pop()}?mute=1&controls=1`}
                                class="w-full h-full"
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                allowFullscreen
                                title={article.title}
                              />
                            ) : (
                              <>
                                <div
                                  class="absolute inset-0 bg-cover bg-center"
                                  style={`background-image: url('https://img.youtube.com/vi/${article.videoUrl.split('v=')[1]?.split('&')[0] || article.videoUrl.split('/').pop()}/maxresdefault.jpg')`}
                                />
                                <button
                                  class="absolute inset-0 flex items-center justify-center bg-black/20 hover:bg-black/30 transition-colors z-20 cursor-pointer"
                                  onClick$={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    isYoutubePlaying.value = true;
                                  }}
                                  aria-label="Play Video"
                                >
                                  <div class="w-20 h-20 rounded-full bg-white/90 flex items-center justify-center pl-1 shadow-2xl hover:scale-110 transition-transform duration-300">
                                    <svg class="w-10 h-10 text-slate-900" fill="currentColor" viewBox="0 0 24 24">
                                      <path d="M8 5v14l11-7z" />
                                    </svg>
                                  </div>
                                </button>
                              </>
                            )}
                            <div class="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent pointer-events-none"></div>
                          </div>
                        ) : (
                          <>
                            <video src={article.videoUrl} class="absolute inset-0 w-full h-full object-cover" muted loop preload="metadata" />
                            <div class="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent pointer-events-none"></div>
                          </>
                        )}
                      </>
                    ) : (
                      <a href={article.articleUrl || `#article-${article.id}`} class="pointer-events-auto cursor-pointer">
                        <div class="absolute inset-0 bg-gradient-to-br from-blue-500 via-blue-600 to-cyan-600">
                          <div class="relative h-full flex items-start justify-center pt-16 p-8 pointer-events-none">
                            <h2 class="text-white text-3xl md:text-4xl font-bold leading-tight text-center line-clamp-2">
                              {article.title}
                            </h2>
                          </div>
                        </div>
                      </a>
                    )}

                    {/* Love Icon - Top Right */}
                    {/* <button
                      onClick$={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        lovedSlides.value = {
                          ...lovedSlides.value,
                          [article.id]: !lovedSlides.value[article.id]
                        };
                      }}
                      class="absolute top-4 right-4 z-20 p-2 bg-black/30 hover:bg-black/50 rounded-full transition-all pointer-events-auto cursor-pointer"
                      aria-label="Like article"
                    >
                      <svg
                        class={`w-6 h-6 transition-all duration-300 ${lovedSlides.value[article.id]
                          ? 'fill-red-500 text-red-500 scale-110'
                          : 'fill-none text-white hover:text-red-300'
                          }`}
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                      </svg>
                    </button> */}

                    {/* text below article card */}
                    <div class="relative h-full flex flex-col justify-end p-4 pointer-events-none">
                      <div class="flex items-start gap-2 mb-2 pointer-events-auto">
                        {article.source && (
                          <a href={article.sourceUrl || "#"} class="flex items-center gap-1 text-xs text-white/80 hover:text-white transition-colors cursor-pointer">
                            <span class="text-sm">📰</span>
                            <span class="font-medium">{article.source}</span>
                            {article.timeAgo && (
                              <>
                                <span>·</span>
                                <span>{article.timeAgo}</span>
                              </>
                            )}
                            {article.views !== undefined && (
                              <>
                                <span>·</span>
                                <span>👁️ {article.views.toLocaleString()}</span>
                              </>
                            )}
                          </a>
                        )}
                      </div>

                      <a href={article.articleUrl || `#article-${article.id}`} class="pointer-events-auto cursor-pointer">
                        <h3 class="font-bold text-slate-100 dark:text-slate-300 leading-tight group-hover:text-white dark:group-hover:text-slate-100 transition-colors duration-200 line-clamp-2 pb-1">
                          {article.title}
                        </h3>
                      </a>

                      <div class="flex items-center justify-between mt-3 pointer-events-auto">
                        {/* Love Icon - Bottom Left */}
                        {article.likes !== undefined && (
                          <button class="flex gap-1 px-2 py-1 bg-white/10 hover:bg-white/20 backdrop-blur-sm rounded-full text-xs text-white/90 hover:text-white transition-all cursor-pointer" title="Like this article">
                            <span class="text-sm">❤️</span>
                            <span class="font-medium">{article.likes.toLocaleString()}</span>
                          </button>
                        )}

                        {slideshowArticles.length > 1 && (
                          <div class="flex gap-2">
                            {slideshowArticles.map((_, dotIdx) => (
                              <button
                                key={dotIdx}
                                onClick$={() => {
                                  isPaused.value = true;
                                  currentSlide.value = dotIdx;
                                  setTimeout(() => isPaused.value = false, 5000);
                                }}
                                class={`w-2 h-2 rounded-full transition-all cursor-pointer ${dotIdx === currentSlide.value
                                  ? 'bg-white w-6'
                                  : 'bg-white/50 hover:bg-white/75'
                                  }`}
                                aria-label={`Go to slide ${dotIdx + 1}`}
                              />
                            ))}
                          </div>
                        )}
                        <a href={article.categoryUrl || `#category-${article.category}`} class="text-xs text-white/70 hover:text-white font-medium transition-colors cursor-pointer">
                          {article.category}
                        </a>
                      </div>
                    </div>



                  </div>
                </>
              ))}

              {slideshowArticles.length > 1 && (
                <>
                  <button
                    onClick$={() => {
                      isPaused.value = true;
                      currentSlide.value = (currentSlide.value - 1 + slideshowArticles.length) % slideshowArticles.length;
                      setTimeout(() => isPaused.value = false, 5000);
                    }}
                    class="absolute left-4 top-1/2 -translate-y-1/2 bg-black/30 hover:bg-black/50 text-white p-2 rounded-full transition-all z-10 pointer-events-auto cursor-pointer"
                    aria-label="Previous slide"
                  >
                    <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
                    </svg>
                  </button>
                  <button
                    onClick$={() => {
                      isPaused.value = true;
                      currentSlide.value = (currentSlide.value + 1) % slideshowArticles.length;
                      setTimeout(() => isPaused.value = false, 5000);
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
            </div>
          )}

          {/* Remaining articles */}
          {gridArticles.map((article) => (
            <ArticleCard
              key={article.id}
              {...article}
              isAuthenticated={!!currentUser.value}
              onEdit={() => handleEdit(article)}
              onDelete={() => handleDelete(article)}
            />
          ))}
        </div >

        {/* Sentinel element for infinite scroll */}
        < div ref={sentinelRef} class="h-px" ></div>

        {/* Loading indicator and end message */}
        <div class="text-center mt-32 ">
          {isLoading.value && (
            <div class="flex items-center justify-center gap-3 text-blue-600 dark:text-blue-400">
              <svg class="animate-spin h-6 w-6" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span class="text-sm font-medium">Loading more articles...</span>
            </div>
          )}
          {!hasMore && visibleCount.value > 0 && (
            <div class="py-8 px-4">
              <div class="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-700 rounded-full border border-slate-300 dark:border-slate-600">
                <svg class="w-5 h-5 text-green-600 dark:text-green-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
                </svg>
                <span class="text-sm font-semibold text-slate-700 dark:text-slate-300">End of Data - All articles loaded</span>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <Footer />

        {/* Scroll to Top Button */}
        <ScrollToTop />

      </div>
    </>
  );
});

/**
 * Dynamic DocumentHead using routeLoader$ data
 * This ensures the metadata is available on server-side rendering (good for SEO)
 */
export const head: DocumentHead = ({ resolveValue }) => {
  const site = resolveValue(useSiteData);

  return {
    title: `${site.name} - Welcome`,
    meta: [
      {
        name: "description",
        content: `Welcome to ${site.name}`,
      },
      {
        property: "og:title",
        content: site.name,
      },
      {
        property: "og:description",
        content: `Visit ${site.metadata?.site_tagline || site.name} at ${site.name}`,
      },
      {
        name: "twitter:card",
        content: "summary_large_image",
      },
    ],
    links: [
      {
        rel: "canonical",
        href: `https://${site.domain}/`,
      },
    ],
  };
};
