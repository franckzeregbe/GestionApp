import React, { useState, useMemo, useCallback } from 'react'
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, LayoutChangeEvent } from 'react-native'
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs'
import Svg, { Polyline, Line, Circle, Text as SvgText } from 'react-native-svg'
import { COLORS } from '../theme'
import { MONTHS_FR, MONTHS_SHORT, ICONS } from '../utils/constants'
import { fmt, fmtShort, mkKey, parseDate } from '../utils/currency'
import { type Transaction, type Budgets, type CurrencyId } from '../types'

interface Props {
  transactions: Transaction[]
  budgets: Budgets
  onDeleteTx: (id: number) => void
  currentMonth: Date
  viewMode: 'month' | 'year'
  onViewModeChange: (v: 'month' | 'year') => void
  theme: 'dark' | 'light'
  currency: CurrencyId
}

export default function DashboardScreen({ transactions, budgets, onDeleteTx, currentMonth, viewMode, theme, currency }: Props) {
  const [width, setWidth] = useState(0)
  const onLayout = useCallback((e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width), [])
  const C = COLORS[theme]
  const PAD = 16

  const key = mkKey(currentMonth)
  const yr = currentMonth.getFullYear()
  const mo = currentMonth.getMonth()

  const monthData = useMemo(() => {
    const inc = transactions.filter(t => t.type === 'income' && t.date.startsWith(key)).reduce((s, t) => s + t.amount, 0)
    const exp = transactions.filter(t => t.type === 'expense' && t.date.startsWith(key)).reduce((s, t) => s + t.amount, 0)
    return { inc, exp, balance: inc - exp }
  }, [transactions, key])

  const topExpenses = useMemo(() => {
    const map: Record<string, number> = {}
    transactions.filter(t => t.type === 'expense' && t.date.startsWith(key))
      .forEach(t => { map[t.category] = (map[t.category] || 0) + t.amount })
    return Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 5)
  }, [transactions, key])

  const last6 = useMemo(() => {
    return Array.from({ length: 6 }, (_, i) => {
      const d = new Date(yr, mo - (5 - i), 1)
      const k = mkKey(d)
      const inc = transactions.filter(t => t.type === 'income' && t.date.startsWith(k)).reduce((s, t) => s + t.amount, 0)
      const exp = transactions.filter(t => t.type === 'expense' && t.date.startsWith(k)).reduce((s, t) => s + t.amount, 0)
      return { label: MONTHS_SHORT[d.getMonth()], balance: inc - exp, inc, exp, hasData: inc + exp > 0 }
    })
  }, [transactions, yr, mo])

  const yearMonths = useMemo(() => {
    const now = new Date()
    return Array.from({ length: 12 }, (_, m) => {
      const d = new Date(yr, m, 1)
      const k = mkKey(d)
      const inc = transactions.filter(t => t.type === 'income' && t.date.startsWith(k)).reduce((s, t) => s + t.amount, 0)
      const exp = transactions.filter(t => t.type === 'expense' && t.date.startsWith(k)).reduce((s, t) => s + t.amount, 0)
      return { inc, exp, net: inc - exp, isFuture: d > now }
    })
  }, [transactions, yr])

  const yearSummary = useMemo(() => {
    const inc = yearMonths.reduce((s, m) => s + m.inc, 0)
    const exp = yearMonths.reduce((s, m) => s + m.exp, 0)
    return { inc, exp, net: inc - exp }
  }, [yearMonths])

  const avgData = useMemo(() => {
    const active = last6.filter(m => m.hasData)
    const n = active.length || 1
    return {
      inc: active.reduce((s, m) => s + m.inc, 0) / n,
      exp: active.reduce((s, m) => s + m.exp, 0) / n,
    }
  }, [last6])

  const projection = useMemo(() =>
    Array.from({ length: 3 }, (_, i) => {
      const d = new Date(yr, mo + i + 1, 1)
      return { label: `${MONTHS_FR[d.getMonth()]} ${d.getFullYear()}`, inc: avgData.inc, exp: avgData.exp, net: avgData.inc - avgData.exp }
    }), [yr, mo, avgData])

  const chart = useMemo(() => {
    if (!width) return null
    const W = width - PAD * 2 - 32
    const H = 120
    const vals = last6.map(m => m.balance)
    const max = Math.max(...vals.map(Math.abs), 1)
    const zeroY = H / 2
    const stepX = W / (vals.length - 1 || 1)
    const pts = vals.map((v, i) => ({ x: i * stepX, y: zeroY - (v / (max * 2)) * (H - 20), label: last6[i].label }))
    return { pts, zeroY, W, H, line: pts.map(p => `${p.x},${p.y}`).join(' ') }
  }, [last6, width])

  const CARD_W = width > 0 ? (width - PAD * 2 - 8) / 3 : 100

  const tabBarHeight = useBottomTabBarHeight()

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: C.bg }}
      contentContainerStyle={{ padding: PAD, paddingBottom: tabBarHeight + 16 }}
      showsVerticalScrollIndicator={false}
      onLayout={onLayout}
    >
      {/* Balance card */}
      <View style={[st.balCard, { backgroundColor: C.primarySoft, borderColor: C.border }]}>
        <Text style={[st.balLabel, { color: C.text2 }]}>
          {viewMode === 'year' ? `Bilan ${yr}` : `Solde — ${MONTHS_FR[mo]}`}
        </Text>
        <Text style={[st.balAmount, { color: monthData.balance >= 0 ? C.green : C.red }]}>
          {fmt(viewMode === 'year' ? yearSummary.net : monthData.balance, currency)}
        </Text>
        <View style={[st.balDivider, { backgroundColor: C.border }]} />
        <View style={st.balRow}>
          <View style={st.balItem}>
            <Text style={[st.balItemLabel, { color: C.text2 }]}>↑ Revenus</Text>
            <Text style={[st.balItemVal, { color: C.green }]}>
              {fmt(viewMode === 'year' ? yearSummary.inc : monthData.inc, currency)}
            </Text>
          </View>
          <View style={[st.balSep, { backgroundColor: C.border }]} />
          <View style={st.balItem}>
            <Text style={[st.balItemLabel, { color: C.text2 }]}>↓ Dépenses</Text>
            <Text style={[st.balItemVal, { color: C.red }]}>
              {fmt(viewMode === 'year' ? yearSummary.exp : monthData.exp, currency)}
            </Text>
          </View>
        </View>
      </View>

      {/* Stats row */}
      <View style={st.statsRow}>
        <StatCard label="Moy. revenus" value={fmtShort(Math.round(avgData.inc), currency)} color={C.green} C={C} />
        <StatCard label="Moy. dépenses" value={fmtShort(Math.round(avgData.exp), currency)} color={C.red} C={C} />
        <StatCard label="Transactions" value={String(transactions.length)} color={C.primary} C={C} />
      </View>

      {viewMode === 'year' ? (
        <>
          {/* Grille 12 mois */}
          <SectionTitle title="Mois par mois" C={C} />
          <View style={st.monthGrid}>
            {yearMonths.map((m, i) => {
              const maxV = Math.max(...yearMonths.map(x => x.inc + x.exp), 1)
              return (
                <View key={i} style={[st.monthCard, { backgroundColor: C.surface, borderColor: C.border, opacity: m.isFuture && !m.inc && !m.exp ? 0.35 : 1 }]}>
                  <Text style={[st.monthCardLabel, { color: C.text2 }]}>{MONTHS_SHORT[i]}</Text>
                  {m.isFuture && !m.inc && !m.exp ? (
                    <Text style={{ fontSize: 16, marginVertical: 6 }}>—</Text>
                  ) : (
                    <>
                      <View style={[st.miniBar, { backgroundColor: C.surface2 }]}>
                        <View style={[st.miniBarFill, { width: `${(m.inc / maxV) * 100}%`, backgroundColor: C.green }]} />
                      </View>
                      <View style={[st.miniBar, { backgroundColor: C.surface2, marginTop: 3 }]}>
                        <View style={[st.miniBarFill, { width: `${(m.exp / maxV) * 100}%`, backgroundColor: C.red }]} />
                      </View>
                      <Text style={[st.monthCardNet, { color: m.net >= 0 ? C.green : C.red }]} numberOfLines={1}>
                        {fmtShort(m.net, currency)}
                      </Text>
                    </>
                  )}
                </View>
              )
            })}
          </View>
          <ProjectionTable projection={projection} C={C} currency={currency} />
        </>
      ) : (
        <>
          {/* Graphique 6 mois */}
          {chart && (
            <>
              <SectionTitle title="Évolution sur 6 mois" C={C} />
              <View style={[st.card, { backgroundColor: C.surface, borderColor: C.border }]}>
                <Svg width={chart.W} height={chart.H}>
                  <Line x1={0} y1={chart.zeroY} x2={chart.W} y2={chart.zeroY} stroke={C.border} strokeWidth={1} strokeDasharray="4,3" />
                  <Polyline points={chart.line} fill="none" stroke={C.primary} strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />
                  {chart.pts.map((p, i) => (
                    <Circle key={i} cx={p.x} cy={p.y} r={4} fill={C.primary} />
                  ))}
                  {chart.pts.map((p, i) => (
                    <SvgText key={`l${i}`} x={p.x} y={chart.H - 2} fontSize={9} fill={C.text2} textAnchor="middle">{p.label}</SvgText>
                  ))}
                </Svg>
              </View>
            </>
          )}

          {/* Top dépenses */}
          <SectionTitle title="Top dépenses du mois" C={C} />
          <View style={[st.card, { backgroundColor: C.surface, borderColor: C.border }]}>
            {topExpenses.length === 0 ? (
              <Text style={[st.empty, { color: C.text2 }]}>Aucune dépense ce mois</Text>
            ) : topExpenses.map(([cat, amt], idx) => (
              <View key={cat}>
                <View style={st.expRow}>
                  <Text style={st.expIcon}>{ICONS[cat] || '📦'}</Text>
                  <View style={{ flex: 1 }}>
                    <View style={st.expTop}>
                      <Text style={[st.expName, { color: C.text }]} numberOfLines={1}>{cat}</Text>
                      <Text style={[st.expAmt, { color: C.red }]}>{fmt(amt, currency)}</Text>
                    </View>
                    <View style={[st.expBarBg, { backgroundColor: C.surface2 }]}>
                      <View style={[st.expBarFill, { width: `${(amt / (topExpenses[0][1] || 1)) * 100}%`, backgroundColor: C.red }]} />
                    </View>
                  </View>
                </View>
                {idx < topExpenses.length - 1 && <View style={[st.sep, { backgroundColor: C.border }]} />}
              </View>
            ))}
          </View>

          <ProjectionTable projection={projection} C={C} currency={currency} />
        </>
      )}
    </ScrollView>
  )
}

