import Link from 'next/link';

export function EmptyState({
  clearHref,
  title = 'No models match those filters',
  body = 'Try removing a filter or searching for something broader.',
  ctaLabel = 'Clear filters',
}: {
  clearHref: string;
  title?: string;
  body?: string;
  ctaLabel?: string;
}) {
  return (
    <div className="border border-dashed border-ink-muted bg-chalk-deep px-6 py-16 text-center">
      <p className="eyebrow">No match</p>
      <p className="mt-3 font-display text-3xl">{title}</p>
      <p className="mx-auto mt-2 max-w-sm text-sm text-ink-muted">{body}</p>
      <Link href={clearHref} className="btn-quiet mt-6">
        {ctaLabel}
      </Link>
    </div>
  );
}
