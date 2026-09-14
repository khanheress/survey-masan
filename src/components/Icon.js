const paths = {
  "database": "M20 6c0 2-3.6 3-8 3S4 8 4 6s3.6-3 8-3 8 1 8 3Z M4 6v12c0 2 3.6 3 8 3s8-1 8-3V6 M4 12c0 2 3.6 3 8 3s8-1 8-3",
  "info": "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18 M12 11v6 M12 7h.01",
  "chart": "M4 4v16h16 M8 16v-5 M13 16V7 M18 16v-8",
  "folder": "M3 7V5h6l2 2h10v12H3Z",
  "file": "M14 3H5v18h14V8Z M14 3v5h5 M8 12h8 M8 16h6",
  "users": "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2 M17 4a4 4 0 0 1 0 8 M22 21v-2a4 4 0 0 0-3-3.87 M9 3a4 4 0 1 0 0 8 4 4 0 0 0 0-8",
  "user": "M20 21v-2a7 7 0 0 0-14 0v2 M13 3a4 4 0 1 0 0 8 4 4 0 0 0 0-8",
  "lock": "M5 10h14v11H5Z M8 10V7a4 4 0 0 1 8 0v3 M12 14v3",
  "link": "M10 13a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-2 2 M14 11a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l2-2",
  "download": "M12 3v12 M7 10l5 5 5-5 M4 16v5h16v-5",
  "phone-device": "M7 2h10v20H7Z M11 18h2",
  "activity": "M3 12h4l3-8 4 16 3-8h4",
  "arrow-right": "M4 12h16 M14 6l6 6-6 6",
  "logout": "M9 3H4v18h5 M9 12h12 M16 7l5 5-5 5",
  "mail": "M3 5h18v14H3Z M3 5l9 7 9-7",
  "check-square": "M9 3H3v18h18V11 M8 11l4 4L21 4",
  "calendar": "M3 5h18v16H3Z M3 10h18 M7 3v4 M17 3v4",
  "phone": "M22 16.9v3a2 2 0 0 1-2.18 2 19.8 19.8 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.12 4.2 2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.37 1.9.7 2.8a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.9.33 1.84.57 2.8.7A2 2 0 0 1 22 16.9Z",
  "star": "m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2-5.6-2.9-5.6 2.9 1.1-6.2L3 9.6l6.2-.9Z",
  "scale": "M3 8h18v8H3Z M7 8v4 M12 8v3 M17 8v4",
  "edit": "m16 3 5 5-12 12H4v-5Z M13 6l5 5",
  "trash": "M3 6h18 M9 6V3h6v3 M5 6l1 15h12l1-15 M10 10v7 M14 10v7",
  "copy": "M9 9h12v12H9Z M5 15H3V3h12v2",
  "eye": "M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6",
  "refresh": "M20 7v5h-5 M4 17v-5h5 M6 6a8 8 0 0 1 14 6 M18 18A8 8 0 0 1 4 12",
  "search": "M10 3a7 7 0 1 0 0 14 7 7 0 0 0 0-14 M15 15l6 6",
  "check": "M4 12l5 5L20 6",
  "close": "M6 6l12 12 M6 18 18 6",
  "alert": "m12 3 10 18H2Z M12 9v5 M12 17h.01",
  "menu": "M4 6h16 M4 12h16 M4 18h16",
  "radio": "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18 M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6",
  "save": "M19 21H3V3h14l4 4v14Z M7 3v6h10V3 M7 21v-8h10v8"
};

export default function Icon({ name, size = 16, style, ...props }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      style={{ display: 'inline-block', verticalAlign: '-0.15em', flexShrink: 0, ...style }}
      {...props}
    >
      <path d={paths[name]} />
    </svg>
  );
}
