import { CollectionHeader, EmptyState } from "@/components/admin/collection-chrome";
import { listPosts } from "@/lib/data/posts";
import type { Post } from "@/lib/types";
import { NewPostButton } from "./new-post-button";
import { PostsList } from "./posts-list";

export const metadata = { title: "Blog Posts - Portfolio CMS" };
export const dynamic = "force-dynamic";

export default async function BlogPage() {
  let posts: Post[] = [];
  let errorMsg: string | null = null;

  try {
    posts = await listPosts();
  } catch (err) {
    errorMsg = (err as Error).message;
  }

  if (errorMsg) {
    return (
      <>
        <CollectionHeader title="Blog Posts" />
        <EmptyState title="Couldn't load posts" description={errorMsg} />
      </>
    );
  }

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
