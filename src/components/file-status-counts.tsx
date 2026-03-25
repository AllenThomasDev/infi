export function FileStatusCounts({
  files,
}: {
  files: readonly { status: string }[];
}) {
  let added = 0;
  let modified = 0;
  let deleted = 0;
  let untracked = 0;
  for (const f of files) {
    if (f.status === "added") {
      added++;
    } else if (f.status === "deleted") {
      deleted++;
    } else if (f.status === "untracked") {
      untracked++;
    } else {
      modified++;
    }
  }
  return (
    <span className="flex items-center gap-1 font-mono">
      {added > 0 && <span className="text-green-500">+{added}</span>}
      {modified > 0 && <span className="text-yellow-500">~{modified}</span>}
      {deleted > 0 && <span className="text-red-500">-{deleted}</span>}
      {untracked > 0 && <span className="text-muted-foreground">?{untracked}</span>}
    </span>
  );
}
