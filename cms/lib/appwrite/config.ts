/**
 * Appwrite resource IDs — read from env so they can be overridden per environment.
 * All values are required at runtime; they are set in .env.local (dev) and
 * as Vercel environment variables (production).
 */

export const APPWRITE_DATABASE_ID =
  process.env.APPWRITE_DATABASE_ID ?? "portfolio-cms";

export const COLLECTION = {
  CATEGORIES: process.env.APPWRITE_COLLECTION_CATEGORIES ?? "categories",
  PROJECTS: process.env.APPWRITE_COLLECTION_PROJECTS ?? "projects",
  POSTS: process.env.APPWRITE_COLLECTION_POSTS ?? "posts",
  SETTINGS: process.env.APPWRITE_COLLECTION_SETTINGS ?? "settings",
  CONTACT_SUBMISSIONS:
    process.env.APPWRITE_COLLECTION_CONTACT_SUBMISSIONS ?? "contact_submissions",
  CMS_COLLECTIONS:
    process.env.APPWRITE_COLLECTION_CMS_COLLECTIONS ?? "cms_collections",
  CMS_FIELDS: process.env.APPWRITE_COLLECTION_CMS_FIELDS ?? "cms_fields",
  CMS_ITEMS: process.env.APPWRITE_COLLECTION_CMS_ITEMS ?? "cms_items",
} as const;

export const APPWRITE_BUCKET_ID =
  process.env.APPWRITE_BUCKET_ID ?? "media";
