import React from 'react';
import {Image, StyleSheet, Text, View} from 'react-native';
import {Action} from './Focusable';
import {C} from '../theme/colors';
import {cinemaImage} from '../platform/cinemaImage';

export function Hero({compact,people,onJoin,onPlan}:{compact:boolean;people:string[];onJoin:()=>void;onPlan:()=>void}) {
  return <View style={[s.hero,compact&&{flexDirection:'column'}]}>
    <View style={[s.copy,compact&&{padding:26,flex:0,flexBasis:'auto',flexGrow:0,flexShrink:0,justifyContent:'flex-start'}]}>
      <View style={s.live}><View style={s.dot}/><Text style={s.liveText}>THE FRIDAY NIGHT CLUB</Text></View>
      <Text style={[s.title,compact&&{fontSize:43,lineHeight:45}]}>Your people.{`\n`}<Text style={{color:C.primary}}>Your movie night.</Text></Text>
      <Text style={s.body}>One room. A great movie. Everyone in.</Text>
      <View style={s.actions}><Action label="Join Friday's Room →" onPress={onJoin}/><Action label="See weekly plan" secondary onPress={onPlan}/></View>
      <View style={s.company}><View style={s.avatars}>{people.slice(0,3).map((name,i)=><View key={`${name}-${i}`} style={[s.avatar,{backgroundColor:['#88534A','#395C72','#55527F'][i],marginLeft:i?-8:0}]}><Text style={s.initial}>{name[0]}</Text></View>)}</View><Text style={s.caption}>{people.length} here · Your seat is waiting</Text></View>
    </View>
    <View style={[s.art,compact&&{height:230,flex:0,flexBasis:'auto',flexShrink:0}]}>
      <Image source={cinemaImage} resizeMode="cover" style={StyleSheet.absoluteFillObject} accessibilityLabel="Friends enjoy a rooftop cinema beneath an orange moon"/>
      <View style={s.imageLabel}><Text style={s.imageLabelTop}>MAKE A NIGHT OF IT</Text><Text style={s.imageLabelBottom}>FRIDAY / 8:00 PM</Text></View>
    </View>
  </View>;
}
const s=StyleSheet.create({
  hero:{flexDirection:'row',backgroundColor:'#14212B',borderRadius:24,overflow:'hidden',borderWidth:1,borderColor:'#354643'},
  copy:{flex:1.1,padding:34,justifyContent:'center'},
  live:{flexDirection:'row',alignItems:'center',gap:8,marginBottom:24},dot:{height:7,width:7,borderRadius:4,backgroundColor:C.primary},liveText:{color:C.primary,fontSize:10,fontWeight:'900',letterSpacing:2.2},
  title:{fontSize:52,lineHeight:55,fontWeight:'900',letterSpacing:-2.2,color:C.text},
  body:{fontSize:15,lineHeight:23,color:'#BDCAD1',marginTop:18},actions:{flexDirection:'row',flexWrap:'wrap',gap:10,marginTop:25},
  company:{flexDirection:'row',alignItems:'center',gap:12,marginTop:28},avatars:{flexDirection:'row'},avatar:{width:30,height:30,borderRadius:15,borderWidth:2,borderColor:'#14212B',alignItems:'center',justifyContent:'center'},initial:{color:C.text,fontSize:10,fontWeight:'800'},caption:{color:C.muted,fontSize:11},
  art:{flex:1,minHeight:220,backgroundColor:'#11222C'},imageLabel:{position:'absolute',bottom:20,left:20,right:20,backgroundColor:'rgba(8,12,19,0.82)',borderRadius:10,padding:14,borderWidth:1,borderColor:'rgba(255,255,255,0.15)'},imageLabelTop:{color:C.primary,fontWeight:'800',fontSize:9,letterSpacing:2},imageLabelBottom:{color:'#FFFFFF',fontSize:16,fontWeight:'900',marginTop:6,letterSpacing:1},
});
