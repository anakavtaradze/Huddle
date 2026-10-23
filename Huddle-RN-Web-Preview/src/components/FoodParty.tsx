import React, {useEffect, useRef, useState} from 'react';
import {Image, Pressable, StyleSheet, Text, TextInput, View} from 'react-native';
import {C} from '../theme/colors';
import {Heading} from './Focusable';
import {foodRequest} from '../foodApi';
import {amazonFoodUrl, foodInvitationId, foodServiceOrigin, validateFoodItems, type FoodItem, type FoodRoom, type FoodSession, type FoodStatus} from '../food';
import {getFoodBase, initialInvite, loadFoodSession, openAmazon, phoneCheckout, saveFoodSession, setFoodBase} from '../platform/foodConnection';

const blank = (): FoodItem => ({name: '', url: '', quantity: 1, notes: ''});
const statusText: Record<FoodStatus, string> = {
  choosing: 'chooses their food', ordered: 'reports a completed order', ready: 'reports their food has arrived', unavailable: 'reports an unavailable item',
};

function Button({label, onPress, disabled = false, secondary = false}: {label: string; onPress: () => void; disabled?: boolean; secondary?: boolean}) {
  const [focused, setFocused] = useState(false);
  return <Pressable focusable accessibilityRole="button" accessibilityLabel={label} accessibilityState={{disabled}}
    disabled={disabled} onPress={onPress} onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
    style={[s.button, secondary && s.secondary, focused && s.focused, disabled && {opacity: 0.45}]}>
    <Text style={[s.buttonText, secondary && {color: C.text}]}>{label}</Text>
  </Pressable>;
}

function Field({label, value, onChange, ...props}: {label: string; value: string; onChange: (value: string) => void; maxLength?: number; keyboardType?: 'default' | 'numeric' | 'url'}) {
  return <View style={s.field}><Text style={s.label}>{label}</Text><TextInput accessibilityLabel={label} style={s.input}
    value={value} onChangeText={onChange} autoCapitalize="none" {...props}/></View>;
}

