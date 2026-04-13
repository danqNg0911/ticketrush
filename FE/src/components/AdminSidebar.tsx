import { NavLink } from 'react-router-dom'

export function AdminSidebar() {
  return (
    <aside className="admin-sidebar">
      <div className="admin-sidebar__brand">
        <h2>Admin Panel</h2>
        <p>TicketRush Central</p>
      </div>

      <nav className="admin-sidebar__menu">
        <NavLink to="/admin/dashboard">Dashboard</NavLink>
        <NavLink to="/admin/events">Event Management</NavLink>
      </nav>
    </aside>
  )
}
