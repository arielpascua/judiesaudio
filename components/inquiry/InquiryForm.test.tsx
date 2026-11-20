// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { InquiryForm } from '@/components/inquiry/InquiryForm';
import { PRODUCTS } from '@/lib/catalog/fixtures';
import { toInquiryProducts, toPublicProducts } from '@/lib/catalog/public';

const submitInquiry = vi.hoisted(() => vi.fn());
vi.mock('@/lib/inquiry/client', () => ({ submitInquiry }));

const products = toInquiryProducts(toPublicProducts(PRODUCTS));
const first = products.find((p) => p.id === 'ja-fr-02')!; // Himig 8: single, pair, pack of 4
const second = products.find((p) => p.id === 'ja-sw-01')!;

beforeEach(() => {
  submitInquiry.mockReset();
});

type User = ReturnType<typeof userEvent.setup>;

async function fillRequired(user: User) {
  await user.type(screen.getByLabelText(/^Company/), 'Reyes Interiors');
  await user.type(screen.getByLabelText(/^Contact name/), 'Ana Reyes');
  await user.type(screen.getByLabelText(/^Email/), 'ana@example.com');
}

describe('InquiryForm lines', () => {
  it('starts with the model from initialSlug, its first pack, quantity 1', () => {
    render(<InquiryForm products={products} initialSlug={first.slug} />);
    expect(screen.getAllByText(first.name).some((e) => e.tagName === 'P')).toBe(true);
    expect(screen.getByLabelText(`Pack for ${first.name}`)).toHaveValue(first.packs[0].id);
    expect(screen.getByLabelText(`Quantity for ${first.name}`)).toHaveValue('1');
  });

  it('starts empty with a hint for an unknown slug, or none', () => {
    const { unmount } = render(<InquiryForm products={products} initialSlug="no-such-model" />);
    expect(screen.queryByLabelText(/^Pack for/)).toBeNull();
    expect(screen.getByText(/add a model/i)).toBeInTheDocument();
    unmount();
    render(<InquiryForm products={products} />);
    expect(screen.queryByLabelText(/^Pack for/)).toBeNull();
    expect(screen.getByText(/add a model/i)).toBeInTheDocument();
  });

  it('offers exactly the packs the model has, as a label and a unit count, never a peso sign', () => {
    render(<InquiryForm products={products} initialSlug={first.slug} />);
    const select = screen.getByLabelText(`Pack for ${first.name}`);
    const options = within(select).getAllByRole('option');
    expect(options).toHaveLength(first.packs.length);
    expect(options[0]).toHaveTextContent('Single unit');
    expect(options[1]).toHaveTextContent('Matched pair · 2 units');
    expect(options[2]).toHaveTextContent('Pack of 4 · 4 units');
    expect(select.textContent).not.toContain('₱');
  });

  it('starts from the venue note when one is given', () => {
    render(<InquiryForm products={products} initialNote="Venue: Houses of worship. Floor area: 150 – 400 m²." />);
    expect(screen.getByLabelText(/^Notes/)).toHaveValue('Venue: Houses of worship. Floor area: 150 – 400 m².');
  });

  it('adds another model from the picker and removes a line', async () => {
    const user = userEvent.setup();
    render(<InquiryForm products={products} initialSlug={first.slug} />);
    await user.selectOptions(screen.getByLabelText('Choose a model to add'), second.id);
    await user.click(screen.getByRole('button', { name: 'Add another model' }));
    expect(screen.getByLabelText(`Pack for ${second.name}`)).toBeInTheDocument();
    // an added model is no longer offered
    const picker = screen.getByLabelText('Choose a model to add');
    expect(within(picker).queryByRole('option', { name: new RegExp(second.name) })).toBeNull();
    await user.click(screen.getByRole('button', { name: `Remove ${first.name}` }));
    expect(screen.queryByLabelText(`Pack for ${first.name}`)).toBeNull();
    expect(screen.getByLabelText(`Pack for ${second.name}`)).toBeInTheDocument();
  });

  it('keeps focus inside the page after Remove (not <body>)', async () => {
    const user = userEvent.setup();
    render(<InquiryForm products={products} initialSlug={first.slug} />);
    await user.click(screen.getByRole('button', { name: `Remove ${first.name}` }));
    await waitFor(() => expect(document.body).not.toHaveFocus());
  });

  it('disables Add at 20 lines and says why', async () => {
    const user = userEvent.setup();
    const many = Array.from({ length: 21 }, (_, i) => ({ ...first, id: `m-${i}`, slug: `m-${i}`, name: `Model ${i}` }));
    render(<InquiryForm products={many} initialSlug="m-0" />);
    for (let i = 1; i < 20; i += 1) {
      await user.click(screen.getByRole('button', { name: 'Add another model' }));
    }
    expect(screen.getAllByLabelText(/^Pack for/)).toHaveLength(20);
    expect(screen.getByRole('button', { name: 'Add another model' })).toBeDisabled();
    expect(screen.getByText(/up to 20 models/i)).toBeInTheDocument();
  });

  it('clamps quantity to 1-1000 on blur and keeps digits only', async () => {
    const user = userEvent.setup();
    render(<InquiryForm products={products} initialSlug={first.slug} />);
    const qty = screen.getByLabelText(`Quantity for ${first.name}`);
    await user.clear(qty);
    await user.type(qty, '5000');
    await user.tab();
    expect(qty).toHaveValue('1000');
    await user.clear(qty);
    await user.tab();
    expect(qty).toHaveValue('1');
    await user.clear(qty);
    await user.type(qty, '0');
    await user.tab();
    expect(qty).toHaveValue('1');
    await user.clear(qty);
    await user.type(qty, '3.5e');
    expect(qty).toHaveValue('35');
  });

  it('strips leading zeros before slicing a pasted quantity', async () => {
    const user = userEvent.setup();
    render(<InquiryForm products={products} initialSlug={first.slug} />);
    const qty = screen.getByLabelText(`Quantity for ${first.name}`);
    await user.clear(qty);
    await user.click(qty);
    await user.paste('00001000');
    expect(qty).toHaveValue('1000');
  });

  it('says "All models added." when nothing is left to pick', () => {
    render(<InquiryForm products={[first]} initialSlug={first.slug} />);
    expect(screen.getByText('All models added.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Add another model' })).toBeNull();
  });

  it('lets long unbroken text wrap', () => {
    const longName = { ...first, id: 'long', slug: 'long', name: 'W'.repeat(200) };
    render(<InquiryForm products={[longName]} initialSlug="long" />);
    const name = screen.getAllByText(longName.name).find((e) => e.tagName === 'P')!;
    expect(name.className).toMatch(/break-words/);
  });

  it('draws the schematic on a faceplate and keeps it decorative', () => {
    const { container } = render(<InquiryForm products={products} initialSlug={first.slug} />);
    expect(container.querySelector('.faceplate svg')).toHaveAttribute('aria-hidden', 'true');
    expect(container.querySelector('img')).toBeNull();
  });

  it('ignores a model with no packs: it cannot be inquired about', () => {
    const bare = { ...first, id: 'bare', slug: 'bare', name: 'Bare Model', packs: [] };
    render(<InquiryForm products={[bare]} initialSlug="bare" />);
    expect(screen.queryByLabelText('Pack for Bare Model')).toBeNull();
  });

  it('never stays stuck on Sending if submitInquiry throws', async () => {
    const user = userEvent.setup();
    submitInquiry.mockRejectedValue(new Error('boom'));
    render(<InquiryForm products={products} initialSlug={first.slug} />);
    await fillRequired(user);
    await user.click(screen.getByRole('button', { name: 'Send inquiry' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('We could not send your inquiry just now. Please try again in a moment.');
    expect(screen.getByRole('button', { name: 'Send inquiry' })).toBeEnabled();
    expect(screen.getByLabelText(/^Company/)).toHaveValue('Reyes Interiors');
  });
});

describe('InquiryForm validation', () => {
  it('shows field errors and does not submit when nothing is filled in', async () => {
    const user = userEvent.setup();
    render(<InquiryForm products={products} />);
    await user.click(screen.getByRole('button', { name: 'Send inquiry' }));
    expect(submitInquiry).not.toHaveBeenCalled();
    const summary = screen.getByRole('alert');
    expect(summary).toHaveFocus();
    for (const label of [/^Company/, /^Contact name/, /^Email/]) {
      const input = screen.getByLabelText(label);
      expect(input).toHaveAttribute('aria-invalid', 'true');
      const described = input.getAttribute('aria-describedby')!;
      expect(document.getElementById(described.split(' ')[0])).toHaveTextContent(/./);
    }
    expect(summary).toHaveTextContent(/add at least one model/i);
  });

  it('rejects a malformed email', async () => {
    const user = userEvent.setup();
    render(<InquiryForm products={products} initialSlug={first.slug} />);
    await user.type(screen.getByLabelText(/^Company/), 'Reyes Interiors');
    await user.type(screen.getByLabelText(/^Contact name/), 'Ana');
    await user.type(screen.getByLabelText(/^Email/), 'not-an-email');
    await user.click(screen.getByRole('button', { name: 'Send inquiry' }));
    expect(submitInquiry).not.toHaveBeenCalled();
    expect(screen.getByLabelText(/^Email/)).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByLabelText(/^Company/)).not.toHaveAttribute('aria-invalid', 'true');
  });

  it('puts maxLength from the limits on the fields and counts the notes', async () => {
    const user = userEvent.setup();
    render(<InquiryForm products={products} />);
    expect(screen.getByLabelText(/^Company/)).toHaveAttribute('maxlength', '120');
    expect(screen.getByLabelText(/^Contact name/)).toHaveAttribute('maxlength', '80');
    expect(screen.getByLabelText(/^Email/)).toHaveAttribute('maxlength', '200');
    expect(screen.getByLabelText(/^Phone/)).toHaveAttribute('maxlength', '40');
    expect(screen.getByLabelText(/^Your role/)).toHaveAttribute('maxlength', '80');
    const notes = screen.getByLabelText(/^Notes/);
    expect(notes).toHaveAttribute('maxlength', '2000');
    await user.type(notes, 'hello');
    expect(screen.getByText('5 / 2000')).toBeInTheDocument();
  });

  it('marks only company, contact name and email as required; phone and role are optional', () => {
    render(<InquiryForm products={products} />);
    for (const label of [/^Company/, /^Contact name/, /^Email/]) expect(screen.getByLabelText(label)).toHaveAttribute('aria-required', 'true');
    for (const label of [/^Phone/, /^Your role/, /^Notes/]) expect(screen.getByLabelText(label)).not.toHaveAttribute('aria-required');
  });
});

describe('InquiryForm submit', () => {
  it('submits the exact payload once, disables the button while sending, then confirms', async () => {
    const user = userEvent.setup();
    let resolve!: (v: { ok: true; reference: string }) => void;
    submitInquiry.mockReturnValue(new Promise((r) => { resolve = r; }));
    render(<InquiryForm products={products} initialSlug={first.slug} />);
    await fillRequired(user);
    await user.type(screen.getByLabelText(/^Phone/), '0917 000 0000');
    await user.type(screen.getByLabelText(/^Your role/), 'Operations');
    await user.type(screen.getByLabelText(/^Notes/), 'Need 12 for a hotel');
    await user.selectOptions(screen.getByLabelText(`Pack for ${first.name}`), 'pair');
    const qty = screen.getByLabelText(`Quantity for ${first.name}`);
    await user.clear(qty);
    await user.type(qty, '12');
    await user.click(screen.getByRole('button', { name: 'Send inquiry' }));

    expect(submitInquiry).toHaveBeenCalledTimes(1);
    expect(submitInquiry).toHaveBeenCalledWith({
      company: 'Reyes Interiors',
      contactName: 'Ana Reyes',
      email: 'ana@example.com',
      phone: '0917 000 0000',
      role: 'Operations',
      message: 'Need 12 for a hotel',
      items: [{ productId: first.id, packId: 'pair', quantity: 12 }],
      website: '',
    });
    const sending = screen.getByRole('button', { name: /sending/i });
    expect(sending).toBeDisabled();
    await user.click(sending);
    expect(submitInquiry).toHaveBeenCalledTimes(1);

    resolve({ ok: true, reference: 'JAI-0123456789AB' });
    const heading = await screen.findByRole('heading', { name: /thank you/i });
    await waitFor(() => expect(heading).toHaveFocus());
    const panel = heading.parentElement!;
    expect(panel).toHaveTextContent('We have received your inquiry.');
    expect(panel).toHaveTextContent('JAI-0123456789AB');
    expect(panel.textContent).not.toMatch(/within|hours|days|quote|reply|respond/i);
    expect(screen.getByRole('link', { name: 'Back to the catalogue' })).toHaveAttribute('href', '/shop');
    expect(screen.queryByRole('button', { name: 'Send inquiry' })).toBeNull();
  });

  it('on failure shows the error in an alert, keeps every value and re-enables the button', async () => {
    const user = userEvent.setup();
    submitInquiry.mockResolvedValue({ ok: false, error: 'We could not send your inquiry just now. Please try again in a moment.' });
    render(<InquiryForm products={products} initialSlug={first.slug} />);
    await fillRequired(user);
    await user.type(screen.getByLabelText(/^Phone/), '0917');
    await user.type(screen.getByLabelText(/^Your role/), 'Manager');
    await user.type(screen.getByLabelText(/^Notes/), 'Hello there');
    await user.selectOptions(screen.getByLabelText(`Pack for ${first.name}`), 'pack-4');
    const qty = screen.getByLabelText(`Quantity for ${first.name}`);
    await user.clear(qty);
    await user.type(qty, '7');
    await user.click(screen.getByRole('button', { name: 'Send inquiry' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('We could not send your inquiry just now.');
    expect(screen.getByLabelText(/^Company/)).toHaveValue('Reyes Interiors');
    expect(screen.getByLabelText(/^Contact name/)).toHaveValue('Ana Reyes');
    expect(screen.getByLabelText(/^Email/)).toHaveValue('ana@example.com');
    expect(screen.getByLabelText(/^Phone/)).toHaveValue('0917');
    expect(screen.getByLabelText(/^Your role/)).toHaveValue('Manager');
    expect(screen.getByLabelText(/^Notes/)).toHaveValue('Hello there');
    expect(screen.getByLabelText(`Pack for ${first.name}`)).toHaveValue('pack-4');
    expect(screen.getByLabelText(`Quantity for ${first.name}`)).toHaveValue('7');
    expect(screen.getByRole('button', { name: 'Send inquiry' })).toBeEnabled();
    expect(screen.queryByText('We have received your inquiry.')).toBeNull();
  });
});

describe('InquiryForm honeypot and accessibility', () => {
  it('renders the honeypot hidden from sight, keyboard and screen readers, and sends it', async () => {
    const user = userEvent.setup();
    submitInquiry.mockResolvedValue({ ok: true, reference: 'JAI-0123456789AB' });
    const { container } = render(<InquiryForm products={products} initialSlug={first.slug} />);
    const trap = container.querySelector<HTMLInputElement>('input[name="website"]')!;
    expect(trap).not.toBeNull();
    expect(trap).toHaveAttribute('tabindex', '-1');
    expect(trap).toHaveAttribute('aria-hidden', 'true');
    expect(trap).toHaveAttribute('autocomplete', 'off');
    const hiddenWrapper = trap.parentElement!;
    expect(hiddenWrapper).toHaveAttribute('aria-hidden', 'true');
    expect(hiddenWrapper.className).toContain('sr-only');
    expect(screen.queryByRole('textbox', { name: /website/i })).toBeNull();
    await fillRequired(user);
    await user.type(trap, 'http://spam.example');
    await user.click(screen.getByRole('button', { name: 'Send inquiry' }));
    expect(submitInquiry).toHaveBeenCalledWith(expect.objectContaining({ website: 'http://spam.example' }));
  });

  it('never puts a price, a peso sign or Maya in the DOM (R-B2B-1)', async () => {
    const user = userEvent.setup();
    const { container } = render(<InquiryForm products={products} initialSlug={first.slug} />);
    expect(container.innerHTML).not.toMatch(/₱|price|maya/i);
    await user.click(screen.getByRole('button', { name: 'Send inquiry' }));
    expect(container.innerHTML).not.toMatch(/₱|price|maya/i);
  });

  it('uses squared corners only and no fixed widths on controls (360px)', () => {
    const { container } = render(<InquiryForm products={products} initialSlug={first.slug} />);
    const classes = Array.from(container.querySelectorAll('[class]')).map((e) => e.getAttribute('class')!).join(' ');
    expect(classes).not.toMatch(/rounded/);
    expect(classes).not.toMatch(/(^|\s)(min-|max-)?w-\[\d+(px|rem)\]/);
  });

  it('gives interactive controls the 44px field or button styles', () => {
    render(<InquiryForm products={products} initialSlug={first.slug} />);
    for (const el of [
      screen.getByLabelText(/^Company/),
      screen.getByLabelText(`Pack for ${first.name}`),
      screen.getByLabelText(`Quantity for ${first.name}`),
      screen.getByRole('button', { name: `Remove ${first.name}` }),
      screen.getByRole('button', { name: 'Add another model' }),
      screen.getByRole('button', { name: 'Send inquiry' }),
    ]) {
      expect(el.className).toMatch(/\bfield\b|btn-primary|btn-quiet|btn-outline/);
    }
  });
});

describe('InquiryForm wording', () => {
  it('tells the visitor how to ask for the same model in several packs, with no money words', () => {
    render(<InquiryForm products={products} initialSlug={first.slug} />);
    const hint = screen.getByText(/Need the same model in more than one pack\?/);
    expect(hint.textContent).not.toMatch(/price|pricing|pay|paid|payment|peso|maya|quote|₱/i);
  });

  it('asks for no city and mentions no rug', () => {
    const { container } = render(<InquiryForm products={products} />);
    expect(container.textContent).not.toMatch(/city|\brugs?\b/i);
  });
});
