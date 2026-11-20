// @vitest-environment jsdom
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CheckoutClient } from '@/components/checkout/CheckoutClient';
import { buildCatalogueIndex } from '@/lib/catalog';
import { PRODUCTS } from '@/lib/catalog/fixtures';
import { CATEGORIES } from '@/lib/catalog/types';
import { MAX_LINE_QUANTITY } from '@/lib/limits';
import { useCartStore } from '@/lib/cart/store';
import { CheckoutClientError } from '@/lib/checkout/client';
import { FIELD_LIMITS } from '@/lib/checkout/limits';
import { LAST_ORDER_KEY } from '@/lib/checkout/last-order';
import type { CheckoutResponse } from '@/lib/checkout/types';

const mockHydrated = vi.hoisted(() => ({ value: true }));

vi.mock('@/components/cart/CartProvider', () => ({
  useCartUi: () => ({ hydrated: mockHydrated.value }),
}));

const TOKEN = 'k9Xq2LmZ7pRt4VbN8cYw3HsA';
const index = buildCatalogueIndex(PRODUCTS);
const fr01 = PRODUCTS.find((p) => p.id === 'ja-fr-01')!;
const price = (id: string) => fr01.packs.find((p) => p.id === id)!.price;
const TOTAL = price('pair') * 2;
const ok: CheckoutResponse = {
  reference: 'JA-ABCD12345678', subtotal: TOTAL, shipping: 0, total: TOTAL, itemCount: 2, isDomestic: true,
  redirectUrl: `https://sandbox.mymaya.me/SbxInv?amt=${TOTAL}`, persisted: true,
};

const renderClient = (props: Partial<React.ComponentProps<typeof CheckoutClient>> = {}) =>
  render(<CheckoutClient token={TOKEN} index={index} submit={vi.fn()} navigate={vi.fn()} {...props} />);

// Typing character by character through user-event, and looking fields up by label, are both
// slow on a page this large and prove nothing extra here: the fields are uncontrolled and read
// from FormData on submit. (The labels themselves are asserted in their own tests.)
const FIELD_IDS: Record<string, string> = {
  Company: 'company',
  'Contact name': 'contactName',
  Email: 'email',
  'Street address': 'line1',
  'City or municipality': 'city',
  Province: 'province',
  'Postal code': 'postalCode',
  'Phone (optional)': 'phone',
  'Tax ID (TIN) (optional)': 'taxId',
  'Your PO reference (optional)': 'poReference',
};

function setValue(label: string, value: string) {
  fireEvent.change(document.getElementById(FIELD_IDS[label])!, { target: { value } });
}

async function fill(_user?: ReturnType<typeof userEvent.setup>) {
  setValue('Company', 'Mabini Dining Corp.');
  setValue('Contact name', 'Ana Reyes');
  setValue('Email', 'ana@example.com');
  setValue('Street address', '12 Mabini St');
  setValue('City or municipality', 'Quezon City');
  setValue('Province', 'Metro Manila');
  setValue('Postal code', '1100');
}

const payButton = () => screen.getByRole('button', { name: /^pay/i });
const linesRegion = () => screen.getByRole('region', { name: 'Order lines' });

afterEach(() => {
  vi.unstubAllGlobals();
});

beforeEach(() => {
  localStorage.clear();
  mockHydrated.value = true;
  useCartStore.setState({ lines: [{ productId: 'ja-fr-01', packId: 'pair', quantity: 2 }] });
});

