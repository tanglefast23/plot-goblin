"use client";

import Link from "next/link";
import { useId, useState } from "react";
import styles from "./RoomNavMenu.module.css";
import { getActiveRooms, getComingSoonRooms } from "@/lib/storyRooms";

type RoomNavMenuProps = {
  align?: "start" | "end";
  buttonClassName?: string;
};

function classes(...names: Array<string | undefined>) {
  return names.filter(Boolean).join(" ");
}

export function RoomNavMenu({ align = "start", buttonClassName }: RoomNavMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const roomListId = useId();
  const activeRooms = getActiveRooms();
  const comingSoonRooms = getComingSoonRooms();

  return (
    <div className={styles.roomMenu} data-align={align}>
      <button
        aria-controls={roomListId}
        aria-expanded={isOpen}
        aria-haspopup="true"
        className={classes(styles.trigger, buttonClassName)}
        onClick={() => setIsOpen((current) => !current)}
        onKeyDown={(event) => {
          if (event.key === "Escape") setIsOpen(false);
        }}
        type="button"
      >
        Rooms
      </button>

      {isOpen ? (
        <div className={styles.panel}>
          <Link className={styles.overviewLink} href="/rooms" onClick={() => setIsOpen(false)}>
            Rooms dashboard
          </Link>
          <ul aria-label="All screenplay rooms" className={styles.roomList} id={roomListId}>
            {activeRooms.map((room) => (
              <li key={room.slug}>
                <Link className={styles.roomLink} href={`/rooms/${room.slug}`} onClick={() => setIsOpen(false)}>
                  <span>{room.title}</span>
                  <small>{room.markdownFile}</small>
                </Link>
              </li>
            ))}
            {comingSoonRooms.map((room) => (
              <li key={room.slug}>
                <span aria-disabled="true" className={classes(styles.roomLink, styles.roomDisabled)}>
                  <span>{room.title}</span>
                  <small>Coming soon</small>
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
