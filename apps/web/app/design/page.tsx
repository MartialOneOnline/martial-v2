import { memberStatusColors, paymentStatusColors, martialColors, primaryColors, gradients, uiColors } from '@/lib/design/tokens'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { PaymentBadge } from '@/components/ui/PaymentBadge'

const S = {
  page: { minHeight: '100vh', background: uiColors.background, fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif', padding: '40px 32px' },
  h1: { fontSize: 28, fontWeight: 800, color: uiColors.textPrimary, margin: '0 0 4px' },
  sub: { fontSize: 14, color: uiColors.textSecondary, margin: '0 0 48px' },
  section: { marginBottom: 48 },
  sectionTitle: { fontSize: 11, fontWeight: 700, color: uiColors.textMuted, textTransform: 'uppercase' as const, letterSpacing: '0.08em', marginBottom: 16 },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: 12 },
  card: { background: uiColors.surface, border: `1px solid ${uiColors.border}`, borderRadius: 12, padding: '16px 14px', textAlign: 'center' as const },
  swatch: { width: '100%', height: 44, borderRadius: 8, marginBottom: 10 },
  colorLabel: { fontSize: 11, fontWeight: 600, color: uiColors.textPrimary, display: 'block' },
  colorHex: { fontSize: 10, color: uiColors.textMuted, display: 'block', marginTop: 2 },
  row: { display: 'flex', flexWrap: 'wrap' as const, gap: 8, alignItems: 'center' },
  divider: { height: 1, background: uiColors.border, margin: '0 0 48px' },
}

function ColorSwatch({ name, hex, border }: { name: string; hex: string; border?: boolean }) {
  return (
    <div style={S.card}>
      <div style={{ ...S.swatch, background: hex, border: border ? `1px solid ${uiColors.border}` : undefined }} />
      <span style={S.colorLabel}>{name}</span>
      <span style={S.colorHex}>{hex}</span>
    </div>
  )
}

function GradientSwatch({ name, gradient }: { name: string; gradient: string }) {
  return (
    <div style={{ ...S.card, minWidth: 160 }}>
      <div style={{ ...S.swatch, background: gradient, height: 56 }} />
      <span style={S.colorLabel}>{name}</span>
    </div>
  )
}

