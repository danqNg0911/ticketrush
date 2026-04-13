import { Link, NavLink, useNavigate } from 'react-router-dom'

import { useAuth } from '../hooks/useAuth'

export function TopNav() {
  const { user, isAuthenticated, isAdmin, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <header className="top-nav">
      <div className="top-nav__inner app-container">
        <Link to="/" className="brand">
          TicketRush
        </Link>

        <nav className="top-nav__menu">
          <NavLink to="/" end>
            Events
          </NavLink>
          {isAuthenticated && !isAdmin && <NavLink to="/my-tickets">My Tickets</NavLink>}
          {isAuthenticated && isAdmin && <NavLink to="/admin/dashboard">Dashboard</NavLink>}
          {isAuthenticated && isAdmin && <NavLink to="/admin/events">Event Management</NavLink>}
        </nav>

        <div className="top-nav__actions">
          {!isAuthenticated && (
            <>
              <Link to="/login" className="btn btn-ghost">
                Login
              </Link>
              <Link to="/register" className="btn btn-primary btn-sm">
                Register
              </Link>
            </>
          )}

          {isAuthenticated && (
            <>
              <span className="top-nav__user">{user?.full_name}</span>
              <button type="button" className="btn btn-ghost" onClick={handleLogout}>
                Logout
              </button>
            </>
          )}
        </div>
      </div>
    </header>
  )
}
