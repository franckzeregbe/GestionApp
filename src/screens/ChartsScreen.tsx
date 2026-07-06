import React, { useMemo, useState, useCallback } from 'react'
import { View, Text, ScrollView, StyleSheet, LayoutChangeEvent } from 'react-native'
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs'
import Svg, { Path, G, Rect, Line, Circle, Polyline, Polygon, Text as SvgText } from 'react-native-svg'
import { type Transaction, type CurrencyId } from '../types'
import { COLORS, CHART_COLORS } from '../theme'
import { MONTHS_SHORT } from '../utils/constants'
import { fmt, fmtShort, convert, mkKey, parseDate } from '../utils/currency'
import AmountText from '../components/AmountText'

interface Props {
  transactions: Transaction[]
  theme: 'dark' | 'light'
  currentMonth: Date
  currency: CurrencyId
  hideBalance?: boolean
}

function getAllMonths(n: number, from?: Date) {
  const r: { key: string; label: string; date: Date }[] = []
  const d = from || new Date()
  for (let i = n - 1; i >= 0; i--) {
    const m = new Date(d.getFullYear(), d.getMonth() - i, 1)
    r.push({ key: mkKey(m), label: MONTHS_SHORT[m.getMonth()] + ' ' + String(m.getFullYear()).slice(-2), date: m })
  }
  return r
}

function polarToCartesian(cx: number, cy: number, r: number, angle: number) {
  return { x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) }
}

