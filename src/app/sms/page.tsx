import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Text Message Program — Fairwinds',
  description: 'How the Fairwinds maintenance text-message program works, how to opt in, and how to opt out.',
}

// ── Fill these in (see note in chat) ───────────────────────────────────────
const SMS_NUMBER = '+1 (949) 693-7222'      // the Twilio number crew text to opt in
const SUPPORT_EMAIL = 'support@fairwindsnewport.com'
// ────────────────────────────────────────────────────────────────────────────

const PRIVACY_URL = 'https://fairwindsnewport.com/fairwinds-privacy.html'
const TERMS_URL = 'https://fairwindsnewport.com/fairwinds-terms.html'

export default function SmsProgramPage() {
  return (
    <div className="min-h-full bg-[var(--color-background-secondary)] py-10 px-5">
      <div className="max-w-[680px] mx-auto bg-[var(--color-background-primary)] border border-[var(--color-border-tertiary)] rounded-[var(--border-radius-lg)] p-7">
        <div className="flex items-center gap-2 mb-1 text-[#185FA5]">
          <i className="ti ti-anchor text-[20px]" />
          <span className="text-[15px] font-semibold">Fairwinds</span>
        </div>
        <h1 className="text-[22px] font-semibold text-[var(--color-text-primary)] mb-2">Maintenance Text Message Program</h1>
        <p className="text-[13px] text-[var(--color-text-secondary)] mb-6">
          Fairwinds is a private yacht-maintenance service used by a single vessel-management team
          and its authorized crew and contractors. This page explains our text-message program and
          how to opt in and out.
        </p>

        <Section title="How to opt in">
          <p>
            The messaging number is provided directly to vessel owners and authorized crew by Fairwinds
            staff during onboarding. There is no public sign-up. To enroll, text the word{' '}
            <strong>YES</strong> to <strong>{SMS_NUMBER}</strong>.
          </p>
          <p>
            When you first text the number, you’ll receive a confirmation request:
          </p>
          <Quote>
            Fairwinds maintenance line: reply YES to receive maintenance ticket confirmations for your
            vessel. About a few msgs/month. Msg &amp; data rates may apply. Reply HELP for help, STOP to
            opt out.
          </Quote>
          <p>
            Reply <strong>YES</strong> to confirm. You’ll then receive a welcome message and may begin
            texting maintenance issues to log tickets. No messages are sent before you reply YES.
          </p>
        </Section>

        <Section title="What you’ll receive">
          <p>
            Transactional service messages only — maintenance ticket confirmations, status updates,
            and operational replies to messages you send. We never send marketing or promotional content.
          </p>
        </Section>

        <Section title="Message frequency &amp; rates">
          <p>
            Approximately a few messages per month, varying with maintenance activity.
            <strong> Message and data rates may apply</strong> according to your mobile carrier’s plan.
          </p>
        </Section>

        <Section title="How to opt out or get help">
          <p>
            Reply <strong>STOP</strong> at any time to unsubscribe and receive no further messages.
            Reply <strong>HELP</strong> for assistance, or email{' '}
            <a className="text-[#185FA5] hover:underline" href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>.
          </p>
        </Section>

        <Section title="Privacy">
          <p>
            We do not sell or share your mobile number. Text-messaging opt-in data and consent are not
            shared with any third parties or affiliates for marketing or promotional purposes. See our{' '}
            <a className="text-[#185FA5] hover:underline" href={PRIVACY_URL} target="_blank" rel="noopener noreferrer">Privacy Policy</a>{' '}
            and{' '}
            <a className="text-[#185FA5] hover:underline" href={TERMS_URL} target="_blank" rel="noopener noreferrer">Terms &amp; Conditions</a>.
          </p>
        </Section>

        <p className="text-[11px] text-[var(--color-text-tertiary)] mt-7 pt-4 border-t border-[var(--color-border-tertiary)]">
          Fairwinds, Newport · Maintenance text program
        </p>
      </div>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-5">
      <h2 className="text-[14px] font-semibold text-[var(--color-text-primary)] mb-1.5">{title}</h2>
      <div className="text-[13px] leading-relaxed text-[var(--color-text-secondary)] space-y-2">{children}</div>
    </section>
  )
}

function Quote({ children }: { children: React.ReactNode }) {
  return (
    <blockquote className="border-l-2 border-[#185FA5] pl-3 py-1 text-[var(--color-text-primary)] bg-[var(--color-background-secondary)] rounded-r-[var(--border-radius-md)]">
      {children}
    </blockquote>
  )
}