describe('CheckoutClient: submitting', () => {
  it('posts the link token, ids, pack ids and quantities only, then navigates to the Maya link when the order was filed', async () => {
    const user = userEvent.setup();
    const submit = vi.fn().mockResolvedValue(ok);
    const navigate = vi.fn();
    renderClient({ submit, navigate });
    await fill(user);
    await user.click(payButton());
    expect(submit).toHaveBeenCalledWith({
      token: TOKEN,
      items: [{ productId: 'ja-fr-01', packId: 'pair', quantity: 2 }],
      customer: { company: 'Mabini Dining Corp.', contactName: 'Ana Reyes', email: 'ana@example.com' },
      shippingAddress: { line1: '12 Mabini St', city: 'Quezon City', province: 'Metro Manila', postalCode: '1100', country: 'Philippines' },
    });
    expect(JSON.stringify(submit.mock.calls[0][0])).not.toMatch(/price|total|amount|subtotal/i);
    expect(navigate).toHaveBeenCalledWith(ok.redirectUrl);
  });

  it('sends the optional phone, TIN and PO reference when they are filled in', async () => {
    const user = userEvent.setup();
    const submit = vi.fn().mockResolvedValue(ok);
    renderClient({ submit });
    await fill(user);
    setValue('Phone (optional)', '+63 917 000 0000');
    setValue('Tax ID (TIN) (optional)', '000-000-000-000');
    setValue('Your PO reference (optional)', 'PO-1042');
    await user.click(payButton());
    expect(submit.mock.calls[0][0].customer).toEqual({
      company: 'Mabini Dining Corp.',
      contactName: 'Ana Reyes',
      email: 'ana@example.com',
      phone: '+63 917 000 0000',
      taxId: '000-000-000-000',
      poReference: 'PO-1042',
    });
  });

  it('a double click sends ONE request and the button stays disabled', async () => {
    const user = userEvent.setup();
    const submit = vi.fn(() => new Promise<CheckoutResponse>(() => {}));
    renderClient({ submit });
    await fill(user);
    const pay = payButton();
    await user.dblClick(pay);
    expect(submit).toHaveBeenCalledTimes(1);
    expect(pay).toBeDisabled();
  });

  it('the in-flight ref alone stops two synchronous submits from sending two requests', () => {
    const submit = vi.fn(() => new Promise<CheckoutResponse>(() => {}));
    renderClient({ submit });
    const form = payButton().closest('form')!;
    act(() => {
      fireEvent.submit(form);
      fireEvent.submit(form);
    });
    expect(submit).toHaveBeenCalledTimes(1);
  });

  it('when we could not confirm the order was saved it does not auto-redirect, tells the customer to keep the reference, and waits for a click', async () => {
    const user = userEvent.setup();
    const navigate = vi.fn();
    renderClient({ submit: vi.fn().mockResolvedValue({ ...ok, persisted: false }), navigate });
    await fill(user);
    await user.click(payButton());
    expect(navigate).not.toHaveBeenCalled();
    expect(screen.getByText(/couldn.t confirm that order JA-ABCD12345678 was saved/i)).toBeInTheDocument();
    expect(screen.getByText(/keep your Maya receipt/i)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /continue to maya/i }));
    expect(navigate).toHaveBeenCalledWith(ok.redirectUrl);
  });

  it('shows a server error in an alert, moves focus to it, and lets the customer try again', async () => {
    const user = userEvent.setup();
    const navigate = vi.fn();
    const submit = vi.fn().mockRejectedValue(new CheckoutClientError('These items are out of stock: Himig 6', 409));
    renderClient({ submit, navigate });
    await fill(user);
    await user.click(payButton());
    const alert = screen.getByRole('alert');
    expect(alert).toHaveTextContent('These items are out of stock: Himig 6');
    expect(alert).toHaveFocus();
    expect(navigate).not.toHaveBeenCalled();
    expect(payButton()).toBeEnabled();
  });

  it('a 409 tells the customer to reload to refresh their order; other errors do not', async () => {
    const user = userEvent.setup();
    const submit = vi
      .fn()
      .mockRejectedValueOnce(new CheckoutClientError('These items are out of stock: Himig 6', 409))
      .mockRejectedValueOnce(new CheckoutClientError('Checkout is temporarily unavailable. Please try again shortly.', 503));
    renderClient({ submit });
    await fill(user);
    await user.click(payButton());
    expect(screen.getByRole('alert')).toHaveTextContent('These items are out of stock: Himig 6. Reload this page to refresh your order.');
    await user.click(payButton());
    expect(screen.getByRole('alert')).toHaveTextContent('Checkout is temporarily unavailable. Please try again shortly.');
    expect(screen.getByRole('alert')).not.toHaveTextContent(/reload this page/i);
  });

  it('refuses to open a payment link on a host it does not recognise (real client)', async () => {
    const user = userEvent.setup();
    const navigate = vi.fn();
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ ...ok, redirectUrl: 'https://evil.example/pay?amt=1' }), {
          status: 200, headers: { 'content-type': 'application/json' },
        }),
      ),
    );
    render(<CheckoutClient token={TOKEN} index={index} navigate={navigate} />);
    await fill(user);
    await user.click(payButton());
    expect(screen.getByRole('alert')).toHaveTextContent(/not recognised/i);
    expect(navigate).not.toHaveBeenCalled();
  });

  it('the real client posts the token in the JSON body to /api/checkout', async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify(ok), { status: 200, headers: { 'content-type': 'application/json' } }),
    );
    vi.stubGlobal('fetch', fetchMock);
    render(<CheckoutClient token={TOKEN} index={index} navigate={vi.fn()} />);
    await fill(user);
    await user.click(payButton());
    expect(fetchMock.mock.calls[0][0]).toBe('/api/checkout');
    expect(JSON.parse(fetchMock.mock.calls[0][1].body).token).toBe(TOKEN);
  });

  it('refuses an unsafe redirect URL that the injected submit returns (component-level check)', async () => {
    const user = userEvent.setup();
    const navigate = vi.fn();
    renderClient({ submit: vi.fn().mockResolvedValue({ ...ok, redirectUrl: 'https://evil.example/x?amt=1' }), navigate });
    await fill(user);
    await user.click(payButton());
    expect(screen.getByRole('alert')).toHaveTextContent(/not recognised/i);
    expect(navigate).not.toHaveBeenCalled();
    expect(payButton()).toBeEnabled();
  });

  it('a mixed order sends ONLY the available line', async () => {
    const user = userEvent.setup();
    useCartStore.setState({
      lines: [
        { productId: 'ja-fr-01', packId: 'single', quantity: 1 },
        { productId: 'ja-fr-01', packId: 'pack-10', quantity: 3 },
      ],
    });
    const submit = vi.fn().mockResolvedValue({ ...ok, subtotal: price('single'), total: price('single') });
    renderClient({ submit });
    expect(screen.getByRole('alert')).toHaveTextContent(/no longer available/i);
    await fill(user);
    await user.click(payButton());
    expect(submit.mock.calls[0][0].items).toEqual([{ productId: 'ja-fr-01', packId: 'single', quantity: 1 }]);
  });
});

