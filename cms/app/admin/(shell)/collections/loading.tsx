import {
  CollectionHeader,
  ListSkeleton,
} from "@/components/admin/collection-chrome";

export default function Loading() {
  return (
    <>
      <CollectionHeader title="Custom Collections" />
      <ListSkeleton />
    </>
  );
}
