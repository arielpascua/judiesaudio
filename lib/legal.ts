// OWNER MUST REVIEW. This wording is a plain, generic draft written to match what
// the site actually does today (an inquiry form that stores its fields, and a
// private order link). It is not legal advice. It invents no company number, no
// address, no governing law, no retention period and no after-sales term: add each
// one here, once, when the owner supplies it, and have the whole text checked by
// a lawyer before the site takes real orders. The notice below keeps these pages
// out of search results until that is done.

export const LEGAL_SLUGS = ['terms', 'privacy'] as const;
export type LegalSlug = (typeof LEGAL_SLUGS)[number];

/** Remove once the owner has reviewed and approved the wording below. */
export const LEGAL_DRAFT_NOTICE = 'Draft: pending review and approval by the owner of Judie’s Audio.';

export interface LegalPageData {
  title: string;
  sections: { heading: string; body: string[] }[];
}

export const LEGAL_PAGES: Record<LegalSlug, LegalPageData> = {
  terms: {
    title: 'Terms',
    sections: [
      {
        heading: 'Who we are',
        body: [
          'Judie’s Audio supplies commercial audio equipment to businesses: speakers, subwoofers, amplifiers, processors and complete systems. This website lets you read each model’s datasheet and send us an inquiry.',
        ],
      },
      {
        heading: 'Inquiries',
        body: [
          'Sending an inquiry through this website is a request for information. It does not place an order and does not commit you or us to anything.',
          'Terms for an order, including delivery, installation and returns, are agreed in writing with each business customer. Nothing on this website promises a delivery time, an after-sales term or a return.',
        ],
      },
      {
        heading: 'Models and specifications',
        body: [
          'Specifications on this website are nominal. The datasheet supplied with your order, and what we confirm in writing at the time of the order, are what apply.',
          'Product drawings are schematics generated from each specification, not photographs. Finishes and proportions on the delivered product are as stated on its datasheet.',
          'A frequency-response curve on a model page is an idealised drawing made from the two bandwidth figures in the specification. It is not a measurement of a unit.',
        ],
      },
      {
        heading: 'Private order links',
        body: [
          'We may send a business customer a private link to a page where an agreed order can be placed. The link is meant only for the person it was sent to. Do not share it.',
        ],
      },
    ],
  },
  privacy: {
    title: 'Privacy',
    sections: [
      {
        heading: 'What we collect',
        body: [
          'When you send an inquiry we collect your company name, your name, your email address, the models, packs and quantities you listed, and, if you choose to give them, your phone number, your role and a note.',
          'If we send you a private order link and you use it, that page also collects the contact and delivery details and the items needed for your order. Your card or e-wallet details are entered with our checkout provider, not on this website, and we do not receive them.',
          'To limit abuse, the server briefly holds your network address in memory to count how many requests come from it. It is not saved with your inquiry.',
        ],
      },
      {
        heading: 'Why we collect it',
        body: ['We use it to read and answer your inquiry, to prepare an order you have agreed, and to see which models our business customers ask about. We do not sell it.'],
      },
      {
        heading: 'Where it is stored',
        body: ['Your inquiry is stored in our database, which is run for us by our database provider.'],
      },
      {
        heading: 'Who can read it',
        body: ['Your inquiry can be read by the people who run Judie’s Audio and by our database provider, who store it for us.'],
      },
      {
        heading: 'Asking us to delete it',
        body: ['You can ask us to delete your inquiry and the details in it at any time. The end of this page says how. Tell us the email address you used so we can find it.'],
      },
    ],
  },
};

/** The page for a slug, or null for anything that is not one of LEGAL_SLUGS. */
export function legalPage(slug: string): LegalPageData | null {
  return (LEGAL_SLUGS as readonly string[]).includes(slug) ? LEGAL_PAGES[slug as LegalSlug] : null;
}
