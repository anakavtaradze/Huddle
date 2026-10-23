import React from 'react';
import {StyleSheet, Text, View} from 'react-native';

const PALETTE = ['#743EA5', '#315C88', '#7C4C6D', '#B5654A', '#3F6E5E', '#2B6C8F', '#8C4A68'];
export const posterColor = (title: string) => PALETTE[[...title].reduce((n, c) => n + c.charCodeAt(0), 0) % PALETTE.length];

export function CoverArt({emoji,color,title}:{emoji:string;color:string;title:string}) {
  return <View accessible={false} style={[s.cover,{backgroundColor:color}]}>
    <View style={s.orbit}/><View style={s.orbitSmall}/><View style={s.light}/>
    <Text style={s.coverLabel}>HUDDLE SELECTS</Text><Text style={s.coverEmoji}>{emoji}</Text>
    <View style={s.coverBottom}><Text style={s.coverTitle} numberOfLines={2}>{title.toUpperCase()}</Text><Text style={s.star}>✦</Text></View>
  </View>;
}
export function Poster({emoji, color, size = 96}: {emoji: string; color: string; size?: number}) {
  return <View accessible={false} style={[s.poster,{width:size,height:Math.round(size*1.4),backgroundColor:color}]}>
    <View style={[s.orbit,{width:size*1.5,height:size*1.5,top:-size*0.3,right:-size*0.8}]}/>
    <Text style={{fontSize:Math.round(size*0.48)}}>{emoji}</Text><View style={s.posterEdge}/>
  </View>;
}
const s=StyleSheet.create({
  cover:{height:178,overflow:'hidden',padding:16,justifyContent:'space-between'},
  orbit:{position:'absolute',width:240,height:240,borderRadius:140,borderWidth:1,borderColor:'rgba(255,255,255,0.24)',right:-90,top:-100,transform:[{rotate:'-25deg'}]},
  orbitSmall:{position:'absolute',width:160,height:160,borderRadius:100,borderWidth:22,borderColor:'rgba(255,255,255,0.08)',left:-60,bottom:-70},
  light:{position:'absolute',width:130,height:180,backgroundColor:'rgba(0,0,0,0.12)',right:20,top:35,transform:[{rotate:'30deg'}]},
  coverLabel:{fontSize:8,fontWeight:'900',letterSpacing:2,color:'#FFFFFF',opacity:0.8},
  coverEmoji:{fontSize:67,position:'absolute',top:30,right:20,transform:[{rotate:'-12deg'}]},
  coverBottom:{flexDirection:'row',alignItems:'flex-end',gap:8},coverTitle:{fontSize:21,lineHeight:22,fontWeight:'900',letterSpacing:-0.5,color:'#FFFFFF',flex:1,textShadowColor:'rgba(0,0,0,0.4)',textShadowRadius:8},
  star:{fontSize:24,color:'#D5FF70'},poster:{borderRadius:10,alignItems:'center',justifyContent:'center',overflow:'hidden',flexShrink:0,borderWidth:1,borderColor:'rgba(255,255,255,0.2)'},
  posterEdge:{position:'absolute',bottom:7,left:7,right:7,height:2,backgroundColor:'rgba(255,255,255,0.4)'},
});