export default function ChartsScreen({ transactions, theme, currentMonth, currency, hideBalance }: Props) {
  const [containerWidth, setContainerWidth] = useState(0)
  const onLayout = useCallback((e: LayoutChangeEvent) => {
    setContainerWidth(e.nativeEvent.layout.width)
  }, [])

  const CARD_PAD = 16
  const CHART_W = containerWidth - CARD_PAD * 2 - 16 * 2
  const CHART_H = 220
  const DONUT_SIZE = 180
  const c = COLORS[theme]

  const donutData = useMemo(() => {
    const mk = mkKey(currentMonth)
    const filtered = transactions.filter(t => t.type === 'expense' && mkKey(parseDate(t.date)) === mk)
    const groups: Record<string, number> = {}
    filtered.forEach(t => { groups[t.category] = (groups[t.category] || 0) + convert(t.amount, t.currency ?? currency, currency) })
    const entries = Object.entries(groups).sort((a, b) => b[1] - a[1])
    const total = entries.reduce((s, [, v]) => s + v, 0)
    return { entries, total, hasData: total > 0 }
  }, [transactions, currentMonth, currency])

  const months = useMemo(() => getAllMonths(12, currentMonth), [currentMonth])

  const monthlyData = useMemo(() => {
    return months.map(m => {
      const txM = transactions.filter(t => mkKey(parseDate(t.date)) === m.key)
      const inc = txM.filter(t => t.type === 'income').reduce((s, t) => s + convert(t.amount, t.currency ?? currency, currency), 0)
      const exp = txM.filter(t => t.type === 'expense').reduce((s, t) => s + convert(t.amount, t.currency ?? currency, currency), 0)
      return { ...m, inc, exp }
    })
  }, [transactions, months, currency])

  const lineData = useMemo(() => {
    let bal = 0
    return monthlyData.map(m => { bal += m.inc - m.exp; return bal })
  }, [monthlyData])

  const DONUT_CX = DONUT_SIZE / 2
  const DONUT_CY = DONUT_SIZE / 2
  const DONUT_OR = 72
  const DONUT_IR = 48

  const donutArcs = useMemo(() => {
    if (!donutData.hasData) return []
    let angle = -Math.PI / 2
    return donutData.entries.map(([cat, amount], i) => {
      const slice = (amount / donutData.total) * Math.PI * 2
      const s = angle; const e = angle + slice
      angle = e
      const oS = polarToCartesian(DONUT_CX, DONUT_CY, DONUT_OR, s)
      const oE = polarToCartesian(DONUT_CX, DONUT_CY, DONUT_OR, e)
      const iS = polarToCartesian(DONUT_CX, DONUT_CY, DONUT_IR, s)
      const iE = polarToCartesian(DONUT_CX, DONUT_CY, DONUT_IR, e)
      const large = slice > Math.PI ? 1 : 0
      const d = `M ${oS.x},${oS.y} A ${DONUT_OR},${DONUT_OR} 0 ${large},1 ${oE.x},${oE.y} L ${iE.x},${iE.y} A ${DONUT_IR},${DONUT_IR} 0 ${large},0 ${iS.x},${iS.y} Z`
      return { d, color: CHART_COLORS[i % CHART_COLORS.length], cat, amount }
    })
  }, [donutData])

  const BAR_L = 44; const BAR_R = 16; const BAR_T = 28; const BAR_B = 44
  const barAreaW = CHART_W - BAR_L - BAR_R
  const barAreaH = CHART_H - BAR_T - BAR_B
  const barGroupW = barAreaW / monthlyData.length
  const barW = Math.min(barGroupW * 0.28, 12)
  const maxVal = Math.max(...monthlyData.map(m => Math.max(m.inc, m.exp)), 1)

  const LN_L = 44; const LN_R = 16; const LN_T = 28; const LN_B = 44
  const lnAreaW = CHART_W - LN_L - LN_R
  const lnAreaH = CHART_H - LN_T - LN_B
  const maxP = Math.max(...lineData, 0)
  const minP = Math.min(...lineData, 0)
  const range = maxP - minP || 1

  const linePts = lineData.map((p, i) => {
    const x = LN_L + (i / Math.max(lineData.length - 1, 1)) * lnAreaW
    const y = CHART_H - LN_B - ((p - minP) / range) * lnAreaH
    return `${x},${y}`
  }).join(' ')

  const fillPts = `${LN_L},${CHART_H - LN_B} ${linePts} ${LN_L + lnAreaW},${CHART_H - LN_B}`

  const yTicks = [0, 1, 2].map(i => {
    const v = minP + range * (i / 2)
    const y = CHART_H - LN_B - ((v - minP) / range) * lnAreaH
    return { v: Math.round(v), y }
  })

  const tabBarHeight = useBottomTabBarHeight()

  return (
    <View style={{ flex: 1 }} onLayout={onLayout}>
      <ScrollView style={[s.container, { backgroundColor: c.bg }]} contentContainerStyle={[s.content, { paddingBottom: tabBarHeight + 16 }]}>
          {/* 1. Donut */}
          <View style={[s.card, { backgroundColor: c.surface }]}>
            <Text style={[s.cardTitle, { color: c.text }]}>Répartition des sorties</Text>
            {donutData.hasData ? (
              <View style={s.donutWrap}>
                <Svg width={DONUT_SIZE} height={DONUT_SIZE}>
                  {donutArcs.map((arc, i) => (
                    <Path key={i} d={arc.d} fill={arc.color} />
                  ))}
                  <SvgText x={DONUT_CX} y={DONUT_CY - 8} fill={c.text} fontSize={18} fontWeight="bold" textAnchor="middle">
                    {hideBalance ? '••••' : fmtShort(donutData.total, currency)}
                  </SvgText>
                  <SvgText x={DONUT_CX} y={DONUT_CY + 12} fill={c.text2} fontSize={11} textAnchor="middle">
                    Total
                  </SvgText>
                </Svg>
                <View style={s.legend}>
                  {donutArcs.map((arc, i) => (
                    <View key={i} style={s.legendRow}>
                      <View style={[s.legendDot, { backgroundColor: arc.color }]} />
                      <Text style={[s.legendText, { color: c.text }]} numberOfLines={1}>{arc.cat}</Text>
                      <AmountText amount={arc.amount} currency={currency} hideBalance={hideBalance} short style={[s.legendValue, { color: c.text2 }]} />
                    </View>
                  ))}
                </View>
              </View>
            ) : (
              <View style={s.empty}>
                <Text style={[s.emptyText, { color: c.text2 }]}>Aucune sortie ce mois</Text>
              </View>
            )}
          </View>

          {/* 2. Bar Chart */}
          <View style={[s.card, { backgroundColor: c.surface }]}>
            <View style={s.chartHeader}>
              <Text style={[s.cardTitle, { color: c.text, marginBottom: 0 }]}>Entrées vs Sorties (12 mois)</Text>
              <View style={s.headerLegend}>
                <View style={[s.legendDot, { backgroundColor: c.green }]} />
                <Text style={[s.legendLabel, { color: c.text2 }]}>R</Text>
                <View style={[s.legendDot, { marginLeft: 10, backgroundColor: c.red }]} />
                <Text style={[s.legendLabel, { color: c.text2 }]}>D</Text>
              </View>
            </View>
            <Svg width={CHART_W} height={CHART_H}>
              {[0, 1, 2].map(i => {
                const y = BAR_T + (i / 2) * barAreaH
                return (
                  <G key={i}>
                    <Line x1={BAR_L} y1={y} x2={CHART_W - BAR_R} y2={y} stroke={c.border} strokeWidth={1} />
                    <SvgText x={BAR_L - 6} y={y + 4} fill={c.text2} fontSize={10} textAnchor="end">
                      {hideBalance ? '••••' : fmtShort(Math.round(maxVal * (1 - i / 2)), currency)}
                    </SvgText>
                  </G>
                )
              })}
              {monthlyData.map((m, i) => {
                const x = BAR_L + i * barGroupW
                const incH = (m.inc / maxVal) * barAreaH
                const expH = (m.exp / maxVal) * barAreaH
                const baseY = CHART_H - BAR_B
                return (
                  <G key={m.key}>
                    {incH > 0 && <Rect x={x} y={baseY - incH} width={barW} height={incH} fill={c.green} rx={2} />}
                    {expH > 0 && <Rect x={x + barGroupW - barW} y={baseY - expH} width={barW} height={expH} fill={c.red} rx={2} />}
                    {i % 2 === 0 && (
                      <SvgText x={x + barGroupW / 2} y={CHART_H - 8} fill={c.text2} fontSize={9} textAnchor="middle">
                        {m.label}
                      </SvgText>
                    )}
                  </G>
                )
              })}
            </Svg>
          </View>

          {/* 3. Line Chart */}
          <View style={[s.card, { backgroundColor: c.surface }]}>
            <View style={s.chartHeader}>
              <Text style={[s.cardTitle, { color: c.text, marginBottom: 0 }]}>Solde cumulatif (12 mois)</Text>
              <AmountText amount={lineData[lineData.length - 1]} currency={currency} hideBalance={hideBalance} short style={[s.currentVal, { color: lineData[lineData.length - 1] >= 0 ? c.green : c.red }]} />
            </View>
            <Svg width={CHART_W} height={CHART_H}>
              {yTicks.map((t, i) => (
                <G key={i}>
                  <Line x1={LN_L} y1={t.y} x2={CHART_W - LN_R} y2={t.y} stroke={c.border} strokeWidth={1} />
                  <SvgText x={LN_L - 6} y={t.y + 4} fill={c.text2} fontSize={10} textAnchor="end">
                    {hideBalance ? '••••' : fmtShort(t.v, currency)}
                  </SvgText>
                </G>
              ))}
              {monthlyData.map((m, i) => {
                if (i % 2 !== 0 && i !== monthlyData.length - 1) return null
                const x = LN_L + (i / Math.max(monthlyData.length - 1, 1)) * lnAreaW
                return (
                  <SvgText key={m.key} x={x} y={CHART_H - 8} fill={c.text2} fontSize={9} textAnchor="middle">
                    {m.label}
                  </SvgText>
                )
              })}
              {minP < 0 && maxP > 0 && (
                <Line
                  x1={LN_L}
                  y1={CHART_H - LN_B - ((-minP) / range) * lnAreaH}
                  x2={LN_L + lnAreaW}
                  y2={CHART_H - LN_B - ((-minP) / range) * lnAreaH}
                  stroke={c.text2} strokeWidth={1} strokeDasharray="4,4"
                />
              )}
              <Polygon points={fillPts} fill={c.green} fillOpacity={0.15} />
              <Polyline points={linePts} fill="none" stroke={c.green} strokeWidth={2.5} strokeLinejoin="round" />
              {lineData.map((p, i) => {
                const x = LN_L + (i / Math.max(lineData.length - 1, 1)) * lnAreaW
                const y = CHART_H - LN_B - ((p - minP) / range) * lnAreaH
                return <Circle key={i} cx={x} cy={y} r={3} fill={c.green} />
              })}
            </Svg>
          </View>
        </ScrollView>
    </View>
  )
}

const s = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, paddingBottom: 100 },
  card: { borderRadius: 14, padding: 16, marginBottom: 16, overflow: 'hidden' },
  cardTitle: { fontSize: 16, fontWeight: '600', marginBottom: 16 },
  donutWrap: { alignItems: 'center' },
  legend: { width: '100%', marginTop: 12 },
  legendRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 3 },
  legendDot: { width: 10, height: 10, borderRadius: 3, marginRight: 8 },
  legendText: { flex: 1, fontSize: 13 },
  legendValue: { fontSize: 13, fontWeight: '500' },
  legendLabel: { fontSize: 12 },
  chartHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  headerLegend: { flexDirection: 'row', alignItems: 'center' },
  currentVal: { fontSize: 16, fontWeight: '700' },
  empty: { justifyContent: 'center', alignItems: 'center' },
  emptyText: { fontSize: 15 },
})
