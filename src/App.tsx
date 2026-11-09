import { lazy, Suspense } from 'react'
import { Route, Router, Switch } from 'wouter'
import { useHashLocation } from 'wouter/use-hash-location'
import Layout from './app/Layout.tsx'
import Page from './app/Page.tsx'
import Cards from './features/cards/Cards.tsx'
import Drill from './features/drill/Drill.tsx'
import Journal from './features/journal/Journal.tsx'
import Log from './features/log/Log.tsx'
import Review from './features/review/Review.tsx'
import Settings from './features/settings/Settings.tsx'
import { useIsOwner } from './auth/owner.ts'

const Guide = lazy(() => import('./features/guide/Guide.tsx'))

function GuideRoute() {
  if (!useIsOwner()) return <Page title="Not found" note="That page does not exist." />
  return (
    <Suspense fallback={<p className="muted">Loading…</p>}>
      <Guide />
    </Suspense>
  )
}

export default function App() {
  return (
    <Router hook={useHashLocation}>
      <Layout>
        <Switch>
          <Route path="/" component={Review} />
          <Route path="/cards" component={Cards} />
          <Route path="/drill" component={Drill} />
          <Route path="/log" component={Log} />
          <Route path="/journal" component={Journal} />
          <Route path="/guide" component={GuideRoute} />
          <Route path="/settings" component={Settings} />
          <Route>
            <Page title="Not found" note="That page does not exist." />
          </Route>
        </Switch>
      </Layout>
    </Router>
  )
}
