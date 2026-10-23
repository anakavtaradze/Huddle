import React, {useCallback,useEffect,useReducer,useState,useSyncExternalStore} from 'react';
import {ScrollView,View,Text,TextInput,StyleSheet,Pressable,Modal,useWindowDimensions} from 'react-native';
import {Action,Heading,Tile} from './src/components/Focusable';
import {C} from './src/theme/colors';
import {movies,games,initialFriends,initialActivities,ME,type Friend,type Activity} from './src/data/mock';

import {FocusGroup,initialFocusProps,runtimeLabel,useRemoteBack} from './src/platform/tv';
import {initialNavigation,navigationReducer,type Page} from './src/navigation';
import {recommend,reasons,genres,movieMinutes} from './src/recommend';
import {feedbackFit,recordFeedback} from './src/rsi';
import {createLearningStore} from './src/learningStorage';
import {learningStorage} from './src/platform/learningStorage';
import {type AiIdea} from './src/ai';
import {aiSuggester} from './src/suggest';
import {Hero} from './src/components/Hero';
import {Poster,posterColor} from './src/components/Poster';
const tabs:Page[]=['Home','Movies','Games','Friends','Plans'];
const allTags=[...new Set([...movies.flatMap(m=>genres(m.genre)),...games.map(g=>g.category)])];
const tabIcons:Record<string,string>={Home:'⌂',Movies:'▣',Games:'✦',Friends:'♧',Plans:'▦'};
export default function App(){
 const [navigation,dispatch]=useReducer(navigationReducer,initialNavigation);
 const {page}=navigation;
 const [friends,setFriends]=useState<Friend[]>(initialFriends);
 const [meId,setMeId]=useState(ME);
 const [showProfile,setShowProfile]=useState(false);
 const [profileFocused,setProfileFocused]=useState(false);
 const me=friends.find(f=>f.id===meId)||friends[0];
 const youTag=(f:Friend)=>f.id===meId&&f.name!=='You'?' (you)':'';
 const [activities,setActivities]=useState<Activity[]>(initialActivities);
 const [planned,setPlanned]=useState<string|null>('KPop Demon Hunters');
 const [selectedMovie,setSelectedMovie]=useState(movies[0]);
 const [nicknameId,setNicknameId]=useState<string|null>(null);
 const [nicknameDraft,setNicknameDraft]=useState('');
 const [notice,setNotice]=useState('');
 const {width}=useWindowDimensions();
 const compact=width<850;
 const hereCount=friends.filter(f=>f.online).length;
 const notify=(msg:string)=>setNotice(msg);
 const go=(p:Page)=>{dispatch({type:'go',page:p});setNotice('');setNicknameId(null)};
 const back=useCallback(()=>{
  if(showProfile){setShowProfile(false);return true}
  if(nicknameId){setNicknameId(null);return true}
  if(notice){setNotice('');return true}
  if(navigation.history.length){dispatch({type:'back'});return true}
  return false;
 },[showProfile,nicknameId,notice,navigation.history.length]);
 useRemoteBack(back);
 const [learningStore]=useState(()=>createLearningStore(learningStorage,initialFriends.map(f=>f.id)));
 const {learning,status:learningStatus}=useSyncExternalStore(learningStore.subscribe,learningStore.getSnapshot);
 useEffect(()=>{void learningStore.load();},[learningStore]);
 const learningBlocked=learningStatus[meId]==='loading'||learningStatus[meId]==='load-error';
 const pick=recommend(friends,movies,games,activities,(id,tags)=>feedbackFit(learning[id]?.weights??{},tags));
 const rateMovie=(movie:typeof movies[number],rating:-1|1)=>learningStore.update(meId,old=>recordFeedback(old,meId,{movieId:movie.id,tags:genres(movie.genre),rating}));
 const feedbackActions=(movie:typeof movies[number])=>{
  const rating=learning[meId]?.feedback.find(f=>f.movieId===movie.id)?.rating;
  return <View style={s.actions}><Action label="I like this movie" disabled={learningBlocked} secondary={rating!==1} onPress={()=>rateMovie(movie,1)}/><Action label="I dislike this movie" disabled={learningBlocked} secondary={rating!==-1} onPress={()=>rateMovie(movie,-1)}/></View>;
 };
 const feedbackCount=learning[meId]?.feedback.length??0;
 const toggleHere=(id:string)=>setFriends(old=>old.map(f=>f.id===id?{...f,online:!f.online}:f));
 const vote=(type:'movie'|'game',title:string)=>setActivities(old=>old.some(a=>a.title===title)?old.map(a=>a.title===title?{...a,voters:a.voters.includes(meId)?a.voters.filter(v=>v!==meId):[...a.voters,meId]}:a):[...old,{id:`a${Date.now()}-${old.length}`,type,title,voters:[meId]}]);
 const votesFor=(title:string)=>activities.find(a=>a.title===title)?.voters.length??0;
 const votedByMe=(title:string)=>activities.find(a=>a.title===title)?.voters.includes(meId)??false;
 const voteLabel=(title:string)=>`${votedByMe(title)?'✓ Voted':'👍'} ${votesFor(title)}`;
 const whoVoted=(a:Activity)=>a.voters.map(id=>friends.find(f=>f.id===id)?.name).filter(Boolean).join(', ')||'No votes yet';
 const updateMe=(fn:(f:Friend)=>Friend)=>setFriends(old=>old.map(f=>f.id===meId?fn(f):f));
 const tagMark=(f:Friend,tag:string)=>f.likes.includes(tag)?'😍':f.dislikes.includes(tag)?'🚫':'·';
 const cycleTaste=(tag:string)=>updateMe(f=>{const rm=(xs:string[])=>xs.filter(x=>x!==tag);const m=tagMark(f,tag);return m==='·'?{...f,likes:[...f.likes,tag]}:m==='😍'?{...f,likes:rm(f.likes),dislikes:[...f.dislikes,tag]}:{...f,dislikes:rm(f.dislikes)}});
 const [aiRuns,setAiRuns]=useState(0);
 const [ideas,setIdeas]=useState<AiIdea[]>([]);
 const [aiBusy,setAiBusy]=useState(false);
 const [aiError,setAiError]=useState('');
 const budget=()=>Math.min(...friends.filter(f=>f.online).map(f=>f.minutes));
 useEffect(()=>{
  if(aiRuns===0)return;
  let live=true;setAiBusy(true);setAiError('');
  aiSuggester({friends,activities,catalog:movies.map(m=>m.title),genres:[...new Set(movies.flatMap(m=>genres(m.genre)))]}).then(r=>live&&setIdeas(r.filter(i=>{const mins=movieMinutes(i.length);return !mins||mins<=budget()}))).catch(e=>live&&setAiError(String(e?.message||e))).finally(()=>live&&setAiBusy(false));
  return()=>{live=false};
 },[aiRuns,friends]);
 const ensure=(type:'movie'|'game',title:string)=>setActivities(old=>old.some(a=>a.title===title)?old.map(a=>a.title===title&&!a.voters.includes(meId)?{...a,voters:[...a.voters,meId]}:a):[...old,{id:`a${Date.now()}-${old.length}`,type,title,voters:[meId]}]);
 const makeTonight=(title:string)=>{ensure('movie',title);setPlanned(title)};
 const planBadge=<View style={{paddingHorizontal:14,paddingVertical:13}}><Text style={{color:C.green,fontWeight:'800',fontSize:15}}>✓ Tonight's movie</Text></View>;
 const suggestActions=(title:string,primary:boolean)=>{const inRunning=activities.some(a=>a.title===title);return planned===title?<>{planBadge}<Action label={voteLabel(title)} secondary onPress={()=>vote('movie',title)}/></>:inRunning?<><Action label="Make tonight's movie" secondary={!primary} onPress={()=>makeTonight(title)}/><Action label={voteLabel(title)} secondary onPress={()=>vote('movie',title)}/></>:<Action label="+ Add to plan" secondary={!primary} onPress={()=>ensure('movie',title)}/>};
 const add=(type:'movie'|'game',title:string)=>{ensure(type,title);notify(`${title} added to the Friday plan with your vote (demo only).`)};
 const removeActivity=(a:Activity)=>{setActivities(old=>old.filter(x=>x.id!==a.id));if(planned===a.title)setPlanned(null)};
 const art=(title:string)=>{const m=movies.find(x=>x.title===title);return {emoji:m?.emoji??'🎬',color:m?.color??posterColor(title)}};
 const plannedAct=activities.find(a=>a.type==='movie'&&a.title===planned);
 const rivals=activities.filter(a=>a.type==='movie'&&a.title!==planned);
 const leader=[...rivals].sort((a,b)=>b.voters.length-a.voters.length)[0];
 const overtaken=leader&&leader.voters.length>(plannedAct?.voters.length??0);
 const planView=(manage:boolean)=><>
  <View style={s.panel}><Text style={s.eyebrow}>🎬  TONIGHT'S MOVIE</Text>
   {planned?<View style={[s.listRow,{backgroundColor:'transparent',borderWidth:0,padding:0,marginBottom:0,flexWrap:compact?'wrap':'nowrap'}]}><Poster {...art(planned)} size={56}/><View style={{flex:1,minWidth:compact?130:0}}><Text style={s.panelTitle}>{planned}</Text><Text style={[s.body,{fontSize:13}]}>{plannedAct?whoVoted(plannedAct):'No votes yet'}</Text></View><Action label={voteLabel(planned)} secondary onPress={()=>vote('movie',planned)}/>{manage&&<Action label="Clear" secondary onPress={()=>setPlanned(null)}/>}</View>:<Text style={s.body}>No movie yet. Add one from the picks, or choose from the movies in the running.</Text>}
   {overtaken&&<View style={[s.notice,{marginTop:14,marginBottom:0,flexWrap:'wrap',gap:10}]}><Text style={{color:C.text,flex:1,minWidth:200}}>{leader.title} now has more votes ({leader.voters.length} vs {plannedAct?.voters.length??0}).</Text><Action label="Switch to it" onPress={()=>setPlanned(leader.title)}/></View>}
  </View>
  {rivals.length>0&&<View style={s.section}><Text style={s.eyebrow}>OTHER MOVIES IN THE RUNNING</Text>{rivals.map(a=><View key={a.id} style={[s.listRow,{flexWrap:compact?'wrap':'nowrap'}]}><Poster {...art(a.title)} size={44}/><View style={{flex:1,minWidth:compact?130:0}}><Text style={s.panelTitle}>{a.title}</Text><Text style={[s.body,{fontSize:13}]}>{whoVoted(a)}</Text></View><Action label="Make tonight's movie" onPress={()=>setPlanned(a.title)}/><Action label={voteLabel(a.title)} secondary onPress={()=>vote(a.type,a.title)}/>{manage&&<Action label="Remove" secondary onPress={()=>removeActivity(a)}/>}</View>)}</View>}
  <View style={s.section}><Text style={s.eyebrow}>🎮  GAMES AFTER THE MOVIE</Text>{activities.filter(a=>a.type==='game').map(a=><View key={a.id} style={s.listRow}><View style={{flex:1,minWidth:200}}><Text style={s.panelTitle}>{a.title}</Text><Text style={[s.body,{fontSize:13}]}>{whoVoted(a)}</Text></View><Action label={voteLabel(a.title)} secondary onPress={()=>vote(a.type,a.title)}/>{manage&&<Action label="Remove" secondary onPress={()=>removeActivity(a)}/>}</View>)}{!activities.some(a=>a.type==='game')&&<Text style={s.body}>No games yet.</Text>}</View>
 </>;
 const rename=(id:string)=>{setFriends(old=>old.map(f=>f.id===id?{...f,nickname:nicknameDraft.trim()||f.nickname}:f));setNicknameId(null)};
 const movieRow=()=> <FocusGroup><ScrollView horizontal showsHorizontalScrollIndicator={false} style={{flexGrow:0}} contentContainerStyle={{paddingVertical:4}}>{movies.map(m=><Tile key={m.id} title={m.title} subtitle={`${m.genre} · ${m.length}`} emoji={m.emoji} color={m.color} onPress={()=>{setSelectedMovie(m);go('Movies')}}/>)}</ScrollView></FocusGroup>;
 const gameRow=(ids?:string[])=><FocusGroup><ScrollView horizontal showsHorizontalScrollIndicator={false} style={{flexGrow:0}} contentContainerStyle={{paddingVertical:4}}>{games.filter(g=>!ids||ids.includes(g.id)).map(g=><Tile key={g.id} title={g.title} subtitle={`${g.category} · ${g.duration}`} emoji={g.emoji} color={g.color} onPress={()=>{go('Games');notify(`${g.title}: game launch is a mock action.`)}}/>)}</ScrollView></FocusGroup>;
 return <View style={s.app}>
  <View style={[s.header,compact&&{paddingHorizontal:18}]}>
   <View style={s.brand}><View style={s.brandMark}><Text style={s.brandGlyph}>h</Text></View><Text style={s.logo}>huddle<Text style={{color:C.primary}}>.</Text></Text>{!compact&&<Text style={s.brandTag}>GOOD COMPANY. GREAT NIGHTS.</Text>}</View>
   <Pressable focusable accessibilityRole="button" accessibilityLabel={`Switch profile, viewing as ${me.name}`} onPress={()=>setShowProfile(true)} onFocus={()=>setProfileFocused(true)} onBlur={()=>setProfileFocused(false)} style={({pressed})=>[s.profileButton,profileFocused&&s.navFocus,pressed&&{opacity:0.8}]}><View style={[s.miniAvatar,{backgroundColor:me.color}]}><Text style={s.miniInitial}>{me.name[0]}</Text></View><View><Text style={s.profileCaption}>VIEWING AS</Text><Text style={s.profileName}>{me.name}  ⌄</Text></View></Pressable>
  </View>
  <View style={[s.layout,compact&&{flexDirection:'column'}]}>
   <FocusGroup style={[s.nav,compact&&{width:'100%',padding:10,borderRightWidth:0,borderBottomWidth:1}]}>
    {!compact&&<Text style={s.navCaption}>YOUR HANGOUT</Text>}
    <ScrollView horizontal={compact} showsHorizontalScrollIndicator={false} style={compact?{flexGrow:0}:undefined} contentContainerStyle={compact?{gap:6}:undefined}>
     {tabs.map(t=><Nav key={t} active={page===t} label={t} icon={tabIcons[t]} onPress={()=>go(t)} compact={compact}/>)}
     <Nav active={false} label="Switch profile" icon="⚙" onPress={()=>setShowProfile(true)} compact={compact}/>
    </ScrollView>
    {!compact&&<View style={s.railCard}><Text style={s.railIcon}>✦</Text><Text style={s.railTitle}>Better together.</Text><Text style={s.railBody}>Your next great night starts with your people.</Text><View style={s.railStatus}><View style={s.statusDot}/><Text style={s.railStatusText}>{hereCount} in the room</Text></View><Text style={s.runtime}>{runtimeLabel}</Text></View>}
   </FocusGroup>
   <FocusGroup key={page} style={s.content}><ScrollView style={s.content} contentContainerStyle={{padding:compact?18:32,paddingBottom:70,maxWidth:1600,width:'100%',alignSelf:'center'}}>
    <View style={s.pageMeta}><Text style={s.pagePath}>YOUR SPACE  /  <Text style={{color:C.text}}>{page.toUpperCase()}</Text></Text><Text style={s.liveCaption}>●  {hereCount} HERE</Text></View>
    {learningStatus[meId]!=='ready'&&<View style={s.notice}><Text style={{color:C.text,flex:1}}>{learningStatus[meId]==='loading'?'Huddle is restoring your saved movie feedback.':learningStatus[meId]==='saving'?'Huddle is saving your movie feedback.':learningStatus[meId]==='load-error'?'Huddle could not restore your movie feedback. You can retry the load or reset your feedback from Movies.':'Huddle could not save your latest movie feedback. Your current ratings remain in memory; you can retry the save.'}</Text>{['load-error','save-error'].includes(learningStatus[meId])&&<Action label="I retry feedback storage" secondary onPress={()=>{void learningStore.retry(meId)}}/>}</View>}
    {notice!==''&&<View style={s.notice}><Text style={{color:C.text}}>{notice}</Text><Action label="Dismiss" secondary onPress={()=>setNotice('')}/></View>}
    {page==='Home'&&<>
     <Hero compact={compact} people={friends.filter(f=>f.online).map(f=>f.name)} onJoin={()=>go('Room')} onPlan={()=>go('Plans')}/>
     <View style={s.overview}>
      <View style={[s.overviewCard,compact&&{minWidth:140}]}><Text style={s.metricLabel}>NEXT UP</Text><Text style={s.metricValue}>Friday, 8 PM <Text style={{color:C.pink}}>↗</Text></Text><Text style={s.metricHint}>Your weekly movie ritual</Text></View>
      <View style={[s.overviewCard,compact&&{minWidth:140}]}><Text style={s.metricLabel}>GOOD COMPANY</Text><Text style={s.metricValue}>{hereCount} <Text style={{fontSize:16,color:C.muted}}>friends here</Text></Text><Text style={s.metricHint}>A whole night to catch up</Text></View>
      <View style={[s.overviewCard,compact&&{minWidth:140}]}><Text style={s.metricLabel}>THE GROUP PICK</Text><Text style={s.metricValue} numberOfLines={1}>{pick?.movie.title??'No movie fits yet'}</Text><Text style={s.metricHint}>{pick?`${pick.movie.length} · Made for your crew`:'Update attendance or available time'}</Text></View>
     </View>
     <View style={s.section}><Heading eyebrow="TONIGHT'S PICK">Watch something together</Heading>{movieRow()}</View>
     <View style={s.section}><Heading eyebrow="AFTER THE CREDITS">Keep the fun going</Heading>{gameRow()}</View>
     <View style={s.section}><Heading eyebrow="YOUR PEOPLE">Friends & rooms</Heading><View style={s.panel}><Text style={s.panelTitle}>Friday Movie Night · 8:00 PM</Text><Text style={s.body}>Mia, Sam, Alex + you · Recurs every Friday</Text><View style={s.actions}><Action label="Enter room" onPress={()=>go('Room')}/><Action label="Manage friends" secondary onPress={()=>go('Friends')}/></View></View></View>
    </>}
    {page==='Movies'&&<><Heading eyebrow="WATCH TOGETHER">Movies</Heading>{movieRow()}<View style={s.section}><View style={s.panel}><Text style={s.eyebrow}>FEATURED MOVIE</Text><Text style={s.panelTitle}>{selectedMovie.emoji}  {selectedMovie.title}</Text><Text style={s.body}>{selectedMovie.description}</Text><Text style={[s.body,{marginTop:8,color:C.gold}]}>Your fit: {reasons([me],genres(selectedMovie.genre)).join(' · ')}</Text><Text style={[s.body,{marginTop:8}]}>{selectedMovie.genre} · {selectedMovie.length}</Text><View style={s.actions}><Action label="Plan movie night" onPress={()=>add('movie',selectedMovie.title)}/><Action label="Open party room" secondary onPress={()=>go('Room')}/></View>{feedbackActions(selectedMovie)}<Text style={s.body}>Huddle uses your movie ratings to refine group picks after you rate six different movies. Huddle keeps {feedbackCount} ratings for your profile on this device.</Text><View style={s.actions}><Action label="I reset my movie feedback" disabled={learningStatus[meId]==='loading'} secondary onPress={()=>{void learningStore.reset(meId)}}/></View></View></View><View style={s.section}><Heading eyebrow="SUGGESTED FOR THIS MOVIE">After-movie games</Heading>{gameRow(selectedMovie.gameIds)}</View></>}
    {page==='Games'&&<><Heading eyebrow="PLAY TOGETHER">Party games</Heading>{gameRow()}<View style={s.section}><View style={s.panel}><Text style={s.panelTitle}>🎮  Choose a game for your next session</Text><Text style={s.body}>Select a game below to add it to your Friday activity lineup.</Text>{games.map(g=><View key={g.id} style={s.listRow}><Text style={[s.body,{flex:1,minWidth:180}]}>{g.emoji}  {g.title} · {g.duration}</Text><Action label="+ Add to plan" secondary onPress={()=>add('game',g.title)}/></View>)}</View></View></>}
    {page==='Friends'&&<><Heading eyebrow="YOUR CREW">Friends & rooms</Heading><View style={s.panel}><Text style={s.panelTitle}>●  Friday Movie Night</Text><Text style={s.body}>Your group's recurring hangout room</Text><View style={s.actions}><Action label="Enter room" onPress={()=>go('Room')}/><Action label="View schedule" secondary onPress={()=>go('Plans')}/></View></View><View style={s.section}><Heading eyebrow="FRIENDS LIST">Your people</Heading>{friends.map(f=><View key={f.id} style={s.listRow}><View style={[s.avatar,{backgroundColor:f.color}]}><Text style={s.avatarText}>{f.name[0]}</Text></View><View style={{flex:1,minWidth:compact?130:0}}><Text style={s.panelTitle}>{f.name}{youTag(f)} <Text style={{color:f.online?C.green:C.muted,fontSize:14}}>{f.online?'● Online':'○ Offline'}</Text></Text><Text style={s.body}>Room nickname: {f.nickname}</Text></View><Action label="Edit nickname" secondary onPress={()=>{setNicknameId(f.id);setNicknameDraft(f.nickname)}}/></View>)}</View>{nicknameId&&<View style={s.panel}><Text style={s.panelTitle}>Rename friend in this room</Text><TextInput autoFocus accessibilityLabel="Room nickname" value={nicknameDraft} onChangeText={setNicknameDraft} placeholder="Room nickname" placeholderTextColor={C.muted} style={s.input}/><View style={s.actions}><Action label="Save nickname" onPress={()=>rename(nicknameId)}/><Action label="Cancel" secondary onPress={()=>setNicknameId(null)}/></View></View>}</>}
    {page==='Plans'&&<><Heading eyebrow="MAKE IT A TRADITION">Weekly plans</Heading><View style={s.panel}><Text style={s.eyebrow}>EVERY FRIDAY · 8:00 PM</Text><Text style={s.panelTitle}>🍿 Friday Movie Night</Text><Text style={s.body}>Hosted by Alex · 4 friends · Recurring weekly (sample event)</Text><View style={s.actions}><Action label="Enter party room" onPress={()=>go('Room')}/></View></View><View style={s.section}><Heading eyebrow="COLLABORATIVE LINEUP">Session activities</Heading>{planView(true)}<Text style={[s.body,{marginTop:18,marginBottom:12}]}>Add another activity:</Text><View style={s.actions}><Action label="+ Movie to the running" onPress={()=>{const m=movies.find(x=>!activities.some(a=>a.title===x.title));m?ensure('movie',m.title):notify('Every movie is already in the running.')}}/><Action label="+ Game" secondary onPress={()=>{const g=games.find(x=>!activities.some(a=>a.title===x.title));g?ensure('game',g.title):notify('Every game is already in the plan.')}}/></View></View></>}
    {page==='Room'&&<><Heading eyebrow="LIVE HANGOUT · MOCK LOBBY">Friday Movie Night</Heading><View style={s.roomHero}><View style={s.roomBadge}><View style={s.statusDot}/><Text style={s.railStatusText}>THE CREW IS GETTING TOGETHER</Text></View><Text style={[s.heroTitle,compact&&{fontSize:36,lineHeight:40}]}>The best seat is{`\n`}<Text style={{color:C.primary}}>next to your people.</Text></Text><Text style={s.heroBody}>Room code: HUDDLE-482 · Friday 8:00 PM</Text><View style={s.actions}><Action label="Start watch party" onPress={()=>notify('Demo: your teammate will connect real playback and room syncing.')}/><Action label="Back to friends" secondary onPress={()=>go('Friends')}/></View></View><View style={s.section}><Heading eyebrow="WHO'S HERE">Room members</Heading>{friends.map(f=><View key={f.id} style={s.listRow}><View style={[s.avatar,{backgroundColor:f.color}]}><Text style={s.avatarText}>{f.name[0]}</Text></View><View style={{flex:1,minWidth:compact?130:0}}><Text style={s.panelTitle}>{f.nickname}</Text><Text style={s.body}>{f.name}{youTag(f)} · {f.online?'Ready':'Offline'}</Text></View><Action label={f.online?'Mark away':'Mark here'} secondary onPress={()=>toggleHere(f.id)}/><Action label="Rename" secondary onPress={()=>{go('Friends');setNicknameId(f.id);setNicknameDraft(f.nickname)}}/></View>)}</View><View style={s.section}><Heading eyebrow="TONIGHT'S PLAN">Movie and games</Heading><Text style={[s.body,{marginTop:-6,marginBottom:12}]}>One movie a night, plus any games. Vote on what you like. The movie with the most votes can be switched in.</Text>{planView(false)}<View style={s.actions}><Action label="Edit plan" onPress={()=>go('Plans')}/></View></View><View style={s.section}><Heading eyebrow="SUGGESTIONS">Find a movie</Heading>{pick?<><View style={[s.panel,s.pickPanel,{flexDirection:'row',gap:22,flexWrap:'wrap'}]}><Poster emoji={pick.movie.emoji} color={pick.movie.color} size={130}/><View style={{flex:1,minWidth:compact?170:240}}><Text style={s.eyebrow}>🎬  BEST MOVIE FOR EVERYONE HERE</Text><Text style={s.panelTitle}>{pick.movie.title}</Text><Text style={s.body}>{pick.movie.genre} · {pick.movie.length}</Text>{[...pick.why,...pick.notes.slice(0,2)].map(n=><Text key={n} style={[s.body,{marginTop:4}]}>• {n}</Text>)}{pick.games.length>0&&<Text style={[s.body,{marginTop:10}]}>Then play: {pick.games.map(g=>`${g.emoji} ${g.title}`).join(', ')}</Text>}<View style={s.actions}>{suggestActions(pick.movie.title,true)}</View>{feedbackActions(pick.movie)}</View></View>{pick.alternatives.length>0&&<><Text style={[s.eyebrow,{marginTop:24}]}>OTHER MOVIES THAT WORK</Text>{pick.alternatives.map(r=><View key={r.movie.id} style={[s.listRow,{flexWrap:compact?'wrap':'nowrap'}]}><Poster emoji={r.movie.emoji} color={r.movie.color} size={52}/><View style={{flex:1,minWidth:compact?130:0}}><Text style={s.panelTitle}>{r.movie.title}</Text><Text style={s.body}>{r.movie.genre} · {r.movie.length}</Text><Text style={s.body}>{r.why.join(' · ')}</Text></View>{suggestActions(r.movie.title,false)}</View>)}</>}</>:<View style={s.panel}><Text style={s.body}>{friends.some(f=>f.online)?"No movie fits everyone's time budget. Increase the available time to see suggestions.":'Mark at least one friend as here to get a movie pick.'}</Text></View>}<View style={s.actions}><Action label={aiRuns>0?'✨  Refresh AI ideas':'✨  Get AI ideas'} secondary onPress={()=>setAiRuns(n=>n+1)}/></View>{aiRuns>0&&<View style={s.panel}><Text style={s.eyebrow}>✨  AI IDEAS · MOVIES NOT IN OUR LIBRARY</Text>{aiBusy&&<Text style={s.body}>Thinking…</Text>}{aiError!==''&&<Text style={s.body}>Could not get ideas: {aiError}</Text>}{!aiBusy&&aiError===''&&ideas.length===0&&<Text style={s.body}>No ideas yet. Mark someone as here.</Text>}{ideas.map(i=><View key={i.title} style={[s.listRow,{backgroundColor:C.raised,flexWrap:compact?'wrap':'nowrap'}]}><Poster emoji="🎬" color={posterColor(i.title)} size={52}/><View style={{flex:1,minWidth:compact?130:0}}><Text style={s.panelTitle}>{i.title}</Text><Text style={s.body}>{[i.genre,i.length].filter(Boolean).join(' · ')}</Text><Text style={s.body}>{i.why}</Text></View>{suggestActions(i.title,false)}</View>)}</View>}</View></>}
   </ScrollView></FocusGroup>
  </View>
  <Modal visible={showProfile} transparent animationType="fade" onRequestClose={()=>setShowProfile(false)}><View accessibilityViewIsModal style={s.overlay}><FocusGroup style={s.sheet}><ScrollView contentContainerStyle={{padding:compact?18:28}}><Heading eyebrow="PROFILE">Switch profile</Heading><View style={s.panel}><Text style={s.panelTitle}>Viewing as</Text><Text style={s.body}>Pretend to be someone else to see the app through their eyes. Their tastes, votes and presence apply everywhere. On a real TV this would be the signed-in profile.</Text><View style={s.actions}>{friends.map(f=><Action key={f.id} label={`${f.id===meId?'✓ ':''}${f.name}`} secondary={f.id!==meId} onPress={()=>setMeId(f.id)}/>)}</View></View><View style={s.section}><View style={s.panel}><Text style={s.panelTitle}>{me.name}'s taste</Text><Text style={s.body}>Press a tag to cycle: neutral, 😍 like, 🚫 dislike. Group Pick uses everyone's tastes.</Text><View style={s.actions}>{allTags.map(tag=><Action key={tag} label={`${tagMark(me,tag)}  ${tag}`} secondary={tagMark(me,tag)==='·'} style={tagMark(me,tag)==='🚫'?{backgroundColor:C.pink,borderColor:C.pink}:undefined} onPress={()=>cycleTaste(tag)}/>)}</View></View></View><View style={s.section}><View style={s.panel}><Text style={s.panelTitle}>Time and presence</Text><Text style={s.body}>{me.name} can stay for {me.minutes} min · {me.online?'Here':'Away'}</Text><View style={s.actions}><Action label="− 30 min" secondary onPress={()=>updateMe(f=>({...f,minutes:Math.max(60,f.minutes-30)}))}/><Action label="+ 30 min" secondary onPress={()=>updateMe(f=>({...f,minutes:Math.min(240,f.minutes+30)}))}/><Action label={me.online?'Mark away':'Mark here'} onPress={()=>toggleHere(meId)}/></View></View></View><View style={s.actions}><Action label="Done" onPress={()=>setShowProfile(false)}/></View></ScrollView></FocusGroup></View></Modal>
 </View>;
}
function Nav({label,icon,active,onPress,compact}:{label:string;icon:string;active:boolean;onPress:()=>void;compact:boolean}){
 const [focused,setFocused]=useState(false);
 const [hovered,setHovered]=useState(false);
 return <Pressable focusable {...(active&&label==='Home'?initialFocusProps:{})} accessibilityRole="tab" accessibilityState={{selected:active}} onPress={onPress} onFocus={()=>setFocused(true)} onBlur={()=>setFocused(false)} onHoverIn={()=>setHovered(true)} onHoverOut={()=>setHovered(false)} style={[s.navItem,active&&s.navActive,hovered&&!active&&{backgroundColor:C.raised},focused&&s.navFocus,compact&&{paddingHorizontal:14,paddingVertical:10,marginBottom:0}]}><Text style={[s.navIcon,active&&{color:'#172509'}]}>{icon}</Text><Text style={[s.navText,active&&{color:'#172509'},compact&&{fontSize:13}]}>{label}</Text>{active&&!compact&&<Text style={s.navArrow}>↗</Text>}</Pressable>;
}
const s=StyleSheet.create({
 app:{flex:1,backgroundColor:C.bg},
 header:{height:84,borderBottomWidth:1,borderBottomColor:C.outline,paddingHorizontal:30,flexDirection:'row',justifyContent:'space-between',alignItems:'center',backgroundColor:'#0B111B'},
 brand:{flexDirection:'row',alignItems:'center',gap:10},brandMark:{height:32,width:32,backgroundColor:C.primary,borderRadius:10,alignItems:'center',justifyContent:'center',transform:[{rotate:'-8deg'}]},brandGlyph:{color:'#172509',fontSize:29,fontWeight:'900',lineHeight:32},logo:{fontSize:29,fontWeight:'900',letterSpacing:-1.5,color:C.text},brandTag:{fontSize:9,letterSpacing:1.5,color:C.muted,marginLeft:20},
 profileButton:{flexDirection:'row',gap:10,alignItems:'center',padding:7,borderRadius:12,borderWidth:2,borderColor:'transparent'},miniAvatar:{height:34,width:34,borderRadius:18,alignItems:'center',justifyContent:'center'},miniInitial:{color:C.text,fontWeight:'900'},profileCaption:{fontSize:8,color:C.muted,letterSpacing:1.8},profileName:{fontSize:13,fontWeight:'800',color:C.text,marginTop:3},
 layout:{flex:1,flexDirection:'row'},nav:{width:202,backgroundColor:'#0B111B',padding:16,borderRightWidth:1,borderColor:C.outline},navCaption:{fontSize:9,color:C.muted,fontWeight:'800',letterSpacing:2,marginBottom:20,marginTop:15,marginLeft:14},
 navItem:{flexDirection:'row',alignItems:'center',gap:12,borderRadius:10,padding:13,marginBottom:8,borderWidth:2,borderColor:'transparent'},navActive:{backgroundColor:C.primary},navFocus:{borderColor:C.text},navText:{color:C.muted,fontSize:14,fontWeight:'700'},navIcon:{color:C.muted,fontSize:18,width:22,textAlign:'center'},navArrow:{marginLeft:'auto',fontSize:18,color:'#172509'},
 railCard:{padding:16,borderRadius:14,backgroundColor:'#17251E',borderWidth:1,borderColor:'#304731',marginTop:25},railIcon:{color:C.primary,fontSize:32,marginBottom:14},railTitle:{color:C.text,fontWeight:'800',fontSize:17,letterSpacing:-0.5},railBody:{color:C.muted,fontSize:11,lineHeight:18,marginTop:8},railStatus:{flexDirection:'row',gap:6,alignItems:'center',marginTop:18},statusDot:{width:6,height:6,borderRadius:3,backgroundColor:C.primary},railStatusText:{fontSize:10,fontWeight:'800',color:C.primary,letterSpacing:0.4},runtime:{color:C.muted,fontSize:7,letterSpacing:1,marginTop:16},
 content:{flex:1,minWidth:0},pageMeta:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',marginBottom:24},pagePath:{fontSize:9,color:C.muted,letterSpacing:2,fontWeight:'700'},liveCaption:{fontSize:9,color:C.primary,letterSpacing:1.5,fontWeight:'800'},
 overview:{flexDirection:'row',flexWrap:'wrap',gap:14,marginTop:18},overviewCard:{flex:1,minWidth:190,borderWidth:1,borderColor:C.outline,backgroundColor:C.panel,borderRadius:14,padding:20},metricLabel:{fontSize:9,letterSpacing:2,color:C.muted,fontWeight:'800',marginBottom:12},metricValue:{color:C.text,fontSize:21,fontWeight:'800',letterSpacing:-0.5},metricHint:{color:C.muted,fontSize:11,marginTop:7,lineHeight:17},
 roomHero:{backgroundColor:'#14252C',borderRadius:22,padding:30,overflow:'hidden',borderWidth:1,borderColor:'#35544B'},roomBadge:{flexDirection:'row',gap:8,alignItems:'center',marginBottom:24},heroTitle:{fontSize:44,lineHeight:48,fontWeight:'900',color:C.text,maxWidth:650,letterSpacing:-1.5},heroBody:{fontSize:15,color:C.muted,marginTop:18,lineHeight:24},
 eyebrow:{fontSize:10,fontWeight:'900',color:C.primary,letterSpacing:2,marginBottom:14},actions:{flexDirection:'row',flexWrap:'wrap',gap:10,marginTop:22},section:{marginTop:36},panel:{backgroundColor:C.panel,padding:24,borderRadius:18,borderWidth:1,borderColor:C.outline,marginTop:12},pickPanel:{backgroundColor:'#172A26',borderColor:'#537044'},panelTitle:{fontSize:20,fontWeight:'800',color:C.text,marginBottom:6,letterSpacing:-0.5},body:{fontSize:14,color:C.muted,lineHeight:23},listRow:{flexDirection:'row',alignItems:'center',gap:14,backgroundColor:C.panel,borderRadius:14,borderWidth:1,borderColor:C.outline,padding:16,marginBottom:10,flexWrap:'wrap'},
 avatar:{width:46,height:46,borderRadius:23,justifyContent:'center',alignItems:'center',borderWidth:2,borderColor:'rgba(255,255,255,0.18)'},avatarText:{color:C.text,fontSize:20,fontWeight:'800'},input:{borderColor:C.primary,borderWidth:2,color:C.text,padding:14,fontSize:18,borderRadius:10,marginTop:12,backgroundColor:C.bg},
 overlay:{position:'absolute',top:0,left:0,right:0,bottom:0,backgroundColor:'rgba(3,7,13,0.94)',justifyContent:'center',alignItems:'center',padding:18,zIndex:10},sheet:{width:'100%',maxWidth:760,maxHeight:'92%',backgroundColor:C.bg,borderRadius:22,borderWidth:1,borderColor:'#536B44',overflow:'hidden'},notice:{backgroundColor:C.primaryDark,borderWidth:1,borderColor:'#49633C',padding:14,borderRadius:12,marginBottom:20,flexDirection:'row',flexWrap:'wrap',gap:12,alignItems:'center',justifyContent:'space-between'},
});
