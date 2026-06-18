import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom' // 👇 1. Import the steering wheel

function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState('')
  
  const navigate = useNavigate() //2. Initialize the navigation tool

  const handleSubmit = async (e) => {
    e.preventDefault()
    setMessage('Verifying credentials with the backend vault...')

    try {
      const response = await fetch('http://localhost:5000/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      })

      const data = await response.json()

      if (response.ok) {
        //Overwriting the pocket memory with the verified user's token!
        localStorage.setItem('studyArenaToken', data.token)
        setMessage(`Welcome back, ${data.user.username}! Secure session token saved.`)
        console.log("Logged In Successfully! Response:", data)
        
        // 3. TELEPORT THEM TO THE LOBBY INSTANTLY!
        setTimeout(() => {
          navigate('/lobby')
        }, 1500) // Small 1.5-second delay so they can actually read your nice success message!

      } else {
        setMessage(`Login Failed: ${data.message || 'Unknown Error'}`)
      }
    } catch (error) {
      console.error("Network Error:", error)
      setMessage('Could not connect to the backend server.')
    }
  }

  return (
    <div style={{ maxWidth: '400px', margin: '20px auto', padding: '20px', border: '1px solid #ccc', borderRadius: '8px', backgroundColor: '#fff' }}>
      <h2>Login to StudyRoom</h2>
      <form onSubmit={handleSubmit}>
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

        <button type="submit" style={{ width: '100%', padding: '10px', background: '#28a745', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
          Sign In
        </button>

        <p style={{ textAlign: 'center', marginTop: '15px', fontSize: '14px', color: '#666' }}>
          Don't have an account?{' '}
          <span 
            onClick={() => navigate('/register')} 
            style={{ color: '#008CBA', cursor: 'pointer', textDecoration: 'underline', fontWeight: 'bold' }}
          >
            Sign Up here
          </span>
        </p>

        {message && (
          <p style={{ marginTop: '15px', padding: '10px', backgroundColor: '#e9ecef', borderRadius: '4px', fontSize: '13px', wordBreak: 'break-all', color: '#333', borderLeft: '4px solid #28a745' }}>
            {message}
          </p>
        )}
      </form>
    </div>
  )
}

export default Login