describe('CheckoutClient: the order slip', () => {
  it('shows each line with its pack, quantity and amount, and the totals in the summary rail', () => {
    renderClient();
    const lines = within(linesRegion());
    expect(lines.getByText('Himig 6')).toBeInTheDocument();
    expect(lines.getByLabelText('Pack for Himig 6')).toHaveValue('pair');
    expect(lines.getByRole('group', { name: /quantity for himig 6, matched pair/i })).toHaveTextContent('2');
    const summary = screen.getByRole('complementary', { name: 'Order summary' });
    expect(summary).toHaveTextContent('₱30,300');
    expect(summary).toHaveTextContent(/Pay ₱30,300 with Maya/);
  });

  it('the stepper changes the quantity and the totals', async () => {
    const user = userEvent.setup();
    renderClient();
    await user.click(screen.getByRole('button', { name: /more: himig 6, matched pair/i }));
    expect(useCartStore.getState().lines).toEqual([{ productId: 'ja-fr-01', packId: 'pair', quantity: 3 }]);
    expect(screen.getByRole('complementary', { name: 'Order summary' })).toHaveTextContent('₱45,450');
    await user.click(screen.getByRole('button', { name: /fewer: himig 6, matched pair/i }));
    await user.click(screen.getByRole('button', { name: /fewer: himig 6, matched pair/i }));
    expect(useCartStore.getState().lines[0].quantity).toBe(1);
  });

  it('changing the pack re-prices the line from the catalogue index', async () => {
    const user = userEvent.setup();
    renderClient();
    await user.selectOptions(within(linesRegion()).getByLabelText('Pack for Himig 6'), 'pack-4');
    expect(useCartStore.getState().lines).toEqual([{ productId: 'ja-fr-01', packId: 'pack-4', quantity: 2 }]);
    expect(screen.getByRole('complementary', { name: 'Order summary' })).toHaveTextContent('₱58,700');
  });

  it('the "more" button stops at the per-product ceiling, summed across packs', () => {
    useCartStore.setState({
      lines: [
        { productId: 'ja-fr-01', packId: 'single', quantity: 10 },
        { productId: 'ja-fr-01', packId: 'pair', quantity: 10 },
      ],
    });
    renderClient();
    for (const button of screen.getAllByRole('button', { name: /^more:/i })) expect(button).toBeDisabled();
    expect(screen.getAllByText(new RegExp(`${MAX_LINE_QUANTITY} is the most of one product`)).length).toBeGreaterThan(0);
  });

  it('removes a line', async () => {
    const user = userEvent.setup();
    renderClient();
    await user.click(screen.getByRole('button', { name: /^remove himig 6, matched pair/i }));
    expect(useCartStore.getState().lines).toEqual([]);
    expect(screen.getByText(/no lines yet/i)).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Order lines' })).toHaveFocus();
  });

  it('every control is a real 44px target (steppers, pack picker, Remove, Add)', () => {
    renderClient();
    for (const name of [/^more:/i, /^fewer:/i]) expect(screen.getByRole('button', { name }).className).toContain('h-11');
    expect(screen.getByRole('button', { name: /^remove himig 6/i }).className).toContain('min-h-[44px]');
    expect(within(linesRegion()).getByLabelText('Pack for Himig 6').className).toContain('min-h-[44px]');
    expect(screen.getByRole('button', { name: /^add himig 6/i }).className).toContain('btn-quiet');
  });
});

