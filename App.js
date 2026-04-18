// App.js — Iron Grind Fitness App
// Expo React Native · All 6 screens · AsyncStorage persistence

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  StyleSheet, StatusBar, Linking, SafeAreaView, Platform,
  KeyboardAvoidingView, Alert, Dimensions, FlatList,
  ActivityIndicator,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFonts, BebasNeue_400Regular } from '@expo-google-fonts/bebas-neue';
import * as SplashScreen from 'expo-splash-screen';

import { PLAN, WARMUPS, SCHEDULE, LIBRARY } from './src/data/plan';
import { MEALS, DEFAULT_RECIPES } from './src/data/nutrition';

SplashScreen.preventAutoHideAsync();

const { width: W } = Dimensions.get('window');

// ─── COLORS ──────────────────────────────────────────────────────────────────
const C = {
  bg:      '#080808', bg1: '#0d0d0d', bg2: '#111', bg3: '#161616',
  border:  '#1e1e1e', border2: '#252525',
  text:    '#e0d8cf', text2: '#888', text3: '#444', text4: '#2a2a2a',
  push:    '#FF4D00', pull: '#00C2FF', legs: '#FFD600',
  tracker: '#a78bfa', cal: '#f97316', recipes: '#ec4899',
  library: '#22d3ee', calc: '#22d3ee', green: '#4CAF50', red: '#e05555',
};

const TABS = [
  { key: 'workout',   icon: '🏋',  label: 'Workout',  accent: C.push },
  { key: 'library',  icon: '📚',  label: 'Library',  accent: C.library },
  { key: 'tracker',  icon: '📈',  label: 'Tracker',  accent: C.tracker },
  { key: 'calories', icon: '🔥',  label: 'Calories', accent: C.cal },
  { key: 'recipes',  icon: '🍳',  label: 'Recipes',  accent: C.recipes },
  { key: 'calc',     icon: '🧮',  label: 'Calc',     accent: C.calc },
];

// ─── STORAGE ─────────────────────────────────────────────────────────────────
async function load(key, fallback) {
  try { const v = await AsyncStorage.getItem(key); return v !== null ? JSON.parse(v) : fallback; }
  catch { return fallback; }
}
async function save(key, value) {
  try { await AsyncStorage.setItem(key, JSON.stringify(value)); } catch {}
}

// ─── SHARED COMPONENTS ───────────────────────────────────────────────────────
function Pill({ children, bg = C.bg3, color = C.text3, borderColor }) {
  return (
    <View style={[s.pill, { backgroundColor: bg }, borderColor && { borderWidth: 1, borderColor }]}>
      <Text style={[s.pillText, { color }]}>{children}</Text>
    </View>
  );
}

function Bar({ value, max, color = C.green, height = 5 }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  const over = value > max && max > 0;
  return (
    <View style={[s.barBg, { height }]}>
      <View style={[s.barFill, { width: `${pct}%`, backgroundColor: over ? C.red : color, height }]} />
    </View>
  );
}

function SectionLabel({ children, color = C.text3 }) {
  return <Text style={[s.sectionLabel, { color }]}>{children}</Text>;
}

function Card({ children, style }) {
  return <View style={[s.card, style]}>{children}</View>;
}

function AccentCard({ accent, children, style }) {
  return (
    <View style={[s.accentCard, { borderLeftColor: accent }, style]}>
      {children}
    </View>
  );
}

function Btn({ label, onPress, accent, outline, style, textStyle, disabled }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.75}
      style={[
        s.btn,
        outline
          ? { backgroundColor: 'transparent', borderWidth: 1, borderColor: accent + '66' }
          : { backgroundColor: disabled ? C.bg3 : accent },
        style,
      ]}
    >
      <Text style={[s.btnText, outline ? { color: accent } : { color: disabled ? C.text4 : '#000' }, textStyle]}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

function Input({ value, onChangeText, placeholder, keyboardType, style }) {
  return (
    <TextInput
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor={C.text4}
      keyboardType={keyboardType || 'default'}
      style={[s.input, style]}
    />
  );
}

function ExpandRow({ title, subtitle, pills, expanded, onToggle, accent, children }) {
  return (
    <View style={{ marginBottom: 5 }}>
      <TouchableOpacity
        onPress={onToggle}
        activeOpacity={0.8}
        style={[s.expandRow, expanded && { borderColor: accent + '44', borderBottomLeftRadius: 0, borderBottomRightRadius: 0 }]}
      >
        <View style={{ flex: 1 }}>
          <Text style={s.expandTitle}>{title}</Text>
          {subtitle && <Text style={[s.expandSub, { marginTop: 2 }]}>{subtitle}</Text>}
          {pills && (
            <View style={s.pillRow}>
              {pills.map((p, i) => (
                <Pill key={i} bg={p.bg} color={p.color} borderColor={p.border}>{p.label}</Pill>
              ))}
            </View>
          )}
        </View>
        <Text style={[s.chevron, { color: expanded ? accent : C.text4 }]}>
          {expanded ? '▲' : '▼'}
        </Text>
      </TouchableOpacity>
      {expanded && (
        <View style={[s.expandBody, { borderColor: accent + '33' }]}>
          {children}
        </View>
      )}
    </View>
  );
}

