import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'; // 1. Imported perfectly!

function Register() {
  // 1. React's internal temporary memory (State)
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState('')

  const navigate = useNavigate(); // 👇 2. INITIALIZE THE STEERING WHEEL HERE!

  // 2. The upgraded backend bridge logic
  const handleSubmit = async (e) => {
    e.preventDefault() 
    setMessage('Sending data to the backend engine...')

    try {
      const response = await fetch('http://localhost:5000/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, email, password }),
      })

      const data = await response.json()

      if (response.ok) {
        localStorage.setItem('studyArenaToken', data.token)
        setMessage(`Account Created Successfully! Redirecting to login...`)
        console.log("Full Response from Server Vault:", data)
        
        //Automatically redirect them to login after 1.5 seconds!
        setTimeout(() => {
          navigate('/login')
        }, 1500)

      } else {
        setMessage(`Server Rejected Request: ${data.message || 'Unknown Error'}`)
      }
    } catch (error) {
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

        <p style={{ textAlign: 'center', marginTop: '15px', fontSize: '14px', color: '#666' }}>
          Already have an account?{' '}
          <span 
            onClick={() => navigate('/login')} // Now this function actually exists!
            style={{ color: '#008CBA', cursor: 'pointer', textDecoration: 'underline', fontWeight: 'bold' }}
          >
            Sign In here
          </span>
        </p>

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