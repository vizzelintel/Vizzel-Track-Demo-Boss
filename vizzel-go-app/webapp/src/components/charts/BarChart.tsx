export function SimpleBarChart({
  labels,
  values,
  max,
}: {
  labels: string[];
  values: number[];
  max?: number;
}) {
  const m = max ?? Math.max(...values, 1);
  return (
    <div className="flex h-48 items-end gap-2">
      {values.map((v, i) => (
        <div key={labels[i]} className="flex flex-1 flex-col items-center gap-1">
          <div
            className="bg-primary/80 w-full min-w-[8px] rounded-t"
            style={{ height: `${Math.max(4, (v / m) * 100)}%` }}
            title={String(v)}
          />
          <span className="text-muted-foreground text-[10px]">{labels[i]}</span>
        </div>
      ))}
    </div>
  );
}

export function StatusBars({ items }: { items: { name: string; count: number }[] }) {
  const max = Math.max(...items.map((i) => i.count), 1);
  return (
    <div className="space-y-2">
      {items.map((item) => (
        <div key={item.name}>
          <div className="mb-1 flex justify-between text-xs">
            <span>{item.name}</span>
            <span className="text-muted-foreground">{item.count}</span>
          </div>
          <div className="bg-muted h-2 rounded-full">
            <div
              className="bg-primary h-2 rounded-full"
              style={{ width: `${(item.count / max) * 100}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
