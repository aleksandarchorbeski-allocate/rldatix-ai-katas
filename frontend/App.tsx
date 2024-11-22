import './App.css'
import ImportComponent from './ImportComponent'
import SearchComponent from './SearchComponent'

function App() {

  return (
    <>
      <h1>AI Katas</h1>
      <div className="card">
        <ImportComponent />
        <SearchComponent />
      </div>
    </>
  )
}

export default App
