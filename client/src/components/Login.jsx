import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'

function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState('')
  const [messageType, setMessageType] = useState('') // 'success' or 'error'
  
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setMessage('Verifying credentials with the backend vault...')
    setMessageType('info')

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
        localStorage.setItem('studyArenaToken', data.token)
        localStorage.setItem('studyArenaUser', JSON.stringify(data.user))

        setMessage(`Welcome back, ${data.user.username}!`)
        setMessageType('success')
        console.log("Logged In Successfully! Response:", data)
        
        setTimeout(() => {
          navigate('/lobby')
        }, 1500)

      } else {
        setMessage(`Login Failed: ${data.message || 'Unknown Error'}`)
        setMessageType('error')
      }
    } catch (error) {
      console.error("Network Error:", error)
      setMessage('Could not connect to the backend server.')
      setMessageType('error')
    }
  }

  return (
    <div className="sa-auth-page">
      <div className="sa-auth-card">
        <div className="sa-auth-header">
          <h2>Welcome Back</h2>
          <p>Sign in to your StudyArena account</p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="sa-form-group">
            <label htmlFor="email">Email Address</label>
            <input 
              id="email"
              type="email" 
              value={email} 
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
            />
          </div>

          <div className="sa-form-group">
            <label htmlFor="password">Password</label>
            <input 
              id="password"
              type="password" 
              value={password} 
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
          </div>

          <button type="submit" className="sa-btn sa-btn-primary sa-btn-full">
            Sign In
          </button>
        </form>

        {message && (
          <div className={`sa-banner sa-banner-${messageType}`} style={{ marginTop: '20px' }}>
            {message}
          </div>
        )}

        <div className="sa-auth-footer">
          Don't have an account?{' '}
          <a 
            onClick={() => navigate('/register')}
            style={{ cursor: 'pointer', color: 'var(--accent)' }}
          >
            Create one here
          </a>
        </div>
      </div>
    </div>
  )
}

export default Login