export function FoodParty() {
  const [session, setSession] = useState<FoodSession | null>(loadFoodSession);
  const [room, setRoom] = useState<FoodRoom | null>(null);
  const [name, setName] = useState('');
  const [title, setTitle] = useState('Friday Movie Night');
  const [invite, setInvite] = useState(initialInvite);
  const [endpoint, setEndpoint] = useState(getFoodBase());
  const [error, setError] = useState('');
  const [syncError, setSyncError] = useState('');
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<FoodItem[]>([blank()]);
  const [draftRevision, setDraftRevision] = useState(0);
  const [savedMessage, setSavedMessage] = useState('');
  const latestRequest = useRef(0);

  useEffect(() => {
    if (!session) return;
    let live = true;
    const refresh = async () => {
      const request = ++latestRequest.current;
      try {
        const next = await foodRequest<FoodRoom>(`rooms/${session.roomId}`);
        if (live && request === latestRequest.current) { setRoom(next); setSyncError(''); }
      } catch (e) { if (live && request === latestRequest.current) setSyncError((e as Error).message); }
    };
    void refresh();
    const timer = setInterval(() => { if (!busyRef.current) void refresh(); }, 2500);
    return () => { live = false; clearInterval(timer); };
  }, [session]);

  const run = async (action: () => Promise<void>) => {
    if (busyRef.current) return;
    busyRef.current = true; setBusy(true); setError(''); setSavedMessage('');
    ++latestRequest.current;
    try { await action(); } catch (e) { setError((e as Error).message); }
    finally { busyRef.current = false; setBusy(false); }
  };
  const connect = () => {
    if (!phoneCheckout) return;
    setFoodBase(foodServiceOrigin(endpoint));
  };
  const accept = (result: {session: FoodSession; room: FoodRoom}) => {
    saveFoodSession(result.session); setSession(result.session); setRoom(result.room); setSyncError(''); setEditing(false);
  };
  const create = () => void run(async () => {
    connect();
    accept(await foodRequest('rooms', 'POST', {name, title}));
  });
  const join = () => void run(async () => {
    connect();
    const id = foodInvitationId(invite);
    accept(await foodRequest(`rooms/${id}/join`, 'POST', {name}));
  });
  const startEdit = () => {
    if (!room) return;
    setDraft(room.items.length ? room.items.map(item => ({...item})) : [blank()]);
    setDraftRevision(room.revision); setEditing(true); setSavedMessage(''); setError('');
  };
  const publish = () => void run(async () => {
    const items = validateFoodItems(draft);
    const next = await foodRequest<FoodRoom>(`rooms/${session!.roomId}/items`, 'PUT', {items, revision: draftRevision}, session!);
    setRoom(next); setEditing(false); setSyncError('');
    setSavedMessage('Huddle published your selection and reset every participant’s food status.');
  });
  const status = (value: FoodStatus) => void run(async () => {
    const next = await foodRequest<FoodRoom>(`rooms/${session!.roomId}/status`, 'PATCH', {status: value, revision: room!.revision}, session!);
    setRoom(next); setSyncError('');
    setSavedMessage('Huddle shared your reported status with the party.');
  });
  const changeItem = (index: number, patch: Partial<FoodItem>) => setDraft(old => old.map((item, i) => i === index ? {...item, ...patch} : item));
  const me = room?.members.find(member => member.id === session?.memberId);
  const ready = room?.members.filter(member => member.status === 'ready').length || 0;

  return <View>
    <Heading eyebrow="DINNER & A MOVIE">Eat Together</Heading>
    <Text style={s.intro}>Your host chooses the food. Each guest orders the same selection through Amazon and pays for delivery to their own address.</Text>
    <Text style={s.body}>Amazon handles checkout, payment, availability, and delivery estimates. Huddle shares your list and your reported status.</Text>
    {!!error && <Text accessibilityRole="alert" style={s.error}>{error}</Text>}
    {!!syncError && <Text accessibilityRole="alert" style={s.error}>{syncError} Huddle may show an outdated list.</Text>}
    {!!savedMessage && <Text accessibilityLiveRegion="polite" style={s.success}>{savedMessage}</Text>}
    {!session && <View style={s.card}>
      <Text style={s.title}>Your food party</Text>
      <Field label="Your name" value={name} onChange={setName} maxLength={60}/>
      {phoneCheckout && <Field label="Food service address" value={endpoint} onChange={setEndpoint} keyboardType="url"/>}
      <Field label="Party name" value={title} onChange={setTitle} maxLength={60}/>
      <Button label="I host a food party" onPress={create} disabled={busy || !name.trim() || !title.trim()}/>
      <Field label="Party invitation link or code" value={invite} onChange={setInvite} maxLength={500}/>
      <Button label="I join the food party" onPress={join} disabled={busy || !name.trim() || !invite.trim()} secondary/>
    </View>}
    {session && !room && <Text style={s.body}>Huddle loads your shared food list.</Text>}
    {room && session && <>
      <View style={s.card}>
        <Text style={s.title}>{room.title}</Text>
        <Text style={s.body}>Huddle connects {room.members.length} participants to this food party. Your food party uses its own invitation, separate from the demo movie lobby.</Text>
        <View style={s.invite}>
          <Image source={{uri: room.qr}} style={{width: 200, height: 200}} accessibilityLabel="Food party invitation QR code"/>
          <View style={{flex: 1, minWidth: 180}}><Text style={s.label}>Your guests scan this code to join the shared list.</Text>
            <Text selectable style={s.link}>{room.inviteUrl}</Text>
            <Text style={s.body}>Your invitation grants access to this party for seven days. You should share it only with your guests.</Text>
            {!room.phoneAccessible && <Text style={s.error}>This invitation uses localhost. Your host must configure FOOD_PUBLIC_ORIGIN with a phone-accessible address before guests can scan it.</Text>}
          </View>
        </View>
      </View>
      <View style={s.card}>
        <Text style={s.title}>The shared food selection</Text>
        <Text style={s.body}>Each quantity applies to one participant. Amazon may offer different stock or restaurants at each address. Your guests can report unavailable items before the host changes the list.</Text>
        {room.items.length === 0 && <Text style={s.body}>The host has not published a food selection yet.</Text>}
        {room.items.map((item, i) => <View key={`${room.revision}-${i}`} style={s.item}>
          <Text style={s.itemTitle}>{item.quantity} × {item.name}</Text>
          {!!item.notes && <Text style={s.body}>{item.notes}</Text>}
          <Text selectable style={s.link}>{item.url}</Text>
          {item.url.endsWith('/grubhub') && <Text style={s.body}>Amazon opens its Grubhub storefront. You must find this meal and its options manually; your address determines restaurant availability.</Text>}
          {phoneCheckout ? <Text style={s.body}>You can scan the party code with your phone to order this item.</Text> :
            <Button label={`I open ${item.name} on Amazon`} secondary onPress={() => { try { openAmazon(amazonFoodUrl(item.url)); } catch (e) { setError((e as Error).message); } }}/>}
        </View>)}
        {session.host && !editing && <Button label="I edit the shared food list" onPress={startEdit} disabled={busy}/>}
        {editing && <View>
          <Text style={s.body}>You can paste full Amazon.com product links for exact products or https://www.amazon.com/grubhub for a restaurant meal. Huddle cannot import your Amazon order or prefill a food cart.</Text>
          <Text style={s.body}>Your publication resets everyone’s reported status. Your changes do not change existing Amazon orders.</Text>
          {draft.map((item, i) => <View key={i} style={s.item}>
            <Field label={`Food ${i + 1} name`} value={item.name} onChange={name => changeItem(i, {name})} maxLength={100}/>
            <Field label={`Food ${i + 1} Amazon link`} value={item.url} onChange={url => changeItem(i, {url})} keyboardType="url" maxLength={2000}/>
            <Field label={`Food ${i + 1} quantity per person`} value={String(item.quantity || '')} onChange={value => changeItem(i, {quantity: /^\d+$/.test(value) ? Number(value) : 0})} keyboardType="numeric" maxLength={2}/>
            <Field label={`Food ${i + 1} options or dietary notes`} value={item.notes} onChange={notes => changeItem(i, {notes})} maxLength={300}/>
            <Button label={`I remove food ${i + 1}`} onPress={() => setDraft(old => old.filter((_, index) => index !== i))} secondary disabled={busy || draft.length === 1}/>
          </View>)}
          <View style={s.actions}>
            <Button label="I add another food item" secondary onPress={() => setDraft(old => [...old, blank()])} disabled={busy || draft.length === 10}/>
            <Button label="I publish the food selection" onPress={publish} disabled={busy}/>
            <Button label="I cancel my changes" secondary onPress={() => setEditing(false)} disabled={busy}/>
          </View>
        </View>}
      </View>
      <View style={s.card}>
        <Text style={s.title}>The party’s food status</Text>
        <Text accessibilityLiveRegion="polite" style={s.success}>Huddle counts {ready} of {room.members.length} participants with food ready.</Text>
        <Text style={s.body}>Each participant reports their own status. Huddle does not receive order confirmations or delivery tracking from Amazon.</Text>
        {room.members.map(member => <Text key={member.id} style={s.member}>{member.name} {statusText[member.status]}.</Text>)}
        <Text style={s.body}>Your current profile uses the name {me?.name}. The demo profile switcher does not change your food party identity.</Text>
        <View style={s.actions}>
          <Button label="I placed my Amazon order" disabled={busy || !room.items.length || !!syncError || me?.status === 'ordered'} onPress={() => status('ordered')}/>
          <Button label="I received my food" disabled={busy || !room.items.length || !!syncError || me?.status === 'ready'} onPress={() => status('ready')}/>
          <Button label="I cannot get this selection" secondary disabled={busy || !room.items.length || !!syncError || me?.status === 'unavailable'} onPress={() => status('unavailable')}/>
          <Button label="I reset my food status" secondary disabled={busy || !room.items.length || !!syncError || me?.status === 'choosing'} onPress={() => status('choosing')}/>
        </View>
      </View>
    </>}
    {session && <View style={s.actions}><Button label="I open another food party" secondary disabled={busy} onPress={() => {
      latestRequest.current++; saveFoodSession(null); setSession(null); setRoom(null); setEditing(false); setError(''); setSyncError(''); setSavedMessage(''); setInvite('');
    }}/></View>}
  </View>;
}

