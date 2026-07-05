import { useEffect, useState } from 'react'
import { NavLink, Route, Routes } from 'react-router-dom'
import { TimersProvider } from './lib/timers'
import { ensurePushSubscription, pushSupported, requestPushPermission } from './lib/push'
import TimerBar from './components/TimerBar'
import Recipes from './screens/Recipes'
import RecipeDetail from './screens/RecipeDetail'
import AddRecipe from './screens/AddRecipe'
import Suggest from './screens/Suggest'
import Shopping from './screens/Shopping'

function PushBanner() {
  const [permission, setPermission] = useState<NotificationPermission>(() =>
    pushSupported() ? Notification.permission : 'denied'
  )

  useEffect(() => {
    if (permission === 'granted') ensurePushSubscription().catch(() => {})
  }, [permission])

  if (permission !== 'default') return null
  return (
    <div className="push-banner">
      <span>Get an alarm when timers finish, even with the phone locked.</span>
      <button
        className="small"
        onClick={async () => {
          const ok = await requestPushPermission()
          setPermission(ok ? 'granted' : Notification.permission)
        }}
      >
        Enable
      </button>
    </div>
  )
}

export default function App() {
  return (
    <TimersProvider>
      <div className="app">
        <main>
          <Routes>
            <Route path="/" element={<Recipes />} />
            <Route path="/recipe/:id" element={<RecipeDetail />} />
            <Route path="/add" element={<AddRecipe />} />
            <Route path="/cook" element={<Suggest />} />
            <Route path="/shopping" element={<Shopping />} />
          </Routes>
        </main>
        <PushBanner />
        <TimerBar />
        <nav className="bottom-nav">
          <NavLink to="/" end className={({ isActive }) => (isActive ? 'active' : '')}>
            <span className="icon">📖</span>Recipes
          </NavLink>
          <NavLink to="/cook" className={({ isActive }) => (isActive ? 'active' : '')}>
            <span className="icon">🍳</span>Cook
          </NavLink>
          <NavLink to="/shopping" className={({ isActive }) => (isActive ? 'active' : '')}>
            <span className="icon">🛒</span>List
          </NavLink>
        </nav>
      </div>
    </TimersProvider>
  )
}