function SectionTitle({ title, C }: { title: string; C: Record<string, string> }) {
  return <Text style={[st.sectionTitle, { color: C.text }]}>{title}</Text>
}

function StatCard({ label, value, color, C }: { label: string; value: string; color: string; C: Record<string, string> }) {
  return (
    <View style={[st.statCard, { backgroundColor: C.surface, borderColor: C.border }]}>
      <Text style={[st.statVal, { color }]}>{value}</Text>
      <Text style={[st.statLabel, { color: C.text2 }]}>{label}</Text>
    </View>
  )
}

function ProjectionTable({ projection, C, currency }: { projection: { label: string; inc: number; exp: number; net: number }[]; C: Record<string, string>; currency: CurrencyId }) {
  return (
    <>
      <SectionTitle title="🔮 Prévisions" C={C} />
      <View style={[st.card, { backgroundColor: C.surface, borderColor: C.border }]}>
        <View style={[st.projHead, { borderBottomColor: C.border }]}>
          {['Mois', 'Revenus', 'Dépenses', 'Net'].map((h, i) => (
            <Text key={h} style={[st.projHeadCell, { color: C.text2, textAlign: i === 0 ? 'left' : 'right' }]}>{h}</Text>
          ))}
        </View>
        {projection.map((p, i) => (
          <View key={i} style={[st.projRow, i < projection.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: C.border }]}>
            <Text style={[st.projCell, { color: C.text, textAlign: 'left', flex: 1.4 }]} numberOfLines={1}>{p.label}</Text>
            <Text style={[st.projCell, { color: C.green }]}>{fmtShort(p.inc, currency)}</Text>
            <Text style={[st.projCell, { color: C.red }]}>{fmtShort(p.exp, currency)}</Text>
            <Text style={[st.projCell, { color: p.net >= 0 ? C.green : C.red }]}>{fmtShort(p.net, currency)}</Text>
          </View>
        ))}
      </View>
    </>
  )
}

