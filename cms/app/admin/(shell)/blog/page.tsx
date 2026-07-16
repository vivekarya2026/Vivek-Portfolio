import { CollectionHeader, EmptyState } from "@/components/admin/collection-chrome";
import { createClient } from "@/lib/supabase/server";
import type { Post } from "@/lib/types";
import { NewPostButton } from "./new-post-button";
import { PostsList } from "./posts-list";

export const metadata = { title: "Blog Posts - Portfolio CMS" };
export const dynamic = "force-dynamic";

export default async function BlogPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("posts")
    .select("*")
    .order("created_at", { ascending: false });

  const posts = (data ?? []) as Post[];

  return (
    <>
      <CollectionHeader title="Blog Posts" count={posts.length}>
        <NewPostButton />
      </CollectionHeader>
      {posts.length === 0 ? (
        <EmptyState
          title="No posts yet"
          description="Write your first article. Drafts stay private until you publish."
          action={<NewPostButton />}
        />
      ) : (
        <PostsList posts={posts} />
      )}
    </>
  );
}
