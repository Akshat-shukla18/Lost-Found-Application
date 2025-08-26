import { Link, useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'

export default function Navbar() {
  const [isAuthed, setIsAuthed] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    const token = localStorage.getItem('token')
    setIsAuthed(Boolean(token))
  }, [])

  function logout() {
    localStorage.removeItem('token')
    setIsAuthed(false)
    navigate('/login')
  }

  return (
    <nav className="navbar">
      <div className="brand"><Link to="/">RTRWH</Link></div>
      <div className="links">
        {!isAuthed ? (
          <>
            <Link to="/login">Login</Link>
            <Link to="/register">Register</Link>
          </>
        ) : (
          <>
            <Link to="/">Assessment</Link>
            <Link to="/dashboard">Dashboard</Link>
            <button onClick={logout}>Logout</button>
          </>
        )}
      </div>
    </nav>
  )
}