const s = StyleSheet.create({
  intro: {color: C.text, fontSize: 19, lineHeight: 29, marginBottom: 12, maxWidth: 850},
  body: {color: C.muted, fontSize: 14, lineHeight: 23, marginBottom: 12},
  card: {backgroundColor: C.panel, borderRadius: 18, borderWidth: 1, borderColor: C.outline, padding: 22, marginTop: 22},
  title: {color: C.text, fontSize: 23, fontWeight: '800', marginBottom: 14},
  label: {color: C.text, fontSize: 14, lineHeight: 22, marginBottom: 7},
  field: {marginBottom: 16, marginTop: 12},
  input: {color: C.text, backgroundColor: C.bg, borderWidth: 2, borderColor: C.outline, borderRadius: 10, padding: 12, fontSize: 16, minHeight: 48},
  button: {backgroundColor: C.primary, borderRadius: 10, borderWidth: 2, borderColor: 'transparent', paddingHorizontal: 16, paddingVertical: 13, minHeight: 48, alignSelf: 'flex-start'},
  buttonText: {color: '#14200B', fontWeight: '800', fontSize: 14},
  secondary: {backgroundColor: C.raised, borderColor: C.outline}, focused: {borderColor: '#FFFFFF'},
  actions: {flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 12},
  invite: {flexDirection: 'row', flexWrap: 'wrap', gap: 22, marginTop: 10},
  item: {borderTopWidth: 1, borderColor: C.outline, paddingVertical: 20, marginTop: 12},
  itemTitle: {color: C.text, fontSize: 18, fontWeight: '800', marginBottom: 10},
  link: {color: C.primary, fontSize: 13, lineHeight: 22, marginBottom: 12},
  error: {color: C.pink, fontSize: 14, lineHeight: 23, marginTop: 14},
  success: {color: C.primary, fontSize: 15, lineHeight: 24, marginTop: 12, marginBottom: 12},
  member: {color: C.text, fontSize: 15, lineHeight: 25, marginBottom: 9},
});