describe('CheckoutClient: add products', () => {
  it('lists the WHOLE catalogue grouped by category, in catalogue order, with thumbnails and no photo claims', () => {
    renderClient();
    const picker = screen.getByRole('region', { name: 'Add products' });
    const headings = within(picker).getAllByRole('heading', { level: 3 }).map((h) => h.textContent ?? '');
    expect(headings).toHaveLength(CATEGORIES.length);
    for (const product of PRODUCTS) {
      expect(within(picker).getByRole('button', { name: new RegExp(`^(add ${product.name},|${product.name}: )`, 'i') })).toBeInTheDocument();
    }
    expect(picker.querySelectorAll('svg')).toHaveLength(PRODUCTS.length);
    expect(picker).toHaveTextContent(/schematics generated from each specification, not photographs/i);
  });

  it('groups a product under its own category heading', () => {
    renderClient();
    const group = screen.getByRole('group', { name: /amplification/i });
    expect(within(group).getByText('Lakas D4-600')).toBeInTheDocument();
    expect(within(group).queryByText('Himig 6')).not.toBeInTheDocument();
  });

  it('adds the chosen pack of a product to the order and announces it', async () => {
    const user = userEvent.setup();
    renderClient();
    await user.selectOptions(screen.getByLabelText('Pack to add for Langit 8C'), 'pack-10');
    await user.click(screen.getByRole('button', { name: /^add langit 8c, carton of 10/i }));
    expect(useCartStore.getState().lines).toContainEqual({ productId: 'ja-ce-02', packId: 'pack-10', quantity: 1 });
    expect(screen.getByText(/added langit 8c, carton of 10, to your order/i)).toBeInTheDocument();
    expect(within(linesRegion()).getByText('Langit 8C')).toBeInTheDocument();
  });

  it('an out-of-stock product cannot be added', () => {
    const stale = { ...index, 'ja-am-01': { ...index['ja-am-01'], inStock: false } };
    renderClient({ index: stale });
    expect(screen.getByRole('button', { name: /lakas d4-600: out of stock/i })).toBeDisabled();
  });

  it('Add is disabled until the persisted order has rehydrated (an early add would be overwritten)', () => {
    mockHydrated.value = false;
    renderClient();
    expect(screen.getByRole('button', { name: /^add himig 6/i })).toBeDisabled();
  });

  it('a product already at the order ceiling cannot be added again', () => {
    useCartStore.setState({ lines: [{ productId: 'ja-fr-01', packId: 'single', quantity: MAX_LINE_QUANTITY }] });
    renderClient();
    expect(screen.getByRole('button', { name: /himig 6: order limit reached/i })).toBeDisabled();
  });
});

