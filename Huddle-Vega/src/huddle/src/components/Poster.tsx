import React from 'react';
import {Text, View} from 'react-native';

const PALETTE = ['#743EA5', '#315C88', '#7C4C6D', '#B5654A', '#3F6E5E', '#2B6C8F', '#8C4A68'];
// Titles without art (like AI ideas) get a stable colour from their name.
export const posterColor = (title: string) => PALETTE[[...title].reduce((n, c) => n + c.charCodeAt(0), 0) % PALETTE.length];

export function Poster({emoji, color, size = 96}: {emoji: string; color: string; size?: number}) {
  return <View style={{width: size, height: Math.round(size * 1.45), borderRadius: 10, backgroundColor: color, alignItems: 'center', justifyContent: 'center'}}>
    <Text style={{fontSize: Math.round(size * 0.5)}}>{emoji}</Text>
  </View>;
}
