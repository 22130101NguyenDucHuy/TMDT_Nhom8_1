import { Link, NavLink, Outlet } from "react-router-dom";
import BrandLogo from "../common/BrandLogo";
import "./AdminLayout.css";

export default function AdminLayout() {
  return (
    <div className="admin-container">
      <aside className="admin-sidebar">
        <div className="admin-logo">
          <Link to="/admin">
            <BrandLogo className="h-8 w-auto object-contain" />
          </Link>
        </div>
        
        <nav className="admin-nav">
          <div className="admin-nav-section">
            <p className="admin-nav-label">Chính</p>
            <NavLink to="/admin" end className={({ isActive }) => isActive ? "admin-nav-link active" : "admin-nav-link"}>
              Dashboard
            </NavLink>
          </div>

          <div className="admin-nav-section">
            <p className="admin-nav-label">Quản Lý</p>
            <NavLink to="/admin/users" className={({ isActive }) => isActive ? "admin-nav-link active" : "admin-nav-link"}>
              Người Dùng
            </NavLink>
            <NavLink to="/admin/listings" className={({ isActive }) => isActive ? "admin-nav-link active" : "admin-nav-link"}>
              Listing/Sách
            </NavLink>
            <NavLink to="/admin/categories" className={({ isActive }) => isActive ? "admin-nav-link active" : "admin-nav-link"}>
              Danh Mục
            </NavLink>
            <NavLink to="/admin/transactions" className={({ isActive }) => isActive ? "admin-nav-link active" : "admin-nav-link"}>
              Giao Dịch
            </NavLink>
            <NavLink to="/admin/premium" className={({ isActive }) => isActive ? "admin-nav-link active" : "admin-nav-link"}>
              Premium
            </NavLink>
          </div>

          <div className="admin-nav-section">
            <p className="admin-nav-label">Hỗ Trợ</p>
            <NavLink to="/admin/disputes" className={({ isActive }) => isActive ? "admin-nav-link active" : "admin-nav-link"}>
              Tranh Chấp
            </NavLink>
            <NavLink to="/admin/reports" className={({ isActive }) => isActive ? "admin-nav-link active" : "admin-nav-link"}>
              Báo Cáo
            </NavLink>
          </div>

          <div className="admin-nav-section">
            <p className="admin-nav-label">Khác</p>
            <NavLink to="/admin/settings" className={({ isActive }) => isActive ? "admin-nav-link active" : "admin-nav-link"}>
              Cài Đặt
            </NavLink>
            <NavLink to="/" className="admin-nav-link">
              Quay Lại
            </NavLink>
          </div>
        </nav>
      </aside>

      <main className="admin-main">
        <div className="admin-content">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
