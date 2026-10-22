export type Movie = {id:string; title:string; genre:string; length:string; emoji:string; color:string; description:string; gameIds:string[]};
export type Game = {id:string; title:string; category:string; duration:string; emoji:string; color:string; description:string};
export type Friend = {id:string; name:string; nickname:string; online:boolean; color:string; likes:string[]; dislikes:string[]; minutes:number};
export type Activity = {id:string; type:'movie'|'game'; title:string; votes:number};
export const movies:Movie[] = [
  {id:'m1',title:'KPop Demon Hunters',genre:'Animation · Music',length:'1h 36m',emoji:'🎤',color:'#743EA5',description:'A pop-star adventure with plenty of music, mystery, and friendship.',gameIds:['g1','g2','g3']},
  {id:'m2',title:'Moonlight Mystery',genre:'Mystery · Adventure',length:'1h 48m',emoji:'🌙',color:'#315C88',description:'A fictional mystery movie for your next group watch.',gameIds:['g2','g3']},
  {id:'m3',title:'The Last Stardust',genre:'Sci-Fi · Comedy',length:'2h 02m',emoji:'✨',color:'#7C4C6D',description:'A fictional space comedy with surprises at every turn.',gameIds:['g3','g4']},
];
export const games:Game[] = [
  {id:'g1',title:'Guess the Song',category:'Music',duration:'10 min',emoji:'🎵',color:'#673FA0',description:'Identify the song from a short clue.'},
  {id:'g2',title:'Who Said That?',category:'Movie trivia',duration:'8 min',emoji:'💬',color:'#B04E81',description:'Match a quote to the right character.'},
  {id:'g3',title:'Movie Trivia',category:'Quiz',duration:'15 min',emoji:'🏆',color:'#2D7792',description:'Challenge your friends on movie details.'},
  {id:'g4',title:'Emoji Movie Challenge',category:'Guessing',duration:'5 min',emoji:'🎭',color:'#86672D',description:'Decode movie titles from emoji clues.'},
];
export const initialFriends:Friend[] = [
  {id:'f1',name:'Mia',nickname:'Popcorn Queen',online:true,color:'#A24B8B',likes:['Animation','Music','Quiz'],dislikes:['Horror'],minutes:120},
  {id:'f2',name:'Sam',nickname:'Plot Twist King',online:true,color:'#477FA0',likes:['Mystery','Comedy','Quiz'],dislikes:['Music'],minutes:180},
  {id:'f3',name:'Alex',nickname:'Snack Captain',online:true,color:'#6E64B2',likes:['Comedy','Adventure','Guessing'],dislikes:[],minutes:150},
  {id:'f4',name:'Jordan',nickname:'J',online:false,color:'#64786A',likes:['Sci-Fi'],dislikes:[],minutes:90},
];
export const initialActivities:Activity[] = [
  {id:'a1',type:'movie',title:'KPop Demon Hunters',votes:4},
  {id:'a2',type:'game',title:'Guess the Song',votes:3},
  {id:'a3',type:'game',title:'Movie Trivia',votes:2},
];
