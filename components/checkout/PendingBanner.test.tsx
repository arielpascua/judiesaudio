// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { PendingBanner } from '@/components/checkout/PendingBanner';

const order = { reference: 'JA-OLD000000001', total: 76_800, at: new Date('2026-03-04T10:00:00').getTime() };

describe('PendingBanner ', () => {
  it('says the customer was taken to Maya, not that the order was sent there (Maya only receives an amount)', () => {
    const { container } = render(<PendingBanner order={order} onDismiss={vi.fn()} onClearItems={vi.fn()} />);
    const text = (container.textContent ?? '').replace(/\s+/g, ' ');
    expect(text).toMatch(/You were taken to Maya to pay for order JA-OLD000000001 \(₱76,800\) on Mar 4, 2026\./);
    expect(text).not.toMatch(/was sent to Maya|order was sent/i);
  });

  it('keeps the honest can’t-see-completion sentence and never says paid', () => {
    const { container } = render(<PendingBanner order={order} onDismiss={vi.fn()} onClearItems={vi.fn()} />);
    expect(screen.getByText(/can.t see whether it was completed/i)).toBeInTheDocument();
    expect(container.textContent).not.toMatch(/\bpaid\b|payment received|confirmed/i);
  });

  it('both buttons are at least 44px tall', () => {
    render(<PendingBanner order={order} onDismiss={vi.fn()} onClearItems={vi.fn()} />);
    for (const button of screen.getAllByRole('button')) expect(button.className).toContain('min-h-[44px]');
  });

  it('is squared and ruled like the rest of the datasheet: no rounded corners, labelled as pending', () => {
    const { container } = render(<PendingBanner order={order} onDismiss={vi.fn()} onClearItems={vi.fn()} />);
    expect(container.innerHTML).not.toMatch(/rounded/);
    expect(container.textContent).toMatch(/pending/i);
  });

  it('keeps both actions working', async () => {
    const user = userEvent.setup();
    const onDismiss = vi.fn();
    const onClearItems = vi.fn();
    render(<PendingBanner order={order} onDismiss={onDismiss} onClearItems={onClearItems} />);
    await user.click(screen.getByRole('button', { name: /remove these items/i }));
    await user.click(screen.getByRole('button', { name: /dismiss/i }));
    expect(onClearItems).toHaveBeenCalledTimes(1);
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });
});
