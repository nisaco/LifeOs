# LifeOS — All-in-One Mobile App

A powerful, beautifully designed mobile app built with React Native (Expo) featuring:

- 🤖 **AI Chat** — Full conversation assistant powered by Claude (Anthropic)
- ✅ **Tasks** — To-do list with priorities, categories, due dates
- 💰 **Budget Tracker** — Income/expense tracking with monthly limits
- 🏋️ **Health & Habits** — Daily habit tracking with streaks and history
- ⏱️ **Focus Timer** — Pomodoro and custom work/break sessions

All data is stored locally on-device. No backend required.

---

## 🚀 Quick Start

### 1. Prerequisites

Install these first if you don't have them:

- **Node.js** (v18+): https://nodejs.org
- **Expo CLI**: `npm install -g expo-cli`
- **Expo Go app** on your phone:
  - iOS: https://apps.apple.com/app/expo-go/id982107779
  - Android: https://play.google.com/store/apps/details?id=host.exp.exponent

### 2. Install dependencies

```bash
cd LifeOS
npm install
```

### 3. Start the development server

```bash
npx expo start
```

This opens a QR code in your terminal. Scan it with:
- **iPhone**: use the Camera app → tap the link
- **Android**: open Expo Go → tap "Scan QR Code"

The app will load on your phone instantly. Any changes you save auto-refresh.

---

## 🔑 Setting Up AI Chat

The AI Chat module requires an Anthropic API key.

1. Go to **https://console.anthropic.com** and create a free account
2. Generate an API key under **API Keys**
3. Open the app → tap **AI Chat** → tap ⚙️ → paste your key → Save

Your key is stored securely on-device only.

---

## 📁 Project Structure

```
LifeOS/
├── App.js                      # Root: navigation + tab bar
├── app.json                    # Expo configuration
├── package.json                # Dependencies
├── babel.config.js
└── src/
    ├── screens/
    │   ├── HomeScreen.js       # Dashboard with stats
    │   ├── ChatScreen.js       # AI Chat (Claude API)
    │   ├── TasksScreen.js      # Task manager
    │   ├── BudgetScreen.js     # Budget & expense tracker
    │   ├── HealthScreen.js     # Habit tracker
    │   └── FocusScreen.js      # Pomodoro / focus timer
    ├── components/
    │   └── shared.js           # Reusable UI components
    └── utils/
        ├── theme.js            # Design system (colors, spacing)
        ├── storage.js          # AsyncStorage wrapper
        └── anthropic.js        # Claude API helper
```

---

## 🏗️ Building for Production

### Android APK (for sharing/testing)
```bash
npx expo build:android
# or with EAS Build (recommended):
npx eas build --platform android --profile preview
```

### iOS (requires Mac + Apple Developer account)
```bash
npx eas build --platform ios
```

### EAS Setup
```bash
npm install -g eas-cli
eas login
eas build:configure
```

---

## 🎨 Customizing the App

### Change the color scheme
Edit `src/utils/theme.js` — all colors are defined as named variables:
```js
primary: '#6C63FF',   // violet (change to your brand color)
chat:    '#6C63FF',
tasks:   '#43E8D8',
budget:  '#FFD166',
health:  '#06D6A0',
focus:   '#FF6584',
```

### Change the AI model or personality
Edit `src/utils/anthropic.js` — update the `system` prompt and `model` field.

### Add a new screen/module
1. Create `src/screens/YourScreen.js`
2. Import it in `App.js`
3. Add a `<Tab.Screen>` entry
4. Add its icon to `TAB_ICONS` in `App.js`

---

## 🔧 Troubleshooting

| Problem | Fix |
|---|---|
| "Metro bundler" error | Run `npx expo start --clear` |
| App won't load on phone | Make sure phone and computer are on the same WiFi |
| AI chat gives "API error" | Check your API key in Settings (⚙️ icon) |
| Module not found error | Run `npm install` again |
| Build fails | Check `npx expo doctor` for issues |

---

## 📦 Key Dependencies

| Package | Purpose |
|---|---|
| `expo` | Build/run toolchain |
| `@react-navigation/bottom-tabs` | Tab navigation |
| `@react-native-async-storage/async-storage` | Local data storage |
| `date-fns` | Date formatting & calculations |
| `@expo/vector-icons` | Icons |

---

## 💡 Feature Ideas for v2

- [ ] Language learning module (flashcards + AI pronunciation)
- [ ] Sleep tracker with alarm
- [ ] Water intake tracker with reminders
- [ ] Habit analytics charts (monthly overview)
- [ ] Cloud sync (Firebase / Supabase)
- [ ] Push notifications for habits and tasks
- [ ] Dark/light mode toggle
- [ ] Widget support (home screen widgets)
- [ ] Export data to CSV

---

## 📄 License

MIT — use and modify freely.