describe('CheckoutClient: honesty and structure', () => {
  it('says plainly that the order stays pending until a person matches the payment, and never claims it is paid or confirmed', () => {
    const { container } = renderClient();
    const text = (container.textContent ?? '').replace(/\s+/g, ' ');
    expect(text).toMatch(/Maya doesn.t tell us when a payment is made/);
    expect(text).toMatch(/stays pending until our team matches your payment/);
    expect(text).not.toMatch(/\bpaid\b|payment received|order confirmed|payment confirmed/i);
  });

  it('shows prices (this page is exempt from the no-prices rule)', () => {
    renderClient();
    expect(screen.getAllByText(/₱\d/).length).toBeGreaterThan(5);
  });

  it('is one form with an accessible name, and no storefront or range wording', () => {
    const { container } = renderClient();
    expect(screen.getByRole('form', { name: 'Purchase order' })).toBeInTheDocument();
    expect(container.textContent).not.toMatch(/(storefront|range|handmade|machine-made|rug)s?/i);
  });

  it('asks for a state or region, not a required province, outside the Philippines', async () => {
    const user = userEvent.setup();
    renderClient();
    expect(screen.getByLabelText('Province')).toBeRequired();
    await user.selectOptions(screen.getByLabelText('Country'), 'Spain');
    expect(screen.getByLabelText('State or region (optional)')).not.toBeRequired();
    expect(screen.getAllByText(/international freight is not included/i).length).toBeGreaterThan(0);
  });

  it('marks the optional fields "(optional)" and leaves the required ones unmarked', () => {
    renderClient();
    for (const label of ['Phone (optional)', 'Tax ID (TIN) (optional)', 'Your PO reference (optional)', 'Address line 2 (optional)', 'Barangay (optional)']) {
      expect(screen.getByLabelText(label)).not.toBeRequired();
    }
    for (const label of ['Company', 'Contact name', 'Email', 'Street address', 'City or municipality', 'Province', 'Postal code']) {
      expect(screen.getByLabelText(label)).toBeRequired();
    }
  });

  it('every input takes its maxLength from the shared FIELD_LIMITS, so the form never accepts more than the API', () => {
    renderClient();
    const expected: Record<string, number> = {
      company: FIELD_LIMITS.company,
      contactName: FIELD_LIMITS.name,
      email: FIELD_LIMITS.email,
      phone: FIELD_LIMITS.phone,
      taxId: FIELD_LIMITS.taxId,
      poReference: FIELD_LIMITS.poReference,
      line1: FIELD_LIMITS.line,
      line2: FIELD_LIMITS.line,
      barangay: FIELD_LIMITS.barangay,
      city: FIELD_LIMITS.city,
      province: FIELD_LIMITS.province,
      postalCode: FIELD_LIMITS.postal,
    };
    for (const [id, max] of Object.entries(expected)) {
      expect(document.getElementById(id), id).toHaveAttribute('maxlength', String(max));
    }
  });

  it('autocomplete hints: organization, email, tel and address-level3 for the barangay', () => {
    renderClient();
    expect(screen.getByLabelText('Company')).toHaveAttribute('autocomplete', 'organization');
    expect(screen.getByLabelText('Email')).toHaveAttribute('autocomplete', 'email');
    expect(screen.getByLabelText('Phone (optional)')).toHaveAttribute('type', 'tel');
    expect(screen.getByLabelText('Barangay (optional)')).toHaveAttribute('autocomplete', 'address-level3');
  });

  it('hydration gate: until the order has hydrated it shows a loading status, not "no lines", and Pay is disabled', () => {
    mockHydrated.value = false;
    renderClient();
    expect(screen.getByRole('status')).toHaveTextContent(/loading your order/i);
    expect(screen.queryByText(/no lines yet/i)).not.toBeInTheDocument();
    expect(payButton()).toBeDisabled();
  });

  it('once hydrated it shows the order and Pay is enabled', () => {
    renderClient();
    expect(screen.queryByText(/loading your order/i)).not.toBeInTheDocument();
    expect(payButton()).toBeEnabled();
  });

  it('an empty order disables Pay and says so', () => {
    useCartStore.setState({ lines: [] });
    renderClient();
    expect(screen.getByRole('button', { name: /add a product to pay/i })).toBeDisabled();
    expect(screen.getByText(/no lines yet/i)).toBeInTheDocument();
  });

  it('a hostile order id such as "constructor" never resolves to an inherited value', () => {
    useCartStore.setState({
      lines: [
        { productId: 'constructor', packId: 'single', quantity: 1 },
        { productId: 'ja-fr-01', packId: 'single', quantity: 1 },
      ],
    });
    // A plain-object index, as a server component hands it across the boundary.
    renderClient({ index: { ...index } });
    expect(payButton()).toBeEnabled();
    expect(screen.getByRole('alert')).toHaveTextContent(/An item: no longer available/);
  });
});

