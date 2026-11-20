// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import ErrorPage from '@/app/error';

const refresh = vi.hoisted(() => vi.fn());
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh }) }));

describe('root error boundary (C12)', () => {
  it('shows a calm, honest message, a Try again button that calls reset, and a link to the shop', async () => {
    const user = userEvent.setup();
    const reset = vi.fn();
    render(<ErrorPage error={new Error('boom')} reset={reset} />);
    expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
    expect(screen.getByText(/We couldn.t load this page\. Try again or head back to the shop\./)).toBeInTheDocument();
    refresh.mockClear();
    await user.click(screen.getByRole('button', { name: 'Try again' }));
    // A server-component failure can re-throw from the cached RSC payload, so Try again
    // refreshes the route (fresh server render) AND resets the boundary.
    expect(refresh).toHaveBeenCalledTimes(1);
    expect(reset).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('link', { name: /shop/i })).toHaveAttribute('href', '/shop');
  });

  it('never prints the error message (it can echo configuration or data)', () => {
    const { container } = render(<ErrorPage error={new Error('SECRET-HOST db.internal:5432')} reset={vi.fn()} />);
    expect(container.textContent).not.toContain('SECRET-HOST');
    expect(container.textContent).not.toMatch(/stack|digest/i);
  });

  it('is a client component (error boundaries must be)', async () => {
    const { readFileSync } = await import('node:fs');
    const path = await import('node:path');
    const src = readFileSync(path.resolve(__dirname, 'error.tsx'), 'utf8');
    expect(src.trimStart().startsWith("'use client'")).toBe(true);
  });
});
