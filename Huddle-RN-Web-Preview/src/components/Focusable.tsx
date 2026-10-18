import React, {useState} from 'react';
import {Pressable, StyleSheet, Text, View, type ViewStyle} from 'react-native';
import {C} from '../theme/colors';

export function Action({label,onPress,secondary=false,style}:{label:string;onPress:()=>void;secondary?:boolean;style?:ViewStyle}) {
  const [focused,setFocused] = useState(false);
  return <Pressable accessibilityRole="button" onPress={onPress} onFocus={()=>setFocused(true)} onBlur={()=>setFocused(false)} style={[styles.action,secondary&&styles.secondary,focused&&styles.focused,style]}>
    <Text style={[styles.actionText,secondary&&{color:C.text}]}>{label}</Text>
  </Pressable>;
}
export function Tile({title,subtitle,emoji,color,onPress,width=252}:{title:string;subtitle:string;emoji:string;color:string;onPress:()=>void;width?:number}) {
  const [focused,setFocused] = useState(false);
  return <Pressable accessibilityRole="button" onPress={onPress} onFocus={()=>setFocused(true)} onBlur={()=>setFocused(false)} style={[styles.tile,{width},focused&&styles.focused]}>
    <View style={[styles.art,{backgroundColor:color}]}><Text style={styles.emoji}>{emoji}</Text></View>
    <Text style={styles.tileTitle} numberOfLines={1}>{title}</Text><Text style={styles.subtitle} numberOfLines={1}>{subtitle}</Text>
  </Pressable>;
}
export function Heading({children,eyebrow}:{children:string;eyebrow?:string}) {return <View style={{marginBottom:17}}>{eyebrow&&<Text style={styles.eyebrow}>{eyebrow}</Text>}<Text style={styles.heading}>{children}</Text></View>}
const styles=StyleSheet.create({action:{backgroundColor:C.primary,paddingHorizontal:22,paddingVertical:13,borderRadius:12,alignItems:'center',justifyContent:'center',borderWidth:2,borderColor:'transparent'},secondary:{backgroundColor:C.raised},focused:{borderColor:'#FFFFFF',transform:[{scale:1.035}]},actionText:{fontSize:17,fontWeight:'800',color:'#171226'},tile:{backgroundColor:C.panel,borderRadius:16,padding:9,borderWidth:2,borderColor:'transparent',marginRight:14},art:{height:140,borderRadius:11,justifyContent:'center',alignItems:'center'},emoji:{fontSize:64},tileTitle:{color:C.text,fontSize:17,fontWeight:'800',marginTop:10,marginHorizontal:5},subtitle:{color:C.muted,fontSize:13,margin:5},heading:{color:C.text,fontSize:27,fontWeight:'900'},eyebrow:{color:C.primary,fontSize:12,fontWeight:'800',letterSpacing:2,marginBottom:5}});
