export type Status = "draft" | "published";

export type JSONContent = {
  type?: string;
  attrs?: Record<string, unknown>;
  content?: JSONContent[];
  marks?: { type: string; attrs?: Record<string, unknown> }[];
  text?: string;
  [key: string]: unknown;
};

export type Category = {
  id: string;
  name: string;
  slug: string;
  published: boolean;
  created_at: string;
  updated_at: string;
};

export type Project = {
  id: string;
  title: string;
  slug: string;
  subtitle: string | null;
  company_name: string | null;
  category_id: string | null;
  live_link: string | null;
  project_date: string | null;
  card_image_url: string | null;
  gallery: string[];
  body: JSONContent | null;
  featured: boolean;
  sort_order: number;
  status: Status;
  published_at: string | null;
  created_at: string;
  updated_at: string;
};

export type ProjectWithCategory = Project & {
  categories: Pick<Category, "id" | "name" | "slug"> | null;
};

export type Post = {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  cover_image_url: string | null;
  body: JSONContent | null;
  tags: string[];
  reading_time: number | null;
  status: Status;
  published_at: string | null;
  created_at: string;
  updated_at: string;
};

export type InquiryStatus = "new" | "read" | "archived";

export type ContactSubmission = {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  message: string;
  status: InquiryStatus;
  email_sent: boolean;
  email_error: string | null;
  source: string | null;
  created_at: string;
};

export type CmsFieldType =
  | "text"
  | "richtext"
  | "image"
  | "link"
  | "email"
  | "number"
  | "date"
  | "switch"
  | "select";

export type CmsCollection = {
  id: string;
  name: string;
  slug: string;
  singular_name: string;
  created_at: string;
  updated_at: string;
};

export type CmsField = {
  id: string;
  collection_id: string;
  name: string;
  slug: string;
  field_type: CmsFieldType;
  required: boolean;
  options: string[];
  sort_order: number;
  created_at: string;
};

export type CmsItem = {
  id: string;
  collection_id: string;
  name: string;
  slug: string;
  status: Status;
  data: Record<string, unknown>;
  published_at: string | null;
  created_at: string;
  updated_at: string;
};

export type Database = {
  categories: Category;
  projects: Project;
  posts: Post;
  contact_submissions: ContactSubmission;
  cms_collections: CmsCollection;
  cms_fields: CmsField;
  cms_items: CmsItem;
};
