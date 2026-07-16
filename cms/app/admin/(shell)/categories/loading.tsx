import { ListSkeleton } from "@/components/admin/collection-chrome";

export default function Loading() {
  return (
    <>
      <div className="sticky top-0 z-[--z-sticky] flex items-center justify-between border-b border-border bg-bg/80 px-5 py-4 backdrop-blur sm:px-8">
        <div className="skeleton h-6 w-40" />
        <div className="skeleton h-9 w-28 rounded-[--radius-md]" />
      </div>
      <ListSkeleton />
    </>
  );
}