describe('CheckoutClient: unavailable lines', () => {
  const lineOf = (packId: string) => ({ productId: 'ja-fr-01', packId, quantity: 1 });

  it('flags a pack that no longer exists, excludes it, and disables Pay', async () => {
    const user = userEvent.setup();
    useCartStore.setState({ lines: [lineOf('pack-10')] });
    renderClient();
    expect(screen.getByRole('alert')).toHaveTextContent(/no longer available/i);
    expect(screen.getByRole('button', { name: /add a product to pay/i })).toBeDisabled();
    await user.click(screen.getByRole('button', { name: /^remove himig 6/i }));
    expect(useCartStore.getState().lines).toEqual([]);
  });

  it('its Remove button is at least 44px tall', () => {
    useCartStore.setState({ lines: [lineOf('pack-10')] });
    renderClient();
    expect(screen.getByRole('button', { name: /^remove himig 6/i }).className).toContain('min-h-[44px]');
  });

  it('moves focus to the next Remove button after removing one', async () => {
    const user = userEvent.setup();
    useCartStore.setState({ lines: [lineOf('pack-10'), lineOf('crate-99'), lineOf('crate-98')] });
    renderClient();
    const [first, second] = screen.getAllByRole('button', { name: /^remove himig 6/i });
    first.focus();
    await user.click(first);
    const left = screen.getAllByRole('button', { name: /^remove himig 6/i });
    expect(left).toHaveLength(2);
    expect(left[0]).toHaveFocus();
    expect(left[0].dataset.removeKey).toBe(second.dataset.removeKey);
  });

  it('moves focus to the previous Remove button when the last one was removed', async () => {
    const user = userEvent.setup();
    useCartStore.setState({ lines: [lineOf('pack-10'), lineOf('crate-99')] });
    renderClient();
    const [first, last] = screen.getAllByRole('button', { name: /^remove himig 6/i });
    await user.click(last);
    const only = screen.getByRole('button', { name: /^remove himig 6/i });
    expect(only.dataset.removeKey).toBe(first.dataset.removeKey);
    expect(only).toHaveFocus();
  });

  it('moves focus to the order-lines heading when the alert disappears with the last removal', async () => {
    const user = userEvent.setup();
    useCartStore.setState({ lines: [lineOf('single'), lineOf('pack-10')] });
    renderClient();
    await user.click(screen.getByRole('button', { name: /^remove himig 6$/i }));
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Order lines' })).toHaveFocus();
  });
});

