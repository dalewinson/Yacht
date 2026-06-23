'use client'

export default function PrintButton() {
  return (
    <button
      onClick={() => window.print()}
      className="no-print inline-flex items-center gap-1.5 px-3 py-[6px] text-[12px] bg-[#185FA5] text-white rounded-[var(--border-radius-md)] hover:bg-[#0C447C]"
    >
      <i className="ti ti-printer text-[13px]" /> Print / Save as PDF
    </button>
  )
}