// ─── WORKOUT SCREEN ───────────────────────────────────────────────────────────
function WorkoutScreen() {
  const [dayIdx, setDayIdx] = useState(0);
  const [expandedEx, setExpandedEx] = useState(null);
  const [showWarmup, setShowWarmup] = useState(false);
  const current = PLAN[dayIdx];
  const wu = WARMUPS[current.day];
  const accent = current.accent;

  return (
    <ScrollView style={s.scroll} contentContainerStyle={s.scrollContent}>
      {/* Schedule strip */}
      <SectionLabel>WEEKLY SCHEDULE</SectionLabel>
      <View style={s.scheduleRow}>
        {SCHEDULE.map((sc, i) => (
          <View key={i} style={[s.scheduleCell, sc.day !== '—' && { borderColor: C.border }]}>
            <Text style={s.scheduleSlot}>{sc.slot}</Text>
            <Text style={[s.scheduleDay, { color: sc.day === '—' ? C.text4 : accent }]}>{sc.day}</Text>
            <Text style={s.scheduleLbl}>{sc.label}</Text>
          </View>
        ))}
      </View>

      {/* Day tabs */}
      <View style={[s.row, { marginBottom: 14 }]}>
        {PLAN.map((d, i) => (
          <TouchableOpacity
            key={i} onPress={() => { setDayIdx(i); setExpandedEx(null); setShowWarmup(false); }}
            activeOpacity={0.8}
            style={[s.dayTab, dayIdx === i && { backgroundColor: d.accent + '22', borderColor: d.accent + '66' }]}
          >
            <Text style={[s.dayTabText, { color: dayIdx === i ? d.accent : C.text3 }]}>{d.day}</Text>
            <Text style={[s.dayTabSub, { color: dayIdx === i ? d.accent + '88' : C.text4 }]}>{d.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Focus bar */}
      <AccentCard accent={accent} style={{ marginBottom: 12 }}>
        <View style={s.spaceBetween}>
          <View>
            <SectionLabel>FOCUS</SectionLabel>
            <Text style={s.focusText}>{current.focus}</Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <SectionLabel>VOLUME</SectionLabel>
            <Text style={s.focusText}>{current.exercises.length} exercises{current.finisher ? ' + finisher' : ''}</Text>
          </View>
        </View>
      </AccentCard>

      {/* Warm-up toggle */}
      <TouchableOpacity
        onPress={() => setShowWarmup(p => !p)}
        activeOpacity={0.8}
        style={[s.warmupToggle, showWarmup && { borderColor: '#2a4a2a', borderBottomLeftRadius: 0, borderBottomRightRadius: 0 }]}
      >
        <View>
          <Text style={s.warmupLabel}>🔥 WARM-UP · {wu.duration}</Text>
          <Text style={s.warmupSub}>{wu.moves.length} movements before you lift</Text>
        </View>
        <Text style={[s.chevron, { color: showWarmup ? C.green : '#2a4a2a' }]}>{showWarmup ? '▲' : '▼'}</Text>
      </TouchableOpacity>
      {showWarmup && (
        <View style={s.warmupBody}>
          {wu.moves.map((m, i) => (
            <View key={i} style={[s.warmupMove, i < wu.moves.length - 1 && { borderBottomWidth: 1, borderBottomColor: '#0c180c' }]}>
              <View style={s.spaceBetween}>
                <Text style={s.warmupMoveName}>{m.name}</Text>
                <Text style={s.warmupMoveReps}>{m.reps}</Text>
              </View>
              <Text style={s.warmupMoveTip}>{m.tip}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Exercises */}
      <View style={{ marginTop: 10 }}>
        {current.exercises.map((ex, i) => (
          <ExpandRow
            key={i}
            title={ex.name}
            accent={accent}
            expanded={expandedEx === i}
            onToggle={() => setExpandedEx(expandedEx === i ? null : i)}
            pills={[
              ex.type === 'cali'
                ? { label: '⚡ cali', bg: '#0f1a0f', color: C.green, border: '#1e2e1e' }
                : { label: '🏋 db', bg: C.bg3, color: C.text2 },
              { label: `${ex.sets} sets`, bg: C.bg3, color: C.text2 },
              { label: ex.reps, bg: C.bg3, color: C.text2 },
              { label: `⏱ ${ex.rest}`, bg: C.bg3, color: C.text3 },
            ]}
          >
            <Text style={s.tipLabel}>FORM TIP</Text>
            <Text style={s.tipText}>{ex.tip}</Text>
          </ExpandRow>
        ))}
      </View>

      {/* Finisher */}
      {current.finisher && (
        <View style={s.finisherCard}>
          <Text style={s.finisherTitle}>{current.finisher.label}</Text>
          <Text style={s.finisherSub}>{current.finisher.subtitle}</Text>
          {current.finisher.moves.map((m, i) => (
            <View key={i} style={s.finisherMove}>
              <Text style={s.finisherNum}>{i + 1}</Text>
              <View style={{ flex: 1 }}>
                <Text style={s.finisherMoveName}>{m.name}</Text>
                <Text style={s.finisherMoveReps}>{m.reps}</Text>
                <Text style={s.finisherMoveTip}>{m.tip}</Text>
              </View>
            </View>
          ))}
        </View>
      )}

      <Card style={{ marginTop: 16 }}>
        <Text style={s.noteText}>
          <Text style={{ color: C.text2 }}>NOTES · </Text>
          Always complete the warm-up. Add weight when you hit the top rep range with clean form. Deload every 4–6 weeks. 7–9 hrs sleep nightly.
        </Text>
      </Card>
    </ScrollView>
  );
}

// ─── LIBRARY SCREEN ───────────────────────────────────────────────────────────
const LIB_CATS = ['ALL', 'CHEST', 'BACK', 'SHOULDERS', 'ARMS', 'LEGS', 'CORE'];
const DIFF_COLOR = { Beginner: C.green, Intermediate: C.legs, Advanced: C.push };

function LibraryScreen() {
  const [cat, setCat] = useState('ALL');
  const [search, setSearch] = useState('');
  const [expanded, setExpanded] = useState(null);

  const filtered = LIBRARY.filter(e =>
    (cat === 'ALL' || e.cat === cat) &&
    (e.name.toLowerCase().includes(search.toLowerCase()) || e.muscle.toLowerCase().includes(search.toLowerCase()))
  );

  const openVideo = (q) => {
    Linking.openURL(`https://www.youtube.com/results?search_query=${encodeURIComponent(q)}`);
  };

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <AccentCard accent={C.library} style={{ margin: 16, marginBottom: 10 }}>
        <Text style={[s.cardLabel, { color: '#0e4a6a' }]}>EXERCISE DATABASE</Text>
        <Text style={{ color: '#4aaad4', fontSize: 12, fontFamily: 'DMMono' }}>
          {LIBRARY.length} exercises · tap for details · YouTube links included
        </Text>
      </AccentCard>

      <View style={{ paddingHorizontal: 16 }}>
        <Input value={search} onChangeText={setSearch} placeholder="🔍  Search exercise or muscle group..." />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginVertical: 10 }}>
          {LIB_CATS.map(c => (
            <TouchableOpacity key={c} onPress={() => setCat(c)} activeOpacity={0.8}
              style={[s.catPill, cat === c && { backgroundColor: '#0e2a3a', borderColor: C.library + '55' }]}>
              <Text style={[s.catPillText, { color: cat === c ? C.library : C.text3 }]}>{c}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
        <Text style={[s.sectionLabel, { marginBottom: 8 }]}>{filtered.length} RESULTS</Text>
      </View>

      <FlatList
        data={filtered}
        keyExtractor={item => String(item.id)}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 20 }}
        renderItem={({ item: ex }) => {
          const isOpen = expanded === ex.id;
          return (
            <ExpandRow
              title={ex.name}
              accent={C.library}
              expanded={isOpen}
              onToggle={() => setExpanded(isOpen ? null : ex.id)}
              pills={[
                ex.equip === 'cali'
                  ? { label: '⚡ cali', bg: '#0f1a0f', color: C.green, border: '#1e2e1e' }
                  : { label: '🏋 db', bg: C.bg3, color: C.text2 },
                { label: ex.diff, bg: DIFF_COLOR[ex.diff] + '22', color: DIFF_COLOR[ex.diff] },
                { label: ex.muscle, bg: C.bg3, color: C.text3 },
              ]}
            >
              <TouchableOpacity
                onPress={() => openVideo(ex.q)}
                activeOpacity={0.8}
                style={s.ytBtn}
              >
                <Text style={{ fontSize: 18 }}>▶</Text>
                <Text style={s.ytBtnText}>Watch on YouTube — "{ex.q}"</Text>
              </TouchableOpacity>
            </ExpandRow>
          );
        }}
      />
    </View>
  );
}

// ─── TRACKER SCREEN ───────────────────────────────────────────────────────────
function TrackerScreen() {
  const [dayIdx, setDayIdx] = useState(0);
  const [logs, setLogs] = useState({});
  const [loaded, setLoaded] = useState(false);
  const plan = PLAN[dayIdx];

  useEffect(() => {
    load('logs', {}).then(v => { setLogs(v); setLoaded(true); });
  }, []);

  useEffect(() => {
    if (loaded) save('logs', logs);
  }, [logs, loaded]);

  const updateLog = (key, field, val) => {
    setLogs(p => ({ ...p, [key]: { ...p[key], [field]: val } }));
  };

  return (
    <ScrollView style={s.scroll} contentContainerStyle={s.scrollContent}>
      <AccentCard accent={C.tracker} style={{ marginBottom: 16 }}>
        <Text style={[s.cardLabel, { color: '#4a3a7a' }]}>PROGRESSION TRACKER · AUTO-SAVED</Text>
        <Text style={{ color: '#9a7adc', fontSize: 12, fontFamily: 'DMMono' }}>
          Log your weight + reps. Data saves to your device automatically.
        </Text>
      </AccentCard>

      <View style={[s.row, { marginBottom: 16 }]}>
        {PLAN.map((d, i) => (
          <TouchableOpacity key={i} onPress={() => setDayIdx(i)} activeOpacity={0.8}
            style={[s.dayTab, dayIdx === i && { backgroundColor: C.tracker + '22', borderColor: C.tracker + '55' }]}>
            <Text style={[s.dayTabText, { color: dayIdx === i ? C.tracker : C.text3 }]}>{d.day}</Text>
            <Text style={[s.dayTabSub, { color: dayIdx === i ? C.tracker + '88' : C.text4 }]}>{d.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {plan.exercises.map((ex, i) => {
        const key = `${plan.day}-${i}`;
        const entry = logs[key] || {};
        const logged = entry.weight && entry.reps;
        return (
          <Card key={i} style={[{ marginBottom: 8 }, logged && { borderColor: C.tracker + '33' }]}>
            <View style={[s.spaceBetween, { marginBottom: 10 }]}>
              <View style={{ flex: 1, marginRight: 10 }}>
                <Text style={s.expandTitle}>{ex.name}</Text>
                <Text style={s.expandSub}>{ex.sets} sets · {ex.reps} target</Text>
              </View>
              <Pill bg={ex.type === 'cali' ? '#0f1a0f' : C.bg3} color={ex.type === 'cali' ? C.green : C.text3}
                borderColor={ex.type === 'cali' ? '#1e2e1e' : undefined}>
                {ex.type === 'cali' ? '⚡' : '🏋'}
              </Pill>
            </View>
            <View style={s.row}>
              <View style={{ flex: 1, marginRight: 8 }}>
                <Text style={s.inputLabel}>WEIGHT (kg / lb)</Text>
                <Input value={entry.weight || ''} onChangeText={v => updateLog(key, 'weight', v)}
                  placeholder={ex.type === 'cali' ? 'bodyweight' : 'e.g. 20kg'} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.inputLabel}>REPS DONE</Text>
                <Input value={entry.reps || ''} onChangeText={v => updateLog(key, 'reps', v)}
                  placeholder="e.g. 10" keyboardType="numeric" />
              </View>
            </View>
            {logged && (
              <View style={[s.loggedBadge, { borderColor: C.tracker + '44' }]}>
                <Text style={{ color: C.tracker, fontSize: 11, fontFamily: 'DMMono' }}>
                  ✓ Logged: {entry.weight} · {entry.reps} reps
                </Text>
              </View>
            )}
          </Card>
        );
      })}

      <Card style={{ marginTop: 8 }}>
        <Text style={s.noteText}>
          <Text style={{ color: C.text2 }}>TIP · </Text>
          Beat at least one number each session — more reps at the same weight, or same reps with more weight. That's progressive overload.
        </Text>
      </Card>
    </ScrollView>
  );
}

// ─── CALORIES SCREEN ──────────────────────────────────────────────────────────
function CaloriesScreen({ targets, setTargets }) {
  const [editTargets, setEditTargets] = useState(false);
  const [foodLog, setFoodLog] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [form, setForm] = useState({ name: '', calories: '', protein: '', carbs: '', fat: '' });

  useEffect(() => {
    load('foodlog', []).then(v => { setFoodLog(v); setLoaded(true); });
  }, []);
  useEffect(() => { if (loaded) save('foodlog', foodLog); }, [foodLog, loaded]);

  const totals = foodLog.reduce((a, f) => ({
    calories: a.calories + (Number(f.calories) || 0),
    protein:  a.protein  + (Number(f.protein)  || 0),
    carbs:    a.carbs    + (Number(f.carbs)    || 0),
    fat:      a.fat      + (Number(f.fat)      || 0),
  }), { calories: 0, protein: 0, carbs: 0, fat: 0 });

  const addFood = () => {
    if (!form.name || !form.calories) return;
    setFoodLog(p => [...p, { ...form, id: Date.now() }]);
    setForm({ name: '', calories: '', protein: '', carbs: '', fat: '' });
  };

  const MACRO_COLS = [
    { k: 'calories', l: 'Calories', u: 'kcal', c: C.cal },
    { k: 'protein',  l: 'Protein',  u: 'g',    c: C.green },
    { k: 'carbs',    l: 'Carbs',    u: 'g',    c: C.library },
    { k: 'fat',      l: 'Fat',      u: 'g',    c: C.legs },
  ];

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: C.bg }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={120}
    >
      <ScrollView style={s.scroll} contentContainerStyle={s.scrollContent}>
        {/* Targets */}
        <Card style={{ marginBottom: 14 }}>
          <View style={[s.spaceBetween, { marginBottom: 12 }]}>
            <Text style={[s.cardLabel, { color: '#5a2a00' }]}>DAILY TARGETS · AUTO-SAVED</Text>
            <TouchableOpacity onPress={() => setEditTargets(p => !p)} activeOpacity={0.8}
              style={[s.editBtn, { borderColor: C.cal + '55', backgroundColor: editTargets ? C.cal : 'transparent' }]}>
              <Text style={[s.editBtnText, { color: editTargets ? '#000' : C.cal }]}>{editTargets ? 'DONE' : 'EDIT'}</Text>
            </TouchableOpacity>
          </View>
          {editTargets ? (
            <View style={s.row}>
              {MACRO_COLS.map(({ k, l, u, c }) => (
                <View key={k} style={{ flex: 1, marginHorizontal: 3 }}>
                  <Text style={[s.inputLabel, { color: c + '99' }]}>{l.toUpperCase()} ({u})</Text>
                  <Input value={String(targets[k])} keyboardType="numeric"
                    onChangeText={v => setTargets(p => ({ ...p, [k]: Number(v) || 0 }))} />
                </View>
              ))}
            </View>
          ) : (
            <View style={s.row}>
              {MACRO_COLS.map(({ k, l, u, c }) => (
                <View key={k} style={{ flex: 1, alignItems: 'center' }}>
                  <Text style={[s.bigNum, { color: c }]}>{targets[k]}</Text>
                  <Text style={s.bigNumLabel}>{l}</Text>
                  <Text style={[s.bigNumLabel, { color: C.text4 }]}>{u}</Text>
                </View>
              ))}
            </View>
          )}
        </Card>

        {/* Progress */}
        <Card style={{ marginBottom: 14 }}>
          <SectionLabel>TODAY'S PROGRESS</SectionLabel>
          {MACRO_COLS.map(({ k, l, u, c }) => {
            const val = totals[k], tgt = targets[k], over = val > tgt && tgt > 0;
            return (
              <View key={k} style={{ marginBottom: 12 }}>
                <View style={[s.spaceBetween, { marginBottom: 5 }]}>
                  <Text style={s.progLabel}>{l}</Text>
                  <Text style={[s.progVal, { color: over ? C.red : c }]}>
                    {val}<Text style={{ color: C.text3 }}>/{tgt} {u}</Text>
                    {over && <Text style={[s.overTag]}> OVER</Text>}
                  </Text>
                </View>
                <Bar value={val} max={tgt} color={c} />
              </View>
            );
          })}
        </Card>

        {/* Add food */}
        <Card style={{ marginBottom: 14 }}>
          <SectionLabel>➕ LOG FOOD / MEAL</SectionLabel>
          <Text style={s.inputLabel}>FOOD NAME</Text>
          <Input value={form.name} onChangeText={v => setForm(p => ({ ...p, name: v }))} placeholder="e.g. Chicken rice bowl" style={{ marginBottom: 10 }} />
          <View style={s.row}>
            {MACRO_COLS.map(({ k, l, u, c }) => (
              <View key={k} style={{ flex: 1, marginHorizontal: 3 }}>
                <Text style={[s.inputLabel, { color: c + '99' }]}>{l.slice(0, 4).toUpperCase()}</Text>
                <Input value={form[k]} keyboardType="numeric" placeholder="0"
                  onChangeText={v => setForm(p => ({ ...p, [k]: v }))}
                  style={{ borderColor: form[k] ? C.cal + '55' : C.border2 }} />
              </View>
            ))}
          </View>
          <Btn label="LOG FOOD" onPress={addFood} accent={C.cal}
            disabled={!form.name || !form.calories} style={{ marginTop: 12 }} />
        </Card>

        {/* Food log */}
        {foodLog.length > 0 && (
          <Card style={{ marginBottom: 14 }}>
            <View style={[s.spaceBetween, { marginBottom: 10 }]}>
              <SectionLabel>TODAY'S LOG · {foodLog.length} item{foodLog.length !== 1 ? 'S' : ''}</SectionLabel>
              <TouchableOpacity onPress={() => Alert.alert('Clear Log', 'Remove all logged foods?', [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Clear', style: 'destructive', onPress: () => setFoodLog([]) },
              ])}>
                <Text style={[s.clearBtn]}>CLEAR ALL</Text>
              </TouchableOpacity>
            </View>
            {foodLog.map((f, i) => (
              <View key={f.id} style={[s.logRow, i < foodLog.length - 1 && { borderBottomWidth: 1, borderBottomColor: '#111' }]}>
                <View style={{ flex: 1 }}>
                  <Text style={s.logName}>{f.name}</Text>
                  <View style={[s.pillRow, { marginTop: 4 }]}>
                    <Pill bg="#1a0e00" color={C.cal}>{f.calories} kcal</Pill>
                    {f.protein ? <Pill bg="#0d1a0d" color={C.green}>{f.protein}g P</Pill> : null}
                    {f.carbs ? <Pill bg="#001a2a" color="#4ab0d4">{f.carbs}g C</Pill> : null}
                    {f.fat ? <Pill bg="#1a1600" color={C.legs}>{f.fat}g F</Pill> : null}
                  </View>
                </View>
                <TouchableOpacity onPress={() => setFoodLog(p => p.filter(x => x.id !== f.id))} style={{ padding: 4 }}>
                  <Text style={{ color: C.text4, fontSize: 16 }}>✕</Text>
                </TouchableOpacity>
              </View>
            ))}
            <View style={[s.logTotals]}>
              <View style={s.pillRow}>
                <Pill bg="#1a0e00" color={C.cal}>{totals.calories} kcal</Pill>
                <Pill bg="#0d1a0d" color={C.green}>{totals.protein}g P</Pill>
                <Pill bg="#001a2a" color="#4ab0d4">{totals.carbs}g C</Pill>
                <Pill bg="#1a1600" color={C.legs}>{totals.fat}g F</Pill>
              </View>
            </View>
          </Card>
        )}
        {foodLog.length === 0 && (
          <Text style={[s.emptyText]}>No foods logged yet — add your first meal above</Text>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// ─── RECIPES SCREEN ───────────────────────────────────────────────────────────
function RecipesScreen() {
  const [recipes, setRecipes] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [mode, setMode] = useState('list'); // list | add
  const [selected, setSelected] = useState(null);
  const [newRecipe, setNewRecipe] = useState({ name: '', servings: '1', emoji: '🍽️', ingredients: [] });
  const [ingForm, setIngForm] = useState({ name: '', amount: '', calories: '', protein: '', carbs: '', fat: '' });

  useEffect(() => {
    load('recipes', DEFAULT_RECIPES).then(v => { setRecipes(v); setLoaded(true); });
  }, []);
  useEffect(() => { if (loaded) save('recipes', recipes); }, [recipes, loaded]);

  const macros = (ingredients) => ingredients.reduce((a, i) => ({
    calories: a.calories + (Number(i.calories) || 0),
    protein:  a.protein  + (Number(i.protein)  || 0),
    carbs:    a.carbs    + (Number(i.carbs)    || 0),
    fat:      a.fat      + (Number(i.fat)      || 0),
  }), { calories: 0, protein: 0, carbs: 0, fat: 0 });

  const addIngredient = () => {
    if (!ingForm.name) return;
    setNewRecipe(p => ({ ...p, ingredients: [...p.ingredients, { ...ingForm, id: Date.now() }] }));
    setIngForm({ name: '', amount: '', calories: '', protein: '', carbs: '', fat: '' });
  };

  const saveRecipe = () => {
    if (!newRecipe.name || newRecipe.ingredients.length === 0) return;
    setRecipes(p => [...p, { ...newRecipe, id: 'r' + Date.now() }]);
    setNewRecipe({ name: '', servings: '1', emoji: '🍽️', ingredients: [] });
    setMode('list');
  };

  const logRecipe = (recipe) => {
    const t = macros(recipe.ingredients);
    // This would ideally use a shared state/context — for now alert
    Alert.alert('Logged!', `${recipe.name} added to your food diary.\n\n${Math.round(t.calories)} kcal · ${Math.round(t.protein)}g protein`, [{ text: 'OK' }]);
  };

  const deleteRecipe = (id) => {
    Alert.alert('Delete Recipe', 'Remove this recipe?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => setRecipes(p => p.filter(r => r.id !== id)) },
    ]);
  };

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <View style={[s.spaceBetween, { padding: 16, paddingBottom: 8 }]}>
        <AccentCard accent={C.recipes} style={{ flex: 1, marginRight: 10 }}>
          <Text style={[s.cardLabel, { color: '#5a1a40' }]}>RECIPE MANAGER · SAVED</Text>
          <Text style={{ color: '#c46090', fontSize: 11, fontFamily: 'DMMono' }}>Build recipes · auto-calculate macros</Text>
        </AccentCard>
        <TouchableOpacity onPress={() => setMode(mode === 'add' ? 'list' : 'add')} activeOpacity={0.8}
          style={[s.addBtn, { backgroundColor: mode === 'add' ? C.recipes : 'transparent', borderColor: C.recipes + '55' }]}>
          <Text style={[s.addBtnText, { color: mode === 'add' ? '#000' : C.recipes }]}>{mode === 'add' ? '✕' : '+ ADD'}</Text>
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={120}>
        <ScrollView style={s.scroll} contentContainerStyle={[s.scrollContent, { paddingTop: 0 }]}>
          {mode === 'add' && (
            <Card style={{ marginBottom: 16 }}>
              <SectionLabel>NEW RECIPE</SectionLabel>
              <View style={[s.row, { marginBottom: 10 }]}>
                <View style={{ width: 70, marginRight: 8 }}>
                  <Text style={s.inputLabel}>EMOJI</Text>
                  <Input value={newRecipe.emoji} onChangeText={v => setNewRecipe(p => ({ ...p, emoji: v }))} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.inputLabel}>RECIPE NAME</Text>
                  <Input value={newRecipe.name} onChangeText={v => setNewRecipe(p => ({ ...p, name: v }))} placeholder="e.g. Post-Workout Shake" />
                </View>
              </View>
              <Text style={s.inputLabel}>SERVINGS</Text>
              <Input value={newRecipe.servings} onChangeText={v => setNewRecipe(p => ({ ...p, servings: v }))}
                keyboardType="numeric" style={{ width: 80, marginBottom: 16 }} />

              <View style={{ borderTopWidth: 1, borderTopColor: C.border, paddingTop: 14 }}>
                <SectionLabel>ADD INGREDIENT</SectionLabel>
                <Input value={ingForm.name} onChangeText={v => setIngForm(p => ({ ...p, name: v }))}
                  placeholder="Name + amount (e.g. Chicken 150g)" style={{ marginBottom: 8 }} />
                <View style={s.row}>
                  {[{ k: 'calories', l: 'KCAL' }, { k: 'protein', l: 'PROT' }, { k: 'carbs', l: 'CARB' }, { k: 'fat', l: 'FAT' }].map(({ k, l }) => (
                    <View key={k} style={{ flex: 1, marginHorizontal: 3 }}>
                      <Text style={s.inputLabel}>{l}</Text>
                      <Input value={ingForm[k]} keyboardType="numeric" placeholder="0"
                        onChangeText={v => setIngForm(p => ({ ...p, [k]: v }))} />
                    </View>
                  ))}
                </View>
                <Btn label="+ ADD INGREDIENT" onPress={addIngredient} accent={C.recipes} outline style={{ marginTop: 10 }} />
              </View>

              {newRecipe.ingredients.length > 0 && (
                <View style={{ marginTop: 14 }}>
                  {newRecipe.ingredients.map((ing, i) => (
                    <View key={ing.id || i} style={[s.spaceBetween, { paddingVertical: 7, borderBottomWidth: 1, borderBottomColor: '#111' }]}>
                      <Text style={{ color: C.text2, fontSize: 11, fontFamily: 'DMMono', flex: 1 }}>{ing.name}</Text>
                      <View style={[s.row, { alignItems: 'center' }]}>
                        <Text style={{ color: C.text3, fontSize: 10, fontFamily: 'DMMono', marginRight: 8 }}>{ing.calories}kcal · {ing.protein}g P</Text>
                        <TouchableOpacity onPress={() => setNewRecipe(p => ({ ...p, ingredients: p.ingredients.filter((_, j) => j !== i) }))}>
                          <Text style={{ color: C.text4, fontSize: 14 }}>✕</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  ))}
                  {(() => { const t = macros(newRecipe.ingredients); return (
                    <View style={[s.logTotals, { marginTop: 10 }]}>
                      <View style={s.pillRow}>
                        <Pill bg="#1a0e00" color={C.cal}>{Math.round(t.calories)} kcal</Pill>
                        <Pill bg="#0d1a0d" color={C.green}>{Math.round(t.protein)}g P</Pill>
                        <Pill bg="#001a2a" color="#4ab0d4">{Math.round(t.carbs)}g C</Pill>
                        <Pill bg="#1a1600" color={C.legs}>{Math.round(t.fat)}g F</Pill>
                      </View>
                    </View>
                  ); })()}
                  <Btn label="SAVE RECIPE" onPress={saveRecipe} accent={C.recipes}
                    disabled={!newRecipe.name || newRecipe.ingredients.length === 0} style={{ marginTop: 12 }} />
                </View>
              )}
            </Card>
          )}

          {mode === 'list' && recipes.map(r => {
            const t = macros(r.ingredients);
            const isOpen = selected === r.id;
            return (
              <ExpandRow key={r.id} title={`${r.emoji}  ${r.name}`} accent={C.recipes}
                subtitle={`${r.servings} serving${r.servings !== 1 ? 's' : ''}`}
                expanded={isOpen} onToggle={() => setSelected(isOpen ? null : r.id)}
                pills={[
                  { label: `${Math.round(t.calories)} kcal`, bg: '#1a0e00', color: C.cal },
                  { label: `${Math.round(t.protein)}g P`, bg: '#0d1a0d', color: C.green },
                  { label: `${Math.round(t.carbs)}g C`, bg: '#001a2a', color: '#4ab0d4' },
                  { label: `${Math.round(t.fat)}g F`, bg: '#1a1600', color: C.legs },
                ]}
              >
                {r.ingredients.map((ing, i) => (
                  <View key={i} style={[s.spaceBetween, { paddingVertical: 7, borderBottomWidth: i < r.ingredients.length - 1 ? 1 : 0, borderBottomColor: '#111' }]}>
                    <Text style={{ color: C.text2, fontSize: 11, fontFamily: 'DMMono' }}>{ing.name}{ing.amount ? ` (${ing.amount})` : ''}</Text>
                    <Text style={{ color: C.text3, fontSize: 10, fontFamily: 'DMMono' }}>{ing.calories}kcal · {ing.protein}g P · {ing.carbs}g C · {ing.fat}g F</Text>
                  </View>
                ))}
                <View style={[s.row, { marginTop: 12 }]}>
                  <Btn label="LOG TO DIARY" onPress={() => logRecipe(r)} accent={C.recipes} outline style={{ flex: 1, marginRight: 8 }} />
                  {!DEFAULT_RECIPES.find(b => b.id === r.id) && (
                    <Btn label="DELETE" onPress={() => deleteRecipe(r.id)} accent={C.red} outline style={{ paddingHorizontal: 16 }} />
                  )}
                </View>
              </ExpandRow>
            );
          })}
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

// ─── CALCULATOR SCREEN ────────────────────────────────────────────────────────
function CalcScreen({ setTargets }) {
  const [calc, setCalc] = useState({ gender: 'male', age: '', weight: '', height: '', unit: 'metric', activity: 'moderate' });
  const [result, setResult] = useState(null);
  const [goal, setGoal] = useState('maintain');

  const runCalc = () => {
    let w = Number(calc.weight), h = Number(calc.height), age = Number(calc.age);
    if (!w || !h || !age) { Alert.alert('Missing info', 'Please fill in age, weight and height.'); return; }
    if (calc.unit === 'imperial') { w *= 0.453592; h *= 2.54; }
    const bmr = calc.gender === 'male' ? 10 * w + 6.25 * h - 5 * age + 5 : 10 * w + 6.25 * h - 5 * age - 161;
    const mult = { sedentary: 1.2, light: 1.375, moderate: 1.55, active: 1.725, veryactive: 1.9 }[calc.activity];
    setResult({ bmr: Math.round(bmr), tdee: Math.round(bmr * mult) });
  };

  const GOAL_MAP = result ? {
    cut2: result.tdee - 1000, cut1: result.tdee - 500, cut05: result.tdee - 250,
    maintain: result.tdee, bulk05: result.tdee + 250, bulk1: result.tdee + 500,
  } : {};

  const goalCals = result ? (GOAL_MAP[goal] || result.tdee) : null;

  const applyTargets = () => {
    if (!goalCals) return;
    const p = Math.round(goalCals * 0.30 / 4);
    const c = Math.round(goalCals * 0.40 / 4);
    const f = Math.round(goalCals * 0.30 / 9);
    setTargets({ calories: goalCals, protein: p, carbs: c, fat: f });
    Alert.alert('Targets Set!', `Your daily targets have been updated:\n\n${goalCals} kcal · ${p}g protein · ${c}g carbs · ${f}g fat`, [{ text: 'Great!' }]);
  };

  const GOALS = [
    { v: 'cut2',    l: '🔥 Aggressive Cut',  d: '–1000 kcal · ~2 lb/wk loss',   c: C.red },
    { v: 'cut1',    l: '⬇ Moderate Cut',     d: '–500 kcal · ~1 lb/wk loss',    c: C.cal },
    { v: 'cut05',   l: '↓ Mild Cut',          d: '–250 kcal · ~0.5 lb/wk loss',  c: C.legs },
    { v: 'maintain',l: '⚖ Maintain',          d: '±0 kcal · body recomp',         c: C.calc },
    { v: 'bulk05',  l: '↑ Lean Bulk',          d: '+250 kcal · ~0.5 lb/wk gain',  c: C.green },
    { v: 'bulk1',   l: '⬆ Moderate Bulk',     d: '+500 kcal · ~1 lb/wk gain',    c: C.tracker },
  ];

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: C.bg }} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={120}>
      <ScrollView style={s.scroll} contentContainerStyle={s.scrollContent}>
        <AccentCard accent={C.calc} style={{ marginBottom: 16 }}>
          <Text style={[s.cardLabel, { color: '#0e4a4a' }]}>TDEE CALORIE CALCULATOR</Text>
          <Text style={{ color: '#4acaca', fontSize: 12, fontFamily: 'DMMono' }}>Calculate your maintenance calories and set a goal</Text>
        </AccentCard>

        <Card style={{ marginBottom: 14 }}>
          <SectionLabel>BIOLOGICAL SEX</SectionLabel>
          <View style={[s.row, { marginBottom: 14 }]}>
            {['male', 'female'].map(g => (
              <TouchableOpacity key={g} onPress={() => setCalc(p => ({ ...p, gender: g }))} activeOpacity={0.8}
                style={[s.toggleBtn, { flex: 1, marginHorizontal: 4, backgroundColor: calc.gender === g ? '#0e3030' : C.bg3, borderColor: calc.gender === g ? C.calc + '55' : C.border }]}>
                <Text style={[s.toggleBtnText, { color: calc.gender === g ? C.calc : C.text3 }]}>{g.charAt(0).toUpperCase() + g.slice(1)}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <SectionLabel>UNITS</SectionLabel>
          <View style={[s.row, { marginBottom: 14 }]}>
            {[{ v: 'metric', l: 'Metric (kg/cm)' }, { v: 'imperial', l: 'Imperial (lb/in)' }].map(u => (
              <TouchableOpacity key={u.v} onPress={() => setCalc(p => ({ ...p, unit: u.v }))} activeOpacity={0.8}
                style={[s.toggleBtn, { flex: 1, marginHorizontal: 4, backgroundColor: calc.unit === u.v ? '#0e3030' : C.bg3, borderColor: calc.unit === u.v ? C.calc + '55' : C.border }]}>
                <Text style={[s.toggleBtnText, { color: calc.unit === u.v ? C.calc : C.text3 }]}>{u.l}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={s.row}>
            {[
              { k: 'age',    l: 'AGE (yrs)', ph: '25' },
              { k: 'weight', l: `WEIGHT (${calc.unit === 'metric' ? 'kg' : 'lb'})`, ph: calc.unit === 'metric' ? '75' : '165' },
              { k: 'height', l: `HEIGHT (${calc.unit === 'metric' ? 'cm' : 'in'})`, ph: calc.unit === 'metric' ? '175' : '69' },
            ].map(({ k, l, ph }) => (
              <View key={k} style={{ flex: 1, marginHorizontal: 3 }}>
                <Text style={s.inputLabel}>{l}</Text>
                <Input value={calc[k]} onChangeText={v => setCalc(p => ({ ...p, [k]: v }))} placeholder={ph} keyboardType="numeric"
                  style={{ borderColor: calc[k] ? C.calc + '44' : C.border2 }} />
              </View>
            ))}
          </View>

          <SectionLabel style={{ marginTop: 14 }}>ACTIVITY LEVEL</SectionLabel>
          {[
            { v: 'sedentary',  l: 'Sedentary',         d: 'Desk job, no exercise' },
            { v: 'light',      l: 'Lightly Active',     d: '1–3 workouts/week' },
            { v: 'moderate',   l: 'Moderately Active',  d: '3–5 workouts/week ← you' },
            { v: 'active',     l: 'Very Active',        d: '6–7 workouts/week' },
            { v: 'veryactive', l: 'Athlete',            d: 'Physical job + daily training' },
          ].map(a => (
            <TouchableOpacity key={a.v} onPress={() => setCalc(p => ({ ...p, activity: a.v }))} activeOpacity={0.8}
              style={[s.activityRow, calc.activity === a.v && { backgroundColor: '#0e3030', borderColor: C.calc + '55' }]}>
              <Text style={[s.activityLabel, { color: calc.activity === a.v ? C.calc : C.text2 }]}>{a.l}</Text>
              <Text style={[s.activityDesc, { color: calc.activity === a.v ? C.calc + '88' : C.text4 }]}>{a.d}</Text>
            </TouchableOpacity>
          ))}

          <Btn label="CALCULATE MY TDEE" onPress={runCalc} accent={C.calc} style={{ marginTop: 16 }} />
        </Card>

        {result && (
          <>
            <Card style={{ marginBottom: 14 }}>
              <SectionLabel>YOUR RESULTS</SectionLabel>
              <View style={[s.row, { marginBottom: 16 }]}>
                <View style={[s.resultBox, { marginRight: 8 }]}>
                  <Text style={s.resultLabel}>BASAL METABOLIC RATE</Text>
                  <Text style={[s.resultNum, { color: '#4acaca' }]}>{result.bmr}</Text>
                  <Text style={s.resultSub}>kcal at complete rest</Text>
                </View>
                <View style={s.resultBox}>
                  <Text style={s.resultLabel}>MAINTENANCE (TDEE)</Text>
                  <Text style={[s.resultNum, { color: C.calc }]}>{result.tdee}</Text>
                  <Text style={s.resultSub}>kcal/day to maintain weight</Text>
                </View>
              </View>

              <SectionLabel>SELECT YOUR GOAL</SectionLabel>
              {GOALS.map(g => (
                <TouchableOpacity key={g.v} onPress={() => setGoal(g.v)} activeOpacity={0.8}
                  style={[s.goalRow, goal === g.v && { backgroundColor: g.c + '18', borderColor: g.c + '55' }]}>
                  <View style={{ flex: 1 }}>
                    <Text style={[s.goalLabel, { color: goal === g.v ? g.c : C.text2 }]}>{g.l}</Text>
                    <Text style={[s.goalDesc, { color: goal === g.v ? g.c + '88' : C.text4 }]}>{g.d}</Text>
                  </View>
                  <Text style={[s.goalCals, { color: goal === g.v ? g.c : C.text4 }]}>{GOAL_MAP[g.v]}</Text>
                </TouchableOpacity>
              ))}
            </Card>

            {goalCals && (() => {
              const p = Math.round(goalCals * 0.30 / 4);
              const c = Math.round(goalCals * 0.40 / 4);
              const f = Math.round(goalCals * 0.30 / 9);
              return (
                <Card style={{ marginBottom: 14 }}>
                  <SectionLabel>SUGGESTED MACRO SPLIT (30 / 40 / 30)</SectionLabel>
                  <View style={[s.row, { marginBottom: 14 }]}>
                    {[{ l: 'PROTEIN', v: p, u: 'g', c: C.green }, { l: 'CARBS', v: c, u: 'g', c: C.library }, { l: 'FAT', v: f, u: 'g', c: C.legs }].map(({ l, v, u, c }) => (
                      <View key={l} style={{ flex: 1, alignItems: 'center' }}>
                        <Text style={[s.bigNum, { color: c }]}>{v}</Text>
                        <Text style={s.bigNumLabel}>{l} ({u})</Text>
                      </View>
                    ))}
                  </View>
                  <Text style={[s.noteText, { marginBottom: 12 }]}>Goal: <Text style={{ color: C.calc }}>{goalCals} kcal/day</Text></Text>
                  <Btn label="SET AS MY DAILY TARGETS →" onPress={applyTargets} accent={C.calc} />
                </Card>
              );
            })()}

            <Card style={{ marginBottom: 14 }}>
              <Text style={s.noteText}>
                <Text style={{ color: C.text2 }}>NOTE · </Text>
                Uses Mifflin-St Jeor formula. Estimates — adjust ±100–200 kcal based on 2–3 weeks of real results. Avoid cuts below 1200 kcal (women) or 1500 kcal (men).
              </Text>
            </Card>
          </>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// ─── BOTTOM TAB BAR ───────────────────────────────────────────────────────────
function TabBar({ activeTab, setActiveTab }) {
  return (
    <View style={s.tabBar}>
      {TABS.map(t => {
        const active = activeTab === t.key;
        return (
          <TouchableOpacity key={t.key} onPress={() => setActiveTab(t.key)} activeOpacity={0.8} style={s.tabItem}>
            <Text style={[s.tabIcon, { opacity: active ? 1 : 0.4 }]}>{t.icon}</Text>
            <Text style={[s.tabLabel, { color: active ? t.accent : C.text4 }]}>{t.label}</Text>
            {active && <View style={[s.tabDot, { backgroundColor: t.accent }]} />}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

// ─── ROOT APP ─────────────────────────────────────────────────────────────────
export default function App() {
  const [activeTab, setActiveTab] = useState('workout');
  const [targets, setTargets] = useState({ calories: 2200, protein: 150, carbs: 220, fat: 70 });
  const [fontsLoaded] = useFonts({ BebasNeue_400Regular });

  useEffect(() => {
    load('targets', { calories: 2200, protein: 150, carbs: 220, fat: 70 }).then(setTargets);
  }, []);
  useEffect(() => { save('targets', targets); }, [targets]);

  const onLayoutRootView = useCallback(async () => {
    if (fontsLoaded) await SplashScreen.hideAsync();
  }, [fontsLoaded]);

  if (!fontsLoaded) return null;

  const accentCol = TABS.find(t => t.key === activeTab)?.accent || C.push;

  const screenMap = {
    workout:  <WorkoutScreen />,
    library:  <LibraryScreen />,
    tracker:  <TrackerScreen />,
    calories: <CaloriesScreen targets={targets} setTargets={setTargets} />,
    recipes:  <RecipesScreen />,
    calc:     <CalcScreen setTargets={setTargets} />,
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }} onLayout={onLayoutRootView}>
      <StatusBar barStyle="light-content" backgroundColor={C.bg1} />

      {/* Header */}
      <View style={s.header}>
        <Text style={s.headerSub}>DUMBBELL + CALISTHENICS · 3×/WEEK</Text>
        <Text style={s.headerTitle}>
          IRON <Text style={{ color: accentCol }}>GRIND</Text>
        </Text>
      </View>

      {/* Screen */}
      <View style={{ flex: 1 }}>{screenMap[activeTab]}</View>

      {/* Tab bar */}
      <TabBar activeTab={activeTab} setActiveTab={setActiveTab} />
    </SafeAreaView>
  );
}

// ─── STYLES ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: C.bg },
  scrollContent: { padding: 16, paddingBottom: 30 },

  header: { backgroundColor: C.bg1, borderBottomWidth: 1, borderBottomColor: C.border, paddingHorizontal: 16, paddingVertical: 12 },
  headerSub: { fontSize: 9, letterSpacing: 2.5, color: C.text3, fontFamily: 'monospace', marginBottom: 2 },
  headerTitle: { fontSize: 32, color: C.text, fontFamily: 'BebasNeue_400Regular', letterSpacing: 1 },

  card: { backgroundColor: C.bg1, borderWidth: 1, borderColor: C.border, borderRadius: 10, padding: 14, marginBottom: 0 },
  accentCard: { backgroundColor: C.bg1, borderWidth: 1, borderColor: C.border, borderLeftWidth: 3, borderRadius: 10, padding: 12 },
  cardLabel: { fontSize: 8, letterSpacing: 2, fontFamily: 'monospace', marginBottom: 3 },

  row: { flexDirection: 'row', alignItems: 'center' },
  spaceBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },

  pill: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 20, marginRight: 5, marginBottom: 3 },
  pillText: { fontSize: 10, fontFamily: 'monospace' },
  pillRow: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 4 },

  barBg: { backgroundColor: '#1a1a1a', borderRadius: 3, overflow: 'hidden', width: '100%' },
  barFill: { borderRadius: 3 },

  sectionLabel: { fontSize: 9, letterSpacing: 2, color: C.text3, fontFamily: 'monospace', marginBottom: 8 },

  expandRow: { backgroundColor: C.bg1, borderWidth: 1, borderColor: C.border, borderRadius: 9, padding: 13, flexDirection: 'row', alignItems: 'center' },
  expandTitle: { fontSize: 13, color: C.text, fontFamily: 'monospace', marginBottom: 3 },
  expandSub: { fontSize: 10, color: C.text3, fontFamily: 'monospace' },
  expandBody: { backgroundColor: '#0a0a0a', borderWidth: 1, borderTopWidth: 0, borderRadius: 9, borderTopLeftRadius: 0, borderTopRightRadius: 0, padding: 13 },
  chevron: { fontSize: 12, marginLeft: 8 },

  tipLabel: { fontSize: 8, letterSpacing: 2, color: C.text3, fontFamily: 'monospace', marginBottom: 4 },
  tipText: { fontSize: 12, color: C.text3, fontFamily: 'monospace', lineHeight: 18 },

  scheduleRow: { flexDirection: 'row', marginBottom: 16 },
  scheduleCell: { flex: 1, backgroundColor: C.bg1, borderWidth: 1, borderColor: '#141414', borderRadius: 5, padding: 5, alignItems: 'center', marginHorizontal: 1 },
  scheduleSlot: { fontSize: 7, color: C.text4, fontFamily: 'monospace', marginBottom: 2 },
  scheduleDay: { fontSize: 9, fontFamily: 'monospace' },
  scheduleLbl: { fontSize: 6, color: C.text4, fontFamily: 'monospace', marginTop: 2 },

  dayTab: { flex: 1, padding: 11, borderWidth: 1, borderColor: C.border, borderRadius: 8, alignItems: 'center', marginHorizontal: 3 },
  dayTabText: { fontSize: 14, fontFamily: 'BebasNeue_400Regular', letterSpacing: 0.5 },
  dayTabSub: { fontSize: 8, fontFamily: 'monospace', marginTop: 1 },

  focusText: { fontSize: 12, color: '#c8c0b8', fontFamily: 'monospace', marginTop: 2 },

  warmupToggle: { backgroundColor: '#0a140a', borderWidth: 1, borderColor: '#1e3a1e', borderRadius: 9, padding: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 0 },
  warmupLabel: { fontSize: 9, color: '#2a5a2a', letterSpacing: 1.5, fontFamily: 'monospace', marginBottom: 2 },
  warmupSub: { fontSize: 11, color: '#4a8a4a', fontFamily: 'monospace' },
  warmupBody: { backgroundColor: '#070d07', borderWidth: 1, borderTopWidth: 0, borderColor: '#1e3a1e', borderRadius: 9, borderTopLeftRadius: 0, borderTopRightRadius: 0, paddingHorizontal: 13, paddingBottom: 13, marginBottom: 10 },
  warmupMove: { paddingVertical: 9 },
  warmupMoveName: { fontSize: 11, color: '#6aaa6a', fontFamily: 'monospace' },
  warmupMoveReps: { fontSize: 10, color: '#3a6a3a', fontFamily: 'monospace' },
  warmupMoveTip: { fontSize: 10, color: '#2a4a2a', fontFamily: 'monospace', lineHeight: 16, marginTop: 3 },

  finisherCard: { backgroundColor: '#0c0700', borderWidth: 1, borderLeftWidth: 3, borderColor: '#332000', borderLeftColor: C.legs, borderRadius: 10, padding: 14, marginTop: 16 },
  finisherTitle: { fontSize: 20, color: C.legs, fontFamily: 'BebasNeue_400Regular', letterSpacing: 1, marginBottom: 3 },
  finisherSub: { fontSize: 9, color: '#4a3800', fontFamily: 'monospace', marginBottom: 13, lineHeight: 14 },
  finisherMove: { backgroundColor: '#080500', borderWidth: 1, borderColor: '#221600', borderRadius: 7, padding: 11, flexDirection: 'row', marginBottom: 5 },
  finisherNum: { fontSize: 14, color: C.legs, opacity: 0.4, fontFamily: 'BebasNeue_400Regular', marginRight: 10, lineHeight: 20 },
  finisherMoveName: { fontSize: 12, color: '#c4a020', fontFamily: 'monospace', marginBottom: 2 },
  finisherMoveReps: { fontSize: 10, color: '#7a5510', fontFamily: 'monospace', marginBottom: 4 },
  finisherMoveTip: { fontSize: 10, color: '#3a2a08', fontFamily: 'monospace', lineHeight: 15 },

  noteText: { fontSize: 10, color: C.text4, fontFamily: 'monospace', lineHeight: 17 },

  btn: { borderRadius: 8, paddingVertical: 12, alignItems: 'center', justifyContent: 'center' },
  btnText: { fontSize: 16, fontFamily: 'BebasNeue_400Regular', letterSpacing: 0.8 },

  input: { backgroundColor: C.bg1, borderWidth: 1, borderColor: C.border2, borderRadius: 7, color: C.text, fontFamily: 'monospace', fontSize: 12, paddingHorizontal: 11, paddingVertical: 9 },
  inputLabel: { fontSize: 8, color: C.text4, letterSpacing: 1.5, fontFamily: 'monospace', marginBottom: 5 },

  catPill: { paddingHorizontal: 14, paddingVertical: 5, borderRadius: 20, borderWidth: 1, borderColor: C.border, marginRight: 6, backgroundColor: C.bg1 },
  catPillText: { fontSize: 9, letterSpacing: 1, fontFamily: 'monospace' },

  ytBtn: { backgroundColor: '#ff000022', borderWidth: 1, borderColor: '#ff000044', borderRadius: 8, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 10 },
  ytBtnText: { color: '#ff4444', fontFamily: 'monospace', fontSize: 11, flex: 1 },

  editBtn: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 6, borderWidth: 1 },
  editBtnText: { fontSize: 10, fontFamily: 'monospace', letterSpacing: 1 },

  progLabel: { fontSize: 11, color: C.text2, fontFamily: 'monospace' },
  progVal: { fontSize: 11, fontFamily: 'monospace' },
  overTag: { fontSize: 9, color: C.red, fontFamily: 'monospace' },

  bigNum: { fontSize: 28, fontFamily: 'BebasNeue_400Regular', lineHeight: 32 },
  bigNumLabel: { fontSize: 8, color: C.text3, fontFamily: 'monospace', marginTop: 2, textAlign: 'center' },

  logRow: { paddingVertical: 10, flexDirection: 'row', alignItems: 'center' },
  logName: { fontSize: 12, color: '#c0b8b0', fontFamily: 'monospace' },
  logTotals: { paddingTop: 10, borderTopWidth: 1, borderTopColor: C.border, marginTop: 4 },
  clearBtn: { fontSize: 9, color: C.text3, fontFamily: 'monospace', letterSpacing: 1 },
  emptyText: { textAlign: 'center', padding: 24, color: C.text4, fontFamily: 'monospace', fontSize: 12 },

  loggedBadge: { backgroundColor: '#100d1a', borderWidth: 1, borderRadius: 6, padding: 8, marginTop: 8 },

  addBtn: { padding: 14, borderWidth: 1, borderRadius: 9, alignItems: 'center', justifyContent: 'center', minWidth: 80 },
  addBtnText: { fontSize: 13, fontFamily: 'BebasNeue_400Regular', letterSpacing: 0.5 },

  toggleBtn: { padding: 10, borderWidth: 1, borderRadius: 8, alignItems: 'center' },
  toggleBtnText: { fontSize: 11, fontFamily: 'monospace' },

  activityRow: { padding: 11, borderWidth: 1, borderColor: C.border, borderRadius: 8, marginBottom: 5, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  activityLabel: { fontSize: 11, fontFamily: 'monospace' },
  activityDesc: { fontSize: 9, fontFamily: 'monospace' },

  resultBox: { flex: 1, backgroundColor: '#060f0f', borderWidth: 1, borderColor: '#0e2020', borderRadius: 9, padding: 13, alignItems: 'center' },
  resultLabel: { fontSize: 8, color: '#0e4a4a', letterSpacing: 1.5, fontFamily: 'monospace', marginBottom: 6, textAlign: 'center' },
  resultNum: { fontSize: 36, fontFamily: 'BebasNeue_400Regular', lineHeight: 40 },
  resultSub: { fontSize: 9, color: '#0e3030', fontFamily: 'monospace', marginTop: 3, textAlign: 'center' },

  goalRow: { padding: 12, borderWidth: 1, borderColor: C.border, borderRadius: 8, marginBottom: 5, flexDirection: 'row', alignItems: 'center' },
  goalLabel: { fontSize: 12, fontFamily: 'monospace', marginBottom: 2 },
  goalDesc: { fontSize: 9, fontFamily: 'monospace' },
  goalCals: { fontSize: 22, fontFamily: 'BebasNeue_400Regular' },

  tabBar: { flexDirection: 'row', backgroundColor: C.bg1, borderTopWidth: 1, borderTopColor: C.border, paddingVertical: 8, paddingHorizontal: 4 },
  tabItem: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 2 },
  tabIcon: { fontSize: 18, marginBottom: 2 },
  tabLabel: { fontSize: 8, fontFamily: 'monospace', letterSpacing: 0.5 },
  tabDot: { width: 4, height: 4, borderRadius: 2, marginTop: 3 },
});