describe('CheckoutClient: pending memory and coming back from Maya', () => {
  const remembered = () =>
    localStorage.setItem(LAST_ORDER_KEY, JSON.stringify({ reference: 'JA-OLD000000001', total: 5000, at: Date.now() }));

  it('after returning from Maya it says the order is pending, keeps the reference, and never says paid', () => {
    remembered();
    const { container } = renderClient();
    expect(screen.getByText(/You were taken to Maya to pay for order JA-OLD000000001/)).toBeInTheDocument();
    expect(screen.getByText(/can.t see whether it was completed/i)).toBeInTheDocument();
    expect(container.textContent).not.toMatch(/\bpaid\b/i);
  });

  it('Dismiss hides the banner and forgets the order, leaving the order lines alone', async () => {
    const user = userEvent.setup();
    remembered();
    renderClient();
    await user.click(screen.getByRole('button', { name: /dismiss/i }));
    expect(screen.queryByText(/JA-OLD000000001/)).not.toBeInTheDocument();
    expect(localStorage.getItem(LAST_ORDER_KEY)).toBeNull();
    expect(useCartStore.getState().lines).toHaveLength(1);
  });

  it('"Remove these items" empties the order and forgets the reference', async () => {
    const user = userEvent.setup();
    remembered();
    useCartStore.setState({
      lines: [
        { productId: 'ja-fr-01', packId: 'pair', quantity: 2 },
        { productId: 'ja-am-01', packId: 'single', quantity: 1 },
      ],
    });
    renderClient();
    await user.click(screen.getByRole('button', { name: /remove these items/i }));
    expect(useCartStore.getState().lines).toEqual([]);
    expect(screen.queryByText(/JA-OLD000000001/)).not.toBeInTheDocument();
  });

  describe('Back / bfcache', () => {
    async function submitOk(user: ReturnType<typeof userEvent.setup>) {
      renderClient({ submit: vi.fn().mockResolvedValue(ok) });
      await fill(user);
      await user.click(payButton());
    }
    const pageshow = (persisted: boolean) =>
      act(() => {
        window.dispatchEvent(new PageTransitionEvent('pageshow', { persisted }));
      });

    it('shows the pending banner as soon as the order is sent, and re-enables Pay on a persisted pageshow', async () => {
      const user = userEvent.setup();
      await submitOk(user);
      expect(screen.getByRole('button', { name: /taking you to maya/i })).toBeDisabled();
      expect(screen.getAllByText(/JA-ABCD12345678/).length).toBeGreaterThan(0);
      pageshow(true);
      expect(payButton()).toBeEnabled();
      expect(screen.getAllByText(/JA-ABCD12345678/).length).toBeGreaterThan(0);
    });

    it('a non-persisted pageshow does nothing', async () => {
      const user = userEvent.setup();
      await submitOk(user);
      pageshow(false);
      expect(screen.getByRole('button', { name: /taking you to maya/i })).toBeDisabled();
    });

    it('removes its pageshow listener on unmount', () => {
      const remove = vi.spyOn(window, 'removeEventListener');
      const { unmount } = renderClient();
      unmount();
      expect(remove.mock.calls.some(([type]) => type === 'pageshow')).toBe(true);
      remove.mockRestore();
    });
  });
});

