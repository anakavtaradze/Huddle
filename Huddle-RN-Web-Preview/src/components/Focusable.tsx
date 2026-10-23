import React, {useState} from 'react';
import {Pressable, StyleSheet, Text, View, type ViewStyle} from 'react-native';
import {C} from '../theme/colors';
import {CoverArt} from './Poster';

export function Action({label,onPress,secondary=false,style,disabled=false}:{label:string;onPress:()=>void;secondary?:boolean;style?:ViewStyle;disabled?:boolean}) {
  const [focused,setFocused] = useState(false);
  const [hovered,setHovered] = useState(false);
  return <Pressable focusable={!disabled} disabled={disabled} accessibilityState={{disabled}} accessibilityRole="button" onPress={onPress} onFocus={()=>setFocused(true)} onBlur={()=>setFocused(false)} onHoverIn={()=>setHovered(true)} onHoverOut={()=>setHovered(false)} style={({pressed})=>[styles.action,secondary&&styles.secondary,hovered&&styles.hovered,focused&&styles.focused,pressed&&{opacity:0.8},disabled&&{opacity:0.5},style]}>
    <Text style={[styles.actionText,secondary&&{color:C.text}]}>{label}</Text>
  </Pressable>;
}
export function Tile({title,subtitle,emoji,color,onPress,width=236}:{title:string;subtitle:string;emoji:string;color:string;onPress:()=>void;width?:number}) {
  const [focused,setFocused] = useState(false);
  const [hovered,setHovered] = useState(false);
  return <Pressable focusable accessibilityRole="button" accessibilityLabel={`${title}, ${subtitle}`} onPress={onPress} onFocus={()=>setFocused(true)} onBlur={()=>setFocused(false)} onHoverIn={()=>setHovered(true)} onHoverOut={()=>setHovered(false)} style={[styles.tile,{width},hovered&&styles.hovered,focused&&styles.focused]}>
    <CoverArt title={title} emoji={emoji} color={color}/>
    <View style={styles.tileCopy}><Text style={styles.tileTitle} numberOfLines={1}>{title}</Text><Text style={styles.subtitle} numberOfLines={2}>{subtitle}</Text></View>
  </Pressable>;
}
export function Heading({children,eyebrow}:{children:string;eyebrow?:string}) {return <View style={styles.headingRow}><View style={{flex:1}}>{eyebrow&&<Text style={styles.eyebrow}>{eyebrow}</Text>}<Text style={styles.heading}>{children}</Text></View><View style={styles.sectionLine}/></View>}
const styles=StyleSheet.create({
  action:{backgroundColor:C.primary,paddingHorizontal:20,paddingVertical:13,minHeight:48,borderRadius:10,alignItems:'center',justifyContent:'center',borderWidth:2,borderColor:'transparent',flexShrink:0},
  secondary:{backgroundColor:C.raised,borderColor:C.outline},
  hovered:{borderColor:C.primary},focused:{borderColor:'#FFFFFF',transform:[{scale:1.02}]},
  actionText:{fontSize:15,fontWeight:'800',color:'#14200B'},
  tile:{backgroundColor:C.panel,borderRadius:16,borderWidth:2,borderColor:C.outline,marginRight:16,overflow:'hidden'},
  tileCopy:{padding:14},tileTitle:{color:C.text,fontSize:17,fontWeight:'800',marginBottom:6},
  subtitle:{color:C.muted,fontSize:12,lineHeight:18,minHeight:36},
  headingRow:{flexDirection:'row',alignItems:'center',gap:24,marginBottom:20},
  sectionLine:{height:1,backgroundColor:C.outline,width:64},
  heading:{color:C.text,fontSize:27,fontWeight:'800',letterSpacing:-0.7},
  eyebrow:{color:C.primary,fontSize:10,fontWeight:'800',letterSpacing:2.5,marginBottom:8},
});
