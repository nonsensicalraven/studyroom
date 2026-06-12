import React, { useState } from 'react'

function Register() {
  // 1. React's internal temporary memory (State)
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState('') // state to hold backend responses on screen

  // 2. The upgraded backend bridge logic
  const handleSubmit = async (e) => {
    e.preventDefault() // Prevents the browser from reloading the page
    setMessage('Sending data to the backend engine...')

    try {
      // Shooting a network request straight across the local ports!
      const response = await fetch('http://localhost:5000/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, email, password }), // Bundling up our state variables
      })

      const data = await response.json()

      if (response.ok) {
        localStorage.setItem('studyArenaToken', data.token)
        setMessage(`Account Created Successfully and saved to LocalStorage!`)
        console.log("Full Response from Server Vault:", data)
    } else {
        // Server error (e.g., Duplicate email)
        setMessage(`Server Rejected Request: ${data.message || 'Unknown Error'}`)
      }
    } catch (error) {
      // System error (e.g., Backend server isn't running)
      console.error("Network Error:", error)
      setMessage('Could not connect to the backend server. Is your Express app running on port 5000?')
    }
  }

  return (
    <div style={{ maxWidth: '400px', margin: '0 auto', padding: '20px', border: '1px solid #ccc', borderRadius: '8px', backgroundColor: '#fff' }}>
      <h2>Create Your Account</h2>
      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: '15px' }}>
          <label style={{ display: 'block', marginBottom: '5px' }}>Username:</label>
          <input 
            type="text" 
            value={username} 
            onChange={(e) => setUsername(e.target.value)} 
            style={{ width: '100%', padding: '8px', boxSizing: 'border-box' }}
            required
          />
        </div>

        <div style={{ marginBottom: '15px' }}>
          <label style={{ display: 'block', marginBottom: '5px' }}>Email:</label>
          <input 
            type="email" 
            value={email} 
            onChange={(e) => setEmail(e.target.value)} 
            style={{ width: '100%', padding: '8px', boxSizing: 'border-box' }}
            required
          />
        </div>

        <div style={{ marginBottom: '15px' }}>
          <label style={{ display: 'block', marginBottom: '5px' }}>Password:</label>
          <input 
            type="password" 
            value={password} 
            onChange={(e) => setPassword(e.target.value)} 
            style={{ width: '100%', padding: '8px', boxSizing: 'border-box' }}
            required
          />
        </div>

        <button type="submit" style={{ width: '100%', padding: '10px', background: '#007bff', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
          Sign Up
        </button>

        {/* 3. Status card showing server updates visually on screen */}
        {message && (
          <p style={{ marginTop: '15px', padding: '10px', backgroundColor: '#e9ecef', borderRadius: '4px', fontSize: '13px', wordBreak: 'break-all', color: '#333', borderLeft: '4px solid #007bff' }}>
            {message}
          </p>
        )}
      </form>
    </div>
  )
}

export default Register