describe('CheckoutClient: held panel', () => {
  it('moves keyboard focus to the heading when the form is replaced by the panel', async () => {
    const user = userEvent.setup();
    renderClient({ submit: vi.fn().mockResolvedValue({ ...ok, persisted: false }) });
    await fill(user);
    await user.click(payButton());
    expect(document.activeElement).toBe(screen.getByRole('heading', { name: /one thing before you go to maya/i }));
  });

  it('remembers the order only when the customer clicks Continue to Maya, not before', async () => {
    const user = userEvent.setup();
    const navigate = vi.fn();
    renderClient({ submit: vi.fn().mockResolvedValue({ ...ok, persisted: false }), navigate });
    await fill(user);
    await user.click(payButton());
    expect(localStorage.getItem(LAST_ORDER_KEY)).toBeNull();
    await user.click(screen.getByRole('button', { name: /continue to maya/i }));
    expect(JSON.parse(localStorage.getItem(LAST_ORDER_KEY)!).reference).toBe('JA-ABCD12345678');
    expect(navigate).toHaveBeenCalledWith(ok.redirectUrl);
  });

  it('does not auto-navigate when the server total differs from the displayed one, and says so', async () => {
    const user = userEvent.setup();
    const navigate = vi.fn();
    renderClient({ submit: vi.fn().mockResolvedValue({ ...ok, total: 80_000, subtotal: 80_000 }), navigate });
    await fill(user);
    await user.click(payButton());
    expect(navigate).not.toHaveBeenCalled();
    expect(screen.getByText(/price changed while you were checking out\. The new total is ₱80,000\./i)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /continue to maya/i }));
    expect(navigate).toHaveBeenCalledWith(ok.redirectUrl);
  });

  it('a price change offers a quiet "Review my order" button that reloads the page, without going to Maya', async () => {
    const user = userEvent.setup();
    const navigate = vi.fn();
    const reload = vi.fn();
    renderClient({ submit: vi.fn().mockResolvedValue({ ...ok, total: 80_000, subtotal: 80_000 }), navigate, reload });
    await fill(user);
    await user.click(payButton());
    const review = screen.getByRole('button', { name: 'Review my order' });
    expect(review.className).toContain('btn-quiet');
    await user.click(review);
    expect(reload).toHaveBeenCalledTimes(1);
    expect(navigate).not.toHaveBeenCalled();
  });

  it('the unsaved-order panel (no price change) has no "Review my order" button', async () => {
    const user = userEvent.setup();
    renderClient({ submit: vi.fn().mockResolvedValue({ ...ok, persisted: false }), reload: vi.fn() });
    await fill(user);
    await user.click(payButton());
    expect(screen.queryByRole('button', { name: 'Review my order' })).not.toBeInTheDocument();
  });

  it('never says the order is paid or confirmed', async () => {
    const user = userEvent.setup();
    const { container } = renderClient({ submit: vi.fn().mockResolvedValue({ ...ok, persisted: false }) });
    await fill(user);
    await user.click(payButton());
    expect(container.textContent).not.toMatch(/\bpaid\b|payment received|confirmed that/i);
  });
});

describe('CheckoutClient: the price-change check holds when either the subtotal or the total differs from the amount shown', () => {
  it('everything equal: goes straight to Maya', async () => {
    const user = userEvent.setup();
    const navigate = vi.fn();
    renderClient({ submit: vi.fn().mockResolvedValue(ok), navigate });
    await fill(user);
    await user.click(payButton());
    expect(navigate).toHaveBeenCalledWith(ok.redirectUrl);
    expect(screen.queryByText(/price changed/i)).not.toBeInTheDocument();
  });

  it('only the TOTAL differs (a delivery fee): HOLDS, says the delivery is added, and goes to Maya only on the click', async () => {
    // Maya is asked for response.total, so a fee the button never showed must not slip through.
    const user = userEvent.setup();
    const navigate = vi.fn();
    renderClient({ submit: vi.fn().mockResolvedValue({ ...ok, shipping: 500, total: TOTAL + 500 }), navigate });
    await fill(user);
    await user.click(payButton());
    expect(navigate).not.toHaveBeenCalled();
    expect(screen.getByText("Delivery of ₱500 is added, so you'll pay ₱30,800 on Maya.")).toBeInTheDocument();
    expect(screen.queryByText(/price changed/i)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Review my order' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /continue to maya/i }));
    expect(navigate).toHaveBeenCalledWith(ok.redirectUrl);
    expect(JSON.parse(localStorage.getItem(LAST_ORDER_KEY)!).total).toBe(TOTAL + 500);
  });

  it('flags a changed subtotal and shows the server TOTAL (with shipping) in the panel', async () => {
    const user = userEvent.setup();
    const navigate = vi.fn();
    renderClient({ submit: vi.fn().mockResolvedValue({ ...ok, subtotal: 80_000, shipping: 500, total: 80_500 }), navigate });
    await fill(user);
    await user.click(payButton());
    expect(navigate).not.toHaveBeenCalled();
    expect(screen.getByText(/The new total is ₱80,500\./)).toBeInTheDocument();
  });
});