const st = StyleSheet.create({
  balCard: { borderRadius: 20, borderWidth: StyleSheet.hairlineWidth, padding: 20, marginBottom: 12 },
  balLabel: { fontSize: 12, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  balAmount: { fontSize: 36, fontWeight: '800', marginTop: 4, marginBottom: 16, letterSpacing: -1 },
  balDivider: { height: StyleSheet.hairlineWidth, marginBottom: 14 },
  balRow: { flexDirection: 'row' },
  balItem: { flex: 1 },
  balSep: { width: StyleSheet.hairlineWidth, marginHorizontal: 16 },
  balItemLabel: { fontSize: 12, fontWeight: '500' },
  balItemVal: { fontSize: 17, fontWeight: '700', marginTop: 3 },

  statsRow: { flexDirection: 'row', gap: 8, marginBottom: 4 },
  statCard: { flex: 1, borderRadius: 14, borderWidth: StyleSheet.hairlineWidth, paddingVertical: 12, paddingHorizontal: 8, alignItems: 'center' },
  statVal: { fontSize: 15, fontWeight: '700' },
  statLabel: { fontSize: 10, fontWeight: '500', marginTop: 3, textAlign: 'center' },

  sectionTitle: { fontSize: 14, fontWeight: '700', marginTop: 18, marginBottom: 10, letterSpacing: -0.2 },

  card: { borderRadius: 16, borderWidth: StyleSheet.hairlineWidth, padding: 16, overflow: 'hidden' },

  expRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10 },
  expIcon: { fontSize: 20, marginRight: 12, width: 28, textAlign: 'center' },
  expTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  expName: { fontSize: 13, fontWeight: '600', flex: 1, marginRight: 8 },
  expAmt: { fontSize: 13, fontWeight: '700' },
  expBarBg: { height: 4, borderRadius: 2, overflow: 'hidden' },
  expBarFill: { height: '100%', borderRadius: 2 },
  sep: { height: StyleSheet.hairlineWidth },
  empty: { fontSize: 14, textAlign: 'center', paddingVertical: 16 },

  monthGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 4 },
  monthCard: { width: '30%', borderRadius: 12, borderWidth: StyleSheet.hairlineWidth, padding: 8, alignItems: 'center' },
  monthCardLabel: { fontSize: 11, fontWeight: '600', marginBottom: 6 },
  monthCardNet: { fontSize: 10, fontWeight: '700', marginTop: 4 },
  miniBar: { width: '100%', height: 3, borderRadius: 2, overflow: 'hidden' },
  miniBarFill: { height: '100%', borderRadius: 2 },

  projHead: { flexDirection: 'row', borderBottomWidth: StyleSheet.hairlineWidth, paddingBottom: 8, marginBottom: 2 },
  projHeadCell: { flex: 1, fontSize: 11, fontWeight: '600', textAlign: 'right' },
  projRow: { flexDirection: 'row', paddingVertical: 10 },
  projCell: { flex: 1, fontSize: 12, fontWeight: '600', textAlign: 'right' },
})
