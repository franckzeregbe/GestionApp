import React from 'react'
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native'
import { ICONS } from '../utils/constants'
import { COLORS } from '../theme'

interface Props {
  categories: string[]
  selected: string
  onSelect: (cat: string) => void
  theme: 'dark' | 'light'
}

export default function CategoryPicker({ categories, selected, onSelect, theme }: Props) {
  const C = COLORS[theme]
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={s.row}
      style={s.scroll}
    >
      {categories.map(cat => {
        const active = cat === selected
        return (
          <TouchableOpacity
            key={cat}
            activeOpacity={0.7}
            onPress={() => onSelect(cat)}
            style={[
              s.chip,
              { backgroundColor: active ? C.primary : C.surface2, borderColor: active ? C.primary : C.border },
            ]}
          >
            <Text style={s.chipIcon}>{ICONS[cat] || '📌'}</Text>
            <Text style={[s.chipText, { color: active ? '#fff' : C.text2 }]} numberOfLines={1}>
              {cat}
            </Text>
          </TouchableOpacity>
        )
      })}
    </ScrollView>
  )
}

const s = StyleSheet.create({
  scroll: { marginBottom: 14 },
  row: { flexDirection: 'row', gap: 8, paddingVertical: 2, paddingHorizontal: 1 },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 12, paddingVertical: 8,
    borderRadius: 20, borderWidth: 1,
  },
  chipIcon: { fontSize: 14 },
  chipText: { fontSize: 13, fontWeight: '500', maxWidth: 110 },
})
