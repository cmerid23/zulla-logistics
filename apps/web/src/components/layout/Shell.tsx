import { Outlet } from "react-router-dom";
import { NavBar } from "./NavBar";
import { Sidebar } from "./Sidebar";
import { BottomNav } from "./BottomNav";

export function Shell() {
  return (
    <div className="min-h-screen flex flex-col bg-black text-white">
      <NavBar />
      <div className="flex flex-1">
        <Sidebar />
        <main className="flex-1 pb-24 md:pb-8">
          <Outlet />
        </main>
      </div>
      <BottomNav />
    </div>
  );
}