function SampleTable() {
  const rows = [
    { name: 'Diego Ramirez', member: 'ACTIVE', payment: 'PAID', plan: 'Premium' },
    { name: 'Ana Torres', member: 'PENDING', payment: 'PENDING', plan: 'Standard' },
    { name: 'Carlos Mendez', member: 'LEAD', payment: 'REQUIRES_ACTION', plan: 'Trial' },
    { name: 'Sofia Gomez', member: 'FROZEN', payment: 'PROCESSING', plan: 'Basic' },
    { name: 'Mateo Silva', member: 'INACTIVE', payment: 'FAILED', plan: '—' },
    { name: 'Diego Vargas', member: 'ARCHIVED', payment: 'REFUNDED', plan: '—' },
  ]
  return (
    <div style={{ background: uiColors.surface, border: `1px solid ${uiColors.border}`, borderRadius: 14, overflow: 'hidden' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
        <thead>
          <tr style={{ background: uiColors.surfaceSoft, borderBottom: `1px solid ${uiColors.border}` }}>
            {['Member', 'Status', 'Plan', 'Payment Status', 'Actions'].map(h => (
              <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: uiColors.textMuted, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} style={{ borderBottom: i < rows.length - 1 ? `1px solid ${uiColors.border}` : undefined }}>
              <td style={{ padding: '12px 16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 32, height: 32, borderRadius: '50%', background: primaryColors.primarySoft, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: primaryColors.primary, flexShrink: 0 }}>
                    {row.name.split(' ').map(n => n[0]).join('')}
                  </div>
                  <div>
                    <div style={{ fontWeight: 600, color: uiColors.textPrimary }}>{row.name}</div>
                    <div style={{ fontSize: 11, color: uiColors.textMuted }}>#M-{1200 + i * 37}</div>
                  </div>
                </div>
              </td>
              <td style={{ padding: '12px 16px' }}><StatusBadge status={row.member} /></td>
              <td style={{ padding: '12px 16px', color: uiColors.textSecondary, fontSize: 13 }}>{row.plan}</td>
              <td style={{ padding: '12px 16px' }}><PaymentBadge status={row.payment} /></td>
              <td style={{ padding: '12px 16px' }}>
                <button style={{ width: 28, height: 28, borderRadius: 8, border: `1px solid ${uiColors.border}`, background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ fontSize: 14, color: uiColors.textMuted }}>⋯</span>
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default function DesignPage() {
  return (
    <div style={S.page}>
      {/* Header */}
      <h1 style={S.h1}>Martial App — Color System v1.0</h1>
      <p style={S.sub}>Premium SaaS deportivo · azul profundo · cyan energético · interfaz blanca limpia</p>

      {/* Base UI */}
      <div style={S.section}>
        <p style={S.sectionTitle}>1 · Base UI</p>
        <div style={S.grid}>
          <ColorSwatch name="Background" hex={uiColors.background} border />
          <ColorSwatch name="Surface" hex={uiColors.surface} border />
          <ColorSwatch name="Border" hex={uiColors.border} />
          <ColorSwatch name="Text Primary" hex={uiColors.textPrimary} />
          <ColorSwatch name="Text Secondary" hex={uiColors.textSecondary} />
          <ColorSwatch name="Text Muted" hex={uiColors.textMuted} />
        </div>
      </div>
      <div style={S.divider} />

      {/* Brand */}
      <div style={S.section}>
        <p style={S.sectionTitle}>2 · Brand Colors</p>
        <div style={S.grid}>
          <ColorSwatch name="Martial Navy" hex={martialColors.navy} />
          <ColorSwatch name="Navy Dark" hex={martialColors.navyDark} />
          <ColorSwatch name="Martial Blue" hex={martialColors.blue} />
          <ColorSwatch name="Martial Sky" hex={martialColors.sky} />
          <ColorSwatch name="Martial Cyan" hex={martialColors.cyan} />
        </div>
      </div>
      <div style={S.divider} />

      {/* Primary */}
      <div style={S.section}>
        <p style={S.sectionTitle}>3 · Primary Product</p>
        <div style={S.grid}>
          <ColorSwatch name="Primary" hex={primaryColors.primary} />
          <ColorSwatch name="Primary Hover" hex={primaryColors.primaryHover} />
          <ColorSwatch name="Primary Soft" hex={primaryColors.primarySoft} border />
        </div>
        <div style={{ marginTop: 16, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button style={{ background: primaryColors.primary, color: '#fff', border: 'none', borderRadius: 10, padding: '10px 20px', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>Primary Button</button>
          <button style={{ background: primaryColors.primarySoft, color: primaryColors.primary, border: `1px solid ${primaryColors.primaryBorder}`, borderRadius: 10, padding: '10px 20px', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>Soft Button</button>
          <button style={{ background: 'transparent', color: primaryColors.primary, border: `1px solid ${uiColors.border}`, borderRadius: 10, padding: '10px 20px', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>Ghost Button</button>
        </div>
      </div>
      <div style={S.divider} />

      {/* Member Status */}
      <div style={S.section}>
        <p style={S.sectionTitle}>4 · Member Status</p>
        <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' as const }}>
          <div>
            <p style={{ fontSize: 11, color: uiColors.textMuted, marginBottom: 10, fontWeight: 600 }}>Soft (default)</p>
            <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 8 }}>
              {Object.keys(memberStatusColors).map(s => <StatusBadge key={s} status={s} variant="soft" size="md" />)}
            </div>
          </div>
          <div>
            <p style={{ fontSize: 11, color: uiColors.textMuted, marginBottom: 10, fontWeight: 600 }}>Solid</p>
            <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 8 }}>
              {Object.keys(memberStatusColors).map(s => <StatusBadge key={s} status={s} variant="solid" size="md" />)}
            </div>
          </div>
          <div>
            <p style={{ fontSize: 11, color: uiColors.textMuted, marginBottom: 10, fontWeight: 600 }}>Dots only</p>
            <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 14, paddingTop: 4 }}>
              {Object.values(memberStatusColors).map(t => (
                <div key={t.label} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: t.dot }} />
                  <span style={{ fontSize: 13, color: uiColors.textSecondary }}>{t.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
      <div style={S.divider} />

      {/* Payment Status */}
      <div style={S.section}>
        <p style={S.sectionTitle}>5 · Payment Status</p>
        <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' as const }}>
          <div>
            <p style={{ fontSize: 11, color: uiColors.textMuted, marginBottom: 10, fontWeight: 600 }}>Soft (default)</p>
            <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 8 }}>
              {Object.keys(paymentStatusColors).map(s => <PaymentBadge key={s} status={s} variant="soft" size="md" />)}
            </div>
          </div>
          <div>
            <p style={{ fontSize: 11, color: uiColors.textMuted, marginBottom: 10, fontWeight: 600 }}>Solid</p>
            <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 8 }}>
              {Object.keys(paymentStatusColors).map(s => <PaymentBadge key={s} status={s} variant="solid" size="md" />)}
            </div>
          </div>
        </div>
      </div>
      <div style={S.divider} />

      {/* Gradients */}
      <div style={S.section}>
        <p style={S.sectionTitle}>6 · Gradients</p>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' as const }}>
          {Object.entries(gradients).map(([name, g]) => <GradientSwatch key={name} name={name} gradient={g} />)}
        </div>
      </div>
      <div style={S.divider} />

      {/* Sample Table */}
      <div style={S.section}>
        <p style={S.sectionTitle}>7 · Sample UI — Dashboard Table</p>
        <SampleTable />
      </div>
    </div>
  )
}
