import React from 'react'
import Register from './components/Register'

function App() {
  return (
    <div style={{ padding: '40px', fontFamily: 'sans-serif', backgroundColor: '#f9f9f9', minHeight: '100vh' }}>
      <h1 style={{ textAlign: 'center' }}>StudyRoom Arena</h1>
      <hr style={{ margin: '30px 0', borderColor: '#eee' }} />
    
      <Register />
    </div>
  )
}

export default App