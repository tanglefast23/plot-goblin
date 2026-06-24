"use client";

import Link from "next/link";
import styles from "./RoomNavMenu.module.css";
import { getActiveRooms } from "@/lib/storyRooms";

type RoomNavMenuProps = {
  buttonClassName?: string;
};

function classes(...names: Array<string | undefined>) {
  return names.filter(Boolean).join(" ");
}

export function RoomNavMenu({ buttonClassName }: RoomNavMenuProps) {
  const activeRooms = getActiveRooms();

  return (
    <div className={styles.roomMenu} aria-label="Active screenplay rooms">
      {activeRooms.map((room) => (
        <Link className={classes(styles.roomLink, buttonClassName)} href={`/rooms/${room.slug}`} key={room.slug}>
          {room.title}
        </Link>
      ))}
    </div>
  );
}
