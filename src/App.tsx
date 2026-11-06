import { Route, Router, Switch } from 'wouter'
import { useHashLocation } from 'wouter/use-hash-location'
import Layout from './app/Layout.tsx'
import Page from './app/Page.tsx'
import Settings from './features/settings/Settings.tsx'

export default function App() {
  return (
    <Router hook={useHashLocation}>
      <Layout>
        <Switch>
          <Route path="/">
            <Page title="Today" note="Reviews and the streak will live here." />
          </Route>
          <Route path="/cards">
            <Page title="Cards" note="Your decks and cards." />
          </Route>
          <Route path="/log">
            <Page title="Log" note="Minutes, progress and the heatmap." />
          </Route>
          <Route path="/journal">
            <Page title="Journal" note="Satz des Tages and song of the week." />
          </Route>
          <Route path="/settings" component={Settings} />
          <Route>
            <Page title="Not found" note="That page does not exist." />
          </Route>
        </Switch>
      </Layout>
    </Router>
  )
}
