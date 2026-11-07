import { Route, Router, Switch } from 'wouter'
import { useHashLocation } from 'wouter/use-hash-location'
import Layout from './app/Layout.tsx'
import Page from './app/Page.tsx'
import Cards from './features/cards/Cards.tsx'
import Log from './features/log/Log.tsx'
import Review from './features/review/Review.tsx'
import Settings from './features/settings/Settings.tsx'

export default function App() {
  return (
    <Router hook={useHashLocation}>
      <Layout>
        <Switch>
          <Route path="/" component={Review} />
          <Route path="/cards" component={Cards} />
          <Route path="/log" component={Log} />
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
