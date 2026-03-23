import React from "react";
import { HomeIcon, Squares2X2Icon, ArrowRightCircleIcon, PersonCircleIcon } from "./icons/Heroicons";

function HomeSidebar({ activeSection, onSelect }) {
  const getAuthLabel = () => {
    try {
      const token = localStorage.getItem("advisys_token");
      const rawUser = localStorage.getItem("advisys_user");
      const role = rawUser ? JSON.parse(rawUser)?.role : null;
      return token && role ? "Dashboard" : "Sign In";
    } catch (_) {
      return "Sign In";
    }
  };

  const navItems = [
  { id: "hero", label: "adviSys", icon: <HomeIcon /> },
  { id: "features", label: "What's Inside", icon: <Squares2X2Icon /> },
  { id: "how-it-works", label: "How it Works", icon: <ArrowRightCircleIcon /> },
  { id: "auth", label: getAuthLabel(), icon: <PersonCircleIcon /> },
];

  return (
    <aside className="w-72 md:w-96 shrink-0 home-sidebar home-sidebar-rail sticky top-0 md:h-screen px-6 md:px-12 py-6 md:py-8 flex flex-col relative bg-white md:bg-transparent">
      <div className="home-menu-center">
        <ul className="select-none list-none m-0 p-0 w-full flex flex-col items-start gap-6">
          {navItems.map((item) => (
            <li key={item.id} className="home-sidebar-li">
              <button
                className={`home-sidebar-item w-full bg-transparent border-0 text-left ${activeSection === item.id ? "active" : ""}`}
                onClick={() => onSelect && onSelect(item.id)}
              >
                <span className="text-lg md:text-xl" aria-hidden>
                  {item.icon}
                </span>
                <span className="drop-shadow-sm">
                  {item.label}
                </span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </aside>
  );
}

export default HomeSidebar;

