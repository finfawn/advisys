import React from "react";
import { BsHouse, BsGrid3X3Gap, BsArrowRightCircle, BsBoxArrowInRight } from "react-icons/bs";

function HomeSidebar({ activeSection, onSelect }) {
  const menuItems = [
    { id: "hero", label: "adviSys", icon: <BsHouse /> },
    { id: "features", label: "What's Inside", icon: <BsGrid3X3Gap /> },
    { id: "how-it-works", label: "How it Works", icon: <BsArrowRightCircle /> },
    { id: "auth", label: "SignIn", icon: <BsBoxArrowInRight /> },
  ];

  return (
    <aside className="w-72 md:w-96 shrink-0 home-sidebar home-sidebar-rail sticky top-0 md:h-screen px-6 md:px-12 py-6 md:py-8 flex flex-col relative bg-white md:bg-transparent">
      <div className="home-menu-center">
        <ul className="select-none list-none m-0 p-0 w-full flex flex-col items-start gap-6">
          {menuItems.map((item) => (
            <li key={item.id} className="home-sidebar-li">
              <button
                className={`home-sidebar-item w-full bg-transparent border-0 text-left ${activeSection === item.id ? "active" : ""}`}
                onClick={() => onSelect && onSelect(item.id)}
              >
                <span className="text-lg md:text-xl" aria-hidden>
                  {item.icon}
                </span>
                <span className="drop-shadow-sm">
                  {item.id === "hero" ? (
                    <>advi<span className="brand-sys">Sys</span></>
                  ) : (
                    item.label
                  )}
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


