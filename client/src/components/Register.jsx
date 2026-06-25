import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { API_BASE_URL } from '../config';

function Register() {
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState('')
  const [messageType, setMessageType] = useState('')

  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setMessage('Sending data to the backend engine...')
    setMessageType('info')

    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, email, password }),
      })

      const data = await response.json()

      if (response.ok) {
        localStorage.setItem('studyArenaToken', data.token)
        setMessage('Account Created Successfully! Redirecting to login...')
        setMessageType('success')
        console.log("Full Response from Server Vault:", data)
        
        setTimeout(() => {
          navigate('/login')
        }, 1500)

      } else {
        setMessage(`Server Rejected Request: ${data.message || 'Unknown Error'}`)
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
          <h2>Create Your Account</h2>
          <p>Join StudyArena and start competitive studying</p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="sa-form-group">
            <label htmlFor="username">Username</label>
            <input 
              id="username"
              type="text" 
              value={username} 
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Choose your study name"
              required
            />
          </div>

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
            Create Account
          </button>
        </form>

        {message && (
          <div className={`sa-banner sa-banner-${messageType}`} style={{ marginTop: '20px' }}>
            {message}
          </div>
        )}

        <div className="sa-auth-footer">
          Already have an account?{' '}
          <a 
            onClick={() => navigate('/login')}
            style={{ cursor: 'pointer', color: 'var(--accent)' }}
          >
            Sign in here
          </a>
        </div>
      </div>
    </div>
  )
}

export default Register