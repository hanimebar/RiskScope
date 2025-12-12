declare module 'google-play-scraper' {
  interface App {
    appId: string;
    title: string;
    url: string;
    description: string;
    descriptionHTML: string;
    summary: string;
    installs: string;
    minInstalls: number;
    maxInstalls: number;
    score: number;
    scoreText: string;
    ratings: number;
    reviews: number;
    histogram: { [key: string]: number };
    price: number;
    free: boolean;
    currency: string;
    priceText: string;
    available: boolean;
    offersIAP: boolean;
    IAPRange: string;
    size: string;
    androidVersion: string;
    androidVersionText: string;
    developer: {
      id: string;
      name: string;
      email: string;
      url: string;
    };
    developerId: string;
    developerEmail: string;
    developerWebsite: string;
    developerAddress: string;
    genre: string;
    genreId: string;
    familyGenre: string;
    familyGenreId: string;
    icon: string;
    headerImage: string;
    screenshots: string[];
    video: string;
    videoImage: string;
    contentRating: string;
    contentRatingDescription: string;
    adSupported: boolean;
    released: string;
    updated: number;
    version: string;
    recentChanges: string;
    comments: string[];
    editorsChoice: boolean;
    [key: string]: any;
  }

  interface Options {
    appId: string;
    country?: string;
    lang?: string;
    cache?: boolean;
    throttle?: number;
  }

  function app(options: Options): Promise<App>;
  function search(options: { term: string; num?: number; country?: string; lang?: string }): Promise<App[]>;
  function developer(options: { devId: string; country?: string; lang?: string }): Promise<App[]>;
  function suggest(options: { term: string; country?: string; lang?: string }): Promise<string[]>;
  function reviews(options: { appId: string; sort?: number; page?: number; country?: string; lang?: string }): Promise<any>;
  function similar(options: { appId: string; country?: string; lang?: string }): Promise<App[]>;
  function permissions(options: { appId: string; country?: string; lang?: string }): Promise<any>;
  function datasafety(options: { appId: string; country?: string; lang?: string }): Promise<any>;
  function categories(): Promise<any[]>;
  function memoized(options: Options): Promise<App>;
  function list(options: { category?: string; collection?: string; num?: number; country?: string; lang?: string }): Promise<App[]>;

  export default {
    app,
    search,
    developer,
    suggest,
    reviews,
    similar,
    permissions,
    datasafety,
    categories,
    memoized,
    list,
  };
}

