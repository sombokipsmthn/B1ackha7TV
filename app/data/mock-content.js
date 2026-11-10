/**
 * Kipsmthn TV - Content Data Model
 *
 * This module defines the content data structures and provides mock data
 * for demonstration purposes. In production, this would be replaced by
 * real viewing activity and content metadata services.
 */

(function (global) {
  'use strict';

  // Content type enumeration
  var ContentType = {
    SERIES: 'series',
    MOVIE: 'movie'
  };

  // Provider identifiers
  var ProviderId = {
    NETFLIX: 'netflix',
    APPLE_TV: 'apple-tv',
    PRIME_VIDEO: 'prime-video',
    DISNEY_PLUS: 'disney-plus',
    SHOWMAX: 'showmax',
    HULU: 'hulu',
    HBO_MAX: 'hbo-max',
    PARAMOUNT_PLUS: 'paramount-plus',
    PEACOCK: 'peacock'
  };

  // Mock content data - demonstration only, not real viewing history
  var MOCK_CONTENT = [
    {
      id: 'ted-lasso',
      title: 'Ted Lasso',
      providerId: 'apple-tv',
      tmdbId: 100088,
      type: 'series',
      season: 3,
      episode: 5,
      episodeTitle: 'Signs',
      progress: 68,
      duration: 2700, // 45 minutes
      position: 1836,
      poster: '/assets/content/ted-lasso-poster.jpg',
      backdrop: '/assets/content/ted-lasso-backdrop.jpg',
      landscapeStill: '/assets/content/ted-lasso-landscape.jpg',
      logo: '/assets/content/ted-lasso-logo.png',
      providerLogo: '/assets/providers/apple-tv-logo.png',
      description: 'An American football coach manages a British soccer team.',
      genres: ['Comedy', 'Sport', 'Drama'],
      releaseYear: 2020,
      isDemo: true
    },
    {
      id: 'severance',
      title: 'Severance',
      providerId: 'apple-tv',
      tmdbId: 112807,
      type: 'series',
      season: 1,
      episode: 7,
      episodeTitle: 'Defiant Jazz',
      progress: 42,
      duration: 3000, // 50 minutes
      position: 1260,
      poster: '/assets/content/severance-poster.jpg',
      backdrop: '/assets/content/severance-backdrop.jpg',
      landscapeStill: '/assets/content/severance-landscape.jpg',
      logo: '/assets/content/severance-logo.png',
      providerLogo: '/assets/providers/apple-tv-logo.png',
      description: 'Employees undergo a procedure that divides their memories between work and personal life.',
      genres: ['Sci-Fi', 'Thriller', 'Mystery'],
      releaseYear: 2022,
      isDemo: true
    },
    {
      id: 'stranger-things',
      title: 'Stranger Things',
      providerId: 'netflix',
      tmdbId: 66732,
      type: 'series',
      season: 4,
      episode: 3,
      episodeTitle: 'The Monster and the Superhero',
      progress: 75,
      duration: 3600, // 60 minutes
      position: 2700,
      poster: '/assets/content/stranger-things-poster.jpg',
      backdrop: '/assets/content/stranger-things-backdrop.jpg',
      landscapeStill: '/assets/content/stranger-things-landscape.jpg',
      logo: '/assets/content/stranger-things-logo.png',
      providerLogo: '/assets/providers/netflix-logo.png',
      description: 'Kids in 1980s Indiana encounter supernatural forces.',
      genres: ['Sci-Fi', 'Horror', 'Drama'],
      releaseYear: 2016,
      isDemo: true
    },
    {
      id: 'wednesday',
      title: 'Wednesday',
      providerId: 'netflix',
      tmdbId: 153001,
      type: 'series',
      season: 1,
      episode: 5,
      episodeTitle: 'You Reap What You Woe',
      progress: 33,
      duration: 2700, // 45 minutes
      position: 891,
      poster: '/assets/content/wednesday-poster.jpg',
      backdrop: '/assets/content/wednesday-backdrop.jpg',
      landscapeStill: '/assets/content/wednesday-landscape.jpg',
      logo: '/assets/content/wednesday-logo.png',
      providerLogo: '/assets/providers/netflix-logo.png',
      description: 'Wednesday Addams navigates Nevermore Academy.',
      genres: ['Comedy', 'Fantasy', 'Mystery'],
      releaseYear: 2022,
      isDemo: true
    },
    {
      id: 'the-boys',
      title: 'The Boys',
      providerId: 'prime-video',
      tmdbId: 87113,
      type: 'series',
      season: 4,
      episode: 2,
      episodeTitle: 'Life Among the Septics',
      progress: 55,
      duration: 3300, // 55 minutes
      position: 1815,
      poster: '/assets/content/the-boys-poster.jpg',
      backdrop: '/assets/content/the-boys-backdrop.jpg',
      landscapeStill: '/assets/content/the-boys-landscape.jpg',
      logo: '/assets/content/the-boys-logo.png',
      providerLogo: '/assets/providers/prime-video-logo.png',
      description: 'Vigilantes take on corrupt superheroes.',
      genres: ['Action', 'Comedy', 'Sci-Fi'],
      releaseYear: 2019,
      isDemo: true
    },
    {
      id: 'reacher',
      title: 'Reacher',
      providerId: 'prime-video',
      tmdbId: 118422,
      type: 'series',
      season: 2,
      episode: 4,
      episodeTitle: 'The Man Who Goes',
      progress: 82,
      duration: 2700, // 45 minutes
      position: 2214,
      poster: '/assets/content/reacher-poster.jpg',
      backdrop: '/assets/content/reacher-backdrop.jpg',
      landscapeStill: '/assets/content/reacher-landscape.jpg',
      logo: '/assets/content/reacher-logo.png',
      providerLogo: '/assets/providers/prime-video-logo.png',
      description: 'Former military policeman Jack Reacher drifts across America.',
      genres: ['Action', 'Crime', 'Thriller'],
      releaseYear: 2022,
      isDemo: true
    },
    {
      id: 'the-bear',
      title: 'The Bear',
      providerId: 'disney-plus',
      tmdbId: 137268,
      type: 'series',
      season: 2,
      episode: 6,
      episodeTitle: 'Fishes',
      progress: 91,
      duration: 1800, // 30 minutes
      position: 1638,
      poster: '/assets/content/the-bear-poster.jpg',
      backdrop: '/assets/content/the-bear-backdrop.jpg',
      landscapeStill: '/assets/content/the-bear-landscape.jpg',
      logo: '/assets/content/the-bear-logo.png',
      providerLogo: '/assets/providers/disney-plus-logo.png',
      description: 'A chef returns to Chicago to run his family sandwich shop.',
      genres: ['Comedy', 'Drama'],
      releaseYear: 2022,
      isDemo: true
    },
    {
      id: 'the-mandalorian',
      title: 'The Mandalorian',
      providerId: 'disney-plus',
      tmdbId: 82856,
      type: 'series',
      season: 3,
      episode: 4,
      episodeTitle: 'Chapter 20: The Foundling',
      progress: 27,
      duration: 3000, // 50 minutes
      position: 810,
      poster: '/assets/content/the-mandalorian-poster.jpg',
      backdrop: '/assets/content/the-mandalorian-backdrop.jpg',
      landscapeStill: '/assets/content/the-mandalorian-landscape.jpg',
      logo: '/assets/content/the-mandalorian-logo.png',
      providerLogo: '/assets/providers/disney-plus-logo.png',
      description: 'A bounty hunter travels the galaxy with a mysterious child.',
      genres: ['Action', 'Adventure', 'Sci-Fi'],
      releaseYear: 2019,
      isDemo: true
    }
  ];

  // Provider configurations
  var PROVIDERS = [
    {
      id: 'netflix',
      name: 'Netflix',
      logo: '/assets/providers/netflix-logo.png',
      brandColor: '#E50914',
      backdropTheme: 'netflix-editorial'
    },
    {
      id: 'apple-tv',
      name: 'Apple TV+',
      logo: '/assets/providers/apple-tv-logo.png',
      brandColor: '#0071E3',
      backdropTheme: 'apple-tv-editorial'
    },
    {
      id: 'prime-video',
      name: 'Prime Video',
      logo: '/assets/providers/prime-video-logo.png',
      brandColor: '#00A8E1',
      backdropTheme: 'prime-video-editorial'
    },
    {
      id: 'disney-plus',
      name: 'Disney+',
      logo: '/assets/providers/disney-plus-logo.png',
      brandColor: '#0063E5',
      backdropTheme: 'disney-plus-editorial'
    },
    {
      id: 'showmax',
      name: 'Showmax',
      logo: '/assets/providers/showmax-logo.png',
      brandColor: '#00C853',
      backdropTheme: 'showmax-editorial'
    },
    {
      id: 'hulu',
      name: 'Hulu',
      logo: '/assets/providers/hulu-logo.png',
      brandColor: '#1CE783',
      backdropTheme: 'hulu-editorial'
    },
    {
      id: 'hbo-max',
      name: 'Max',
      logo: '/assets/providers/hbo-max-logo.png',
      brandColor: '#6E28D9',
      backdropTheme: 'hbo-max-editorial'
    },
    {
      id: 'paramount-plus',
      name: 'Paramount+',
      logo: '/assets/providers/paramount-plus-logo.png',
      brandColor: '#004EFF',
      backdropTheme: 'paramount-plus-editorial'
    },
    {
      id: 'peacock',
      name: 'Peacock',
      logo: '/assets/providers/peacock-logo.png',
      brandColor: '#3B82F6',
      backdropTheme: 'peacock-editorial'
    }
  ];

  // Helper functions
  function getContentById(id) {
    return MOCK_CONTENT.find(function (content) { return content.id === id; });
  }

  function getContentByProvider(providerId) {
    return MOCK_CONTENT.filter(function (content) { return content.providerId === providerId; });
  }

  function getProviderConfig(providerId) {
    return PROVIDERS.find(function (provider) { return provider.id === providerId; });
  }

  function getAllContent() {
    return MOCK_CONTENT.slice();
  }

  // For demo purposes - returns content sorted by progress (most watched first)
  function getContinueWatchingContent() {
    return MOCK_CONTENT.slice().sort(function (a, b) { return b.progress - a.progress; });
  }

  // Export to global scope
  global.ContentData = {
    ContentType: ContentType,
    ProviderId: ProviderId,
    MOCK_CONTENT: MOCK_CONTENT,
    PROVIDERS: PROVIDERS,
    getContentById: getContentById,
    getContentByProvider: getContentByProvider,
    getProviderConfig: getProviderConfig,
    getAllContent: getAllContent,
    getContinueWatchingContent: getContinueWatchingContent
  };
}(window));