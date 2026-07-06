import React from 'react'
import { Text, type TextProps } from 'react-native'
import { fmt, fmtShort } from '../utils/currency'
import type { CurrencyId } from '../types'

interface Props extends Omit<TextProps, 'children'> {
  amount: number
  currency: CurrencyId
  hideBalance?: boolean
  short?: boolean
}

export default function AmountText({ amount, currency, hideBalance, short, style, ...rest }: Props) {
  if (hideBalance) {
    return <Text style={style} {...rest}>••••</Text>
  }
  return <Text style={style} {...rest}>{short ? fmtShort(amount, currency) : fmt(amount, currency)}</Text>
}
